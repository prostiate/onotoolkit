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
  },
  {
    id: "image",
    title: "Image",
    description: "Edit images in your browser - nothing is uploaded."
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
    description: "Combine several PDFs into one, then optionally compress the result.",
    icon: "i-lucide-combine",
    group: "pdf",
    status: "available",
    engine: "mixed",
    route: "/tools/merge"
  },
  {
    slug: "split-pdf",
    title: "Split PDF",
    description: "Extract pages into one PDF, or split into several as a ZIP.",
    icon: "i-lucide-scissors",
    group: "pdf",
    status: "available",
    engine: "pdf-lib",
    route: "/tools/split"
  },
  {
    slug: "rotate-pdf",
    title: "Rotate PDF",
    description: "Turn individual pages or the whole document, then download.",
    icon: "i-lucide-rotate-cw",
    group: "pdf",
    status: "available",
    engine: "pdf-lib",
    route: "/tools/rotate"
  },
  {
    slug: "edit-pdf",
    title: "Edit PDF",
    description: "Add rich text, images, shapes, drawings, and signatures onto any PDF page.",
    icon: "i-lucide-pen-tool",
    group: "pdf",
    status: "available",
    engine: "mixed",
    route: "/tools/edit-pdf"
  },
  {
    slug: "jpg-to-pdf",
    title: "JPG to PDF",
    description: "Combine JPG, PNG, or WebP images into a single PDF.",
    icon: "i-lucide-image",
    group: "pdf",
    status: "available",
    engine: "pdf-lib",
    route: "/tools/jpg-to-pdf"
  },
  {
    slug: "pdf-to-jpg",
    title: "PDF to JPG",
    description: "Turn PDF pages into JPG images - one file or a ZIP.",
    icon: "i-lucide-file-image",
    group: "pdf",
    status: "available",
    engine: "browser",
    route: "/tools/pdf-to-jpg"
  },
  {
    slug: "html-to-pdf",
    title: "HTML to PDF",
    description: "Paste or upload HTML and save it as a PDF.",
    icon: "i-lucide-code-2",
    group: "pdf",
    status: "available",
    engine: "browser",
    route: "/tools/html-to-pdf"
  },
  {
    slug: "word-to-pdf",
    title: "Word to PDF",
    description: "Convert a Word document (DOCX) to PDF.",
    icon: "i-lucide-file-type",
    group: "pdf",
    status: "available",
    engine: "browser",
    route: "/tools/word-to-pdf"
  },
  {
    slug: "pdf-to-markdown",
    title: "PDF to Markdown",
    description: "Extract a PDF into editable Markdown, then export (best-effort).",
    icon: "i-lucide-file-text",
    group: "pdf",
    status: "available",
    engine: "browser",
    route: "/tools/pdf-to-markdown"
  },
  {
    slug: "pdf-to-word",
    title: "PDF to Word",
    description: "Convert a PDF into an editable Word (DOCX) document (best-effort).",
    icon: "i-lucide-file-output",
    group: "pdf",
    status: "available",
    engine: "browser",
    route: "/tools/pdf-to-word"
  },
  {
    slug: "background-remover",
    title: "Background Remover",
    description: "Erase or recolor an image background in your browser - keeps full quality.",
    icon: "i-lucide-scissors-line-dashed",
    group: "image",
    status: "available",
    engine: "onnx",
    route: "/tools/background-remover"
  },
  {
    slug: "watermark-remover",
    title: "Watermark Remover",
    description: "Brush over a watermark and inpaint it away - only the marked pixels change.",
    icon: "i-lucide-eraser",
    group: "image",
    status: "available",
    engine: "onnx",
    route: "/tools/watermark-remover"
  },
  {
    slug: "compress-image",
    title: "Compress Images",
    description: "Shrink JPG, PNG, or WebP with MozJPEG/oxipng - keep transparency or flatten it.",
    icon: "i-lucide-image-minus",
    group: "image",
    status: "available",
    engine: "browser",
    route: "/tools/compress-image"
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
    description: "Pretty-print, minify, validate, and convert JSON to YAML/CSV/XML.",
    icon: "i-lucide-braces",
    group: "developer",
    status: "available",
    engine: "browser",
    route: "/tools/json"
  },
  {
    slug: "markdown-preview",
    title: "Markdown Studio",
    description: "Edit Markdown in a live editor and export to PDF or Word (DOCX).",
    icon: "i-lucide-file-code-2",
    group: "text",
    status: "available",
    engine: "browser",
    route: "/tools/markdown"
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
