import type { EncodeSettings } from "~/utils/imageConvert";
import { defineImageJobStore } from "~/stores/imageJob";

export const useImageConverterStore = defineImageJobStore<EncodeSettings>("imageConverter", {
  defaultSettings: (): EncodeSettings => ({
    format: "png",
    quality: 80,
    bgColor: "#ffffff"
  }),
  suffix: "-converted",
  process: async (file, settings) => {
    const { convertFile } = useImageConvert();
    return convertFile(file, settings);
  }
});
