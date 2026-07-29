import { describe, expect, it } from "vitest";
import {
  formatJson,
  indentValue,
  minifyJson,
  outputFileName,
  outputMime,
  parseJson,
  sortKeysDeep
} from "~/utils/json";

describe("parseJson", () => {
  it("parses valid JSON", () => {
    const result = parseJson('{"a":1}');
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ a: 1 });
  });

  it("reports empty input", () => {
    const result = parseJson("   ");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Empty input.");
  });

  it("reports a parse error message", () => {
    const result = parseJson("{bad}");
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("indentValue", () => {
  it("maps numbers straight through and tab to \\t", () => {
    expect(indentValue(2)).toBe(2);
    expect(indentValue(4)).toBe(4);
    expect(indentValue("tab")).toBe("\t");
  });
});

describe("formatJson", () => {
  it("pretty-prints with the requested indent", () => {
    expect(formatJson('{"a":1}', 2)).toBe('{\n  "a": 1\n}');
    expect(formatJson('{"a":1}', 4)).toBe('{\n    "a": 1\n}');
    expect(formatJson('{"a":1}', "tab")).toBe('{\n\t"a": 1\n}');
  });

  it("throws on invalid JSON", () => {
    expect(() => formatJson("{bad}", 2)).toThrow();
  });
});

describe("minifyJson", () => {
  it("collapses whitespace to one line", () => {
    expect(minifyJson('{\n  "a": 1\n}')).toBe('{"a":1}');
  });

  it("throws on invalid JSON", () => {
    expect(() => minifyJson("nope")).toThrow();
  });
});

describe("sortKeysDeep", () => {
  it("sorts nested object keys and preserves array order", () => {
    const input = { b: 1, a: { d: 2, c: 3 }, list: [{ z: 1, y: 2 }] };
    expect(JSON.stringify(sortKeysDeep(input))).toBe(
      '{"a":{"c":3,"d":2},"b":1,"list":[{"y":2,"z":1}]}'
    );
  });

  it("leaves primitives untouched", () => {
    expect(sortKeysDeep(5)).toBe(5);
    expect(sortKeysDeep(null)).toBe(null);
  });
});

describe("output metadata", () => {
  it("returns file names per format", () => {
    expect(outputFileName("json")).toBe("data.json");
    expect(outputFileName("yaml")).toBe("data.yaml");
    expect(outputFileName("csv")).toBe("data.csv");
    expect(outputFileName("xml")).toBe("data.xml");
  });

  it("returns MIME types per format", () => {
    expect(outputMime("json")).toBe("application/json");
    expect(outputMime("yaml")).toBe("text/yaml");
    expect(outputMime("csv")).toBe("text/csv");
    expect(outputMime("xml")).toBe("application/xml");
  });
});
