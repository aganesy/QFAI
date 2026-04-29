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

async function newWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ddh-int-"));
  tempDirs.push(root);
  return root;
}

async function seedDiscussionPack(root: string, uiux: Record<string, string>): Promise<void> {
  const packRoot = path.join(root, ".qfai", "discussion", "discussion-20260423000000000");
  await mkdir(path.join(packRoot, "uiux"), { recursive: true });
  await writeFile(
    path.join(packRoot, "01_Context.md"),
    "# Context\n\n- surface: web\n\n```html\n<div>ui</div>\n```",
    "utf-8",
  );
  await writeFile(
    path.join(packRoot, "03_Story-Workshop.md"),
    "# Story\n\n```html\n<div>ui</div>\n```",
    "utf-8",
  );
  for (const [rel, content] of Object.entries(uiux)) {
    await writeFile(path.join(packRoot, rel), content, "utf-8");
  }
}

function validUiux(): Record<string, string> {
  return {
    "uiux/30_exploration_brief.md":
      "## Product Intent\nx\n\n## Must-preserve Interactions\n- x\n\n## Brand Signals\n- x\n\n## Differentiation Targets\n- x\n",
    "uiux/31_reference_pool.md":
      "# Reference Pool\n\n| Ref | Kind | Source URL | Adopted points | Rejected points | Local translation | Copy risk | Template usage policy |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| REF-001 | competitor | https://example.com | x | y | z | medium | reference-only |\n",
    "uiux/32_design_anti_goals.md": "# Design Anti-goals\n\n- x\n",
    "uiux/33_exploration_rubric.md":
      "## Design Quality\nx\n\n## Originality\nx\n\n## Craft\nx\n\n## Functionality\nx\n\n## Brand Memorability\nx\n\n## Category Distinctiveness\nx\n\n## Template Dependency Risk\nx\n\n## Localization Fit\nx\n",
    "uiux/34_evaluator_calibration.md":
      "## Good Critique\nx\n\n## Too Lenient\nx\n\n## Blandness Fail\nx\n\n## Originality Fail\nx\n\n## Template Copy Fail\nx\n",
    "uiux/40_screen_contracts.md":
      "### Screen: Dashboard\n- screen_id: dashboard\n- route: /dashboard\n- purpose: x\n- actor: user\n- primary_tasks:\n  - x\n- secondary_tasks:\n  - y\n- required_states:\n  - default\n  - loading\n  - empty\n  - error\n- transitions:\n  - open detail\n- observable_outcomes:\n  - x\n- notes_for_verify: x\n- notes_for_reviewer: x\n",
    "uiux/50_review_input_bundle.md": "# Review Input Bundle\n\n## Best-of-history\nx\n",
  };
}

describe("discussion hardening integration", () => {
  it("最新 pack に新しい exploration family が揃っていれば pass する", async () => {
    const root = await newWorkspace();
    await seedDiscussionPack(root, validUiux());

    const issues = await validateDiscussionDesignHardening(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("latest pack に欠落や不完全 heading があれば集約して返す", async () => {
    const root = await newWorkspace();
    const files = validUiux();
    delete files["uiux/31_reference_pool.md"];
    files["uiux/34_evaluator_calibration.md"] = "## Good Critique\nx\n";
    await seedDiscussionPack(root, files);

    const issues = await validateDiscussionDesignHardening(root, defaultConfig);

    expect(issues.some((i) => i.code === "UIX-VAL-EXPLORE-SIDECAR-MISSING")).toBe(true);
    expect(issues.some((i) => i.code === "UIX-VAL-EVAL-CALIBRATION")).toBe(true);
  });
});
