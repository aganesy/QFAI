/**
 * E2E acceptance for spec-0012 CHG-006 user story US-0012-0142
 * (`mutation-log.jsonl`: iterate appends a JSON-Lines entry for
 * every destructive mutation under `iter-NN/*`, including each file
 * moved by `--cycle 0 --force`; unlogged mutation surfaces
 * `R-EVIDENCE-MUTATION-UNLOGGED`).
 *
 * Converted from `.skip` test-first skeleton to a deterministic
 * temp-fixture exercise of the iterate `--force` path + the SSOT
 * pair-scan reviewer-gate detector.
 */
// QFAI:SPEC-0012:US-0012-0142

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../src/cli/commands/prototypingIterate.js";
import { detectEvidenceMutationUnlogged } from "../../src/core/validators/evidenceMutationUnlogged.js";

const MUTATION_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme"',
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
  "# Brand",
].join("\n");

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const d = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-spec0012-mutlog-"));
  tempDirs.push(d);
  return d;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop();
    if (d) await rm(d, { recursive: true, force: true });
  }
});

async function seedProject(root: string): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), MUTATION_DESIGN_MD, "utf-8");
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/out",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "validation:",
      "  failOn: error",
    ].join("\n"),
    "utf-8",
  );
  const specDir = path.join(root, ".qfai/specs/spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "# 01\n\n- Spec: spec-0001\n- Parent: CAP-0001\nsurface_type: ui-bearing\n",
    "utf-8",
  );
}

describe("US-0012-0142 — --cycle 0 --force appends a mutation-log line per moved iter-NN file", () => {
  it("each prior iter-00 file is recorded as a JSON-Lines {ts,caller,path,action,priorSize,newSize} entry", async () => {
    const root = await newTempDir();
    await seedProject(root);
    // Plant a prior iter-00 with two files so the backup-walk emits
    // two JSONL lines.
    const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
    await mkdir(iter00, { recursive: true });
    await writeFile(path.join(iter00, "home.html"), "<a/>", "utf-8");
    await writeFile(path.join(iter00, "settings.html"), "<b/>", "utf-8");
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });
    expect(exit).toBe(0);
    const logRaw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/mutation-log.jsonl"),
      "utf-8",
    );
    const lines = logRaw.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      const entry = JSON.parse(line) as Record<string, unknown>;
      expect(typeof entry.ts).toBe("string");
      expect(entry.caller).toBe("iterate");
      expect(typeof entry.path).toBe("string");
      expect(entry.action).toBe("move");
      expect(typeof entry.priorSize).toBe("number");
      expect(entry.newSize).toBe(0);
    }
  });
});

describe("US-0012-0142 — R-EVIDENCE-MUTATION-UNLOGGED reviewer gate", () => {
  it("the SSOT pair scan emits zero findings against the live repo (all mutation sites are paired)", async () => {
    // Walk from this test file up to the repository root.
    const repoRoot = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      "..",
      "..",
      "..",
      "..",
    );
    const issues = await detectEvidenceMutationUnlogged(repoRoot);
    expect(issues.filter((i) => i.code === "R-EVIDENCE-MUTATION-UNLOGGED")).toEqual([]);
  });
});
