import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validatePrototypingCandidateConcept } from "../../src/core/validators/prototypingCandidateConcept.js";

const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prot-concept-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function seedUiContract(root: string): Promise<void> {
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(
    path.join(uiDir, "ui.yaml"),
    "# QFAI-CONTRACT-ID: CON-UI-0001\nscreens:\n  - id: home\n    route: /\n",
    "utf-8",
  );
}

async function seedReviewBundle(root: string, candidateIds: string[]): Promise<void> {
  const roundDir = path.join(root, ".qfai", "evidence", "prototyping", "rounds", "r5");
  await mkdir(roundDir, { recursive: true });
  await writeFile(
    path.join(roundDir, "review-bundle.json"),
    JSON.stringify(
      { candidates: candidateIds.map((candidateId) => ({ candidateId })) },
      null,
      2,
    ),
    "utf-8",
  );
}

async function seedConcept(root: string, candidateId: string, designThesis: string): Promise<void> {
  const dir = path.join(
    root,
    ".qfai",
    "evidence",
    "prototyping",
    "rounds",
    "r5",
    "candidates",
    candidateId,
  );
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "concept.json"),
    JSON.stringify(
      {
        schemaVersion: "2.0",
        candidateId,
        round: "r5",
        statement: `Statement ${candidateId}`,
        designThesis,
        referenceLineage: ["REF-001"],
        templateSeedUsage: "reference-only",
        antiTemplateConstraints: ["replace default rhythm"],
        noveltyBet: `Novelty ${candidateId}`,
      },
      null,
      2,
    ),
    "utf-8",
  );
}

describe("validatePrototypingCandidateConcept", () => {
  it("active candidates with complete differentiated concepts pass", async () => {
    const root = await newRoot();
    await seedUiContract(root);
    await seedReviewBundle(root, ["c1", "c2"]);
    await seedConcept(root, "c1", "Dense operational control room");
    await seedConcept(root, "c2", "Editorial decision surface");

    const issues = await validatePrototypingCandidateConcept(root, defaultConfig);

    expect(issues).toEqual([]);
  });

  it("missing concept emits an error", async () => {
    const root = await newRoot();
    await seedUiContract(root);
    await seedReviewBundle(root, ["c1"]);

    const issues = await validatePrototypingCandidateConcept(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-PROT-CONCEPT-001");
  });

  it("duplicate r5 designThesis emits an error", async () => {
    const root = await newRoot();
    await seedUiContract(root);
    await seedReviewBundle(root, ["c1", "c2"]);
    await seedConcept(root, "c1", "Same thesis");
    await seedConcept(root, "c2", "Same thesis");

    const issues = await validatePrototypingCandidateConcept(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-PROT-CONCEPT-001");
  });

  it("template seeded concepts require anti-template constraints", async () => {
    const root = await newRoot();
    await seedUiContract(root);
    await seedReviewBundle(root, ["c1"]);
    await seedConcept(root, "c1", "Template translated surface");
    const conceptPath = path.join(
      root,
      ".qfai",
      "evidence",
      "prototyping",
      "rounds",
      "r5",
      "candidates",
      "c1",
      "concept.json",
    );
    const raw = JSON.parse(await readFile(conceptPath, "utf-8"));
    raw.antiTemplateConstraints = [];
    await writeFile(conceptPath, JSON.stringify(raw, null, 2), "utf-8");

    const issues = await validatePrototypingCandidateConcept(root, defaultConfig);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-PROT-CONCEPT-001");
  });
});
