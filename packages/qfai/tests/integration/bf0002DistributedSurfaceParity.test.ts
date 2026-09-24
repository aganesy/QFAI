import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runLintShipping } from "../../scripts/lint-shipping.js";
import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";
import { STORY_ID_BOUNDARIES, scanDistributedSurface } from "../helpers/distributedSurfaceScan.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const guardScript = path.join(packageRoot, "scripts/check-no-internal-version-leakage.sh");

type Fixture = { initRoot: string; packRoot: string };

function runPostBuildGuard(packRoot: string): { status: number | null; output: string } {
  const child = spawnSync("bash", [guardScript], {
    cwd: packRoot,
    encoding: "utf-8",
    env: { ...process.env, QFAI_LEAKAGE_SCAN_ROOT: packRoot },
  });
  return { status: child.status, output: `${child.stdout ?? ""}${child.stderr ?? ""}` };
}

async function plant(fixture: Fixture, id: string): Promise<void> {
  const body = `${id}\n`;
  await Promise.all([
    writeFile(path.join(fixture.initRoot, "probe.md"), body, "utf-8"),
    writeFile(path.join(fixture.packRoot, "assets/probe.md"), body, "utf-8"),
    writeFile(
      path.join(fixture.packRoot, "src/guard.ts"),
      `// ${id}\nexport const guard = true;\n`,
      "utf-8",
    ),
  ]);
}

async function observe(
  fixture: Fixture,
  id: string,
): Promise<{
  smokeClasses: string[];
  lintPatterns: string[];
  guard: { status: number | null; output: string };
}> {
  await plant(fixture, id);
  const smoke = await scanDistributedSurface(fixture.initRoot);
  const lint = await runLintShipping(fixture.packRoot);
  return {
    smokeClasses: smoke.hits.filter((hit) => hit.file === "probe.md").map((hit) => hit.className),
    lintPatterns: lint.violations
      .filter((violation) => violation.file === "src/guard.ts")
      .map((violation) => violation.pattern),
    guard: runPostBuildGuard(fixture.packRoot),
  };
}

describe("BF-0002 distributed-surface guard parity", () => {
  let fixture: Fixture;

  beforeAll(async () => {
    const initRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-bf2-init-"));
    const packRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-bf2-pack-"));
    fixture = { initRoot, packRoot };
    await captureStdout(() => runInit({ dir: initRoot, force: false, dryRun: false, yes: true }));
    await cp(initRoot, path.join(packRoot, "assets"), { recursive: true });
    await mkdir(path.join(packRoot, "src"));
    await writeFile(
      path.join(packRoot, "package.json"),
      JSON.stringify({ name: "qfai-bf2-guard-fixture", version: "0.0.0", files: ["assets"] }),
      "utf-8",
    );
  }, 120_000);

  afterAll(async () => {
    if (fixture !== undefined) {
      await Promise.all([
        rm(fixture.initRoot, { recursive: true, force: true }),
        rm(fixture.packRoot, { recursive: true, force: true }),
      ]);
    }
  });

  // QFAI:EX-0002-0009-01
  it("accepts the clean initialized surface in both guards", async () => {
    const smoke = await scanDistributedSurface(fixture.initRoot);
    expect(smoke.hits).toEqual([]);
    expect(smoke.nameHits).toEqual([]);
    const guard = runPostBuildGuard(fixture.packRoot);
    expect(guard.status, guard.output).toBe(0);
  });

  // QFAI:EX-0002-0009-01
  // QFAI:EX-0002-0009-02
  it.each(STORY_ID_BOUNDARIES)(
    "keeps %s and rejects %s across pre-build, post-build, and smoke guards",
    async (sample, internal) => {
      const allowed = await observe(fixture, sample);
      expect(allowed.smokeClasses).toEqual([]);
      expect(allowed.lintPatterns).toEqual([]);
      expect(allowed.guard.status, allowed.guard.output).toBe(0);

      const rejected = await observe(fixture, internal);
      expect(rejected.smokeClasses).toEqual(["internal story id"]);
      expect(rejected.lintPatterns).toHaveLength(1);
      expect(rejected.lintPatterns[0]).toMatch(
        /^internal-story-(?:dec|oq|bf|us|ac|ex|br)-id-jsdoc-leak$/,
      );
      expect(rejected.guard.status, rejected.guard.output).toBe(1);
      expect(rejected.guard.output).toContain("probe.md");
    },
  );

  // QFAI:EX-0002-0009-02
  it.each([
    ["DEC-0001-0042", "internal-dec-id-jsdoc-leak"],
    ["OQ-0001-0042", "internal-oq-id-jsdoc-leak"],
  ])("keeps legacy composite %s in its prior class", async (id, legacyPattern) => {
    const observed = await observe(fixture, id);
    expect(observed.smokeClasses).toEqual(["internal trace id (CAP-0010+/DEC/DR/PROT2/OQ/CHG)"]);
    expect(observed.lintPatterns).toEqual([legacyPattern]);
    expect(observed.guard.status, observed.guard.output).toBe(1);
    expect(observed.guard.output).toContain("probe.md");
  });
});
