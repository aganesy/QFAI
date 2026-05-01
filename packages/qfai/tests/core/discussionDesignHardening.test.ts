import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateDiscussionDesignHardening } from "../../src/core/validators/discussionDesignHardening.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-discussion-hardening-"));
  tempDirs.push(dir);
  return dir;
}

async function seedLatestPack(root: string, files: Record<string, string>): Promise<string> {
  const packRoot = path.join(root, ".qfai", "discussion", "discussion-20260423000000000");
  await mkdir(packRoot, { recursive: true });
  await writeFile(
    path.join(packRoot, "01_Context.md"),
    "# Context\n\n- surface: web\n\n```html\n<div>ui</div>\n```",
    "utf-8",
  );
  await writeFile(
    path.join(packRoot, "03_Story-Workshop.md"),
    "# Story Workshop\n\n```html\n<div>ui</div>\n```",
    "utf-8",
  );
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(packRoot, name);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf-8");
  }
  return packRoot;
}

function validUiuxFiles(): Record<string, string> {
  return {
    "uiux/30_exploration_brief.md": [
      "## Product Intent",
      "Clarify the main decision path.",
      "",
      "## Must-preserve Interactions",
      "- Search remains visible",
      "",
      "## Brand Signals",
      "- Calm confidence",
      "",
      "## Differentiation Targets",
      "- Reject default admin-shell layouts",
    ].join("\n"),
    "uiux/31_reference_pool.md": [
      "# Reference Pool",
      "",
      "| Ref | Kind | Source URL | Why it matters | Adopted points | Rejected points | Local translation | Copy risk | Template usage policy |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
      "| REF-001 | competitor | https://example.com | Category benchmark | editorial rhythm | stock dashboard hero | domain-first comparison | medium | reference-only |",
    ].join("\n"),
    "uiux/32_design_anti_goals.md":
      "# Design Anti-goals\n\n- Do not use generic SaaS cards everywhere\n",
    // v2.0 (spec-0017 P14): rubric / calibration sidecars are no longer
    // produced or validated.
    "uiux/40_screen_contracts.md":
      "### Screen: Dashboard\n- screen_id: dashboard\n- route: /dashboard\n- purpose: Main view\n- actor: user\n- primary_tasks:\n  - Review main status\n- secondary_tasks:\n  - Filter list\n- required_states:\n  - default\n  - loading\n  - empty\n  - error\n- transitions:\n  - open detail\n- observable_outcomes:\n  - status visible\n- notes_for_verify: check state transitions\n- notes_for_reviewer: keep rhythm bold\n",
    "uiux/50_review_input_bundle.md":
      "# Review Input Bundle\n\n## Best-of-history\nLater iterations are not automatically preferred.\n",
  };
}

describe("validateDiscussionDesignHardening", () => {
  it("必須 exploration sidecar が揃っていれば issue を返さない", async () => {
    const root = await newRoot();
    await seedLatestPack(root, validUiuxFiles());

    const issues = await validateDiscussionDesignHardening(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("必須 sidecar が欠けると missing error を返す", async () => {
    const root = await newRoot();
    const files = validUiuxFiles();
    delete files["uiux/31_reference_pool.md"];
    await seedLatestPack(root, files);

    const issues = await validateDiscussionDesignHardening(root, defaultConfig);

    expect(issues.some((i) => i.code === "UIX-VAL-EXPLORE-SIDECAR-MISSING")).toBe(true);
    expect(issues.some((i) => i.file === "uiux/31_reference_pool.md")).toBe(true);
  });

  it("brief の必須 heading が欠けると UIX-VAL-EXPLORE-BRIEF を返す", async () => {
    // v2.0 (spec-0017 P14): rubric/calibration section validators were removed
    // alongside the 33/34 sidecars; only the brief check remains.
    const root = await newRoot();
    const files = validUiuxFiles();
    files["uiux/30_exploration_brief.md"] = "## Product Intent\nOnly one section.";
    await seedLatestPack(root, files);

    const issues = await validateDiscussionDesignHardening(root, defaultConfig);

    expect(issues.some((i) => i.code === "UIX-VAL-EXPLORE-BRIEF")).toBe(true);
  });

  it("anti-goals が箇条書きでないと issue を返す (v2.0: best-of-history 検査は spec-0017 P14 で削除)", async () => {
    const root = await newRoot();
    const files = validUiuxFiles();
    files["uiux/32_design_anti_goals.md"] = "# Design Anti-goals\n\nAvoid blandness";
    await seedLatestPack(root, files);

    const issues = await validateDiscussionDesignHardening(root, defaultConfig);

    expect(issues.some((i) => i.code === "UIX-VAL-EXPLORE-ANTI-GOALS")).toBe(true);
  });

  it("reference pool の必須列や placeholder が欠けると error を返す", async () => {
    const root = await newRoot();
    const files = validUiuxFiles();
    files["uiux/31_reference_pool.md"] =
      "# Reference Pool\n\n| Ref | Kind | Source URL |\n| --- | --- | --- |\n| REF-001 | competitor | [why] |\n";
    await seedLatestPack(root, files);

    const issues = await validateDiscussionDesignHardening(root, defaultConfig);

    expect(issues.some((i) => i.code === "UIX-VAL-REFERENCE-POOL")).toBe(true);
  });
});
