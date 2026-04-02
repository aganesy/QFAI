/**
 * compatibility: production path no longer routes through the legacy DDP validator.
 *
 * This test stays in the compatibility suite because it documents the migration
 * boundary: canonical sidecar packs must remain valid even when no DDP artifacts exist.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateProject } from "../../src/core/validate.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-ddp-compat-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function seedCanonicalDiscussionPack(root: string): Promise<void> {
  const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216000000000");
  await mkdir(path.join(packDir, "uiux"), { recursive: true });
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
  await writeFile(
    path.join(packDir, "03_Story-Workshop.md"),
    [
      "# 03 Story Workshop",
      "",
      "<div>UI content</div>",
      "",
      "## Behavior Obligations",
      "",
      "### State Coverage",
      "| State / Risk | Discovery Notes | Handoff to Contract |",
      "| ------------ | --------------- | ------------------- |",
      "| loading | Spinner can obscure the main action | Final `required_states` contract lives in `uiux/40_contracts.md` |",
      "| error | Retry messaging must stay visible | Final `required_states` contract lives in `uiux/40_contracts.md` |",
      "",
      "### Interaction Contracts",
      "| Primary Task | Key Action | Priority Hint | Expected Result | Error Handling |",
      "| ------------ | ---------- | ------------- | --------------- | -------------- |",
      "| Start trial | Start trial | primary | Trial flow begins | Retry stays visible during service failures |",
      "",
      "Screen-level CTA hierarchy and required state definitions are finalized in `uiux/40_contracts.md`.",
      "",
      "### Design Anti-goals",
      "- Anti-goal: Avoid cluttered dashboard",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(packDir, "04_Sources.md"),
    [
      "# 04 Sources",
      "",
      "## Trend Scan",
      "",
      "| reference | confidence | freshness_date | source_translation |",
      "| --------- | ---------- | -------------- | ------------------ |",
      "| Ref A | high | 2026-02-01 | Motion pattern translated for current product |",
      "",
      "## Competitive Reference Registry",
      "",
      "### Competitor Alpha",
      "- adopted_points: Clear onboarding flow",
      "- rejected_points: Hidden navigation",
      "- local_translation: Adapted for the current product context",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(packDir, "uiux", "10_strategy.md"),
    [
      "# Strategy",
      "",
      "- surface: web-ui",
      "- selection_required: true",
      "- decision: Choose Option A",
      "- candidate_options: Option A, Option B",
      "- chosen_option: Option A",
      "- rationale: Option A supports the clearest primary action",
      "- verification_expectations: Responsive review and task completion checks",
      "- notes_for_reviewer: Focus on selected direction consistency",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(packDir, "uiux", "30_comparison.md"),
    [
      "# 30 Comparison",
      "",
      "## Option Comparison",
      "",
      "- **Option A**: Focused dashboard",
      "- **Option B**: Dense table-first view",
      "",
      "## Selected Direction",
      "",
      "Selected: Option A - best fit for the primary workflow",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(packDir, "uiux", "40_contracts.md"),
    [
      "# Screen Contracts",
      "",
      "### Screen: Dashboard",
      "",
      "- screen_id: dashboard",
      "- route: /dashboard",
      "- purpose: Review current status",
      "- actor: end-user",
      "- primary_tasks:",
      "  - Start trial",
      "- required_states:",
      "  - default: Standard state",
      "  - loading: Spinner",
      "  - empty: Empty state",
      "  - error: Retry state",
      "- transitions:",
      "  - default -> loading: Refresh triggered",
      "- observable_outcomes:",
      "  - The dashboard summary is visible",
      "- notes_for_verify: Check state coverage",
      "- notes_for_reviewer: Focus on the primary action",
    ].join("\n"),
    "utf-8",
  );
}

describe("compatibility: DDP production-path convergence", () => {
  it("validateProject does not emit QFAI-DDP-* for a canonical sidecar pack without DDP", async () => {
    const root = await newTempDir();
    await seedCanonicalDiscussionPack(root);

    const result = await validateProject(root);

    expect(result.issues.filter((issue) => issue.code.startsWith("QFAI-DDP-"))).toHaveLength(0);
  });
});
