import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateBreakthroughEvidence } from "../../src/core/validators/breakthroughEvidence.js";

const tempDirs: string[] = [];

async function newTempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-breakthrough-evidence-"));
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

async function seedUiContract(root: string, contractsDir = ".qfai/contracts"): Promise<void> {
  const uiDir = path.join(root, contractsDir, "ui");
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

async function writeBreakthroughEvidence(
  root: string,
  record: string,
  evidenceDir = ".qfai/evidence",
): Promise<void> {
  const fullEvidenceDir = path.join(root, evidenceDir);
  await mkdir(fullEvidenceDir, { recursive: true });
  await writeFile(path.join(fullEvidenceDir, "breakthrough.json"), record, "utf-8");
}

describe("validateBreakthroughEvidence", () => {
  it("custom specsDir でも suggested_action は実際の evidence path を案内する", async () => {
    const root = await newTempRoot();
    const config = {
      ...defaultConfig,
      paths: {
        ...defaultConfig.paths,
        contractsDir: "workspace/contracts",
        specsDir: "workspace/specs",
      },
    };
    await seedUiContract(root, "workspace/contracts");

    const issues = await validateBreakthroughEvidence(root, config);
    const missingIssue = issues.find((issue) => issue.code === "QFAI-BREAK-001");

    expect(missingIssue?.file).toBe("workspace/evidence/breakthrough.json");
    expect(missingIssue?.suggested_action).toContain("workspace/evidence/breakthrough.json");
  });

  it("壊れた JSON の場合は QFAI-BREAK-002 を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await writeBreakthroughEvidence(root, "{");

    const issues = await validateBreakthroughEvidence(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-BREAK-002");
  });

  it("latestIteration が 0 以下なら QFAI-BREAK-003 を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);

    for (const latestIteration of [0, -1]) {
      await writeBreakthroughEvidence(
        root,
        `${JSON.stringify(
          {
            latestIteration,
            triggerResult: false,
            triggerReasons: ["insufficient-lookback"],
            scoreDeltaWindow: 2,
            avgScoreDeltas: [0.01, 0.015],
            minScoreDeltas: [0.02, 0.01],
            diffLines: 8,
          },
          null,
          2,
        )}\n`,
      );

      const issues = await validateBreakthroughEvidence(root, defaultConfig);
      expect(issues.map((issue) => issue.code)).toContain("QFAI-BREAK-003");
    }
  });

  it("妥当な breakthrough.json なら issue を返さない", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await writeBreakthroughEvidence(
      root,
      `${JSON.stringify(
        {
          latestIteration: 3,
          triggerResult: false,
          triggerReasons: ["insufficient-lookback"],
          scoreDeltaWindow: 2,
          avgScoreDeltas: [0.01, 0.015],
          minScoreDeltas: [0.02, 0.01],
          diffLines: 8,
        },
        null,
        2,
      )}\n`,
    );

    const issues = await validateBreakthroughEvidence(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("triggerResult=true で branchCount と branchRefs が無い場合は両方 error を返す", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await writeBreakthroughEvidence(
      root,
      `${JSON.stringify(
        {
          latestIteration: 4,
          triggerResult: true,
          triggerReasons: ["score-regressing"],
          scoreDeltaWindow: 2,
          avgScoreDeltas: [-0.02, -0.01],
          minScoreDeltas: [-0.03, -0.02],
          diffLines: 12,
        },
        null,
        2,
      )}\n`,
    );

    const issues = await validateBreakthroughEvidence(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["QFAI-BREAK-008", "QFAI-BREAK-009"]),
    );
  });

  it("triggerResult=true で branchCount と branchRefs があれば issue を返さない", async () => {
    const root = await newTempRoot();
    await seedUiContract(root);
    await writeBreakthroughEvidence(
      root,
      `${JSON.stringify(
        {
          latestIteration: 4,
          triggerResult: true,
          triggerReasons: ["score-regressing"],
          scoreDeltaWindow: 2,
          avgScoreDeltas: [-0.02, -0.01],
          minScoreDeltas: [-0.03, -0.02],
          diffLines: 12,
          branchCount: 2,
          branchRefs: ["density-philosophy", "shape-language"],
        },
        null,
        2,
      )}\n`,
    );

    const issues = await validateBreakthroughEvidence(root, defaultConfig);

    expect(issues).toEqual([]);
  });
});
