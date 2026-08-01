import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { usePdfBuild } from "~/composables/usePdfBuild";
import { useZip } from "~/composables/useZip";
import { hasPdfMagic } from "~/utils/pdf";
import { makeImageHeavyPdf } from "./support/makeSamplePdf";

describe("usePdfBuild.assemble", () => {
  it("extracts selected pages in the given order", async () => {
    const bytes = await makeImageHeavyPdf(200, 4);
    const { assemble } = usePdfBuild();
    const out = await assemble(
      [
        { sourceId: "s", pageIndex: 2, rotation: 0 },
        { sourceId: "s", pageIndex: 0, rotation: 0 }
      ],
      new Map([["s", bytes]])
    );
    expect(hasPdfMagic(out)).toBe(true);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
  });

  it("applies rotation additively", async () => {
    const bytes = await makeImageHeavyPdf(200, 1);
    const { assemble } = usePdfBuild();
    const out = await assemble(
      [{ sourceId: "s", pageIndex: 0, rotation: 90 }],
      new Map([["s", bytes]])
    );
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
  });

  it("merges pages across multiple sources", async () => {
    const a = await makeImageHeavyPdf(200, 2);
    const b = await makeImageHeavyPdf(200, 3);
    const { assemble } = usePdfBuild();
    const out = await assemble(
      [
        { sourceId: "a", pageIndex: 0, rotation: 0 },
        { sourceId: "b", pageIndex: 2, rotation: 0 },
        { sourceId: "a", pageIndex: 1, rotation: 0 }
      ],
      new Map([
        ["a", a],
        ["b", b]
      ])
    );
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
  });
});

describe("useZip", () => {
  it("zips files that can be read back", async () => {
    const { zip } = useZip();
    const archive = await zip({ "a.txt": new TextEncoder().encode("hello") });
    const { unzipSync } = await import("fflate");
    const files = unzipSync(archive);
    expect(new TextDecoder().decode(files["a.txt"])).toBe("hello");
  });
});
