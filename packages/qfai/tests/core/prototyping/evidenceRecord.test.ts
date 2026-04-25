/**
 * Unit tests for prototyping.json cycle-centric schema (spec-0017 REQ-0005).
 *
 * QFAI:SPEC-0017:TC-0017-0010 — PrototypingCycleEvidence round-trip
 * QFAI:SPEC-0017:TC-0017-0011 — canonical latest mirroring (deferred to writer)
 */

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  PROTOTYPING_MAX_CYCLES,
  type PrototypingMode,
} from "../../../src/core/review/prototyping.js";
import {
  buildCycleEvidence,
  buildPrototypingEvidenceRecord,
  writePrototypingEvidenceRecord,
} from "../../../src/core/prototyping/evidenceRecord.js";
import type {
  PrototypingCycleEvidence,
  PrototypingEvidenceRecord,
} from "../../../src/core/prototyping/types.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-evrec-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function makeCycle(cycle: number): PrototypingCycleEvidence {
  return buildCycleEvidence({
    cycle,
    kind: cycle === 1 ? "explore" : "polish",
    screens: [{ screenId: "order-list" }, { screenId: "order-create" }],
    reviewerScores: [
      {
        reviewerId: "product-surface-reviewer",
        scores: [
          {
            axisId: "design-quality",
            score: 100,
            rationale: "Matches design system tokens exactly.",
            evidenceRefs: [`.qfai/evidence/prototyping/iterations/${cycle}/order-list.png`],
          },
        ],
      },
    ],
    allReviewerAxesPerfect100: true,
  });
}

describe("spec-0017 buildCycleEvidence", () => {
  // TC-0017-0010 — PrototypingCycleEvidence round-trip
  it("populates canonical per-cycle paths (REQ-0005)", () => {
    const cycle = buildCycleEvidence({
      cycle: 2,
      kind: "polish",
      screens: [{ screenId: "order-list" }],
    });

    expect(cycle.commandPlanRef).toBe(
      ".qfai/evidence/prototyping/iterations/2/playwright-commands.json",
    );
    expect(cycle.reviewBundleRef).toBe(
      ".qfai/evidence/prototyping/iterations/2/review-bundle.json",
    );
    expect(cycle.evaluatorReviewRef).toBe(
      ".qfai/evidence/prototyping/iterations/2/evaluator-review.json",
    );
    expect(cycle.screenEvidence[0]).toEqual({
      screenId: "order-list",
      screenshotRef: ".qfai/evidence/prototyping/iterations/2/order-list.png",
      htmlRef: ".qfai/evidence/prototyping/iterations/2/order-list.html",
      snapshotRef: ".qfai/evidence/prototyping/iterations/2/order-list.snapshot.txt",
      commandLogRef: ".qfai/evidence/prototyping/iterations/2/order-list.commands.json",
    });
  });

  it("defaults reviewerScores=[] and allReviewerAxesPerfect100=false", () => {
    const cycle = buildCycleEvidence({
      cycle: 1,
      kind: "explore",
      screens: [{ screenId: "s1" }],
    });
    expect(cycle.reviewerScores).toEqual([]);
    expect(cycle.allReviewerAxesPerfect100).toBe(false);
  });

  it("rejects non-positive cycle numbers", () => {
    expect(() =>
      buildCycleEvidence({
        cycle: 0,
        kind: "explore",
        screens: [{ screenId: "s1" }],
      }),
    ).toThrow(/cycle must be a positive integer/);
  });
});

describe("spec-0017 buildPrototypingEvidenceRecord", () => {
  it("sets maxCycles from mode (REQ-0001) and browserTool=playwright-cli (REQ-0002)", () => {
    for (const mode of ["low-cost", "standard", "full-harness"] as PrototypingMode[]) {
      const record = buildPrototypingEvidenceRecord({
        surface: "web",
        mode,
        modeSource: "test",
        modeRationale: "test",
        iterations: [makeCycle(1)],
        bestOfHistory: { cycle: 1, evidenceRef: "ref" },
        breakthrough: { checked: true, evidenceRef: "bt" },
        reviewerGate: { result: "PASS", evidenceRef: "rg" },
      });

      expect(record.maxCycles).toBe(PROTOTYPING_MAX_CYCLES[mode]);
      expect(record.browserTool).toBe("playwright-cli");
      expect(record.mode.effective).toBe(mode);
    }
  });

  it("captures bestOfHistory, breakthrough, and reviewerGate refs", () => {
    const record = buildPrototypingEvidenceRecord({
      surface: "web",
      mode: "standard",
      modeSource: "config",
      modeRationale: "default",
      iterations: [makeCycle(1), makeCycle(2)],
      bestOfHistory: {
        cycle: 2,
        evidenceRef: ".qfai/evidence/prototyping/iterations/2/evaluator-review.json",
      },
      breakthrough: {
        checked: true,
        evidenceRef: ".qfai/evidence/breakthrough.json",
      },
      reviewerGate: {
        result: "PASS",
        evidenceRef: ".qfai/evidence/prototyping/iterations/2/evaluator-review.json",
      },
      completionClaimed: true,
    });

    expect(record.bestOfHistory.cycle).toBe(2);
    expect(record.breakthrough.checked).toBe(true);
    expect(record.reviewerGate.result).toBe("PASS");
    expect(record.completionClaimed).toBe(true);
    expect(record.iterations).toHaveLength(2);
  });
});

describe("spec-0017 writePrototypingEvidenceRecord", () => {
  it("persists prototyping.json at .qfai/evidence/prototyping.json", async () => {
    const root = await newTempDir();
    const { path: recordPath, record } = await writePrototypingEvidenceRecord({
      root,
      surface: "web",
      mode: "standard",
      modeSource: "test",
      modeRationale: "test",
      iterations: [makeCycle(1)],
      bestOfHistory: { cycle: 1, evidenceRef: "ref" },
      breakthrough: { checked: true, evidenceRef: "bt" },
      reviewerGate: { result: "PASS", evidenceRef: "rg" },
    });

    expect(recordPath).toBe(path.join(root, ".qfai", "evidence", "prototyping.json"));

    const raw = await readFile(recordPath, "utf-8");
    const parsed = JSON.parse(raw) as PrototypingEvidenceRecord;
    expect(parsed.browserTool).toBe("playwright-cli");
    expect(parsed.mode.effective).toBe("standard");
    expect(parsed.maxCycles).toBe(3);
    expect(parsed.iterations).toHaveLength(record.iterations.length);
  });
});
