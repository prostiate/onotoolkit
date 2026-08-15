import type {
  AnnotationStroke,
  NormalizedRect,
  OverlaySize,
  WebcamCorner,
  WebcamShape
} from "~/types/screenRecorder";

/** Preferred MediaRecorder MIME types, best quality first (probed per browser). */
export const RECORDER_MIME_CANDIDATES: readonly { mimeType: string; extension: "mp4" | "webm" }[] =
  [
    { mimeType: "video/mp4;codecs=avc1,mp4a", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" }
  ];

/** Overlay width as a fraction of the canvas width, by size preset. */
export const OVERLAY_SIZE_FACTORS: Record<OverlaySize, number> = {
  small: 0.15,
  medium: 0.22,
  large: 0.3
};

/** Padding between the overlay and the canvas edge, in CSS pixels. */
export const OVERLAY_MARGIN = 16;

/** Video bitrate used for the recorder, tuned to the chosen resolution. */
export function recorderBitrate(resolution: string): number {
  if (resolution === "1080p") return 8_000_000;
  if (resolution === "720p") return 5_000_000;
  return 6_000_000;
}

/**
 * Picks the first supported MIME type (and its file extension) for this
 * browser. Returns null when the MediaRecorder API is unavailable entirely.
 */
export function pickRecorderMimeType(
  isSupported: (mimeType: string) => boolean
): { mimeType: string; extension: "mp4" | "webm" } | null {
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    if (isSupported(candidate.mimeType)) return candidate;
  }
  return null;
}

/** Builds a collision-free, time-ordered file name for a recording. */
export function recordingFileName(date: Date, extension: string): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  const datePart = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-");
  const timePart = [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join("");
  return `screen-recording-${datePart}-${timePart}.${extension}`;
}

/** Rectangle for the webcam overlay within the composited canvas. */
export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes the overlay rectangle for a corner + size, keeping the camera's
 * aspect ratio and clamping so the overlay never leaves the canvas.
 */
export function computeOverlayRect(
  canvasWidth: number,
  canvasHeight: number,
  cameraAspect: number,
  corner: WebcamCorner,
  size: OverlaySize
): OverlayRect {
  const safeAspect = Number.isFinite(cameraAspect) && cameraAspect > 0 ? cameraAspect : 16 / 9;
  const width = Math.round(canvasWidth * OVERLAY_SIZE_FACTORS[size]);
  const height = Math.round(Math.min(width / safeAspect, canvasHeight * 0.5));
  const margin = Math.min(OVERLAY_MARGIN, Math.round(canvasWidth * 0.02));
  const x = corner.endsWith("left") ? margin : canvasWidth - width - margin;
  const y = corner.startsWith("top") ? margin : canvasHeight - height - margin;
  return { x, y, width, height };
}

/** Converts a normalized (0..1) rect into pixel coordinates on the canvas. */
export function denormalizeRect(
  rect: NormalizedRect,
  canvasWidth: number,
  canvasHeight: number
): OverlayRect {
  return {
    x: Math.round(rect.x * canvasWidth),
    y: Math.round(rect.y * canvasHeight),
    width: Math.round(rect.width * canvasWidth),
    height: Math.round(rect.height * canvasHeight)
  };
}

/** Clamps a normalized rect so it always stays fully inside the canvas. */
export function clampNormalizedRect(rect: NormalizedRect): NormalizedRect {
  const width = Math.min(Math.max(rect.width, 0.05), 1);
  const height = Math.min(Math.max(rect.height, 0.05), 1);
  const x = Math.min(Math.max(rect.x, 0), 1 - width);
  const y = Math.min(Math.max(rect.y, 0), 1 - height);
  return { x, y, width, height };
}

/** Returns the visible square used by the circle overlay inside its bounds. */
export function inscribedSquareRect(rect: OverlayRect): OverlayRect {
  const diameter = Math.min(rect.width, rect.height);
  return {
    x: rect.x + (rect.width - diameter) / 2,
    y: rect.y + (rect.height - diameter) / 2,
    width: diameter,
    height: diameter
  };
}

/** Returns the geometry occupied by a webcam shape. */
export function overlayShapeRect(rect: OverlayRect, shape: WebcamShape): OverlayRect {
  return shape === "circle" ? inscribedSquareRect(rect) : rect;
}

/** Moves an overlay by a normalized delta while keeping it inside the canvas. */
export function moveNormalizedRect(rect: NormalizedRect, dx: number, dy: number): NormalizedRect {
  return clampNormalizedRect({ ...rect, x: rect.x + dx, y: rect.y + dy });
}

/** Resizes an overlay from its bottom-right corner by a normalized delta. */
export function resizeNormalizedRect(rect: NormalizedRect, dw: number, dh: number): NormalizedRect {
  return clampNormalizedRect({ ...rect, width: rect.width + dw, height: rect.height + dh });
}

/**
 * Draws a video into a destination rect using object-fit: cover semantics,
 * cropping the source so the rect is filled without distortion.
 */
export function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw === 0 || vh === 0 || width === 0 || height === 0) return;
  const destAspect = width / height;
  const srcAspect = vw / vh;
  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;
  if (srcAspect > destAspect) {
    sw = Math.round(vh * destAspect);
    sx = Math.round((vw - sw) / 2);
  } else {
    sh = Math.round(vw / destAspect);
    sy = Math.round((vh - sh) / 2);
  }
  ctx.drawImage(video, sx, sy, sw, sh, x, y, width, height);
}

/** Applies a clip path for the given webcam shape over the rect. Caller saves/restores. */
export function applyShapeClip(
  ctx: CanvasRenderingContext2D,
  shape: WebcamShape,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const shapeRect = overlayShapeRect({ x, y, width, height }, shape);
  ctx.beginPath();
  if (shape === "circle") {
    ctx.ellipse(
      shapeRect.x + shapeRect.width / 2,
      shapeRect.y + shapeRect.height / 2,
      shapeRect.width / 2,
      shapeRect.height / 2,
      0,
      0,
      Math.PI * 2
    );
  } else if (shape === "rounded" && typeof ctx.roundRect === "function") {
    const radius = Math.min(shapeRect.width, shapeRect.height) * 0.18;
    ctx.roundRect(shapeRect.x, shapeRect.y, shapeRect.width, shapeRect.height, radius);
  } else {
    ctx.rect(shapeRect.x, shapeRect.y, shapeRect.width, shapeRect.height);
  }
  ctx.clip();
}

/** Draws one annotation stroke onto the canvas, mapping normalized points to pixels. */
export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  stroke: AnnotationStroke,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (stroke.points.length === 0) return;
  const px = (n: number): number => n * canvasWidth;
  const py = (n: number): number => n * canvasHeight;
  const lineWidth = Math.max(1, stroke.width * canvasWidth);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = stroke.tool === "highlighter" ? 0.35 : 1;

  if (stroke.tool === "pen" || stroke.tool === "highlighter") {
    if (stroke.tool === "highlighter") ctx.lineWidth = lineWidth * 2.5;
    ctx.beginPath();
    const [first, ...rest] = stroke.points;
    if (!first) {
      ctx.restore();
      return;
    }
    ctx.moveTo(px(first.x), py(first.y));
    for (const point of rest) ctx.lineTo(px(point.x), py(point.y));
    ctx.stroke();
  } else if (stroke.tool === "rect") {
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];
    if (start && end) {
      ctx.strokeRect(px(start.x), py(start.y), px(end.x) - px(start.x), py(end.y) - py(start.y));
    }
  } else if (stroke.tool === "arrow") {
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];
    if (start && end) {
      const x1 = px(start.x);
      const y1 = py(start.y);
      const x2 = px(end.x);
      const y2 = py(end.y);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = Math.max(lineWidth * 3, canvasWidth * 0.012);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - head * Math.cos(angle - Math.PI / 6),
        y2 - head * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x2 - head * Math.cos(angle + Math.PI / 6),
        y2 - head * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Human-friendly label for a media device, with a sensible fallback. */
export function formatDeviceLabel(device: MediaDeviceInfo, kind: "camera" | "microphone"): string {
  const label = device.label.trim();
  if (label) return label;
  return kind === "camera" ? "Default camera" : "Default microphone";
}

/** Formats an elapsed time in milliseconds as m:ss or h:mm:ss. */
export function formatRecordingDuration(elapsedMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number): string => String(value).padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

/** Tells whether the browser has the APIs a screen-capture session needs. */
export function isScreenRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getDisplayMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

/** Tells whether camera-only recording is possible (no screen capture required). */
export function isCameraRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}
