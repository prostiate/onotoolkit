// @vitest-environment node
import { describe, expect, it } from "vitest";
import { useJsonConvert } from "~/composables/useJsonConvert";

const { toYaml, toCsv, toXml } = useJsonConvert();

describe("toYaml", () => {
  it("serialises an object to YAML", async () => {
    const yaml = await toYaml({ name: "Ono", tools: ["pdf", "jwt"] });
    expect(yaml).toContain("name: Ono");
    expect(yaml).toContain("- pdf");
    expect(yaml).toContain("- jwt");
  });
});

describe("toCsv", () => {
  it("wraps a single object into one CSV row", async () => {
    const csv = await toCsv({ a: 1, b: 2 });
    const [header, row] = csv.trim().split("\n");
    expect(header).toBe("a,b");
    expect(row).toBe("1,2");
  });

  it("emits one row per array element", async () => {
    const csv = await toCsv([
      { a: 1, b: 2 },
      { a: 3, b: 4 }
    ]);
    expect(csv.trim().split("\n")).toHaveLength(3);
  });
});

describe("toXml", () => {
  it("wraps the value under a root element", async () => {
    const xml = await toXml({ name: "Ono" });
    expect(xml).toContain("<root>");
    expect(xml).toContain("<name>Ono</name>");
    expect(xml).toContain("</root>");
  });
});
