import type { WatermarkPosition } from "./index";
export interface RuntimeProfile {
  id: string;
  modelUrl: string;
  inputShape: number[];
  outputShape: number[];
  padding: number;
}
export function resolveAllenkFdncnnRuntimeProfile(position?: WatermarkPosition): RuntimeProfile;
