import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { QfaiConfig } from "../../../src/core/config.js";
import { validatePrototypingEvidence } from "../../../src/core/validators/prototypingEvidence.js";

const tempDirs: string[] = [];
const SHA_R5 = "a".repeat(40);
const SHA_R3 = "b".repeat(40);
const SHA_POLISH = "c".repeat(40);

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-prot-commit-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function makeConfig(): QfaiConfig {
  return {
    paths: {
      contractsDir: ".qfai/contracts",
      specsDir: ".qfai/specs",
      discussionDir: ".qfai/discussion",
      outDir: ".qfai/out",
      skillsDir: ".qfai/assistant/skills",
      promptsDir: ".qfai/assistant/skills",
      srcDir: "src",
      testsDir: "tests",
    },
    validation: {
      failOn: "error",
      require: { specSections: [] },
      testStrategy: {
        requireLayerTags: false,
        requireSizeTags: false,
        maxE2eScenarioRatio: null,
        maxE2eScenarioCount: null,
        forbidTestTodoStubs: true,
      },
      traceability: {
        brMustHaveSc: true,
        scMustHaveTest: true,
        testFileGlobs: [],
        testFileExcludeGlobs: [],
        scNoTestSeverity: "error",
        orphanContractsPolicy: "error",
        unknownContractIdSeverity: "warning",
      },
    },
    output: { validateJsonPath: ".qfai/output/validate.json" },
  };
}

async function seedUiContract(root: string): Promise<void> {
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(
    path.join(uiDir, "ui-0001-home.yaml"),
    ["screens:", "  - id: home", "    title: Home", "    route: /", ""].join("\n"),
    "utf-8",
  );
}

async function seedPrototypingJson(root: string, body: unknown): Promise<void> {
  await mkdir(path.join(root, ".qfai/evidence"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping.json"),
    `${JSON.stringify(body, null, 2)}\n`,
    "utf-8",
  );
}

function makeCandidate(candidateId: string): Record<string, unknown> {
  return { candidateId, firstRound: "r5", droppedAtRound: null };
}

function makeRound(
  round: "r5" | "r3",
  candidateIds: string[],
  commitSha: string,
): Record<string, unknown> {
  return {
    round,
    commitSha,
    candidates: candidateIds.map(makeCandidate),
    screenEvidenceByCandidate: Object.fromEntries(
      candidateIds.map((candidateId) => [
        candidateId,
        [
          {
            screenId: "home",
            screenshotRef: `.qfai/evidence/prototyping/rounds/${round}/candidates/${candidateId}/home.png`,
            htmlRef: `.qfai/evidence/prototyping/rounds/${round}/candidates/${candidateId}/home.html`,
            snapshotRef: `.qfai/evidence/prototyping/rounds/${round}/candidates/${candidateId}/home.snapshot.txt`,
            commandLogRef: `.qfai/evidence/prototyping/rounds/${round}/candidates/${candidateId}/home.commands.json`,
          },
        ],
      ]),
    ),
    evaluatorReviewRefsByCandidate: Object.fromEntries(
      candidateIds.map((candidateId) => [
        candidateId,
        `.qfai/evidence/prototyping/rounds/${round}/evaluator-reviews/${candidateId}.json`,
      ]),
    ),
    allAxesPerfect100: true,
  };
}

function makePolish(commitSha: string): Record<string, unknown> {
  return {
    cycle: 1,
    kind: "polish",
    commitSha,
    screenEvidence: [],
    evaluatorReviewRef: ".qfai/evidence/prototyping/iterations/1/evaluator-review.json",
    breakthroughRef: ".qfai/evidence/breakthrough.json",
    reviewerGateRef: null,
    allAxesPerfect100: true,
  };
}

function makeRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: "2.0",
    surface: "web",
    mode: { effective: "standard", source: "explicit-request", rationale: "test" },
    browserTool: "playwright-cli",
    maxCycles: 3,
    rounds: [makeRound("r5", ["c1", "c2", "c3", "c4", "c5"], SHA_R5)],
    polishCycles: [],
    runtimeGate: {},
    uiFidelity: {},
    bestOfHistory: { cycle: 1, evidenceRef: ".qfai/evidence/prototyping.json#/rounds/0" },
    breakthrough: { checked: true, evidenceRef: ".qfai/evidence/breakthrough.json" },
    reviewerGate: { result: "REVISE", evidenceRef: ".qfai/evidence/reviewer-gate.json" },
    completionClaimed: false,
    ...overrides,
  };
}

async function validateRecord(body: Record<string, unknown>): Promise<string[]> {
  const root = await newTempDir();
  await seedUiContract(root);
  await seedPrototypingJson(root, body);
  const issues = await validatePrototypingEvidence(root, makeConfig());
  return issues.map((issue) => issue.code);
}

describe("validatePrototypingEvidence commitSha lifecycle", () => {
  it("accepts unique commitSha values for rounds and polish cycles", async () => {
    const codes = await validateRecord({
      ...makeRecord(),
      rounds: [
        makeRound("r5", ["c1", "c2", "c3", "c4", "c5"], SHA_R5),
        makeRound("r3", ["c1", "c3", "c5"], SHA_R3),
      ],
      polishCycles: [makePolish(SHA_POLISH)],
    });

    expect(codes).not.toContain("QFAI-PROT-277");
    expect(codes).not.toContain("QFAI-PROT-278");
  });

  it("emits QFAI-PROT-277 when a round commitSha is missing", async () => {
    const round = makeRound("r5", ["c1", "c2", "c3", "c4", "c5"], SHA_R5);
    delete round.commitSha;

    const codes = await validateRecord(makeRecord({ rounds: [round] }));

    expect(codes).toContain("QFAI-PROT-277");
  });

  it("emits QFAI-PROT-277 when a polish commitSha is missing", async () => {
    const polish = makePolish(SHA_POLISH);
    delete polish.commitSha;

    const codes = await validateRecord(makeRecord({ polishCycles: [polish] }));

    expect(codes).toContain("QFAI-PROT-277");
  });

  it("emits QFAI-PROT-278 when a commitSha is reused", async () => {
    const codes = await validateRecord(
      makeRecord({
        polishCycles: [makePolish(SHA_R5)],
      }),
    );

    expect(codes).toContain("QFAI-PROT-278");
  });
});
