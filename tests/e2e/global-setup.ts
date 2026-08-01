import { mkdirSync, writeFileSync } from "node:fs";
import markdownDocx, { Packer } from "markdown-docx";
import { makeImageHeavyPdf } from "../../apps/web/tests/support/makeSamplePdf";
import { FIXTURE_DIR, SAMPLE_DOCX_PATH, SAMPLE_PDF_PATH } from "./fixture";

/** Generates the sample PDF and DOCX fixtures used by the e2e tests. */
export default async function globalSetup(): Promise<void> {
  mkdirSync(FIXTURE_DIR, { recursive: true });

  const pdf = await makeImageHeavyPdf(1000, 2);
  writeFileSync(SAMPLE_PDF_PATH, pdf);

  const doc = await markdownDocx("# Sample document\n\nHello **world** from a Word file.");
  const docx = await Packer.toBuffer(doc);
  writeFileSync(SAMPLE_DOCX_PATH, docx);
}
