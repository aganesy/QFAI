import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  designDirectionProblems,
  validateDesignDirectionProposal,
} from "../../src/core/validators/designDirectionProposal.js";

const PACK = "discussion-20260918010203040";

function context(primary: string, secondary: string[] = []): string {
  return [
    "# 01 Context",
    "",
    "## UI-bearing Classification",
    "",
    `- ui_bearing: ${primary === "non-ui" ? "false" : "true"}`,
    `- primary_surface: ${primary}`,
    "- secondary_surfaces:",
    ...secondary.map((surface) => `  - ${surface}`),
    "- classification_rationale: test",
    "",
    "## Design Direction",
    "",
    "- adopted_theme: Radix Themes",
    "- brand_accent: a warmer primary, and `visual.colors.highlight` for promotions",
    "- conventions_kept: everything else",
    "- chosen_by: user",
    "",
  ].join("\n");
}

async function withPack(files: Record<string, string>, task: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-design-direction-"));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const file = path.join(root, ".qfai", "discussion", PACK, rel);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf-8");
    }
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("designDirectionProblems", () => {
  it("reads a key path in a code span against the schema", () => {
    expect(designDirectionProblems("Use `visual.colors.primary` for links.")).toEqual([]);
    expect(designDirectionProblems("Add `visual.colors.highlight`.")).toEqual([
      expect.stringContaining("`highlight` is not a key of `visual.colors`"),
    ]);
    expect(designDirectionProblems("Add `visual.gradients: soft`.")).toEqual([
      expect.stringContaining("`gradients` is not a key of `visual`"),
    ]);
    expect(designDirectionProblems("Set `accessibility.focus_ring`.")).toEqual([
      expect.stringContaining("`focus_ring` is not a key of `accessibility`"),
    ]);
    expect(designDirectionProblems("Split `visual.colors.primary.dark`.")).toEqual([
      "`visual.colors.primary` takes a value, not keys.",
    ]);
  });

  it("admits a scale key with digits", () => {
    expect(designDirectionProblems("Headings use `visual.typography.scale.3xl`.")).toEqual([]);
    expect(designDirectionProblems("Add `visual.typography.scale.4xl`.")).toEqual([
      expect.stringContaining("`4xl` is not a key of `visual.typography.scale`"),
    ]);
  });

  it("reads an archetype value against the enum", () => {
    expect(designDirectionProblems("- archetype: minimal")).toEqual([]);
    expect(designDirectionProblems("- archetype: futuristic")).toEqual([
      expect.stringContaining("`futuristic` is not an archetype"),
    ]);
    expect(designDirectionProblems("Keep `brand.archetype: tech`.")).toEqual([]);
    expect(designDirectionProblems("Try `brand.archetype: retro`.")).toEqual([
      expect.stringContaining("`retro` is not an archetype"),
    ]);
    // A template's own placeholder proposes nothing.
    expect(designDirectionProblems("- archetype: [one of the eight]")).toEqual([]);
  });

  it("reads a fenced YAML block under each DESIGN.md section", () => {
    const block = [
      "```yaml",
      "brand:",
      "  archetype: futuristic",
      "visual:",
      "  colors:",
      "    primary: '#123456'",
      "    highlight: '#ffcc00'",
      "  motion: calm",
      "screens: [home]",
      "```",
    ].join("\n");
    expect(designDirectionProblems(block)).toEqual([
      expect.stringContaining("`futuristic` is not an archetype"),
      expect.stringContaining("`highlight` is not a key of `visual.colors`"),
      expect.stringContaining("`motion` is not a key of `visual`"),
    ]);
  });

  it("leaves prose, other code spans and other YAML alone", () => {
    const text = [
      "The notes live in visual.md and brand.voice.txt.",
      "Run `npm run visual.test` and read `primary_surface`.",
      "```yaml",
      "screens:",
      "  visual: [home]",
      "```",
      "```text",
      "`visual.colors.highlight`",
      "```",
    ].join("\n");
    expect(designDirectionProblems(text)).toEqual([]);
  });
});

describe("validateDesignDirectionProposal", () => {
  it("reports each proposal the schema rejects, on a visual surface", async () => {
    await withPack(
      {
        "01_Context.md": context("web"),
        "uiux/30_screen_notes.md": "- archetype: futuristic\n",
      },
      async (root) => {
        const issues = await validateDesignDirectionProposal(root, defaultConfig);
        expect(
          issues.map((entry) => [entry.code, entry.severity, path.basename(entry.file ?? "")]),
        ).toEqual([
          ["QFAI-DPACK-011", "warning", "01_Context.md"],
          ["QFAI-DPACK-011", "warning", "30_screen_notes.md"],
        ]);
        expect(issues[0]?.message).toContain("`highlight` is not a key of `visual.colors`");
      },
    );
  });

  it("reads a pack whose visual surface is a secondary one", async () => {
    await withPack({ "01_Context.md": context("cli", ["web"]) }, async (root) => {
      expect(await validateDesignDirectionProposal(root, defaultConfig)).toHaveLength(1);
    });
  });

  it("stays silent on a cli-only or non-ui pack, which gets no DESIGN.md", async () => {
    for (const primary of ["cli", "non-ui"]) {
      await withPack({ "01_Context.md": context(primary) }, async (root) => {
        expect(await validateDesignDirectionProposal(root, defaultConfig)).toEqual([]);
      });
    }
  });

  it("stays silent with no discussion pack", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-design-direction-"));
    try {
      expect(await validateDesignDirectionProposal(root, defaultConfig)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
