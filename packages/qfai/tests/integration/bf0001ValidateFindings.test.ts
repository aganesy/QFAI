/**
 * What `qfai validate` reports about a project's discussion packs, assistant
 * tree, skills and root `DESIGN.md`, read from the findings of the profile that
 * owns each check.
 */

import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { loadConfig } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-findings-"));
  roots.push(root);
  return root;
}

async function initializedRoot(): Promise<string> {
  const root = await newRoot();
  await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function findings(
  root: string,
  profile: "sdd" | "discussion" | "full",
  prefix: string,
): Promise<Issue[]> {
  const result = await validateProject(root, await loadConfig(root), { profile });
  return result.issues.filter((found) => found.code.startsWith(prefix));
}

async function put(root: string, file: string, content: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf-8");
}

describe("discussion pack presence on the story tree", () => {
  // QFAI:AC-0001-0148-02
  it("asks for no pack where none exists, and still names a misnamed one", async () => {
    const root = await initializedRoot();
    expect(await findings(root, "discussion", "QFAI-DPACK-")).toEqual([]);

    await mkdir(path.join(root, ".qfai", "discussion", "discussion-latest"), { recursive: true });
    const misnamed = await findings(root, "discussion", "QFAI-DPACK-");
    expect(misnamed.map((found) => found.code).sort()).toEqual([
      "QFAI-DPACK-001",
      "QFAI-DPACK-005",
    ]);
    expect(misnamed.find((found) => found.code === "QFAI-DPACK-005")?.refs).toEqual([
      "discussion-latest",
    ]);
  });
});

describe("assistant tree findings", () => {
  const LAYERS = ["rule", "skill", "step", "agent", "prompt"];

  async function assistantTree(...directories: string[]): Promise<string> {
    const root = await newRoot();
    for (const name of [...LAYERS, ...directories]) {
      await mkdir(path.join(root, ".qfai", "assistant", name), { recursive: true });
    }
    return root;
  }

  // QFAI:AC-0001-0043-01
  it("names a directory outside the layers and lists the layers, leaving skill.local alone", async () => {
    const root = await assistantTree("skill.local", "notes", "extras");
    const reported = await findings(root, "sdd", "QFAI-ASSISTANT-001");

    expect(reported.map((found) => `${found.severity} ${found.file}`).sort()).toEqual([
      "warning .qfai/assistant/extras/",
      "warning .qfai/assistant/notes/",
    ]);
    for (const found of reported) {
      expect(found.message).toContain("(rule, skill, step, agent, prompt)");
    }
  });

  // QFAI:AC-0001-0045-02
  it("warns for a project_memory block that is not trailing and for no other", async () => {
    const root = await assistantTree();
    const skill = (name: string) => `.qfai/assistant/skill/${name}/SKILL.md`;
    await put(
      root,
      skill("qfai-demo"),
      "# Demo\n\nproject_memory:\n  scope: demo\n\n## Steps\n\nRun the demo.\n",
    );
    await put(
      root,
      skill("qfai-trailing"),
      "# Trailing\n\n## Steps\n\nRun it.\n\nproject_memory:\n  scope: demo\n  notes:\n    - keep it short\n",
    );
    await put(root, skill("qfai-silent"), "# Silent\n\n## Steps\n\nRun it.\n");

    const reported = await findings(root, "sdd", "QFAI-SKILLDOC-001");
    expect(reported.map((found) => [found.file, found.severity])).toEqual([
      [skill("qfai-demo"), "warning"],
    ]);
    expect(reported[0]?.message).toContain("qfai-demo/SKILL.md");
    expect(reported[0]?.message).toContain("project_memory:");
  });
});

const VALID_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand Philosophy",
  "",
].join("\n");

describe("root DESIGN.md findings", () => {
  async function uiBearingRoot(): Promise<string> {
    const root = await newRoot();
    await put(
      root,
      ".qfai/spec/03_contract/ui/ui-0001-home.yaml",
      "# QFAI-CONTRACT-ID: UI-0001\nscreens:\n  - id: home\n    title: Home\n    route: /\n",
    );
    return root;
  }

  async function designFindings(
    root: string,
  ): Promise<Array<[string, string, string | undefined]>> {
    return (await findings(root, "sdd", "QFAI-DCON-")).map((found) => [
      found.code,
      found.severity,
      found.file,
    ]);
  }

  // QFAI:AC-0001-0042-03
  it("raises neither design finding for a present, parseable DESIGN.md", async () => {
    const root = await uiBearingRoot();
    await put(root, "DESIGN.md", VALID_DESIGN_MD);

    expect(await designFindings(root)).toEqual([]);
  });

  // QFAI:AC-0001-0042-13
  it("raises QFAI-DCON-030 for a missing DESIGN.md and QFAI-DCON-033 for one that does not parse", async () => {
    const root = await uiBearingRoot();
    expect(await designFindings(root)).toEqual([["QFAI-DCON-030", "error", "DESIGN.md"]]);

    await put(root, "DESIGN.md", "no front matter here\n");
    expect(await designFindings(root)).toEqual([["QFAI-DCON-033", "error", "DESIGN.md"]]);
  });
});

describe("prototyping skill validation", () => {
  const ASSISTANT = path.join(getInitAssetsDir(), ".qfai", "assistant");

  async function rootWithShippedPrototyping(): Promise<string> {
    const root = await newRoot();
    const target = path.join(root, ".qfai", "assistant");
    await cp(
      path.join(ASSISTANT, "skill", "qfai-prototyping"),
      path.join(target, "skill", "qfai-prototyping"),
      { recursive: true },
    );
    for (const step of (await readdir(path.join(ASSISTANT, "step"))).filter((name) =>
      name.startsWith("prototyping-"),
    )) {
      await cp(path.join(ASSISTANT, "step", step), path.join(target, "step", step), {
        recursive: true,
      });
    }
    return root;
  }

  // QFAI:AC-0001-0042-01
  it("accepts the shipped skill and reports a skill that lacks a required section", async () => {
    const root = await rootWithShippedPrototyping();
    expect(await findings(root, "full", "QFAI-PROTOSKILL-")).toEqual([]);

    const stepPath = path.join(root, ".qfai", "assistant", "step", "prototyping-loop", "STEP.md");
    const step = await readFile(stepPath, "utf-8");
    expect(step).toMatch(/^## Required References$/m);
    await writeFile(stepPath, step.replace(/^## Required References$/m, "## References"), "utf-8");

    const drift = await findings(root, "full", "QFAI-PROTOSKILL-");
    expect(drift.map((found) => [found.code, found.severity])).toEqual([
      ["QFAI-PROTOSKILL-009", "error"],
    ]);
    expect(drift[0]?.message).toContain("## Required References");
  });
});
