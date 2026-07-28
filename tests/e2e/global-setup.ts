import { mkdirSync, writeFileSync } from "node:fs";
import { makeImageHeavyPdf } from "../../apps/web/tests/support/makeSamplePdf";
import { FIXTURE_DIR, SAMPLE_PDF_PATH } from "./fixture";

/** Generates the image-heavy sample PDF used by the compress e2e test. */
export default async function globalSetup(): Promise<void> {
  const pdf = await makeImageHeavyPdf(1000, 2);
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(SAMPLE_PDF_PATH, pdf);
}
