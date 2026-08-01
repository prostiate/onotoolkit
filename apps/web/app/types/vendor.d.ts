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
