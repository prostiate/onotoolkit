import { z } from "zod";
import { MAX_PDF_BYTES, hasPdfExtension, hasPdfMimeType } from "~/utils/pdf";

/** Validates a single selected/dropped file is an acceptable PDF. Shared by the
 * PDF tools that take one document (split, rotate). */
export const pdfFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, { message: "The file is empty." })
  .refine((file) => file.size <= MAX_PDF_BYTES, {
    message: "This file is too large to process safely in the browser."
  })
  .refine((file) => hasPdfExtension(file.name) || hasPdfMimeType(file.type), {
    message: "Please choose a PDF file."
  });
