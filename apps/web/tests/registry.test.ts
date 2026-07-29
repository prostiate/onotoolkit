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

  it("exposes Compress PDF, JWT Debugger, and JSON Formatter as available", () => {
    const slugs = getAvailableTools().map((t) => t.slug);
    expect(slugs).toContain("compress-pdf");
    expect(slugs).toContain("jwt-debugger");
    expect(slugs).toContain("json-formatter");
  });

  it("finds a tool by slug", () => {
    expect(getToolBySlug("compress-pdf")?.route).toBe("/tools/compress");
    expect(getToolBySlug("jwt-debugger")?.route).toBe("/tools/jwt");
    expect(getToolBySlug("json-formatter")?.route).toBe("/tools/json");
    expect(getToolBySlug("missing")).toBeUndefined();
  });

  it("reaches every tool through its group", () => {
    const grouped = toolGroups.flatMap((g) => getToolsByGroup(g.id));
    expect(grouped).toHaveLength(tools.length);
  });
});
