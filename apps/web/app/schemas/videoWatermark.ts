import { z } from "zod";

export const VIDEO_MAX_BYTES = 100_000_000;
export const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";
export const videoFileSchema = z
  .custom<File>((value) => value instanceof File, "Choose a video file.")
  .refine((file) => /\.(mp4|webm|mov)$/i.test(file.name), "Choose an MP4, WebM or MOV video.")
  .refine((file) => file.size > 0, "This video is empty.")
  .refine((file) => file.size <= VIDEO_MAX_BYTES, "Choose a short clip up to 100 MB.");

export const videoWatermarkSettingsSchema = z.object({
  bitrateMbps: z.number().int().min(4).max(40).default(12),
  allowLowConfidence: z.boolean().default(false)
});
export type VideoWatermarkSettings = z.infer<typeof videoWatermarkSettingsSchema>;
export function parseVideoWatermarkSettings(stored: string | null): VideoWatermarkSettings {
  try {
    const result = videoWatermarkSettingsSchema.safeParse(JSON.parse(stored ?? "{}"));
    if (result.success) return result.data;
  } catch {
    /* Storage can contain old or invalid data. */
  }
  return videoWatermarkSettingsSchema.parse({});
}
