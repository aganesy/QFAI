/**
 * `iterate --cycle 0` removes the legacy `fullHarness` block from
 * `prototyping.json` as part of its hard reset.
 *
 * The case seeds a project on disk, runs the command's entry function and
 * reads the file it rewrote. The reset's other outcomes have their own cases
 * in the command's unit suite.
 */

// QFAI:SPEC-0014:TC-0014-0034

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";

const DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "audience:",
  '  emotion: ["confident comparison"]',
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
  "Restrained, calm, sober.",
  "",
].join("\n");

const CONFIG_YAML = [
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
  "  require:",
  "    specSections: []",
  "  testStrategy:",
  "    requireApiAtdd: false",
  "    requireE2eAtdd: false",
  "    requireIntegrationAtdd: false",
  "    requireUnitTdd: false",
  "    requireSpecTagBlock: false",
  "    requireRoutingProfile: false",
].join("\n");

const PROTOTYPING_JSON_REL = ".qfai/evidence/prototyping/prototyping.json";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/** A UI-bearing project whose `prototyping.json` carries a prior run's `fullHarness` block. */
async function seedProjectWithLegacyFullHarness(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-iterate-fullharness-"));
  tempDirs.push(root);
  await writeFile(path.join(root, "DESIGN.md"), DESIGN_MD, "utf-8");
  await writeFile(path.join(root, "qfai.config.yaml"), CONFIG_YAML, "utf-8");
  const specDir = path.join(root, ".qfai/specs/spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "# 01 Spec — test\n\n- Spec: spec-0001\n- Parent: CAP-0001\nsurface_type: ui-bearing\n",
    "utf-8",
  );
  await mkdir(path.dirname(path.join(root, PROTOTYPING_JSON_REL)), { recursive: true });
  await writeFile(
    path.join(root, PROTOTYPING_JSON_REL),
    JSON.stringify({
      iterations: [{ index: 0 }],
      fullHarness: {
        runId: "legacy-prior-run",
        status: "complete",
        scoringTrace: [{ axis: "ux", score: 5 }],
      },
    }),
    "utf-8",
  );
  return root;
}

async function readPrototypingJson(root: string): Promise<Record<string, unknown>> {
  const text = await readFile(path.join(root, PROTOTYPING_JSON_REL), "utf-8");
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${PROTOTYPING_JSON_REL} is not a JSON object`);
  }
  return Object.fromEntries(Object.entries(parsed));
}

describe("TC-0014-0034: iterate cycle 0 drops the legacy fullHarness block", () => {
  it("cycle 0 deletes fullHarness", async () => {
    const root = await seedProjectWithLegacyFullHarness();

    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);

    const body = await readPrototypingJson(root);
    expect("fullHarness" in body).toBe(false);
  });
});
