import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { defaultConfig } from "../../src/core/config.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import {
  executePlannedStep,
  runStep,
  type MigrationContext,
  type MigrationStep,
} from "../../src/migration/specToStory/harness.js";
import { serializeIdMap } from "../../src/migration/specToStory/idMap.js";
import { step01, STEP01_RENAMES } from "../../src/migration/specToStory/step01RenameDirectories.js";
import { step08 } from "../../src/migration/specToStory/step08RewriteAnnotations.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture(
  config = "paths:\n  specsDir: .qfai/specs\n  contractsDir: .qfai/contracts\n",
): Promise<MigrationContext> {
  const root = await mkdtemp(path.join(tmpdir(), "qfai-bf4-examples-"));
  roots.push(root);
  await put(root, "qfai.config.yaml", config);
  const parsed = parseYaml(config) as { paths?: { specsDir?: string; contractsDir?: string } };
  const settings = structuredClone(defaultConfig);
  settings.paths.specsDir = parsed.paths?.specsDir ?? ".qfai/specs";
  settings.paths.contractsDir = parsed.paths?.contractsDir ?? ".qfai/contracts";
  settings.paths.testsDir = "tests";
  settings.validation.traceability.testFileGlobs = ["tests/**/*.test.ts"];
  return {
    root,
    specsDir: path.join(root, settings.paths.specsDir),
    contractsDir: path.join(root, settings.paths.contractsDir),
    config: settings,
  };
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

async function read(root: string, relative: string): Promise<string> {
  return readFile(path.join(root, relative), "utf8");
}

async function treeHash(root: string): Promise<string> {
  const hash = createHash("sha256");
  async function visit(directory: string): Promise<void> {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const target = path.join(directory, entry.name);
      hash.update(path.relative(root, target).replaceAll(path.sep, "/"));
      if (entry.isDirectory()) await visit(target);
      else hash.update(await readFile(target));
    }
  }
  await visit(root);
  return hash.digest("hex");
}

function capture() {
  let output = "";
  let error = "";
  return {
    get output() {
      return output;
    },
    get error() {
      return error;
    },
    io: {
      stdout: {
        write: (text: string) => {
          output += text;
        },
      },
      stderr: {
        write: (text: string) => {
          error += text;
        },
      },
    },
  };
}

async function run(step: MigrationStep, context: MigrationContext, dryRun = false) {
  const captured = capture();
  const code = await executePlannedStep(step, context, dryRun, captured.io);
  return { code, output: captured.output, error: captured.error };
}

describe("BF-0004 migration examples", () => {
  it("moves every present default directory and skips an absent prototype directory", async () => {
    // QFAI:EX-0004-0004-01
    const context = await fixture();
    for (const [source] of STEP01_RENAMES) {
      if (source === ".qfai/prototypes") continue;
      await put(context.root, `${source}/sentinel.md`, source);
    }
    const result = await run(step01, context);
    expect(result.code).toBe(0);
    for (const [source, target] of STEP01_RENAMES) {
      if (source === ".qfai/prototypes") continue;
      expect(await read(context.root, `${target}/sentinel.md`)).toBe(source);
      await expect(readdir(path.join(context.root, source))).rejects.toMatchObject({
        code: "ENOENT",
      });
    }
    await expect(readdir(path.join(context.root, ".qfai/prototype"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(result.output).not.toContain(".qfai/prototypes");
  });

  it("rewrites only present default config keys", async () => {
    // QFAI:EX-0004-0004-02
    const context = await fixture("paths:\n  specsDir: .qfai/specs\n");
    await put(context.root, ".qfai/specs/spec-0001/01_Spec.md", "original");
    expect((await run(step01, context)).code).toBe(0);
    const paths = (
      parseYaml(await read(context.root, "qfai.config.yaml")) as { paths: Record<string, string> }
    ).paths;
    expect(paths.specsDir).toBe(".qfai/spec");
    expect(paths).not.toHaveProperty("promptsDir");
  });

  it("leaves a configured custom spec path and its bytes untouched", async () => {
    // QFAI:EX-0004-0004-03
    const context = await fixture(
      "paths:\n  specsDir: docs/specs\n  contractsDir: .qfai/contracts\n",
    );
    const original = Buffer.from("custom spec\r\n", "utf8");
    const target = path.join(context.root, "docs/specs/spec-0001/01_Spec.md");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, original);
    expect((await run(step01, context)).code).toBe(0);
    expect(
      (parseYaml(await read(context.root, "qfai.config.yaml")) as { paths: { specsDir: string } })
        .paths.specsDir,
    ).toBe("docs/specs");
    expect(await readFile(target)).toEqual(original);
  });

  it("preserves a current skill while archiving its colliding plural predecessor", async () => {
    // QFAI:EX-0004-0004-04
    const context = await fixture();
    await put(context.root, ".qfai/assistant/skill/qfai-sdd/SKILL.md", "current");
    await put(context.root, ".qfai/assistant/skills/qfai-sdd/SKILL.md", "old");
    await put(context.root, ".qfai/assistant/skills/team-review/SKILL.md", "team");
    const result = await run(step01, context);
    expect(result.code).toBe(0);
    expect(await read(context.root, ".qfai/assistant/skill/qfai-sdd/SKILL.md")).toBe("current");
    expect(await read(context.root, ".qfai/assistant/skill/team-review/SKILL.md")).toBe("team");
    expect(
      await read(
        context.root,
        ".qfai/evidence/migration-spec-to-story/legacy/skills/qfai-sdd/SKILL.md",
      ),
    ).toBe("old");
    expect(result.output).toContain("legacy/skills/qfai-sdd");
    await expect(readdir(path.join(context.root, ".qfai/assistant/skills"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("moves local skills without changing their bytes", async () => {
    // QFAI:EX-0004-0004-05
    const context = await fixture();
    const original = Buffer.from([0x23, 0x20, 0x53, 0x4b, 0x49, 0x4c, 0x4c, 0x0d, 0x0a]);
    const source = path.join(context.root, ".qfai/assistant/skills.local/house-style/SKILL.md");
    await mkdir(path.dirname(source), { recursive: true });
    await writeFile(source, original);
    expect((await run(step01, context)).code).toBe(0);
    expect(
      await readFile(path.join(context.root, ".qfai/assistant/skill.local/house-style/SKILL.md")),
    ).toEqual(original);
    await expect(
      readdir(path.join(context.root, ".qfai/assistant/skills.local")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rewrites mapped case and E2E story annotations but retains unsupported lines", async () => {
    // QFAI:EX-0004-0010-01
    // QFAI:EX-0004-0010-02
    // QFAI:EX-0004-0010-03
    // QFAI:EX-0004-0010-04
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: {
          "spec-0001": {
            "US-0001-0001": "US-0001-0001",
            "TC-0001-0001": "EX-0001-0001-01",
          },
        },
        placements: { "spec-0001": { "US-0001-0001": "Checkout" } },
        retiredPacks: {},
      }),
    );
    await put(
      context.root,
      ".qfai/spec/01_policy/objective.md",
      "# Objective\n\nx-qfai-status: external\n",
    );
    const integration =
      "const stable = true; // QFAI:SPEC-0001:TC-0001-0001\n// QFAI:SPEC-0001:US-0001-0001\n// QFAI:CON-API-0001\n// x-qfai-status: planned\n";
    const e2e = "// QFAI:SPEC-0001:US-0001-0001\n// QFAI:SPEC-0001:TC-0001-9999\n";
    await put(context.root, "tests/integration/checkout.test.ts", integration);
    await put(context.root, "tests/e2e/checkout.test.ts", e2e);
    const result = await run(step08, context);
    expect(result.code).toBe(3);
    expect(await read(context.root, "tests/integration/checkout.test.ts")).toBe(
      integration.replace("QFAI:SPEC-0001:TC-0001-0001", "QFAI:EX-0001-0001-01"),
    );
    expect(await read(context.root, "tests/e2e/checkout.test.ts")).toBe(
      e2e.replace("QFAI:SPEC-0001:US-0001-0001", "QFAI:BF-0001"),
    );
    expect(await read(context.root, ".qfai/spec/01_policy/objective.md")).toContain(
      "x-qfai-status: external",
    );
    expect(result.output).toContain("## Annotations kept");
    expect(result.output).toContain("QFAI:CON-API-0001");
    expect(result.output).toContain("QFAI:SPEC-0001:US-0001-0001");
    expect(result.output).toContain("QFAI:SPEC-0001:TC-0001-9999");
    expect(result.output).toContain("## For a person");
  });

  it("rejects an extra option and a missing root config before migration writes", async () => {
    // QFAI:EX-0004-0003-01
    // QFAI:EX-0004-0003-03
    const context = await fixture();
    await put(context.root, ".qfai/specs/spec-0001/01_Spec.md", "old");
    const before = await treeHash(context.root);
    const badOption = capture();
    expect(await runStep(1, ["--force"], { cwd: context.root, ...badOption.io })).toBe(2);
    expect(badOption.error).toContain("--dry-run");
    expect(await treeHash(context.root)).toBe(before);
    const missingRoot = capture();
    expect(await runStep(1, [], { cwd: path.join(context.root, ".qfai"), ...missingRoot.io })).toBe(
      2,
    );
    expect(missingRoot.error).toContain("qfai.config.yaml");
    expect(await treeHash(context.root)).toBe(before);
  });

  it("reports step 1 on dry run without changing bytes, then performs the same rename", async () => {
    // QFAI:EX-0004-0003-02
    const context = await fixture();
    await put(context.root, ".qfai/specs/spec-0001/01_Spec.md", "old");
    const before = await treeHash(context.root);
    const dry = capture();
    expect(await runStep(1, ["--dry-run"], { cwd: context.root, ...dry.io })).toBe(0);
    expect(dry.output).toContain(".qfai/specs/spec-0001");
    expect(await treeHash(context.root)).toBe(before);
    const real = capture();
    expect(await runStep(1, [], { cwd: context.root, ...real.io })).toBe(0);
    expect(real.output).toContain(".qfai/spec/spec-0001");
    expect(await read(context.root, ".qfai/spec/spec-0001/01_Spec.md")).toBe("old");
    await expect(readdir(path.join(context.root, ".qfai/specs"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("requires step 1 before step 2 and an ID map before step 5", async () => {
    // QFAI:EX-0004-0003-07
    // QFAI:EX-0004-0003-08
    const context = await fixture();
    await put(context.root, ".qfai/specs/spec-0001/01_Spec.md", "old");
    const before = await treeHash(context.root);
    const outOfOrder = capture();
    expect(await runStep(2, [], { cwd: context.root, ...outOfOrder.io })).toBe(2);
    expect(outOfOrder.error).toContain("Run step 1");
    expect(await treeHash(context.root)).toBe(before);
    const renamed = await run(step01, context);
    expect(renamed.code).toBe(0);
    const noMapBefore = await treeHash(context.root);
    const missingMap = capture();
    expect(await runStep(5, [], { cwd: context.root, ...missingMap.io })).toBe(2);
    expect(missingMap.error).toContain("Run step 4");
    expect(await treeHash(context.root)).toBe(noMapBefore);
  });

  it("ships the plan, dry-run, evidence, deduplication and validation procedure in order", async () => {
    // QFAI:EX-0004-0012-01
    const skill = await readFile(
      path.join(getInitAssetsDir(), ".qfai/assistant/skill/qfai-migration-spec-to-story/SKILL.md"),
      "utf8",
    );
    const markers = [
      "plan.yaml",
      "--dry-run first",
      "complete Markdown report and exit code",
      "Remove facts duplicated in different words",
      "After step 10, run the project's local `qfai validate` launcher",
    ];
    const positions = markers.map((marker) => skill.indexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("reports no operations for all ten steps in an already migrated project", async () => {
    // QFAI:EX-0004-0012-02
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(context.root, ".qfai/spec/01_policy/objective.md", "# Objective\n");
    const before = await treeHash(context.root);
    for (let step = 1; step <= 10; step += 1) {
      const report = capture();
      expect(await runStep(step, [], { cwd: context.root, ...report.io })).toBe(0);
      expect(report.output).toContain("## Operations\nnone");
      expect(report.output).not.toContain("## For a person\n-");
      expect(await treeHash(context.root)).toBe(before);
    }
  });

  it("ships a guide that gives the exact release and old-layout support boundary", async () => {
    // QFAI:EX-0004-0012-04
    const guide = await readFile(
      path.join(
        getInitAssetsDir(),
        ".qfai/assistant/skill/qfai-migration-spec-to-story/references/migration-guide.md",
      ),
      "utf8",
    );
    expect(guide).toContain("QFAI 2.0.0");
    expect(guide).not.toMatch(/QFAI v2\.0\.0/);
    expect(guide).toContain("QFAI 2.x does not read the old spec-pack layout");
    expect(guide).toContain("pinned 1.x release");
    expect(guide).toContain("migrate the project before using");
    expect(guide).not.toMatch(/(?:BF|US|AC|EX|BR)-00(?:1\d|[2-9]\d)/);
  });
});
