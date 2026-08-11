import type { ConvertFormat } from "~/utils/imageConvert";
import { detectSourceFormat } from "~/utils/imageConvert";
import type { ResizeSettings } from "~/utils/imageResize";
import { defineImageJobStore } from "~/stores/imageJob";

/** Resizer output format; "original" keeps each file's source codec. */
export type ResizeOutputFormat = ConvertFormat | "original";

/** Full resizer settings: geometry + encoding. */
export type ResizerSettings = ResizeSettings & {
  format: ResizeOutputFormat;
  quality: number;
  bgColor: string;
};

/** Resolves "original" to a concrete codec (unknown types fall back to PNG). */
function resolveFormat(file: File, choice: ResizeOutputFormat): ConvertFormat {
  if (choice !== "original") return choice;
  const detected = detectSourceFormat(file.type, file.name);
  return detected === "other" ? "png" : detected;
}

export const useImageResizerStore = defineImageJobStore<ResizerSettings>("imageResizer", {
  defaultSettings: (): ResizerSettings => ({
    mode: "percentage",
    percentage: 50,
    width: null,
    height: null,
    fit: "contain",
    targetKb: 200,
    format: "original",
    quality: 80,
    bgColor: "#ffffff"
  }),
  suffix: "-resized",
  process: async (file, settings) => {
    const { resizeFile } = useImageConvert();
    return resizeFile(file, {
      ...settings,
      format: resolveFormat(file, settings.format)
    });
  }
});
