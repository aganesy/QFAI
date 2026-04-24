/**
 * Unit tests for review bundle / command plan writer (spec-0017 REQ-0006, REQ-0007).
 *
 * QFAI:SPEC-0017:TC-0017-0008 — review bundle required fields
 * QFAI:SPEC-0017:TC-0017-0009 — review bundle references command plan file
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { CanonicalScreenContract } from "../../../src/core/contracts/screenContracts.js";
import {
  buildReviewBundle,
  deriveDefaultPreviousScoreRef,
  writeReviewBundles,
} from "../../../src/core/prototyping/reviewBundle.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-rb-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function makeScreens(): CanonicalScreenContract[] {
  return [
    {
      name: "Order List",
      screenId: "order-list",
      route: "/orders",
      primaryTasks: ["Search orders", "Open detail"],
      sourceRef: ".qfai/contracts/ui/ui-0001-order.yaml#order-list",
    },
    {
      name: "Order Create",
      screenId: "order-create",
      route: "/orders/new",
      primaryTasks: ["Submit a new order"],
      sourceRef: ".qfai/contracts/ui/ui-0001-order.yaml#order-create",
    },
  ];
}

describe("spec-0017 buildReviewBundle", () => {
  // TC-0017-0008 — review bundle required fields
  it("populates all 5 evaluator-facing fields (REQ-0006, BR-0017-0015)", () => {
    const bundle = buildReviewBundle({
      targetUrl: "http://localhost:5173",
      cycle: 1,
      mode: "standard",
      screens: makeScreens(),
    });

    expect(bundle.screens.length).toBeGreaterThan(0);
    expect(bundle.axisDefsRef).toBe(".qfai/contracts/design/evaluation-rubric.yaml");
    expect(bundle.designSystemChecklistRef).toBe(
      ".qfai/contracts/design/design-system.yaml",
    );
    expect(bundle.previousScoreRef).toBeNull();
    expect(bundle.commandPlanRef).toBe(
      ".qfai/evidence/prototyping/iterations/1/playwright-commands.json",
    );
  });

  it("assigns expected evidence paths per screen under the cycle iteration dir", () => {
    const bundle = buildReviewBundle({
      targetUrl: "http://localhost:5173",
      cycle: 2,
      mode: "standard",
      screens: makeScreens(),
    });

    const orderList = bundle.screens.find((screen) => screen.screenId === "order-list");
    expect(orderList?.expectedEvidence).toEqual({
      screenshotPath: ".qfai/evidence/prototyping/iterations/2/order-list.png",
      htmlPath: ".qfai/evidence/prototyping/iterations/2/order-list.html",
      snapshotPath: ".qfai/evidence/prototyping/iterations/2/order-list.snapshot.txt",
      commandLogPath: ".qfai/evidence/prototyping/iterations/2/order-list.commands.json",
    });
  });

  it("sets maxCycles from the mode (REQ-0001)", () => {
    const low = buildReviewBundle({
      targetUrl: "http://localhost:5173",
      cycle: 1,
      mode: "low-cost",
      screens: makeScreens(),
    });
    const standard = buildReviewBundle({
      targetUrl: "http://localhost:5173",
      cycle: 1,
      mode: "standard",
      screens: makeScreens(),
    });
    const full = buildReviewBundle({
      targetUrl: "http://localhost:5173",
      cycle: 1,
      mode: "full-harness",
      screens: makeScreens(),
    });

    expect(low.maxCycles).toBe(1);
    expect(standard.maxCycles).toBe(3);
    expect(full.maxCycles).toBe(20);
  });

  it("derives previousScoreRef=null for cycle 1 and prior-cycle ref otherwise", () => {
    expect(deriveDefaultPreviousScoreRef(1)).toBeNull();
    expect(deriveDefaultPreviousScoreRef(2)).toBe(
      ".qfai/evidence/prototyping/iterations/1/evaluator-review.json",
    );
    expect(deriveDefaultPreviousScoreRef(5)).toBe(
      ".qfai/evidence/prototyping/iterations/4/evaluator-review.json",
    );
  });

  it("assigns evaluatorReviewOutputPath at the canonical cycle path", () => {
    const bundle = buildReviewBundle({
      targetUrl: "http://localhost:5173",
      cycle: 4,
      mode: "full-harness",
      screens: makeScreens(),
    });
    expect(bundle.evaluatorReviewOutputPath).toBe(
      ".qfai/evidence/prototyping/iterations/4/evaluator-review.json",
    );
  });

  it("rejects non-positive cycle numbers", () => {
    expect(() =>
      buildReviewBundle({
        targetUrl: "http://localhost:5173",
        cycle: 0,
        mode: "standard",
        screens: makeScreens(),
      }),
    ).toThrow(/cycle must be a positive integer/);
  });
});

describe("spec-0017 writeReviewBundles", () => {
  // TC-0017-0009 — review bundle references command plan file
  it("persists review-bundle.json and playwright-commands.json at canonical paths", async () => {
    const root = await newTempDir();
    const result = await writeReviewBundles({
      root,
      targetUrl: "http://localhost:5173",
      cycle: 1,
      mode: "standard",
      screens: makeScreens(),
    });

    const expectedReviewBundlePath = path.join(
      root,
      ".qfai/evidence/prototyping/iterations/1/review-bundle.json",
    );
    const expectedCommandPlanPath = path.join(
      root,
      ".qfai/evidence/prototyping/iterations/1/playwright-commands.json",
    );
    expect(result.reviewBundlePath).toBe(expectedReviewBundlePath);
    expect(result.commandPlanPath).toBe(expectedCommandPlanPath);

    const [bundleJson, planJson] = await Promise.all([
      readFile(expectedReviewBundlePath, "utf-8"),
      readFile(expectedCommandPlanPath, "utf-8"),
    ]);

    const bundle = JSON.parse(bundleJson);
    const plans = JSON.parse(planJson);
    expect(bundle.commandPlanRef).toBe(
      ".qfai/evidence/prototyping/iterations/1/playwright-commands.json",
    );
    expect(Array.isArray(plans)).toBe(true);
    expect(plans).toHaveLength(2);
    expect(plans[0].screenId).toBe("order-list");
    expect(plans[1].screenId).toBe("order-create");
  });

  it("creates iteration directory even when it doesn't exist yet", async () => {
    const root = await newTempDir();
    await writeReviewBundles({
      root,
      targetUrl: "http://localhost:5173",
      cycle: 7,
      mode: "full-harness",
      screens: makeScreens(),
    });

    const bundleJson = await readFile(
      path.join(root, ".qfai/evidence/prototyping/iterations/7/review-bundle.json"),
      "utf-8",
    );
    const bundle = JSON.parse(bundleJson);
    expect(bundle.cycle).toBe(7);
    expect(bundle.mode).toBe("full-harness");
    expect(bundle.maxCycles).toBe(20);
  });
});
