/**
 * Converts DOCX bytes to HTML in the browser using mammoth's browser build
 * (imported dynamically). Mammoth preserves headings, lists, tables, bold/italic
 * and images, but not exact page layout. Shared by the Word->PDF tool.
 */
export function useDocx() {
  async function docxToHtml(bytes: ArrayBuffer): Promise<string> {
    const mammoth = await import("mammoth/mammoth.browser");
    const { value } = await mammoth.convertToHtml({ arrayBuffer: bytes });
    return value;
  }
  return { docxToHtml };
}
