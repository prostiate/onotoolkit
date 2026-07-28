import type { CompressPreset, CompressResult } from "~/types/tools";
import type { CompressWorkerRequest, CompressWorkerResponse, WorkerStage } from "~/types/worker";

interface PendingRequest {
  resolve: (result: CompressResult) => void;
  reject: (error: Error) => void;
  onStage?: (stage: WorkerStage) => void;
}

interface CompressArgs {
  file: File;
  preset: CompressPreset;
  onStage?: (stage: WorkerStage) => void;
}

/**
 * Manages a single Ghostscript Web Worker instance and exposes a typed,
 * promise-based `compress` call. The worker (and its ~16MB WASM) is imported
 * lazily via a dynamic import so it never enters the SSR server bundle, and is
 * reused across runs. All work stays in the browser; nothing is uploaded.
 */
export function useGhostscript() {
  let worker: Worker | null = null;
  let nextId = 0;
  const pending = new Map<number, PendingRequest>();

  function handleMessage(event: MessageEvent<CompressWorkerResponse>): void {
    const message = event.data;
    const request = pending.get(message.id);
    if (!request) return;

    if (message.type === "progress") {
      request.onStage?.(message.stage);
      return;
    }

    if (message.type === "error") {
      pending.delete(message.id);
      request.reject(new Error(message.message));
      return;
    }

    pending.delete(message.id);
    request.resolve({
      fileName: message.fileName,
      originalSize: message.originalSize,
      compressedSize: message.compressedSize,
      bytes: new Uint8Array(message.bytes)
    });
  }

  async function ensureWorker(): Promise<Worker> {
    if (worker) return worker;
    const { default: GhostscriptWorker } = await import("~/workers/ghostscript.worker?worker");
    const instance = new GhostscriptWorker();
    instance.addEventListener("message", handleMessage as EventListener);
    instance.addEventListener("error", (event: ErrorEvent) => {
      for (const [id, request] of pending) {
        pending.delete(id);
        request.reject(new Error(event.message || "Ghostscript worker crashed."));
      }
    });
    worker = instance;
    return instance;
  }

  async function compress({ file, preset, onStage }: CompressArgs): Promise<CompressResult> {
    const instance = await ensureWorker();
    const id = nextId++;
    const buffer = await file.arrayBuffer();

    return new Promise<CompressResult>((resolve, reject) => {
      pending.set(id, { resolve, reject, onStage });
      const request: CompressWorkerRequest = {
        type: "compress",
        id,
        fileName: file.name,
        bytes: buffer,
        preset
      };
      instance.postMessage(request, [buffer]);
    });
  }

  function terminate(): void {
    worker?.terminate();
    worker = null;
    for (const [id, request] of pending) {
      pending.delete(id);
      request.reject(new Error("Compression cancelled."));
    }
  }

  return { compress, terminate };
}
