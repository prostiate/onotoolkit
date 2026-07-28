export type ToolStatus = "available" | "coming-soon";

export type ToolEngine = "ghostscript" | "pdf-lib" | "mixed" | "browser";

export type ToolGroupId = "pdf" | "developer" | "text";

export interface ToolGroup {
  id: ToolGroupId;
  title: string;
  description: string;
}

export interface ToolDefinition {
  slug: string;
  title: string;
  description: string;
  /** Lucide icon name used by Nuxt UI's <UIcon>. */
  icon: string;
  group: ToolGroupId;
  status: ToolStatus;
  engine: ToolEngine;
  /** Route path; undefined for coming-soon tools without a page yet. */
  route: string | null;
}

/** Ghostscript PDFSETTINGS presets exposed to the user, smallest to largest. */
export type CompressPreset = "screen" | "ebook" | "printer" | "prepress";

export interface CompressPresetOption {
  value: CompressPreset;
  label: string;
  description: string;
  /** Approximate target image resolution, for display only. */
  dpi: number;
}

/** Lifecycle states shared by every tool runner. */
export type ToolRunnerState = "idle" | "preparing" | "running" | "done" | "error";

export interface CompressResult {
  fileName: string;
  originalSize: number;
  compressedSize: number;
  bytes: Uint8Array;
}
