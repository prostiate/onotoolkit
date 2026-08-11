/**
 * Minimal ambient declaration for mammoth's browser build, which ships without
 * bundled types. We only use `convertToHtml` in the browser (DOCX -> Markdown).
 */
declare module "mammoth/mammoth.browser" {
  interface ConvertInput {
    arrayBuffer: ArrayBuffer;
  }
  interface ConvertResult {
    value: string;
    messages: { type: string; message: string }[];
  }
  export function convertToHtml(input: ConvertInput): Promise<ConvertResult>;
  export function extractRawText(input: ConvertInput): Promise<ConvertResult>;
}

/**
 * Ambient declaration for gifenc (MIT, mattdesl), which ships without bundled
 * types. We only use the static-GIF path: quantize + applyPalette + writeFrame.
 */
declare module "gifenc" {
  export interface GifPalette {
    [index: number]: number;
  }
  export interface GifFrameOptions {
    palette?: GifPalette;
    /** Frame delay in ms. */
    delay?: number;
    /** 0 = no transparency, 1 = indexed transparency (first palette entry). */
    transparent?: boolean | number;
  }
  export interface GifEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, options: GifFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    reset(): void;
  }
  export function GIFEncoder(): GifEncoderInstance;
  export function quantize(
    data: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: Record<string, unknown>
  ): GifPalette;
  export function applyPalette(
    data: Uint8Array | Uint8ClampedArray,
    palette: GifPalette,
    format?: string
  ): Uint8Array;
  export function nearestColorIndex(palette: GifPalette, r: number, g: number, b: number): number;
}
