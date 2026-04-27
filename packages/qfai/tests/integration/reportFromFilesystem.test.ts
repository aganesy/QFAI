/**
 * RR §8.2 regression: report.md must show non-zero counts when round
 * artifacts physically exist on the filesystem, even if the curated index
 * (`prototyping.json.rounds[]`) is sparse or empty.
 *
 * Phase 4/9 of the v1.8.4 prototyping refactor.
 *
 * Pre-Phase-4 behaviour (the bug): collectPrototypingSummary counted
 * `rounds[].absorptionPlanRef` strings only. If round-* CLI commands wrote
 * artifacts to disk but did not (yet) update the index, report.md showed
 * `absorption plans: 0` while files were physically present.
 *
 * Post-Phase-4 behaviour (this commit): counts are sourced from
 * .qfai/evidence/prototyping/rounds/<rN>/*.json. The index is no longer
 * authoritative for these counts; instead, drift between index references
 * and filesystem reality surfaces as a warning.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createReportData } from "../../src/core/report.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-rr-8-2-"));
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

async function seedMinimalProject(root: string): Promise<void> {
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/output",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "",
    ].join("\n"),
    "utf-8",
  );
  await mkdir(path.join(root, ".qfai/specs/spec-0001"), { recursive: true });
  await writeFile(path.join(root, ".qfai/specs/spec-0001/01_Spec.md"), "# spec-0001\n", "utf-8");
  await writeFile(
    path.join(root, ".qfai/specs/spec-0001/02_User-stories.md"),
    "# stories\n",
    "utf-8",
  );
}

async function seedPrototypingJson(root: string, body: unknown): Promise<void> {
  await mkdir(path.join(root, ".qfai/evidence"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai/evidence/prototyping.json"),
    JSON.stringify(body, null, 2),
    "utf-8",
  );
}

async function writeRoundArtifact(root: string, round: string, filename: string): Promise<void> {
  const dir = path.join(root, ".qfai/evidence/prototyping/rounds", round);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), "{}\n", "utf-8");
}

const minimalProtoJsonV2 = {
  schemaVersion: "2.0",
  surface: "web",
  mode: { effective: "standard", source: "explicit-request", rationale: "test" },
  rounds: [],
  polishCycles: [],
};

describe("RR §8.2 regression — report aggregates round artifacts from filesystem", () => {
  it("counts absorption-plan.json files even when prototyping.json.rounds[] is empty", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedPrototypingJson(root, minimalProtoJsonV2);

    // Filesystem has 3 absorption plans + 2 reimplementations + 2 narrow + 2 harvest
    await writeRoundArtifact(root, "r3", "absorption-plan.json");
    await writeRoundArtifact(root, "r2", "absorption-plan.json");
    await writeRoundArtifact(root, "r1", "absorption-plan.json");
    await writeRoundArtifact(root, "r3", "reimplementation.json");
    await writeRoundArtifact(root, "r2", "reimplementation.json");
    await writeRoundArtifact(root, "r5", "harvest.json");
    await writeRoundArtifact(root, "r3", "harvest.json");
    await writeRoundArtifact(root, "r5", "narrow-decision.json");
    await writeRoundArtifact(root, "r3", "narrow-decision.json");

    const data = await createReportData(root);

    expect(data.prototyping?.roundLifecycle?.absorptionPlans).toBe(3);
    expect(data.prototyping?.roundLifecycle?.reimplementations).toBe(2);
    expect(data.prototyping?.roundLifecycle?.harvestArtifacts).toBe(2);
    expect(data.prototyping?.roundLifecycle?.narrowDecisions).toBe(2);
  });

  it("reports filesystem-observed roundIds even when index is empty", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedPrototypingJson(root, minimalProtoJsonV2);
    await writeRoundArtifact(root, "r5", "harvest.json");
    await writeRoundArtifact(root, "r3", "absorption-plan.json");

    const data = await createReportData(root);

    expect(data.prototyping?.roundLifecycle?.roundIds).toEqual(
      expect.arrayContaining(["r5", "r3"]),
    );
  });

  it("activates roundLifecycle even when schemaVersion is absent if FS has rounds", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // No schemaVersion / rounds[] — pre-V2-style document
    await seedPrototypingJson(root, {
      surface: "web",
      mode: { effective: "standard", source: "explicit-request", rationale: "test" },
    });
    await writeRoundArtifact(root, "r5", "harvest.json");

    const data = await createReportData(root);

    expect(data.prototyping?.roundLifecycle).toBeDefined();
    expect(data.prototyping?.roundLifecycle?.harvestArtifacts).toBe(1);
  });

  it("emits a drift warning when index references differ from filesystem", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Index claims 1 absorption plan ref, but filesystem has 3
    await seedPrototypingJson(root, {
      ...minimalProtoJsonV2,
      rounds: [
        {
          round: "r3",
          absorptionPlanRef: ".qfai/evidence/prototyping/rounds/r3/absorption-plan.json",
        },
      ],
    });
    await writeRoundArtifact(root, "r3", "absorption-plan.json");
    await writeRoundArtifact(root, "r2", "absorption-plan.json");
    await writeRoundArtifact(root, "r1", "absorption-plan.json");

    const data = await createReportData(root);

    // Filesystem count wins
    expect(data.prototyping?.roundLifecycle?.absorptionPlans).toBe(3);
    // Drift warning surfaces
    expect(data.prototyping?.warnings ?? []).toEqual(
      expect.arrayContaining([expect.stringMatching(/absorption-plan\(s\) but filesystem has 3/)]),
    );
  });

  it("returns 0 counts and no roundLifecycle block when no rounds anywhere", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // No prototyping.json — collectPrototypingSummary returns undefined
    const data = await createReportData(root);
    expect(data.prototyping).toBeUndefined();
  });
});
