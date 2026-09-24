import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { defaultConfig } from "../../src/core/config.js";
import { parseRecordTable } from "../../src/core/storyTree/tables.js";
import { validateProject } from "../../src/core/validate.js";
import { runInit } from "../../src/cli/commands/init.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import {
  executePlannedStep,
  runStep,
  type MigrationContext,
  type MigrationStep,
} from "../../src/migration/specToStory/harness.js";
import { serializeIdMap } from "../../src/migration/specToStory/idMap.js";
import { step01, STEP01_RENAMES } from "../../src/migration/specToStory/step01RenameDirectories.js";
import { step02 } from "../../src/migration/specToStory/step02MergeTables.js";
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
  it("installs a resolvable migration skill on both fresh and old-layout projects", async () => {
    // QFAI:EX-0004-0001-01
    const fresh = await mkdtemp(path.join(tmpdir(), "qfai-bf4-fresh-"));
    const legacy = await mkdtemp(path.join(tmpdir(), "qfai-bf4-legacy-"));
    roots.push(fresh, legacy);
    await put(legacy, ".qfai/specs/spec-0001/01_Spec.md", "# Old\n");
    for (const root of [fresh, legacy]) {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const skill = path.join(root, ".qfai/assistant/skill/qfai-migration-spec-to-story");
      expect(await readFile(path.join(skill, "SKILL.md"), "utf8")).toContain(
        "qfai-migration-spec-to-story",
      );
      expect(await readdir(path.join(skill, "scripts"))).toContain("01-rename-directories.mjs");
      for (const host of [".claude/skills", ".agents/skills", ".codex/skills", ".github/skills"]) {
        expect(await realpath(path.join(root, host, "qfai-migration-spec-to-story"))).toBe(
          await realpath(skill),
        );
      }
    }
  });

  it("delegates link and managed-ignore mutations to the init writers", async () => {
    // QFAI:EX-0004-0001-02
    const source = path.resolve(getInitAssetsDir(), "../../src/migration/specToStory");
    const links = await readFile(path.join(source, "step09RepointLinks.ts"), "utf8");
    const ignore = await readFile(path.join(source, "step10UpdateGitignore.ts"), "utf8");
    expect(links).toContain(
      'import { repairIntegrationWrappers } from "../../cli/commands/init.js"',
    );
    expect(links).toContain("await repairIntegrationWrappers(");
    expect(ignore).toContain(
      'import { ensureRootGitignoreEntries } from "../../cli/commands/init.js"',
    );
    expect(ignore).toContain("await ensureRootGitignoreEntries(context.root, false");
    expect(links).not.toMatch(/\b(?:symlink|unlink|rm|writeFile)\s*\(/);
    expect(ignore).not.toMatch(/\b(?:writeFile|appendFile|rename)\s*\(/);
  });

  it("reports only the old layout across five profiles, ahead of a missing story file", async () => {
    // QFAI:EX-0004-0002-01
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(context.root, ".qfai/spec/spec-0001/01_Spec.md", "# Old\n");
    await put(
      context.root,
      ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md",
      "# New\n",
    );
    for (const profile of ["sdd", "atdd", "tdd", "full", "drift"] as const) {
      const result = await validateProject(
        context.root,
        {
          config: context.config,
          issues: [],
          configPath: path.join(context.root, "qfai.config.yaml"),
        },
        { profile },
      );
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]?.code).toBe("QFAI-LAYOUT-001");
      expect(result.issues[0]?.severity).toBe("error");
      expect(result.issues[0]?.message).toContain(path.join(context.root, ".qfai/spec"));
      expect(result.issues[0]?.message).toContain("/qfai-migration-spec-to-story");
      expect(result.issues[0]?.message).toMatch(
        /; run \/qfai-migration-spec-to-story before validation\.$/,
      );
      expect(result.issues[0]?.message).not.toContain("03_Example.md");
    }
  });

  it("refuses a truncated migration ID map before step 5 changes any bytes", async () => {
    // QFAI:EX-0004-0003-06
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(context.root, ".qfai/spec/spec-0001/06_Test-Cases.md", "# Cases\n");
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      '{"version":1,"ids":',
    );
    const before = await treeHash(context.root);
    const result = capture();
    expect(await runStep(5, [], { cwd: context.root, ...result.io })).toBe(2);
    expect(result.error).toContain(".qfai/evidence/migration-spec-to-story/id-map.json");
    expect(await treeHash(context.root)).toBe(before);
  });

  it("requires a local package install when a copied script has no qfai dependency", async () => {
    // QFAI:EX-0004-0003-04
    const context = await fixture();
    await put(context.root, ".qfai/specs/spec-0001/01_Spec.md", "# Old\n");
    const installedSkill = path.join(
      context.root,
      ".qfai/assistant/skill/qfai-migration-spec-to-story",
    );
    await cp(
      path.join(getInitAssetsDir(), ".qfai/assistant/skill/qfai-migration-spec-to-story"),
      installedSkill,
      { recursive: true },
    );
    const before = await treeHash(context.root);
    const result = spawnSync(
      process.execPath,
      [path.join(installedSkill, "scripts/01-rename-directories.mjs")],
      {
        cwd: context.root,
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("npm install --save-dev qfai");
    expect(await treeHash(context.root)).toBe(before);
  });

  it("runs step 5 after a valid ID map without demanding an earlier step", async () => {
    // QFAI:EX-0004-0003-09
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(
      context.root,
      ".qfai/evidence/migration-spec-to-story/id-map.json",
      serializeIdMap({
        version: 1,
        ids: { "spec-0001": {} },
        placements: { "spec-0001": {} },
        retiredPacks: {},
      }),
    );
    const result = capture();
    expect(await runStep(5, [], { cwd: context.root, ...result.io })).toBe(0);
    expect(result.output).not.toMatch(/Run step [1-4]/);
    expect(result.output).toContain("## Operations\nnone");
  });

  it("archives pack decisions and questions after writing their new rows", async () => {
    // QFAI:EX-0004-0003-19
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    const decisions = "# Decisions\n\n### DR-0001: Choose A\n\n- Status: accepted\n";
    const questions =
      "# Questions\n\n## Open Questions\n\n| OQ-ID | Question | Status | Notes |\n| --- | --- | --- | --- |\n| OQ-0001-0001 | Choose B? | open | Ask owner |\n";
    await put(context.root, ".qfai/spec/spec-0001/07_Decisions.md", decisions);
    await put(context.root, ".qfai/spec/spec-0001/08_Open-questions.md", questions);
    expect((await run(step02, context)).code).toBe(0);
    expect(
      parseRecordTable(await read(context.root, ".qfai/spec/decisions.md"), "decisions").rows,
    ).toHaveLength(1);
    expect(
      parseRecordTable(await read(context.root, ".qfai/spec/open-questions.md"), "open-questions")
        .rows,
    ).toHaveLength(1);
    expect(
      await read(
        context.root,
        ".qfai/evidence/migration-spec-to-story/retired/spec-0001/07_Decisions.md",
      ),
    ).toBe(decisions);
    expect(
      await read(
        context.root,
        ".qfai/evidence/migration-spec-to-story/retired/spec-0001/08_Open-questions.md",
      ),
    ).toBe(questions);
    await expect(read(context.root, ".qfai/spec/spec-0001/07_Decisions.md")).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      read(context.root, ".qfai/spec/spec-0001/08_Open-questions.md"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
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

  it("merges all six decision origins into consecutive four-cell records", async () => {
    // QFAI:EX-0004-0005-01
    // QFAI:EX-0004-0005-02
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(
      context.root,
      ".qfai/spec/spec-0001/07_Decisions.md",
      "# Decisions\n\n### DR-0001: First\n\n- Status: accepted\n\n### DR-0002: Second\n\n- Status: proposed\n",
    );
    await put(
      context.root,
      ".qfai/spec/spec-0001/09_delta.md",
      "# Delta\n\n### DL-0001: Delta\n\nnotes: Keep the delta.\n\n## Triage\n\n| Subject | Operation | Rationale |\n| --- | --- | --- |\n| Compatibility | UPDATE | Keep compatibility. |\n",
    );
    await put(
      context.root,
      ".qfai/spec/_policies/08_Decisions.md",
      "# Decisions\n\n### DR-0003: Shared\n\n- Status: accepted\n",
    );
    await put(
      context.root,
      ".qfai/decisions/CR-20260101-0001.md",
      "# Request\n\n- ID: CR-20260101-0001\n- Title: Change paths\n- Status: accepted\n\n## Impact scope\n\n`src/a.ts` and `docs/b.md`\n",
    );
    const result = await run(step02, context);
    expect(result.code).toBe(0);
    const decisions = parseRecordTable(
      await read(context.root, ".qfai/spec/decisions.md"),
      "decisions",
    );
    expect(decisions.errors).toEqual([]);
    expect(decisions.rows).toHaveLength(6);
    expect(decisions.rows.map((row) => row.id)).toEqual([
      "DEC-0001",
      "DEC-0002",
      "DEC-0003",
      "DEC-0004",
      "DEC-0005",
      "DEC-0006",
    ]);
    for (const row of decisions.rows.slice(0, 5))
      expect(row.content).toMatch(/^\.qfai\/spec\/.*#(?:DR-|DL-|Triage-)/);
    const request = decisions.rows[5];
    expect(request?.content).toContain("Change request: src/a.ts, docs/b.md");
    expect(request?.approach).toMatch(/^\.qfai\/decisions\/CR-20260101-0001\.md:/);
  });

  it("records a retired pack without placing it in a new flow", async () => {
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(
      context.root,
      ".qfai/spec/spec-0001/01_Spec.md",
      "# Old\n\n- Status: superseded\n- Superseded by: spec-0002\n",
    );
    const result = await run(step02, context);
    expect(result.code).toBe(0);
    const rows = parseRecordTable(
      await read(context.root, ".qfai/spec/decisions.md"),
      "decisions",
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "DONE" });
    expect(rows[0]?.content).toContain("spec-0001 is superseded by spec-0002");
    await expect(
      readdir(path.join(context.root, ".qfai/spec/02_business-flow")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("maps question statuses while omitting the no-question row", async () => {
    // QFAI:EX-0004-0005-06
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(
      context.root,
      ".qfai/spec/spec-0001/08_Open-questions.md",
      "# Questions\n\n## Open Questions\n\n| OQ-ID | Question | Status | Notes |\n| --- | --- | --- | --- |\n| OQ-0001-0001 | First? | open | A |\n| OQ-0001-0002 | Second? | deferred | B |\n| OQ-0001-0003 | Third? | resolved | C |\n| OQ-0001-0004 | Fourth? | parked | D |\n| none | No questions | — | — |\n",
    );
    expect((await run(step02, context)).code).toBe(0);
    const rows = parseRecordTable(
      await read(context.root, ".qfai/spec/open-questions.md"),
      "open-questions",
    ).rows;
    expect(rows.map((row) => [row.id, row.status])).toEqual([
      ["OQ-0001", "TODO"],
      ["OQ-0002", "DEFERRED"],
      ["OQ-0003", "DONE"],
      ["OQ-0004", "TODO"],
    ]);
    expect(
      rows.every((row) => row.content.startsWith(".qfai/spec/spec-0001/08_Open-questions.md#")),
    ).toBe(true);
  });

  it("preserves an unadjudicated question as TODO with an origin", async () => {
    // QFAI:EX-0004-0005-07
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(
      context.root,
      ".qfai/spec/spec-0001/08_Open-questions.md",
      "# Questions\n\n## Open Questions\n\n| OQ-ID | Question | Status | Notes |\n| --- | --- | --- | --- |\n| OQ-0001-0001 | Choose a path? | unadjudicated | Needs review |\n",
    );
    expect((await run(step02, context)).code).toBe(0);
    const row = parseRecordTable(
      await read(context.root, ".qfai/spec/open-questions.md"),
      "open-questions",
    ).rows[0];
    expect(row).toMatchObject({ status: "TODO" });
    expect(row?.content).toBe("Unadjudicated: Choose a path?");
    expect(row?.approach).toMatch(/^\.qfai\/spec\/spec-0001\/08_Open-questions\.md/);
    expect(row?.approach).toContain("Needs review");
  });

  it("reports both superseded decisions with unresolved successors", async () => {
    // QFAI:EX-0004-0005-08
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(
      context.root,
      ".qfai/spec/spec-0001/07_Decisions.md",
      "# Decisions\n\n### DR-0001: No successor\n\n- Status: superseded\n\n### DR-0002: Missing successor\n\n- Status: superseded\n- Successor: DR-9999\n",
    );
    const result = await run(step02, context);
    expect(result.code).toBe(3);
    expect(result.output).toContain("DR-0001 has no migrated successor");
    expect(result.output).toContain("DR-0002 has no migrated successor");
    const rows = parseRecordTable(
      await read(context.root, ".qfai/spec/decisions.md"),
      "decisions",
    ).rows;
    expect(rows.map((row) => row.status)).toEqual(["TODO", "TODO"]);
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
