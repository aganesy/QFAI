import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildCandidates, parseCandidateIds } from "../../../src/core/prototyping/candidate.js";
import {
  buildPrototypingEvidenceRecordV2,
  buildRoundEvidence,
  writePrototypingEvidenceRecordV2,
} from "../../../src/core/prototyping/evidenceRecord.js";
import { buildReimplementationRecord } from "../../../src/core/prototyping/reimplementationBuilder.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-evrec-v2-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("spec-0018 reimplementation builder", () => {
  it("builds reimplementation records", () => {
    const record = buildReimplementationRecord({
      round: "r3",
      absorptionPlanRef: ".qfai/evidence/prototyping/rounds/r3/absorption-plan.json",
      candidateChanges: [
        {
          candidateId: "c1",
          changedScreens: ["home"],
          diffSummary: "Applied pinned CTA and simplified header.",
          codeChangeEvidenceRef: ".qfai/evidence/prototyping/rounds/r3/reimplementation.diff.txt",
        },
      ],
    });

    expect(record.schemaVersion).toBe("2.0");
    expect(record.candidateChanges[0]?.candidateId).toBe("c1");
  });
});

describe("spec-0018 evidence record v2", () => {
  it("builds round evidence with round-specific refs", () => {
    const candidates = buildCandidates(parseCandidateIds(["c1", "c3", "c5"]), "r5");
    const roundEvidence = buildRoundEvidence({
      round: "r3",
      candidates,
      screens: [{ screenId: "home" }, { screenId: "orders" }],
      allAxesPerfect100: true,
    });

    expect(roundEvidence.harvestRef).toBe(".qfai/evidence/prototyping/rounds/r3/harvest.json");
    expect(roundEvidence.absorptionPlanRef).toBe(
      ".qfai/evidence/prototyping/rounds/r3/absorption-plan.json",
    );
    expect(roundEvidence.screenEvidenceByCandidate.c1?.[0]).toEqual({
      screenId: "home",
      screenshotRef: ".qfai/evidence/prototyping/rounds/r3/candidates/c1/home.png",
      htmlRef: ".qfai/evidence/prototyping/rounds/r3/candidates/c1/home.html",
      snapshotRef: ".qfai/evidence/prototyping/rounds/r3/candidates/c1/home.snapshot.txt",
      commandLogRef: ".qfai/evidence/prototyping/rounds/r3/candidates/c1/home.commands.json",
    });
  });

  it("writes prototyping.json using the v2 schema", async () => {
    const root = await newTempDir();
    const surface = "web";
    const mode = "standard";
    const reviewerGateResult = "PASS";
    const recordInput = {
      surface,
      mode,
      modeSource: "test",
      modeRationale: "test",
      rounds: [
        buildRoundEvidence({
          round: "r5",
          candidates: buildCandidates(parseCandidateIds(["c1", "c2", "c3", "c4", "c5"]), "r5"),
          screens: [{ screenId: "home" }],
        }),
      ],
      polishCycles: [],
      bestOfHistory: { cycle: 1, evidenceRef: "ref" },
      breakthrough: { checked: true, evidenceRef: "bt" },
      reviewerGate: { result: reviewerGateResult, evidenceRef: "rg" },
      completionClaimed: false,
    };

    const built = buildPrototypingEvidenceRecordV2(recordInput);
    expect(built.schemaVersion).toBe("2.0");
    expect(built.rounds).toHaveLength(1);

    const { path: recordPath } = await writePrototypingEvidenceRecordV2({
      root,
      ...recordInput,
    });

    const raw = await readFile(recordPath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe("2.0");
    expect(parsed.rounds).toHaveLength(1);
  });
});
