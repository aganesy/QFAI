/**
 * E2E acceptance for spec-0012 CHG-006 user story US-0012-0141
 * (`QFAI-CRIT-009` taskFidelity keyword surfacing: error text names
 * every required keyword, evidence-requirements.md enumerates them,
 * and `iterate --capture` emits a keyword-placeholder template).
 *
 * Converted from `.skip` test-first skeleton to deterministic helper
 * exercises of the SSOT keyword list + the shipped reference doc.
 */
// QFAI:SPEC-0012:US-0012-0141

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { buildTaskFidelityTemplate } from "../../src/core/prototyping/captureTemplate.js";
import { validateRenderCritique } from "../../src/core/validators/renderCritique.js";
import {
  TASK_FIDELITY_REQUIRED_KEYWORDS,
  TASK_FIDELITY_SECTION_NAME,
} from "../../src/core/validators/taskFidelityKeywords.js";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSET_REF_PATH = path.resolve(
  TEST_DIR,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-prototyping",
  "references",
  "evidence-requirements.md",
);

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const d = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-spec0012-taskfidelity-"));
  tempDirs.push(d);
  return d;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop();
    if (d) await rm(d, { recursive: true, force: true });
  }
});

describe("US-0012-0141 — QFAI-CRIT-009 error text names every required taskFidelity keyword", () => {
  it("the SSOT keyword list contains the canonical required keywords", () => {
    expect(TASK_FIDELITY_REQUIRED_KEYWORDS).toContain("cta_visibility");
    expect(TASK_FIDELITY_REQUIRED_KEYWORDS).toContain("four_state_check");
    expect(TASK_FIDELITY_SECTION_NAME).toBe("## taskFidelity");
  });

  it("validateRenderCritique fires QFAI-CRIT-009 naming every required keyword when taskFidelity evidence is absent", async () => {
    const root = await newTempDir();
    // Seed an evidence file matching the validator's glob
    // ({prototyping*,critique-*}.md) under .qfai/evidence/ — the
    // body intentionally lacks any `## taskFidelity` section so the
    // QFAI-CRIT-009 absent-keywords branch engages.
    const evidenceDir = path.join(root, ".qfai/evidence");
    await mkdir(evidenceDir, { recursive: true });
    await writeFile(
      path.join(evidenceDir, "prototyping-iter-00.md"),
      [
        "# Iter 00",
        "",
        "## Desktop",
        "verdict: PASS",
        "",
        "## Mobile",
        "verdict: PASS",
        "",
        "## Rubric",
        "Standard four-axis rubric applied.",
        "",
      ].join("\n"),
      "utf-8",
    );
    const issues = await validateRenderCritique(root, defaultConfig);
    const crit009 = issues.filter((i) => i.code === "QFAI-CRIT-009");
    expect(crit009.length).toBeGreaterThan(0);
    const messageBlob = crit009.map((i) => i.message).join(" ");
    for (const kw of TASK_FIDELITY_REQUIRED_KEYWORDS) {
      expect(messageBlob).toContain(kw);
    }
    expect(messageBlob).toContain(TASK_FIDELITY_SECTION_NAME);
  });
});

describe("US-0012-0141 — references/evidence-requirements.md enumerates the keywords", () => {
  it("the shipped reference doc lists every required keyword by name", async () => {
    const body = await readFile(ASSET_REF_PATH, "utf-8");
    for (const kw of TASK_FIDELITY_REQUIRED_KEYWORDS) {
      expect(body).toContain(kw);
    }
  });
});

describe("US-0012-0141 — iterate --capture emits a taskFidelity template skeleton with each keyword", () => {
  it("the buildTaskFidelityTemplate text contains every required keyword as a TODO placeholder", () => {
    const text = buildTaskFidelityTemplate();
    expect(text).toContain(TASK_FIDELITY_SECTION_NAME);
    for (const kw of TASK_FIDELITY_REQUIRED_KEYWORDS) {
      expect(text).toMatch(new RegExp(`- ${kw}: TODO`));
    }
  });
});
