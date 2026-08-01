import { mkdirSync, writeFileSync } from "node:fs";
import markdownDocx, { Packer } from "markdown-docx";
import { makeImageHeavyPdf, makeTextPdf } from "../../apps/web/tests/support/makeSamplePdf";
import { FIXTURE_DIR, SAMPLE_DOCX_PATH, SAMPLE_PDF_PATH, SAMPLE_TEXT_PDF_PATH } from "./fixture";

/** Generates the sample PDF/DOCX fixtures used by the e2e tests. */
export default async function globalSetup(): Promise<void> {
  mkdirSync(FIXTURE_DIR, { recursive: true });

  const pdf = await makeImageHeavyPdf(1000, 2);
  writeFileSync(SAMPLE_PDF_PATH, pdf);

  const textPdf = await makeTextPdf();
  writeFileSync(SAMPLE_TEXT_PDF_PATH, textPdf);

  const doc = await markdownDocx("# Sample document\n\nHello **world** from a Word file.");
  const docx = await Packer.toBuffer(doc);
  writeFileSync(SAMPLE_DOCX_PATH, docx);
}
