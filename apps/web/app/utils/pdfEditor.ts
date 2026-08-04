/**
 * Pure geometry for the PDF editor. The editor works in "page space": points
 * (1/72 inch, the PDF unit) with a top-left origin and y pointing down, matching
 * screen/Konva conventions. pdf-lib draws in points with a bottom-left origin and
 * y pointing up, so these helpers convert between the two. All functions are pure
 * and unit-tested so the fiddly coordinate math is verifiable without a canvas.
 */

/** A centre-anchored box in page space (points, top-left origin, y-down). */
export interface CenterBox {
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** Clockwise rotation in degrees about the box centre (screen convention). */
  rotation: number;
}

/** A pdf-lib draw placement: bottom-left origin (points), CCW rotation degrees. */
export interface PdfPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Counter-clockwise degrees, as pdf-lib's `rotate: degrees(...)` expects. */
  rotate: number;
}

const DEG_TO_RAD = Math.PI / 180;

/** Display pixels -> page-space points, given the current render scale (zoom). */
export function displayToPage(px: number, scale: number): number {
  if (scale <= 0) throw new Error("scale must be positive");
  return px / scale;
}

/** Page-space points -> display pixels at the given scale. */
export function pageToDisplay(pts: number, scale: number): number {
  return pts * scale;
}

/** Flips a single page-space point (top-left, y-down) to pdf-lib space (y-up). */
export function flipPointY(
  xPts: number,
  yPts: number,
  pageHeightPts: number
): { x: number; y: number } {
  return { x: xPts, y: pageHeightPts - yPts };
}

/**
 * Converts a centre-anchored, possibly-rotated box into the origin + rotation
 * pdf-lib needs to draw it identically. pdf-lib rotates about the draw origin
 * (the image/shape's bottom-left), so we compute where that origin lands after
 * rotating the box about its centre.
 */
export function centerBoxToPdf(box: CenterBox, pageHeightPts: number): PdfPlacement {
  const { cx, cy, width, height, rotation } = box;
  const centerYUp = pageHeightPts - cy; // centre in pdf-lib (y-up) space
  const a = -rotation * DEG_TO_RAD; // screen clockwise -> pdf-lib CCW
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const hx = width / 2;
  const hy = height / 2;
  // Rotate the vector from centre to the (bottom-left) draw origin. In pdf space
  // the origin sits at centre + R(a) * (-w/2, -h/2).
  const originX = cx + (-hx * cos - -hy * sin);
  const originY = centerYUp + (-hx * sin + -hy * cos);
  return { x: originX, y: originY, width, height, rotate: -rotation };
}

/** Top-left (page space) of a centre box - handy for Konva node placement. */
export function centerBoxTopLeft(box: CenterBox): { x: number; y: number } {
  return { x: box.cx - box.width / 2, y: box.cy - box.height / 2 };
}

/** Builds a centre box from a top-left rect (no rotation). */
export function rectToCenterBox(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation = 0
): CenterBox {
  return { cx: x + width / 2, cy: y + height / 2, width, height, rotation };
}

/** Maps a flat [x0,y0,x1,y1,...] path (page space) into pdf-lib (y-up) points. */
export function flipPathPoints(
  points: number[],
  pageHeightPts: number
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    out.push({ x: points[i]!, y: pageHeightPts - points[i + 1]! });
  }
  return out;
}

/** Clamps a value into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
