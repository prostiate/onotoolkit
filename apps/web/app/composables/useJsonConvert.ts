/**
 * Converts a parsed JSON value to YAML, CSV, or XML entirely in the browser.
 * The conversion libraries are imported dynamically so they stay out of the SSR
 * bundle and only load when a conversion is actually requested.
 */
export function useJsonConvert() {
  async function toYaml(value: unknown): Promise<string> {
    const { stringify } = await import("yaml");
    return stringify(value);
  }

  async function toCsv(value: unknown): Promise<string> {
    const { json2csv } = await import("json-2-csv");
    const rows = Array.isArray(value) ? value : [value];
    return json2csv(rows as Record<string, unknown>[], { expandNestedObjects: true });
  }

  async function toXml(value: unknown): Promise<string> {
    const { XMLBuilder } = await import("fast-xml-parser");
    const builder = new XMLBuilder({ format: true, indentBy: "  ", ignoreAttributes: false });
    return builder.build({ root: value });
  }

  return { toYaml, toCsv, toXml };
}
