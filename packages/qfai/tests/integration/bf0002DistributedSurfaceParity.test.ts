import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  declaredSampleBandIds,
  repoRootFromHere,
} from "../../scripts/lib/declared-sample-band-ids.mjs";
import { runLintShipping } from "../../scripts/lint-shipping.js";
import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";
import { isRecord } from "../helpers/shippedWorkflowFixtures.js";
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

/** One ID of each story-tree shape with a numeric segment outside the sample band. */
const OUTSIDE_BAND_IDS = [
  "DEC-0010",
  "OQ-0010",
  "BF-0010",
  "US-0001-0010",
  "AC-0001-0001-10",
  "EX-0001-0010-01",
  "BR-0010",
  "CLI-0010",
  "API-0100",
  "DB-0010",
  "UI-1000",
  "cli-0010",
  "api-0100",
  "db-0010",
  "ui-1000",
];

/** The same shapes with every numeric segment inside the sample band. */
const INSIDE_BAND_IDS = [
  "DEC-0009",
  "OQ-0009",
  "BF-0009",
  "US-0009-0009",
  "AC-0009-0009-09",
  "EX-0009-0009-09",
  "BR-0009",
  "CLI-0009",
  "API-0001",
  "DB-0009",
  "UI-0009",
  "cli-0009",
  "api-0001",
  "db-0009",
  "ui-0009",
];

/**
 * Plants one ID per file in every scanned tree and one comment line per ID in the
 * source file, so a single pass of each guard reports on the whole set.
 */
async function observeBatch(
  fixture: Fixture,
  ids: readonly string[],
): Promise<{
  smokeClasses: Map<string, string[]>;
  lintLines: number[];
  guard: { status: number | null; output: string };
  names: string[];
}> {
  const names = ids.map((_, index) => `batch-${String(index)}.md`);
  // A single-ID probe left by an earlier case would be read as one of this set.
  await Promise.all([
    rm(path.join(fixture.initRoot, "probe.md"), { force: true }),
    rm(path.join(fixture.packRoot, "assets", "probe.md"), { force: true }),
  ]);
  await Promise.all(
    ids.flatMap((id, index) => [
      writeFile(path.join(fixture.initRoot, names[index] ?? ""), `${id}\n`, "utf-8"),
      writeFile(path.join(fixture.packRoot, "assets", names[index] ?? ""), `${id}\n`, "utf-8"),
    ]),
  );
  const comments = ids.map((id) => `// ${id}`).join("\n");
  await writeFile(
    path.join(fixture.packRoot, "src/guard.ts"),
    `${comments}\nexport const guard = true;\n`,
    "utf-8",
  );
  try {
    const smoke = await scanDistributedSurface(fixture.initRoot);
    const lint = await runLintShipping(fixture.packRoot);
    const smokeClasses = new Map<string, string[]>();
    for (const hit of smoke.hits) {
      smokeClasses.set(hit.file, [...(smokeClasses.get(hit.file) ?? []), hit.className]);
    }
    return {
      smokeClasses,
      lintLines: lint.violations
        .filter((violation) => violation.file === "src/guard.ts")
        .map((violation) => violation.line)
        .sort((a, b) => a - b),
      guard: runPostBuildGuard(fixture.packRoot),
      names,
    };
  } finally {
    await Promise.all(
      names.flatMap((name) => [
        rm(path.join(fixture.initRoot, name), { force: true }),
        rm(path.join(fixture.packRoot, "assets", name), { force: true }),
      ]),
    );
  }
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
  // QFAI:EX-0002-0009-03
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
        /^internal-story-(?:dec|oq|bf|us|ac|ex|br|contract)-id-jsdoc-leak$/,
      );
      expect(rejected.guard.status, rejected.guard.output).toBe(1);
      expect(rejected.guard.output).toContain("probe.md");
    },
  );

  // QFAI:EX-0002-0009-03
  it.each(["cli-0009", "cli-0001-checkout.md", "ui-nnnn", "sub-cli-0010", "xapi-0100"])(
    "keeps %s, which names no contract file outside the sample band, in all three guards",
    async (text) => {
      const kept = await observe(fixture, text);
      expect(kept.smokeClasses).toEqual([]);
      expect(kept.lintPatterns).toEqual([]);
      expect(kept.guard.status, kept.guard.output).toBe(0);
    },
  );

  // QFAI:AC-0002-0012-02
  // QFAI:EX-0002-0012-03
  it.each(["REQ-0006", "TDD-0039"])(
    "rejects %s in a source comment in the pre-build lint alone, outside the shared set",
    async (id) => {
      const observed = await observe(fixture, id);
      expect(observed.lintPatterns).toEqual(["local-reference-id-comment"]);
      expect(observed.smokeClasses).toEqual([]);
      expect(observed.guard.status, observed.guard.output).toBe(0);
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

  // QFAI:AC-0002-0009-01
  it("rejects every story-tree shape outside the sample band in the smoke scan, the lint and the post-build guard, naming each file", async () => {
    const observed = await observeBatch(fixture, OUTSIDE_BAND_IDS);
    for (const name of observed.names) {
      expect(observed.smokeClasses.get(name), name).toEqual(["internal story id"]);
      expect(observed.guard.output, name).toContain(name);
    }
    expect(observed.lintLines).toEqual(OUTSIDE_BAND_IDS.map((_, index) => index + 1));
    expect(observed.guard.status, observed.guard.output).toBe(1);
  });

  // QFAI:AC-0002-0009-01
  it("passes the clean surface and every story-tree shape inside the sample band in all three guards", async () => {
    const observed = await observeBatch(fixture, INSIDE_BAND_IDS);
    expect([...observed.smokeClasses.keys()]).toEqual([]);
    expect(observed.lintLines).toEqual([]);
    expect(observed.guard.status, observed.guard.output).toBe(0);
  });

  // QFAI:AC-0002-0009-01
  it("rejects an in-band ID the spec tree declares, and the three guards read declared IDs from one module", async () => {
    const { businessRules, contractNames } = declaredSampleBandIds(repoRootFromHere());
    const declared = [
      ...businessRules.slice(0, 1),
      ...contractNames.slice(0, 1).map((name) => `${name}.md`),
    ];
    expect(declared).toHaveLength(2);
    const observed = await observeBatch(fixture, declared);
    for (const name of observed.names) {
      expect(observed.smokeClasses.get(name), name).toContain("declared sample band id");
      expect(observed.guard.output, name).toContain(name);
    }
    expect(observed.guard.status, observed.guard.output).toBe(1);

    for (const reader of [
      "scripts/lint-shipping.ts",
      "scripts/check-no-internal-version-leakage.sh",
      "tests/helpers/distributedSurfaceScan.ts",
    ]) {
      expect(await readFile(path.join(packageRoot, reader), "utf-8"), reader).toContain(
        "declared-sample-band-ids",
      );
    }
  });

  // QFAI:AC-0002-0012-01
  it("reports a story-tree ID outside the sample band in a source comment at its line, and leaves in-band and composite IDs to their own classes", async () => {
    const outside = [
      ["DEC-0010", "dec"],
      ["OQ-0010", "oq"],
      ["BF-0010", "bf"],
      ["US-0001-0010", "us"],
      ["AC-0001-0001-10", "ac"],
      ["EX-0001-0010-01", "ex"],
      ["BR-0001-0010", "br"],
    ] as const;
    const inside = ["DEC-0009", "OQ-0009", "BF-0009", "US-0009-0009", "AC-0009-0009-09"];
    const lines = [
      ...outside.map(([id]) => `// ${id}`),
      ...inside.map((id) => `// ${id}`),
      "// DEC-0001-0042",
      "export const guard = true;",
    ];
    await writeFile(path.join(fixture.packRoot, "src/guard.ts"), `${lines.join("\n")}\n`, "utf-8");

    const { violations } = await runLintShipping(fixture.packRoot);
    expect(
      violations
        .filter((violation) => violation.file === "src/guard.ts")
        .map(({ line, pattern, matched }) => ({ line, pattern, matched })),
    ).toEqual([
      ...outside.map(([id, kind], index) => ({
        line: index + 1,
        pattern: `internal-story-${kind}-id-jsdoc-leak`,
        matched: id,
      })),
      {
        line: outside.length + inside.length + 1,
        pattern: "internal-dec-id-jsdoc-leak",
        matched: "DEC-0001-0042",
      },
    ]);

    const manifest: unknown = JSON.parse(
      await readFile(path.resolve(packageRoot, "../../package.json"), "utf-8"),
    );
    const scripts = isRecord(manifest) ? manifest["scripts"] : undefined;
    if (!isRecord(scripts)) throw new Error("the root manifest declares no scripts");
    expect(scripts["ci:lint"]).toContain("run-lint-checks.sh");
    expect(scripts["ci:lint:structure"]).toContain("lint:shipping");
  });
});
