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
    const slugs = tools.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("references only known groups", () => {
    const groupIds = new Set(toolGroups.map((group) => group.id));
    for (const tool of tools) {
      expect(groupIds.has(tool.group)).toBe(true);
    }
  });

  it("exposes Compress PDF as the only available tool with a route", () => {
    const available = getAvailableTools();
    expect(available).toHaveLength(1);
    expect(available[0]?.slug).toBe("compress-pdf");
    expect(available[0]?.route).toBe("/tools/compress");
  });

  it("marks every coming-soon tool with a null route", () => {
    for (const tool of tools) {
      if (tool.status === "coming-soon") {
        expect(tool.route).toBeNull();
      }
    }
  });

  it("finds a tool by slug and returns undefined otherwise", () => {
    expect(getToolBySlug("compress-pdf")?.title).toBe("Compress PDF");
    expect(getToolBySlug("does-not-exist")).toBeUndefined();
  });

  it("groups tools so every tool is reachable from a group", () => {
    const grouped = toolGroups.flatMap((group) => getToolsByGroup(group.id));
    expect(grouped).toHaveLength(tools.length);
  });
});
