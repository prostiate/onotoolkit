import { z } from "zod";
import { MAX_PDF_BYTES, hasPdfExtension, hasPdfMimeType } from "~/utils/pdf";

/** Upper bound on how many files can be combined in one merge. */
export const MAX_MERGE_FILES = 50;

/** Validates a single file dropped into the merge list is an acceptable PDF. */
export const mergeFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, { message: "The file is empty." })
  .refine((file) => file.size <= MAX_PDF_BYTES, {
    message: "This file is too large to process safely in the browser."
  })
  .refine((file) => hasPdfExtension(file.name) || hasPdfMimeType(file.type), {
    message: "Please choose PDF files only."
  });

/** Validates the whole set of files just before merging. */
export const mergeFilesSchema = z
  .array(mergeFileSchema)
  .min(2, { message: "Add at least two PDFs to merge." })
  .max(MAX_MERGE_FILES, { message: `You can merge up to ${MAX_MERGE_FILES} files at once.` })
  .refine((files) => files.reduce((total, file) => total + file.size, 0) <= MAX_PDF_BYTES, {
    message: "The combined size is too large to process safely in the browser."
  });
