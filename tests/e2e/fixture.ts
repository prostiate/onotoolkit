import { fileURLToPath } from "node:url";

export const FIXTURE_DIR = fileURLToPath(new URL("./.fixtures/", import.meta.url));
export const SAMPLE_PDF_PATH = fileURLToPath(new URL("./.fixtures/sample.pdf", import.meta.url));
export const SAMPLE_DOCX_PATH = fileURLToPath(new URL("./.fixtures/sample.docx", import.meta.url));
