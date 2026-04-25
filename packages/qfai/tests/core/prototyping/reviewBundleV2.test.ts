import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { CanonicalScreenContract } from "../../../src/core/contracts/screenContracts.js";
import {
  buildRoundReviewBundle,
  derivePreviousCandidateReviewRef,
  writeRoundReviewBundle,
} from "../../../src/core/prototyping/reviewBundle.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-rb-v2-"));
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
      name: "Home",
      screenId: "home",
      route: "/",
      primaryTasks: ["Open primary CTA"],
      sourceRef: ".qfai/contracts/ui/ui-0001-home.yaml#home",
    },
    {
      name: "Orders",
      screenId: "orders",
      route: "/orders",
      primaryTasks: ["Filter orders"],
      sourceRef: ".qfai/contracts/ui/ui-0001-home.yaml#orders",
    },
  ];
}

describe("spec-0017 round review bundle", () => {
  it("populates candidate-specific evaluator inputs", () => {
    const bundle = buildRoundReviewBundle({
      targetUrl: "http://localhost:3000",
      round: "r3",
      mode: "standard",
      candidateIds: ["c1", "c3", "c5"],
      screens: makeScreens(),
    });

    expect(bundle.spec).toBe("0017");
    expect(bundle.commandPlanRef).toBe(".qfai/evidence/prototyping/rounds/r3/command-plans.json");
    expect(bundle.candidates[0]?.conceptRef).toBe(
      ".qfai/evidence/prototyping/rounds/r3/candidates/c1/concept.json",
    );
    expect(bundle.candidates[0]?.previousEvaluatorReviewRef).toBe(
      ".qfai/evidence/prototyping/rounds/r5/evaluator-reviews/c1.json",
    );
    expect(bundle.candidates[0]?.screens[0]?.expectedEvidence.screenshotPath).toBe(
      ".qfai/evidence/prototyping/rounds/r3/candidates/c1/home.png",
    );
  });

  it("derives previous round review refs and persists round-scoped artifacts", async () => {
    expect(derivePreviousCandidateReviewRef("r5", "c1")).toBeNull();
    expect(derivePreviousCandidateReviewRef("r2", "c1")).toBe(
      ".qfai/evidence/prototyping/rounds/r3/evaluator-reviews/c1.json",
    );

    const root = await newTempDir();
    const result = await writeRoundReviewBundle({
      root,
      targetUrl: "http://localhost:3000",
      round: "r5",
      mode: "standard",
      candidateIds: ["c1", "c2", "c3", "c4", "c5"],
      screens: makeScreens(),
    });

    expect(result.reviewBundlePath).toBe(
      path.join(root, ".qfai", "evidence", "prototyping", "rounds", "r5", "review-bundle.json"),
    );
    expect(result.commandPlanPath).toBe(
      path.join(root, ".qfai", "evidence", "prototyping", "rounds", "r5", "command-plans.json"),
    );

    const bundleJson = await readFile(result.reviewBundlePath, "utf-8");
    const planJson = await readFile(result.commandPlanPath, "utf-8");

    const bundle = JSON.parse(bundleJson);
    const plans = JSON.parse(planJson);

    expect(bundle.candidates).toHaveLength(5);
    expect(plans[0]?.candidateId).toBe("c1");
  });
});
