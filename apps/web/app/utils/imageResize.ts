/**
 * Pure resize-planning math for the image resizer. Everything here is a
 * framework-agnostic pure function so it can be unit-tested without a DOM;
 * the actual pixel work happens in `useImageConvert` on a canvas.
 */

export type ResizeMode = "percentage" | "dimensions" | "size";

/** How a source is fitted into a target box in "dimensions" mode. */
export type FitMode = "contain" | "cover" | "stretch";

/** Output pixels are clamped to this range (canvas safety + sanity). */
export const RESIZE_MIN_DIMENSION = 1;
export const RESIZE_MAX_DIMENSION = 8192;

export const RESIZE_MIN_PERCENTAGE = 1;
export const RESIZE_MAX_PERCENTAGE = 500;

export const TARGET_KB_MIN = 1;
export const TARGET_KB_MAX = 10240;

/** User-chosen resize options that drive {@link planTargetDimensions}. */
export interface ResizeSettings {
  mode: ResizeMode;
  /** Scale percentage (1-500), used in "percentage" mode. */
  percentage: number;
  /** Target box width (px), used in "dimensions" mode. Null keeps the aspect. */
  width: number | null;
  /** Target box height (px), used in "dimensions" mode. Null keeps the aspect. */
  height: number | null;
  fit: FitMode;
  /** Target output file size (KB), used in "size" mode. */
  targetKb: number;
}

/** A concrete output size. */
export interface TargetDimensions {
  width: number;
  height: number;
}

/** Clamps a dimension into the supported output range. */
export function clampDimension(value: number): number {
  return Math.min(RESIZE_MAX_DIMENSION, Math.max(RESIZE_MIN_DIMENSION, Math.round(value)));
}

/** Clamps a scale percentage into the supported range. */
export function clampPercentage(value: number): number {
  return Math.min(RESIZE_MAX_PERCENTAGE, Math.max(RESIZE_MIN_PERCENTAGE, Math.round(value)));
}

/** Clamps a target file size (KB) into the supported range. */
export function clampTargetKb(value: number): number {
  return Math.min(TARGET_KB_MAX, Math.max(TARGET_KB_MIN, Math.round(value)));
}

/** Calculates the output width/height (rounded, clamped) for one raster. */
export function planTargetDimensions(
  inputWidth: number,
  inputHeight: number,
  settings: Pick<ResizeSettings, "mode" | "percentage" | "width" | "height" | "fit">
): TargetDimensions {
  if (inputWidth <= 0 || inputHeight <= 0) {
    throw new Error("planTargetDimensions: input dimensions must be positive.");
  }

  switch (settings.mode) {
    case "percentage": {
      const scale = clampPercentage(settings.percentage) / 100;
      return {
        width: clampDimension(inputWidth * scale),
        height: clampDimension(inputHeight * scale)
      };
    }
    case "dimensions": {
      const { width, height } = settings;
      if (width == null && height == null) {
        throw new Error("planTargetDimensions: provide a width or a height.");
      }
      // One axis empty: derive it from the other, keeping the aspect ratio.
      if (width == null) {
        const scale = height! / inputHeight;
        return { width: clampDimension(inputWidth * scale), height: clampDimension(height!) };
      }
      if (height == null) {
        const scale = width / inputWidth;
        return { width: clampDimension(width), height: clampDimension(inputHeight * scale) };
      }
      switch (settings.fit) {
        case "stretch":
          return { width: clampDimension(width), height: clampDimension(height) };
        case "cover": {
          const scale = Math.max(width / inputWidth, height / inputHeight);
          return {
            width: clampDimension(inputWidth * scale),
            height: clampDimension(inputHeight * scale)
          };
        }
        case "contain": {
          const scale = Math.min(width / inputWidth, height / inputHeight);
          return {
            width: clampDimension(inputWidth * scale),
            height: clampDimension(inputHeight * scale)
          };
        }
      }
      break;
    }
    case "size":
      // The byte budget is reached by iterating quality/scale in the browser
      // composable; the raster itself stays untouched.
      return { width: inputWidth, height: inputHeight };
  }

  // Unreachable, kept for exhaustiveness.
  throw new Error("planTargetDimensions: unknown resize mode.");
}
