import type { EncodeSettings } from "~/utils/imageConvert";
import { defineImageJobStore } from "~/stores/imageJob";

export interface ConverterSettings extends EncodeSettings {
  /**
   * When true, every image is re-encoded at its own source quality
   * (estimated from JPEG quant tables, 95 for lossless sources) instead of
   * the fixed `quality` value.
   */
  useSourceQuality: boolean;
}

export const useImageConverterStore = defineImageJobStore<ConverterSettings>("imageConverter", {
  defaultSettings: (): ConverterSettings => ({
    format: "png",
    quality: 80,
    bgColor: "#ffffff",
    useSourceQuality: false
  }),
  suffix: "-converted",
  process: async (file, settings) => {
    const { convertFile, estimateSourceQuality } = useImageConvert();
    if (settings.useSourceQuality) {
      const quality = await estimateSourceQuality(file);
      return convertFile(file, { ...settings, quality });
    }
    return convertFile(file, settings);
  }
});
