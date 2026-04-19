import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildDiscussionAxisInputs,
  buildScreenContractInputs,
  buildTrendAlignmentInputs,
} from "../../src/core/prototyping/l2Evidence.js";

describe("l2Evidence", () => {
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "qfai-l2-"));
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260410000000000");
    const uiuxDir = path.join(packDir, "uiux");
    await mkdir(uiuxDir, { recursive: true });
    for (const file of [
      "01_Context.md",
      "02_Inception-Deck.md",
      "03_Story-Workshop.md",
      "05_Scope.md",
      "06_REQ.md",
      "07_NFR.md",
      "08_Glossary.md",
      "09_Constraints.md",
      "10_Policy.md",
      "11_OQ-Register.md",
      "12_OQ-Resolution-Log.md",
      "13_Deferred.md",
      "14_Review-Request.md",
      "99_delta.md",
      "prototyping.yaml",
    ]) {
      await writeFile(
        path.join(packDir, file),
        "placeholder content with enough text to pass pack discovery\n".repeat(3),
        "utf-8",
      );
    }
    await writeFile(
      path.join(uiuxDir, "20_design_eval_invariant.md"),
      "### Axis: [INV-01]\n- intent: keep focus\n",
      "utf-8",
    );
    await writeFile(
      path.join(uiuxDir, "21_design_eval_trend_derived.md"),
      "### Axis: [TRD-01]\n- intent: align trend\n",
      "utf-8",
    );
    await writeFile(
      path.join(uiuxDir, "22_design_eval_product_specific.md"),
      "### Axis: [PRD-01]\n- intent: fit product\n",
      "utf-8",
    );
    await writeFile(
      path.join(uiuxDir, "23_design_eval_aggregate.md"),
      "- aggregate_score: 0.82\n",
      "utf-8",
    );
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      [
        "# Trend Scan",
        "- Source A",
        "# Competitive Reference Registry",
        "- Competitor A",
        "- translation: localized insight",
        "- local_implication: use dashboard density",
        "- decision_connection: support selected anchor",
        "- evaluation_connection: validate hierarchy",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(uiuxDir, "40_screen_contracts.md"),
      [
        "# Screen Contracts",
        "",
        "### Screen: Dashboard",
        "- screen_id: dashboard",
        "- route: /dashboard",
      ].join("\n"),
      "utf-8",
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("uses structured canonical artifacts without degraded scoring", async () => {
    const discussion = await buildDiscussionAxisInputs(root);
    const trend = await buildTrendAlignmentInputs(root);

    expect(discussion.invariantAxes).toBeGreaterThan(0);
    expect(discussion.degradedScoring).toBe(false);
    expect(trend.trendSourcesChecked).toBe(1);
    expect(trend.degradedScoring).toBe(false);
    expect(trend.evidenceRefs.some((ref) => ref.includes("40_screen_contracts.md#"))).toBe(true);
  });

  it("uses canonical screen contract sourceRef instead of route-slug anchors", async () => {
    await writeFile(
      path.join(
        root,
        ".qfai",
        "discussion",
        "discussion-20260410000000000",
        "uiux",
        "40_screen_contracts.md",
      ),
      [
        "# Screen Contracts",
        "",
        "### Screen: Dashboard",
        "- screen_id: home-dashboard",
        "- route: /dashboard",
      ].join("\n"),
      "utf-8",
    );

    const screenContracts = await buildScreenContractInputs(root, [
      {
        screenId: "home-dashboard",
        route: "/dashboard",
        uiContractId: "CON-UI-0001",
        observed: { elementsPlaced: 1, actionsWired: 1 },
        expected: { elements: 1, actions: 1 },
      },
    ]);

    expect(screenContracts.evidenceRefs).toEqual([
      ".qfai/discussion/discussion-20260410000000000/uiux/40_screen_contracts.md#home-dashboard",
    ]);
  });
});
