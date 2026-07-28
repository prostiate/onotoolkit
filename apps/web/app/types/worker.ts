import type { CompressPreset } from "~/types/tools";

/** Message sent from the main thread to the Ghostscript worker. */
export interface CompressWorkerRequest {
  type: "compress";
  id: number;
  fileName: string;
  bytes: ArrayBuffer;
  preset: CompressPreset;
}

export type WorkerStage = "loading-engine" | "compressing" | "finalizing";

/** Messages sent from the worker back to the main thread. */
export type CompressWorkerResponse =
  | { type: "progress"; id: number; stage: WorkerStage }
  | {
      type: "result";
      id: number;
      fileName: string;
      originalSize: number;
      compressedSize: number;
      bytes: ArrayBuffer;
    }
  | { type: "error"; id: number; message: string };
