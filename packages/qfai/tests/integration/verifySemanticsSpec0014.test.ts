/**
 * verify semantics audit tests — spec-0014 migration / compatibility alignment
 *
 * QFAI:SPEC-0014:TC-0014-0009
 * QFAI:SPEC-0014:TC-0014-0018
 * QFAI:SPEC-0014:TC-0014-0019
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runCanonicalUixValidators } from "../../src/core/validators/uix/canonical.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-verify-semantics-"));
  tempDirs.push(dir);
  return dir;
}

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

const repoRoot = path.resolve(process.cwd(), "..", "..");

// QFAI:SPEC-0014:TC-0014-0009
describe("TC-0014-0009: stale sidecar migration guidance", () => {
  it("legacy strategy-style filename is rejected with exploration-first migration guidance", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "10_strategy.md"),
      [
        "# Strategy",
        "",
        "- surface: web",
        "- selection_required: true",
        "- decision: component-library",
        "- candidate_options:",
        "  - component-library",
        "- chosen_option: component-library",
        "- rationale:",
        "  - Keep the canonical path.",
        "- verification_expectations:",
        "  - Verify on the anchor screen.",
        "- notes_for_reviewer:",
        "  - Confirm canonical naming.",
      ].join("\n"),
      "utf-8",
    );

    const issues = await runCanonicalUixValidators(root, defaultConfig);
    const legacyIssue = issues.find((issue) => issue.code === "UIX-VAL-3LAYER-FORBIDDEN-FILE");

    expect(legacyIssue).toBeDefined();
    expect(legacyIssue?.severity).toBe("error");
    expect(legacyIssue?.suggested_action).toContain("exploration-first");
  });
});

// QFAI:SPEC-0014:TC-0014-0018
describe("TC-0014-0018: canonical UIX in verify path", () => {
  it("validate.ts imports and invokes runCanonicalUixValidators", async () => {
    const validateSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );

    expect(validateSrc).toContain("runCanonicalUixValidators");
    expect(validateSrc).toContain('from "./validators/index.js"');
    expect(validateSrc).not.toMatch(/runLegacyUixCompatibilityValidators|runAllUixValidators/);
  });

  it("runCanonicalUixValidators does not resolve discussion packs implicitly from repo root", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai", "discussion", "discussion-20260101000000000", "uiux"), {
      recursive: true,
    });
    await writeFile(
      path.join(root, ".qfai", "discussion", "discussion-20260101000000000", "01_Spec.md"),
      "# Spec\n\n- surface: web\n",
      "utf-8",
    );
    await writeFile(
      path.join(
        root,
        ".qfai",
        "discussion",
        "discussion-20260101000000000",
        "uiux",
        "12_design_system.md",
      ),
      "## Visual Theme\n\nReal content\n\n## Color Palette\n\nReal content\n\n## Do's and Don'ts\n\nReal content\n",
      "utf-8",
    );

    const issues = await runCanonicalUixValidators(root, defaultConfig);
    expect(issues).toEqual([]);
  });
});

// QFAI:SPEC-0014:TC-0014-0019
describe("TC-0014-0019: removed compatibility surface", () => {
  it("package surface exposes no legacy namespace or compatibility category", async () => {
    const [validatorsIndexSrc, typesSrc] = await Promise.all([
      readFile(
        path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "index.ts"),
        "utf-8",
      ),
      readFile(path.join(repoRoot, "packages", "qfai", "src", "core", "types.ts"), "utf-8"),
    ]);

    expect(validatorsIndexSrc).not.toContain("validators/legacy");
    expect(validatorsIndexSrc).not.toContain("runLegacyUixCompatibilityValidators");
    expect(typesSrc).toMatch(/type\s+IssueCategory\s*=\s*"canonical"\s*\|\s*"change"/);
    expect(typesSrc).not.toContain('"compatibility"');
  });
});

// QFAI:SPEC-0014:TC-0014-0009
describe("TC-0014-0009: stale sidecar migration errors", () => {
  it("legacy evaluation content is rejected with exploration-first migration guidance", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "33_exploration_rubric.md"),
      [
        "# Exploration Rubric",
        "",
        "## craft",
        "",
        "- task_completion: legacy axis",
        "",
        "## consistency",
        "",
        "- design_system: legacy axis",
        "",
        "## accessibility",
        "",
        "- wcag: legacy axis",
        "",
        "## delight",
        "",
        "- satisfaction: legacy axis",
      ].join("\n"),
      "utf-8",
    );

    const issues = await runCanonicalUixValidators(root, defaultConfig);
    const legacyIssue = issues.find((issue) => issue.code === "UIX-VAL-3LAYER-LEGACY-FORMAT");

    expect(legacyIssue).toBeDefined();
    expect(legacyIssue?.severity).toBe("error");
    expect(legacyIssue?.suggested_action).toContain("exploration-first");
  });
});
