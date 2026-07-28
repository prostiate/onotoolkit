// @vitest-environment node
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import initGhostscript from "@jspawn/ghostscript-wasm/gs.js";
import { makeImageHeavyPdf } from "./support/makeSamplePdf";
import { hasPdfMagic } from "~/utils/pdf";

const require = createRequire(import.meta.url);
const wasmBinary = readFileSync(require.resolve("@jspawn/ghostscript-wasm/gs.wasm"));

/**
 * Verifies the real Ghostscript-WASM engine compresses an image-heavy PDF.
 * This exercises the same command Ono PDF's worker runs in the browser.
 */
describe("ghostscript-wasm engine", () => {
  it("compresses an image-heavy PDF to a smaller valid PDF", async () => {
    const input = await makeImageHeavyPdf(1000, 2);
    expect(hasPdfMagic(input)).toBe(true);

    const mod = await initGhostscript({
      noInitialRun: true,
      instantiateWasm: (imports, success) => {
        WebAssembly.instantiate(wasmBinary, imports)
          .then((result) => success(result.instance, result.module))
          .catch((error: unknown) => {
            throw error instanceof Error ? error : new Error("wasm instantiate failed");
          });
        return {};
      }
    });
    mod.FS.writeFile("input.pdf", input);

    try {
      mod.callMain([
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        "-dPDFSETTINGS=/ebook",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dSAFER",
        "-sOutputFile=output.pdf",
        "input.pdf"
      ]);
    } catch {
      // Emscripten raises an ExitStatus even on a clean exit; ignore it.
    }

    const output = mod.FS.readFile("output.pdf");
    expect(hasPdfMagic(output)).toBe(true);
    expect(output.byteLength).toBeGreaterThan(0);
    expect(output.byteLength).toBeLessThan(input.byteLength);
  }, 60_000);
});
