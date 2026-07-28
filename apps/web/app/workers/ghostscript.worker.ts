import initGhostscript from "@jspawn/ghostscript-wasm/gs.js";
import gsWasmUrl from "@jspawn/ghostscript-wasm/gs.wasm?url";
import type { GhostscriptModule } from "@jspawn/ghostscript-wasm/gs.js";
import type { CompressWorkerRequest, CompressWorkerResponse } from "~/types/worker";
import type { CompressPreset } from "~/types/tools";

const INPUT_PATH = "input.pdf";
const OUTPUT_PATH = "output.pdf";

function post(message: CompressWorkerResponse, transfer?: Transferable[]): void {
  if (transfer && transfer.length > 0) {
    self.postMessage(message, transfer);
  } else {
    self.postMessage(message);
  }
}

function buildArgs(preset: CompressPreset): string[] {
  return [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    `-dPDFSETTINGS=/${preset}`,
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    "-dSAFER",
    `-sOutputFile=${OUTPUT_PATH}`,
    INPUT_PATH
  ];
}

async function loadModule(): Promise<GhostscriptModule> {
  return initGhostscript({
    locateFile: (path) => (path.endsWith(".wasm") ? gsWasmUrl : path),
    noInitialRun: true,
    print: () => {},
    printErr: () => {}
  });
}

async function compress(request: CompressWorkerRequest): Promise<void> {
  const { id, fileName, bytes, preset } = request;
  const input = new Uint8Array(bytes);
  const originalSize = input.byteLength;

  post({ type: "progress", id, stage: "loading-engine" });
  const mod = await loadModule();

  post({ type: "progress", id, stage: "compressing" });
  mod.FS.writeFile(INPUT_PATH, input);

  try {
    mod.callMain(buildArgs(preset));
  } catch (error) {
    // Emscripten throws an ExitStatus even on success; only surface real failures
    // where no output was produced.
    void error;
  }

  post({ type: "progress", id, stage: "finalizing" });
  let output: Uint8Array;
  try {
    output = mod.FS.readFile(OUTPUT_PATH);
  } catch {
    post({
      type: "error",
      id,
      message: "Ghostscript could not process this PDF. It may be corrupted or password-protected."
    });
    return;
  }

  if (output.byteLength === 0) {
    post({ type: "error", id, message: "Compression produced an empty file." });
    return;
  }

  // Copy into a standalone ArrayBuffer so it can be transferred.
  const result = new Uint8Array(output.byteLength);
  result.set(output);

  post(
    {
      type: "result",
      id,
      fileName,
      originalSize,
      compressedSize: result.byteLength,
      bytes: result.buffer
    },
    [result.buffer]
  );
}

self.addEventListener("message", (event: MessageEvent<CompressWorkerRequest>) => {
  const request = event.data;
  if (request.type !== "compress") return;

  compress(request).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unexpected compression error.";
    post({ type: "error", id: request.id, message });
  });
});
