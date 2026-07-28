declare module "@jspawn/ghostscript-wasm/gs.js" {
  interface EmscriptenFileSystem {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
  }

  export interface GhostscriptModule {
    FS: EmscriptenFileSystem;
    callMain(args: string[]): number;
  }

  type WasmInstantiateSuccess = (
    instance: WebAssembly.Instance,
    module?: WebAssembly.Module
  ) => void;

  export interface GhostscriptModuleOptions {
    locateFile?: (path: string, scriptDirectory: string) => string;
    wasmBinary?: ArrayBuffer | Uint8Array;
    instantiateWasm?: (
      imports: WebAssembly.Imports,
      success: WasmInstantiateSuccess
    ) => Record<string, never>;
    noInitialRun?: boolean;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
  }

  export default function initGhostscript(
    options?: GhostscriptModuleOptions
  ): Promise<GhostscriptModule>;
}

declare module "@jspawn/ghostscript-wasm/gs.wasm?url" {
  const url: string;
  export default url;
}
