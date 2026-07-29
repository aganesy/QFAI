/**
 * QFAI-PLAN-002 (`plan.howOnly.status`) — which `10_Plan.md` headings are
 * blocking errors.
 *
 * The rule moved from bare-word matching to operational-shape matching, which
 * changes the blocking set in both directions: domain headings that merely
 * contain "status" / "done" / 「状態」 must now pass, and progress tracking must
 * still fail — including when it carries a value (`## Current Status: Complete`)
 * or hides behind markdown decoration (`## TODO ##`, `## **TODO**`).
 *
 * Exercised through the public `validateLayerCoverage` so the heading extractor,
 * the normalizer and the patterns are covered as one unit.
 */
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateLayerCoverage } from "../../src/core/validators/layerCoverage.js";

/** Runs the validator over a v1421 spec whose `10_Plan.md` has these headings. */
async function planFindings(headings: string[]): Promise<string[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-plan-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 User Stories\n", "utf-8");
    await writeFile(path.join(specDir, "05_Examples.md"), "# 05 Examples\n", "utf-8");
    await writeFile(
      path.join(specDir, "10_Plan.md"),
      ["# 10 Plan", "", ...headings.flatMap((heading) => [heading, "", "body", ""])].join("\n"),
      "utf-8",
    );

    const issues = await validateLayerCoverage(root, defaultConfig);
    return issues
      .filter((entry) => entry.code === "QFAI-PLAN-002")
      .flatMap((entry) => entry.refs ?? []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("QFAI-PLAN-002 blocking set", () => {
  it("rejects a heading that is a progress label", async () => {
    await expect(
      planFindings([
        "## Progress",
        "## TODO",
        "## Work In Progress",
        "## Remaining Tasks",
        "## Current Status",
        "## 進捗",
        "## 残作業",
        "## ステータス",
      ]),
    ).resolves.toEqual([
      "Progress",
      "TODO",
      "Work In Progress",
      "Remaining Tasks",
      "Current Status",
      "進捗",
      "残作業",
      "ステータス",
    ]);
  });

  it("rejects an operational field promoted to a heading, value and all", async () => {
    await expect(
      planFindings([
        "## Status: In Review",
        "## Done: 12/20",
        "## Current Status: Complete",
        "## Implementation Status: Complete",
        "## Status Tracking: weekly",
        "## 進捗: 50%",
        "## 対応状況: 完了",
      ]),
    ).resolves.toEqual([
      "Status: In Review",
      "Done: 12/20",
      "Current Status: Complete",
      "Implementation Status: Complete",
      "Status Tracking: weekly",
      "進捗: 50%",
      "対応状況: 完了",
    ]);
  });

  it("rejects a progress label wearing markdown decoration", async () => {
    await expect(
      planFindings([
        "## TODO ##",
        "## **TODO**",
        "## __Progress__",
        "## `WIP`",
        "## **Current Status**: Complete",
      ]),
    ).resolves.toEqual([
      "TODO ##",
      "**TODO**",
      "__Progress__",
      "`WIP`",
      "**Current Status**: Complete",
    ]);
  });

  it("allows domain headings that merely contain one of the words", async () => {
    await expect(
      planFindings([
        "## HTTP Status Mapping",
        "## Status Code Handling",
        "## Response Status Construction",
        "## Definition of Done",
        "## Progressive Enhancement Strategy",
        "## 状態遷移",
        "## 状態機械",
        "## エラー状態の扱い",
      ]),
    ).resolves.toEqual([]);
  });

  it("leaves the bare `Status` and `Done` headings alone", async () => {
    // Only the `field: value` shape makes these operational; as whole headings
    // they are ordinary domain vocabulary.
    await expect(planFindings(["## Status", "## Done"])).resolves.toEqual([]);
  });
});
