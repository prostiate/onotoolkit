import type { ToolDefinition, ToolGroup, ToolGroupId } from "~/types/tools";

export const toolGroups: readonly ToolGroup[] = [
  {
    id: "pdf",
    title: "PDF",
    description: "Compress, combine, and reshape PDF files."
  },
  {
    id: "developer",
    title: "Developer",
    description: "Everyday utilities for building and debugging."
  },
  {
    id: "text",
    title: "Text & Markdown",
    description: "Write, preview, and transform text."
  }
] as const;

export const tools: readonly ToolDefinition[] = [
  {
    slug: "compress-pdf",
    title: "Compress PDF",
    description: "Reduce PDF file size with adjustable quality. Powered by Ghostscript.",
    icon: "i-lucide-archive",
    group: "pdf",
    status: "available",
    engine: "ghostscript",
    route: "/tools/compress"
  },
  {
    slug: "merge-pdf",
    title: "Merge PDF",
    description: "Combine several PDFs into a single document.",
    icon: "i-lucide-combine",
    group: "pdf",
    status: "coming-soon",
    engine: "pdf-lib",
    route: null
  },
  {
    slug: "split-pdf",
    title: "Split PDF",
    description: "Break one PDF into separate pages or ranges.",
    icon: "i-lucide-scissors",
    group: "pdf",
    status: "coming-soon",
    engine: "pdf-lib",
    route: null
  },
  {
    slug: "rotate-pdf",
    title: "Rotate PDF",
    description: "Turn pages to the correct orientation.",
    icon: "i-lucide-rotate-cw",
    group: "pdf",
    status: "coming-soon",
    engine: "pdf-lib",
    route: null
  },
  {
    slug: "jwt-debugger",
    title: "JWT Debugger",
    description: "Decode, verify, and generate JSON Web Tokens (RFC 7519) - all algorithms.",
    icon: "i-lucide-key-round",
    group: "developer",
    status: "available",
    engine: "browser",
    route: "/tools/jwt"
  },
  {
    slug: "json-formatter",
    title: "JSON Formatter",
    description: "Pretty-print, minify, and validate JSON.",
    icon: "i-lucide-braces",
    group: "developer",
    status: "coming-soon",
    engine: "browser",
    route: null
  },
  {
    slug: "markdown-preview",
    title: "Markdown Preview",
    description: "Write Markdown and see it rendered live.",
    icon: "i-lucide-file-code-2",
    group: "text",
    status: "coming-soon",
    engine: "browser",
    route: null
  }
] as const;

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.slug === slug);
}

export function getToolsByGroup(groupId: ToolGroupId): ToolDefinition[] {
  return tools.filter((tool) => tool.group === groupId);
}

export function getAvailableTools(): ToolDefinition[] {
  return tools.filter((tool) => tool.status === "available");
}
