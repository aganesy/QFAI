import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validatePrototypingArtifactRefIntegrity } from "../../../src/core/validators/prototyping/refIntegrity.js";
import {
  SEED_COMMIT_SHA,
  SEED_PROSE_CRITIQUE_PLACEHOLDER,
  SEED_REVIEWER_ID,
} from "../../../src/core/prototyping/iteration.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-ref-integrity-"));
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

async function seedPrototypingJson(root: string, screenshot: string, html: string): Promise<void> {
  const dir = path.join(root, ".qfai", "evidence", "prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "prototyping.json"),
    JSON.stringify({
      specsCovered: ["0001"],
      iterations: [
        {
          index: 0,
          evidenceRefs: [
            { kind: "screenshot", path: screenshot },
            { kind: "html", path: html },
          ],
        },
      ],
    }),
    "utf-8",
  );
}

/**
 * A `prototyping.json` holding one iteration, written verbatim — so a case can
 * omit `evidenceRefs` entirely, which the fixed-shape helper above cannot
 * express.
 */
/**
 * The record `prototyping iterate --cycle 0` actually writes.
 *
 * Spelled out from the exported constants rather than as
 * `{ reviewerId: "iterate-seed" }`, because the waiver is not granted to a
 * record that merely CLAIMS to be the seed — `isUntouchedCycleZeroSeed` also
 * requires the seed's `commitSha` and its untouched placeholder critique, so
 * the waiver lifts by itself on the first real review.
 */
const untouchedSeed = (): Record<string, unknown> => ({
  index: 0,
  commitSha: SEED_COMMIT_SHA,
  reviewerId: SEED_REVIEWER_ID,
  proseCritique: SEED_PROSE_CRITIQUE_PLACEHOLDER,
});

async function seedIterations(root: string, iterations: unknown[]): Promise<void> {
  const dir = path.join(root, ".qfai", "evidence", "prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "prototyping.json"),
    JSON.stringify({ specsCovered: ["0001"], iterations }),
    "utf-8",
  );
}

describe("validatePrototypingArtifactRefIntegrity", () => {
  it("returns no issues when prototyping.json is missing", async () => {
    const root = await newTempDir();

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("returns no issues when iteration evidenceRefs point to existing files", async () => {
    const root = await newTempDir();
    const iterDir = path.join(root, ".qfai", "evidence", "prototyping", "iter-00");
    await mkdir(iterDir, { recursive: true });
    await writeFile(path.join(iterDir, "home.png"), "png", "utf-8");
    await writeFile(path.join(iterDir, "home.html"), "<html></html>", "utf-8");
    await seedPrototypingJson(root, "iter-00/home.png", "iter-00/home.html");

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("emits QFAI-PROT-009 when iteration evidenceRefs point to missing files", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, "iter-00/missing.png", "iter-00/missing.html");

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-PROT-009", "QFAI-PROT-009"]);
  });

  it("accepts an empty evidenceRefs array while an iteration has no captured artifacts", async () => {
    const root = await newTempDir();
    await seedIterations(root, [{ index: 0, evidenceRefs: [] }]);

    expect(await validatePrototypingArtifactRefIntegrity(root, defaultConfig)).toEqual([]);
  });

  it("rejects the retired object-shaped iteration reference", async () => {
    const root = await newTempDir();
    await seedIterations(root, [
      {
        index: 0,
        evidenceRefs: { screenshot: "iter-00/home.png", html: "iter-00/home.html" },
      },
    ]);

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues.map((item) => item.code)).toEqual(["QFAI-PROT-009"]);
    expect(issues[0]?.message).toContain("must be an array");
  });

  it("refuses a path that escapes the prototyping evidence directory", async () => {
    const root = await newTempDir();
    await seedIterations(root, [
      { index: 0, evidenceRefs: [{ kind: "screenshot", path: "../outside.png" }] },
    ]);

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues.map((item) => item.code)).toEqual(["QFAI-PROT-009"]);
    expect(issues[0]?.message).toContain("evidenceRefs[0].path");
  });

  it("emits QFAI-PROT-009 when iteration evidenceRefs are empty", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(root, "", "   ");

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-PROT-009", "QFAI-PROT-009"]);
    expect(issues.map((issue) => issue.message)).toEqual([
      "iterations[0].evidenceRefs[0].path must be an iter-NN artifact path under .qfai/evidence/prototyping.",
      "iterations[0].evidenceRefs[1].path must be an iter-NN artifact path under .qfai/evidence/prototyping.",
    ]);
  });

  it("checks prototype-handoff artifact references when present", async () => {
    const root = await newTempDir();
    const handoffDir = path.join(root, defaultConfig.paths.contractsDir, "design");
    await mkdir(handoffDir, { recursive: true });
    await writeFile(
      path.join(handoffDir, "prototype-handoff.yaml"),
      [
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
      ].join("\n"),
      "utf-8",
    );

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-PROT-009", "QFAI-PROT-009"]);
  });

  it("validates designSystemMirror specifically — a missing target surfaces PROT-009", async () => {
    const root = await newTempDir();
    const handoffDir = path.join(root, defaultConfig.paths.contractsDir, "design");
    await mkdir(handoffDir, { recursive: true });
    await writeFile(
      path.join(handoffDir, "prototype-handoff.yaml"),
      [
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designSystemMirror: ".qfai/contracts/design/missing-design-system.yaml"',
      ].join("\n"),
      "utf-8",
    );

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    const messages = issues.map((i) => i.message);
    expect(
      messages.some(
        (m) =>
          m.includes("prototype-handoff.designSystemMirror") &&
          m.includes("missing-design-system.yaml"),
      ),
    ).toBe(true);
  });

  it("handoff field issues point at prototype-handoff.yaml (not prototyping.json)", async () => {
    const root = await newTempDir();
    const handoffDir = path.join(root, defaultConfig.paths.contractsDir, "design");
    await mkdir(handoffDir, { recursive: true });
    await writeFile(
      path.join(handoffDir, "prototype-handoff.yaml"),
      [
        'finalArtifact: ""', // empty string → required-violation
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
      ].join("\n"),
      "utf-8",
    );

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    const handoffIssue = issues.find((i) => i.message.includes("prototype-handoff.finalArtifact"));
    expect(handoffIssue).toBeDefined();
    // Issue#path tells the operator WHICH file to edit. For handoff
    // field violations, that file is prototype-handoff.yaml — not
    // prototyping.json (which is the generic refIntegrity owner).
    expect(handoffIssue?.file).toBe(".qfai/spec/03_contract/design/prototype-handoff.yaml");
  });

  // The handoff lives in `paths.contractsDir`. A copy left at the retired
  // `.qfai/contracts/design/` is not the one this gate reads.
  it("reads the handoff from paths.contractsDir", async () => {
    const root = await newTempDir();
    const handoff = ['finalArtifact: ""', 'designSystemMirror: "missing.yaml"'].join("\n");
    await mkdir(path.join(root, ".qfai", "contracts", "design"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "contracts", "design", "prototype-handoff.yaml"),
      handoff,
      "utf-8",
    );
    expect(await validatePrototypingArtifactRefIntegrity(root, defaultConfig)).toEqual([]);

    const config = { ...defaultConfig, paths: { ...defaultConfig.paths, contractsDir: "custom" } };
    await mkdir(path.join(root, "custom", "design"), { recursive: true });
    await writeFile(
      path.join(root, "custom", "design", "prototype-handoff.yaml"),
      handoff,
      "utf-8",
    );
    const files = (await validatePrototypingArtifactRefIntegrity(root, config)).map((i) => i.file);
    expect(files).toContain("custom/design/prototype-handoff.yaml");
  });

  // The cycle-0 seed is written BEFORE capture runs, so any ref it carried
  // named a file that did not exist yet. It cites nothing now, and this gate
  // asks nothing of it.
  it("asks no artifact of the cycle-0 seed, which cites none", async () => {
    const root = await newTempDir();
    await seedIterations(root, [untouchedSeed()]);

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  // Reviewed iterations must carry the canonical array, even when capture was omitted.
  it("requires an evidenceRefs array from an iteration that names no reviewer", async () => {
    const root = await newTempDir();
    await seedIterations(root, [{ index: 0 }]);

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues.map((i) => i.message)).toEqual([
      "iterations[0].evidenceRefs must be an array of {kind, path} entries.",
    ]);
  });

  it("still requires the array from a reviewed record that kept the seed stamp", async () => {
    const root = await newTempDir();
    await seedIterations(root, [
      { ...untouchedSeed(), commitSha: "a".repeat(40), proseCritique: "a real critique" },
    ]);

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(1);
  });

  it("still requires the array from an iteration naming a real reviewer", async () => {
    const root = await newTempDir();
    await seedIterations(root, [{ index: 0, reviewerId: "product-surface-reviewer" }]);

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(1);
  });

  // The pre-fix seed shape, kept as a case rather than a memory: it pointed at
  // `iter-00/index.{png,html}`, which nothing in the loop writes at any point —
  // capture honours the plan's `iter-NN/{screen}.png` template. Those two
  // QFAI-PROT-009 errors are the missing-artifact findings such refs raise, and
  // the exemption is what keeps them from firing on the seed.
  it("would have reported the pre-fix seed refs, and does not now that they are gone", async () => {
    const root = await newTempDir();
    const preFix = {
      ...untouchedSeed(),
      evidenceRefs: [
        { kind: "screenshot", path: "iter-00/index.png" },
        { kind: "html", path: "iter-00/index.html" },
      ],
    };
    // Same refs, no reviewerId: the gate still resolves them and still fails.
    await seedIterations(root, [{ index: 0, evidenceRefs: preFix.evidenceRefs }]);
    const withoutSeedId = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(
      withoutSeedId.filter((i) => i.message.includes("references a missing artifact")),
    ).toHaveLength(2);

    // The seed carrying them is exempt, so the window between `iterate` and the
    // first review is clean even for a record written before this change.
    await seedIterations(root, [preFix]);
    const asSeed = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(asSeed).toEqual([]);
  });
});
