import { z } from "zod";

/** Max image size accepted (device-RAM bound). */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/x-ms-bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/avif"
];
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|bmp|ico|avif)$/i;

/** Validates a single selected/dropped file is an acceptable image. */
export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, { message: "The file is empty." })
  .refine((file) => file.size <= MAX_IMAGE_BYTES, {
    message: "This image is too large to process safely in the browser."
  })
  .refine((file) => IMAGE_MIME_TYPES.includes(file.type) || IMAGE_EXTENSION.test(file.name), {
    message: "Please choose an image file (JPG, PNG, WebP, GIF, BMP, ICO, or AVIF)."
  });
