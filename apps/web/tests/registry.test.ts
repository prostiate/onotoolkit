import { describe, expect, it } from "vitest";
import {
  getAvailableTools,
  getToolBySlug,
  getToolsByGroup,
  toolGroups,
  tools
} from "~/tools/registry";

describe("tool registry", () => {
  it("has unique slugs", () => {
    const slugs = tools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has unique, absolute routes for tools that define them", () => {
    const routes = tools.map((t) => t.route).filter((r): r is string => r !== null);
    expect(new Set(routes).size).toBe(routes.length);
    for (const route of routes) expect(route.startsWith("/")).toBe(true);
  });

  it("references only known groups and has an icon + description", () => {
    const groupIds = new Set(toolGroups.map((g) => g.id));
    for (const tool of tools) {
      expect(groupIds.has(tool.group)).toBe(true);
      expect(tool.icon).toMatch(/^i-lucide-/);
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it("keeps status and route consistent", () => {
    for (const tool of tools) {
      if (tool.status === "coming-soon") expect(tool.route).toBeNull();
      if (tool.status === "available") expect(tool.route).toBeTruthy();
    }
  });

  it("exposes the shipped tools as available", () => {
    const slugs = getAvailableTools().map((t) => t.slug);
    expect(slugs).toContain("compress-pdf");
    expect(slugs).toContain("jwt-debugger");
    expect(slugs).toContain("json-formatter");
    expect(slugs).toContain("markdown-preview");
    expect(slugs).toContain("merge-pdf");
    expect(slugs).toContain("split-pdf");
    expect(slugs).toContain("rotate-pdf");
    expect(slugs).toContain("jpg-to-pdf");
    expect(slugs).toContain("pdf-to-jpg");
    expect(slugs).toContain("html-to-pdf");
    expect(slugs).toContain("word-to-pdf");
    expect(slugs).toContain("pdf-to-markdown");
    expect(slugs).toContain("pdf-to-word");
    expect(slugs).toContain("background-remover");
    expect(slugs).toContain("watermark-remover");
  });

  it("finds a tool by slug", () => {
    expect(getToolBySlug("compress-pdf")?.route).toBe("/tools/compress");
    expect(getToolBySlug("jwt-debugger")?.route).toBe("/tools/jwt");
    expect(getToolBySlug("json-formatter")?.route).toBe("/tools/json");
    expect(getToolBySlug("markdown-preview")?.route).toBe("/tools/markdown");
    expect(getToolBySlug("merge-pdf")?.route).toBe("/tools/merge");
    expect(getToolBySlug("split-pdf")?.route).toBe("/tools/split");
    expect(getToolBySlug("rotate-pdf")?.route).toBe("/tools/rotate");
    expect(getToolBySlug("background-remover")?.route).toBe("/tools/background-remover");
    expect(getToolBySlug("watermark-remover")?.route).toBe("/tools/watermark-remover");
    expect(getToolBySlug("missing")).toBeUndefined();
  });

  it("reaches every tool through its group", () => {
    const grouped = toolGroups.flatMap((g) => getToolsByGroup(g.id));
    expect(grouped).toHaveLength(tools.length);
  });
});
