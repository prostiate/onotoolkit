/**
 * Sanitizes an HTML string with DOMPurify (imported dynamically, client-only).
 * `<style>` tags are kept so pasted/converted documents can carry their own CSS
 * into the print output. Shared by the HTML->PDF and Word->PDF tools.
 */
export function useSanitize() {
  async function sanitize(html: string): Promise<string> {
    const { default: DOMPurify } = await import("dompurify");
    return DOMPurify.sanitize(html, { ADD_TAGS: ["style"] });
  }
  return { sanitize };
}
