import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../../src/cli/commands/prototypingIterate.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-iterate-"));
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

async function seedMinimalProject(
  root: string,
  options: { uiBearing?: boolean } = {},
): Promise<void> {
  const uiBearing = options.uiBearing ?? true;
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/out",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "validation:",
      "  failOn: error",
      "  require:",
      "    specSections: []",
      "  testStrategy:",
      "    requireLayerTags: false",
      "    requireSizeTags: false",
      "    requireApiAtdd: false",
      "    requireE2eAtdd: false",
      "    requireIntegrationAtdd: false",
      "    requireUnitTdd: false",
      "    requireSpecTagBlock: false",
      "    requireRoutingProfile: false",
    ].join("\n"),
    "utf-8",
  );

  const specDir = path.join(root, ".qfai/specs/spec-0017");
  await mkdir(specDir, { recursive: true });
  const marker = uiBearing ? "surface_type: ui-bearing\n" : "";
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    `# 01 Spec — test\n\n- Spec: spec-0017\n- Parent: CAP-0017\n${marker}`,
    "utf-8",
  );
}

async function seedPrototypingJson(
  root: string,
  iterations: Array<{
    index: number;
    scores: {
      designQuality: string;
      originality: string;
      craft: string;
      functionality: string;
    };
    slopPatternsDetected?: string[];
  }>,
): Promise<void> {
  const dir = path.join(root, ".qfai/evidence/prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "prototyping.json"),
    JSON.stringify({
      schemaVersion: "3.0",
      specsCovered: ["0017"],
      iterations: iterations.map((it) => ({
        index: it.index,
        commitSha: "a".repeat(40),
        scores: it.scores,
        proseCritique: "x".repeat(1500),
        slopPatternsDetected: it.slopPatternsDetected ?? [],
        pivotDirective: "continue",
        evidenceRefs: {
          screenshot: `.qfai/evidence/prototyping/iter-${String(it.index).padStart(2, "0")}/home.png`,
          html: `.qfai/evidence/prototyping/iter-${String(it.index).padStart(2, "0")}/home.html`,
        },
      })),
      acceptedIterationIndex: iterations.length - 1,
      stopReason: null,
    }),
    "utf-8",
  );
}

// QFAI:SPEC-0017:TC-0017-0010
describe("runPrototypingIterate cycle 0", () => {
  it("returns 0 and creates iter-00/ with iterate-plan.json (target-url provided)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);

    const planRaw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/iter-00/iterate-plan.json"),
      "utf-8",
    );
    const plan = JSON.parse(planRaw) as {
      cycle: number;
      targetUrl: string | null;
      paths: { iterationDir: string; reviewJson: string };
      specs: string[];
    };
    expect(plan.cycle).toBe(0);
    expect(plan.targetUrl).toBe("http://localhost:5173");
    expect(plan.paths.iterationDir).toBe(".qfai/evidence/prototyping/iter-00");
    expect(plan.paths.reviewJson).toBe(".qfai/evidence/prototyping/iter-00/review.json");
    expect(plan.specs).toEqual(["0017"]);
  });

  // QFAI:SPEC-0017:TC-0017-0011
  it("returns 2 when --target-url is missing at cycle 0", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingIterate({ root, cycle: 0 });
    expect(exit).toBe(2);
  });
});

// QFAI:SPEC-0017:TC-0017-0012
describe("runPrototypingIterate convergence (exit 64)", () => {
  it("returns 64 when latest iter has all 4 axes exceptional and no slop", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          designQuality: "exceptional",
          originality: "exceptional",
          craft: "exceptional",
          functionality: "exceptional",
        },
        slopPatternsDetected: [],
      },
    ]);

    const exit = await runPrototypingIterate({ root, cycle: 1 });
    expect(exit).toBe(64);
  });

  it("does NOT exit 64 when slop is present even with all-exceptional scores", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Note: invariant-violating fixture intentionally bypasses
    // buildEvaluatorReview's runtime guard to mimic file tampering.
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          designQuality: "exceptional",
          originality: "exceptional",
          craft: "exceptional",
          functionality: "exceptional",
        },
        slopPatternsDetected: ["slop-001-shadcn-zinc"],
      },
    ]);

    const exit = await runPrototypingIterate({ root, cycle: 1 });
    expect(exit).toBe(0);
  });
});

// QFAI:SPEC-0017:TC-0017-0013
describe("runPrototypingIterate max-iterations (exit 65)", () => {
  it("returns 65 when latest iter index === 14", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const iterations = Array.from({ length: 15 }, (_, i) => ({
      index: i,
      scores: {
        designQuality: "acceptable",
        originality: "acceptable",
        craft: "acceptable",
        functionality: "acceptable",
      },
    }));
    await seedPrototypingJson(root, iterations);

    // We can't pass cycle 15 (out of range), but the stop check fires
    // at the start of any cycle >= 1 by reading the latest iter index.
    const exit = await runPrototypingIterate({ root, cycle: 14 });
    expect(exit).toBe(65);
  });
});

// QFAI:SPEC-0017:TC-0017-0014
describe("runPrototypingIterate input validation", () => {
  it("returns 2 when --cycle is negative", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingIterate({ root, cycle: -1 });
    expect(exit).toBe(2);
  });

  it("returns 2 when --cycle is > 14", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingIterate({ root, cycle: 15 });
    expect(exit).toBe(2);
  });

  it("returns 2 when --cycle is fractional", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingIterate({ root, cycle: 1.5 });
    expect(exit).toBe(2);
  });

  it("returns 2 when no UI-bearing spec is found", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { uiBearing: false });
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(2);
  });
});

describe("runPrototypingIterate continue (exit 0)", () => {
  it("returns 0 at cycle 1 when prior iter is acceptable (no convergence, not at max)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          designQuality: "acceptable",
          originality: "acceptable",
          craft: "acceptable",
          functionality: "acceptable",
        },
      },
    ]);

    const exit = await runPrototypingIterate({ root, cycle: 1 });
    expect(exit).toBe(0);

    const planRaw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/iter-01/iterate-plan.json"),
      "utf-8",
    );
    const plan = JSON.parse(planRaw) as { cycle: number };
    expect(plan.cycle).toBe(1);
  });
});
