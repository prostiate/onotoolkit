import { z } from "zod";
import type { CompressPreset, CompressPresetOption } from "~/types/tools";
import { MAX_PDF_BYTES, hasPdfExtension, hasPdfMimeType } from "~/utils/pdf";

export const compressPresetSchema = z.enum(["screen", "ebook", "printer", "prepress"]);

export const compressPresetOptions: readonly CompressPresetOption[] = [
  {
    value: "screen",
    label: "Smallest",
    description: "Lowest quality, smallest file. Great for quick sharing.",
    dpi: 72
  },
  {
    value: "ebook",
    label: "Balanced",
    description: "Good quality with strong size savings. Recommended.",
    dpi: 150
  },
  {
    value: "printer",
    label: "High quality",
    description: "Print-ready quality with moderate savings.",
    dpi: 300
  },
  {
    value: "prepress",
    label: "Maximum quality",
    description: "Preserves the most detail. Smallest savings.",
    dpi: 300
  }
] as const;

export const DEFAULT_COMPRESS_PRESET: CompressPreset = "ebook";

/** Validates a dropped/selected file is an acceptable PDF for compression. */
export const compressFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, { message: "The file is empty." })
  .refine((file) => file.size <= MAX_PDF_BYTES, {
    message: "This file is too large to process safely in the browser."
  })
  .refine((file) => hasPdfExtension(file.name) || hasPdfMimeType(file.type), {
    message: "Please choose a PDF file."
  });

export const compressOptionsSchema = z.object({
  preset: compressPresetSchema
});

export type CompressOptions = z.infer<typeof compressOptionsSchema>;
