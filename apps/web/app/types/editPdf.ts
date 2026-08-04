/** Types for the in-browser PDF editor (overlay authoring on top of PDF pages). */

/** The active editing tool. */
export type EditorTool =
  | "select"
  | "text"
  | "image"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "draw"
  | "highlight"
  | "whiteout"
  | "signature";

/** A centre-anchored, rotatable box in page-space points (top-left origin). */
export interface BoxGeometry {
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number;
}

interface WithId {
  id: string;
}

/** Rich text, rasterised to an image for faithful rendering into the PDF. */
export interface TextObject extends WithId, BoxGeometry {
  type: "text";
  /** TipTap HTML, kept so the box can be re-edited. */
  html: string;
  /** Rasterised PNG data URL used for display and export. */
  dataUrl: string;
}

/** Selectable, searchable PDF text (drawn as real text on export, Latin only). */
export interface NativeTextObject extends WithId, BoxGeometry {
  type: "nativeText";
  text: string;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
}

/** An inserted raster image. */
export interface ImageObject extends WithId, BoxGeometry {
  type: "image";
  dataUrl: string;
}

/** Rectangle, ellipse, highlighter, or whiteout - all box-shaped fills/strokes. */
export interface ShapeObject extends WithId, BoxGeometry {
  type: "rect" | "ellipse" | "highlight" | "whiteout";
  stroke: string;
  fill: string;
  strokeWidth: number;
  opacity: number;
}

/** A straight line or arrow between two page-space points. */
export interface LineObject extends WithId {
  type: "line" | "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}

/** A freehand pen stroke or a drawn signature (flat [x0,y0,x1,y1,...] points). */
export interface StrokeObject extends WithId {
  type: "draw" | "signature";
  points: number[];
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export type EditorObject =
  TextObject | NativeTextObject | ImageObject | ShapeObject | LineObject | StrokeObject;

/** True for objects that carry a centre box (movable/resizable/rotatable). */
export function isBoxObject(
  obj: EditorObject
): obj is TextObject | NativeTextObject | ImageObject | ShapeObject {
  return (
    obj.type === "text" ||
    obj.type === "nativeText" ||
    obj.type === "image" ||
    obj.type === "rect" ||
    obj.type === "ellipse" ||
    obj.type === "highlight" ||
    obj.type === "whiteout"
  );
}

/** Editable fields for a "simple" (selectable) text box. */
export interface SimpleTextValue {
  text: string;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
}

/** Payload emitted by the text popover when a box is added or edited. */
export type TextSavePayload =
  | { mode: "rich"; html: string; dataUrl: string; width: number; height: number }
  | ({ mode: "simple"; width: number; height: number } & SimpleTextValue);

/** Per-page metadata; `sourceIndex` is null for a blank page added in the editor. */
export interface EditorPage {
  id: string;
  sourceIndex: number | null;
  widthPts: number;
  heightPts: number;
  /** Page rotation in degrees (0/90/180/270), applied on export. */
  rotation: number;
}
