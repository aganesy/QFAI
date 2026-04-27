import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateEvaluatorReviewHardFloor } from "../../src/core/validators/evaluatorReviewHardFloor.js";

const tempDirs: string[] = [];

async function newTempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-eval-hard-floor-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function seedUiContract(root: string): Promise<void> {
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(
    path.join(uiDir, "ui-0001-dashboard.yaml"),
    [
      "# QFAI-CONTRACT-ID: CON-UI-0001",
      "screens:",
      "  - id: dashboard",
      "    title: Dashboard",
      "    route: /dashboard",
    ].join("\n"),
    "utf-8",
  );
}

type RubricFloor = { id: string; min_score: number };

async function seedRubric(root: string, hardFloors: RubricFloor[]): Promise<void> {
  const designDir = path.join(root, ".qfai", "contracts", "design");
  await mkdir(designDir, { recursive: true });
  const lines: string[] = ["axes:", "  - id: originality", "    weight: 3", "hard_floors:"];
  for (const floor of hardFloors) {
    lines.push(`  - id: ${floor.id}`);
    lines.push(`    min_score: ${floor.min_score}`);
  }
  await writeFile(path.join(designDir, "evaluation-rubric.yaml"), lines.join("\n"), "utf-8");
}

async function seedFlatRubric(root: string): Promise<void> {
  const designDir = path.join(root, ".qfai", "contracts", "design");
  await mkdir(designDir, { recursive: true });
  await writeFile(
    path.join(designDir, "evaluation-rubric.yaml"),
    ["axes:", "  - originality", "hard_floors:", "  - originality", "  - functionality"].join("\n"),
    "utf-8",
  );
}

type AxisScore = { axisId: string; score: number };

async function seedReview(
  root: string,
  round: string,
  candidateId: string,
  perAxis: AxisScore[],
): Promise<void> {
  const reviewsDir = path.join(
    root,
    ".qfai",
    "evidence",
    "prototyping",
    "rounds",
    round,
    "evaluator-reviews",
  );
  await mkdir(reviewsDir, { recursive: true });
  const review = {
    schemaVersion: "2.0",
    candidateId,
    round,
    reviewerId: "test-reviewer",
    perAxis: perAxis.map((axis) => ({
      axisId: axis.axisId,
      score: axis.score,
      rationale: "fixture",
      evidenceRefs: ["fixture-ref"],
    })),
    strengths: [],
    weaknesses: [],
    conceptFit: {
      overallScore: 100,
      rationale: "fixture",
      anchorsFromExplorationBrief: [],
      divergences: [],
      evidenceRefs: ["fixture-ref"],
      priorRoundScore: null,
      regressionAlert: false,
    },
    coherenceFindings: [],
  };
  await writeFile(
    path.join(reviewsDir, `${candidateId}.json`),
    JSON.stringify(review, null, 2),
    "utf-8",
  );
}

describe("validateEvaluatorReviewHardFloor", () => {
  it("TC-0012-0317: r3 で originality < min_score の candidate に対し QFAI-PROT-AXIS-FLOOR-001 を発行する", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedRubric(root, [{ id: "originality", min_score: 80 }]);
    await seedReview(root, "r3", "c2", [{ axisId: "originality", score: 70 }]);

    const issues = await validateEvaluatorReviewHardFloor(root, defaultConfig);

    expect(issues).toHaveLength(1);
    const found = issues[0];
    expect(found?.code).toBe("QFAI-PROT-AXIS-FLOOR-001");
    expect(found?.severity).toBe("error");
    expect(found?.refs).toEqual(["r3", "c2", "originality", "70", "80"]);
  });

  it("TC-0012-0318: r5 で originality < min_score でも error を発行しない（r5 exemption）", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedRubric(root, [{ id: "originality", min_score: 80 }]);
    await seedReview(root, "r5", "c1", [{ axisId: "originality", score: 60 }]);

    const issues = await validateEvaluatorReviewHardFloor(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("r3 で全軸が floor 以上なら error を発行しない", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedRubric(root, [
      { id: "originality", min_score: 80 },
      { id: "functionality", min_score: 80 },
    ]);
    await seedReview(root, "r3", "c2", [
      { axisId: "originality", score: 95 },
      { axisId: "functionality", score: 90 },
    ]);

    const issues = await validateEvaluatorReviewHardFloor(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("rubric ファイル自体が無い場合は error を発行しない（DCON-001 に委ねる）", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedReview(root, "r3", "c2", [{ axisId: "originality", score: 50 }]);

    const issues = await validateEvaluatorReviewHardFloor(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("hard_floors が flat-string 形式（旧スキーマ）の場合は error を発行しない", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedFlatRubric(root);
    await seedReview(root, "r3", "c2", [{ axisId: "originality", score: 50 }]);

    const issues = await validateEvaluatorReviewHardFloor(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("UI contract が無い場合は早期 return で error を発行しない", async () => {
    const root = await newTempRoot();
    await seedRubric(root, [{ id: "originality", min_score: 80 }]);
    await seedReview(root, "r3", "c2", [{ axisId: "originality", score: 50 }]);

    const issues = await validateEvaluatorReviewHardFloor(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("hard_floors にない axis（例: conceptFit が perAxis に居ない時）はスキップする", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedRubric(root, [
      { id: "originality", min_score: 80 },
      { id: "conceptFit", min_score: 85 },
    ]);
    // perAxis には conceptFit が含まれない（別軸として記録される想定）
    await seedReview(root, "r3", "c2", [{ axisId: "originality", score: 90 }]);

    const issues = await validateEvaluatorReviewHardFloor(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("r3 と r2 の両方で違反があれば各々別の issue を発行する", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedRubric(root, [{ id: "originality", min_score: 80 }]);
    await seedReview(root, "r3", "c1", [{ axisId: "originality", score: 70 }]);
    await seedReview(root, "r2", "c1", [{ axisId: "originality", score: 65 }]);

    const issues = await validateEvaluatorReviewHardFloor(root, defaultConfig);

    expect(issues).toHaveLength(2);
    const codes = issues.map((item) => item.code);
    expect(codes).toEqual(["QFAI-PROT-AXIS-FLOOR-001", "QFAI-PROT-AXIS-FLOOR-001"]);
    const rounds = issues.map((item) => item.refs?.[0]);
    expect(rounds).toContain("r3");
    expect(rounds).toContain("r2");
  });

  it("evaluator-reviews ディレクトリが空の場合は error を発行しない", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await seedRubric(root, [{ id: "originality", min_score: 80 }]);

    const issues = await validateEvaluatorReviewHardFloor(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });
});
