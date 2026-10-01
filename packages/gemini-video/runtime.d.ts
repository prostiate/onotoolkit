export interface RgbaFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
export interface DenoiseRuntime {
  id: string;
  inputShape: number[];
  executionProvider: string;
  denoiseImageData(options: {
    imageData: RgbaFrame;
    sigma?: number;
  }): Promise<{ imageData: RgbaFrame }>;
  session: { release(): Promise<void> };
}
export function createAllenkFdncnnOnnxRuntime(options: {
  modelBytes: Uint8Array;
  executionProvider: "wasm";
  wasmPaths: { mjs: string; wasm: string };
  inputName: string;
  outputName: string;
  inputShape: number[];
  outputShape: number[];
  numThreads: number;
}): Promise<DenoiseRuntime>;
