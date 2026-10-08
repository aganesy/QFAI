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
import { expectSentence } from "../helpers/shippedSentences.js";
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
      const relative = path.relative(root, target).replaceAll(path.sep, "/");
      hash.update(relative);
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

const FINISH_TOKENS = ["/qfai-migration-v1-to-v2", "/qfai-sdd"] as const;

function messageLines(message: string): string[] {
  return message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** Each file on a line of its own, either bare or as a list item. */
function expectListedFiles(message: string, files: readonly string[]): void {
  const lines = messageLines(message).map((line) => line.replace(/^[-*]\s+/, ""));
  for (const file of files) expect(lines, file).toContain(file);
}

/** The last line names the two skills. */
function expectFinishLine(message: string): void {
  const last = messageLines(message).at(-1) ?? "";
  for (const token of FINISH_TOKENS) expect(last, token).toContain(token);
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
      const skill = path.join(root, ".qfai/assistant/skill/qfai-migration-v1-to-v2");
      expect(await readFile(path.join(skill, "SKILL.md"), "utf8")).toContain(
        "qfai-migration-v1-to-v2",
      );
      expect(await readdir(path.join(skill, "scripts"))).toContain("01-rename-directories.mjs");
      for (const host of [".claude/skills", ".agents/skills", ".codex/skills", ".github/skills"]) {
        expect(await realpath(path.join(root, host, "qfai-migration-v1-to-v2"))).toBe(
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
      'import { repairIntegrationWrappers } from "../../core/init/wrapperRepair.js"',
    );
    expect(links).toContain("await repairIntegrationWrappers(");
    expect(ignore).toContain(
      'import { ensureRootGitignoreEntries } from "../../core/init/rootGitignore.js"',
    );
    expect(ignore).toContain("await ensureRootGitignoreEntries(context.root, false");
    const init = await readFile(path.resolve(source, "../../cli/commands/init.ts"), "utf8");
    expect(init).toContain(
      'import { ensureRootGitignoreEntries } from "../../core/init/rootGitignore.js"',
    );
    expect(links).not.toMatch(/\b(?:symlink|unlink|rm|writeFile)\s*\(/);
    expect(ignore).not.toMatch(/\b(?:writeFile|appendFile|rename)\s*\(/);
  });

  // QFAI:EX-0004-0002-01
  it("reports only the old layout across every profile, ahead of a missing story file", async () => {
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(context.root, ".qfai/spec/spec-0001/01_Spec.md", "# Old\n");
    await put(context.root, ".qfai/spec/spec-0001/04_Business-Rules.md", "# Old rules\n");
    await put(
      context.root,
      ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md",
      "# New\n",
    );
    for (const profile of [
      "discussion",
      "sdd",
      "prototyping",
      "atdd",
      "tdd",
      "verify",
      "full",
      "saas-package",
      "drift",
    ] as const) {
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
      const message = result.issues[0]?.message ?? "";
      expectListedFiles(message, [
        ".qfai/spec/spec-0001/01_Spec.md",
        ".qfai/spec/spec-0001/04_Business-Rules.md",
      ]);
      expectFinishLine(message);
      expect(message).not.toContain("01_User-story.md");
      expect(message).not.toContain("03_Example.md");
    }
  });

  // QFAI:EX-0004-0002-02
  it("reports a policies-only old layout ahead of a missing story file", async () => {
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(context.root, ".qfai/spec/_policies/04_Business-Flow.md", "# Old\n");
    await put(
      context.root,
      ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md",
      "# New\n",
    );
    const result = await validateProject(
      context.root,
      {
        config: context.config,
        issues: [],
        configPath: path.join(context.root, "qfai.config.yaml"),
      },
      { profile: "sdd" },
    );
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe("QFAI-LAYOUT-001");
    const message = result.issues[0]?.message ?? "";
    expect(message).toContain(path.join(context.root, ".qfai/spec"));
    expectListedFiles(message, [".qfai/spec/_policies/04_Business-Flow.md"]);
    expectFinishLine(message);
  });

  // QFAI:EX-0004-0002-03
  it("reports the former default spec root when the new root is configured", async () => {
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(context.root, ".qfai/specs/spec-0001/01_Spec.md", "# Old\n");
    await put(
      context.root,
      ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md",
      "# New\n",
    );
    const result = await validateProject(
      context.root,
      {
        config: context.config,
        issues: [],
        configPath: path.join(context.root, "qfai.config.yaml"),
      },
      { profile: "full" },
    );
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe("QFAI-LAYOUT-001");
    const message = result.issues[0]?.message ?? "";
    expect(message).toContain(path.join(context.root, ".qfai/specs"));
    expectListedFiles(message, [".qfai/specs/spec-0001/01_Spec.md"]);
    expectFinishLine(message);
  });

  // QFAI:EX-0004-0003-06
  it("refuses a truncated migration ID map before step 5 changes any bytes", async () => {
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(context.root, ".qfai/spec/spec-0001/06_Test-Cases.md", "# Cases\n");
    await put(context.root, "tmp/qfai-migration/id-map.json", '{"version":1,"ids":');
    const before = await treeHash(context.root);
    const result = capture();
    expect(await runStep(5, [], { cwd: context.root, ...result.io })).toBe(2);
    expect(result.error).toContain("tmp/qfai-migration/id-map.json");
    expect(await treeHash(context.root)).toBe(before);
  });

  // QFAI:EX-0004-0003-04
  it("requires a local package install when a copied script has no qfai dependency", async () => {
    const context = await fixture();
    await put(context.root, ".qfai/specs/spec-0001/01_Spec.md", "# Old\n");
    const installedSkill = path.join(context.root, ".qfai/assistant/skill/qfai-migration-v1-to-v2");
    await cp(
      path.join(getInitAssetsDir(), ".qfai/assistant/skill/qfai-migration-v1-to-v2"),
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

  // QFAI:EX-0004-0003-09
  it("runs step 5 after a valid ID map without demanding an earlier step", async () => {
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(
      context.root,
      "tmp/qfai-migration/id-map.json",
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

  // QFAI:EX-0004-0003-19
  it("deletes pack decisions and questions after writing their new rows", async () => {
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
    await expect(read(context.root, ".qfai/spec/spec-0001/07_Decisions.md")).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      read(context.root, ".qfai/spec/spec-0001/08_Open-questions.md"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
  // QFAI:EX-0004-0004-01
  it("moves every present default directory and skips an absent prototype directory", async () => {
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

  // QFAI:EX-0004-0004-02
  it("rewrites only present default config keys", async () => {
    const context = await fixture("paths:\n  specsDir: .qfai/specs\n");
    await put(context.root, ".qfai/specs/spec-0001/01_Spec.md", "original");
    expect((await run(step01, context)).code).toBe(0);
    const paths = (
      parseYaml(await read(context.root, "qfai.config.yaml")) as { paths: Record<string, string> }
    ).paths;
    expect(paths.specsDir).toBe(".qfai/spec");
    expect(paths).not.toHaveProperty("promptsDir");
  });

  // QFAI:EX-0004-0004-03
  it("leaves a configured custom spec path and its bytes untouched", async () => {
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

  // QFAI:EX-0004-0004-04
  it("preserves a current skill while deleting its colliding plural predecessor", async () => {
    const context = await fixture();
    await put(context.root, ".qfai/assistant/skill/qfai-sdd/SKILL.md", "current");
    await put(context.root, ".qfai/assistant/skills/qfai-sdd/SKILL.md", "old");
    await put(context.root, ".qfai/assistant/skills/team-review/SKILL.md", "team");
    const result = await run(step01, context);
    expect(result.code).toBe(0);
    expect(await read(context.root, ".qfai/assistant/skill/qfai-sdd/SKILL.md")).toBe("current");
    expect(await read(context.root, ".qfai/assistant/skill/team-review/SKILL.md")).toBe("team");
    expect(result.output).toContain(
      ".qfai/assistant/skills/qfai-sdd: delete: the destination exists",
    );
    await expect(readdir(path.join(context.root, ".qfai/assistant/skills"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  // QFAI:EX-0004-0004-05
  it("moves local skills without changing their bytes", async () => {
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

  // QFAI:EX-0004-0005-01
  // QFAI:EX-0004-0005-02
  it("merges all six decision origins into consecutive four-cell records", async () => {
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

  // QFAI:EX-0004-0005-09
  it("appends after the rows decisions.md already holds without changing them", async () => {
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    const existing =
      "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| DEC-0001 | First kept decision | Kept | DONE |\n| DEC-0002 | Second kept decision | Kept | TODO |\n";
    await put(context.root, ".qfai/spec/decisions.md", existing);
    await put(
      context.root,
      ".qfai/spec/spec-0001/07_Decisions.md",
      "# Decisions\n\n### DR-0001: Choose A\n\n- Status: accepted\n",
    );
    expect((await run(step02, context)).code).toBe(0);
    const text = await read(context.root, ".qfai/spec/decisions.md");
    const rows = parseRecordTable(text, "decisions").rows;
    expect(rows.map((row) => row.id)).toEqual(["DEC-0001", "DEC-0002", "DEC-0003"]);
    expect(rows[2]?.content).toContain("DR-0001");
    for (const line of existing.split("\n").filter((entry) => entry.startsWith("| DEC-")))
      expect(text).toContain(line);
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

  // QFAI:EX-0004-0005-06
  it("maps question statuses while omitting the no-question row", async () => {
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

  // QFAI:EX-0004-0005-07
  it("preserves an unadjudicated question as TODO with an origin", async () => {
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

  // QFAI:EX-0004-0005-08
  it("reports both superseded decisions with unresolved successors", async () => {
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

  // QFAI:EX-0004-0010-01
  // QFAI:EX-0004-0010-02
  // QFAI:EX-0004-0010-03
  // QFAI:EX-0004-0010-04
  it("rewrites mapped case and E2E story annotations but retains unsupported lines", async () => {
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(
      context.root,
      "tmp/qfai-migration/id-map.json",
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
      "const stable = true; // QFAI:SPEC-0001:TC-0001-0001\n// QFAI:SPEC-0001:US-0001-0001\n// x-qfai-status: planned\n";
    const e2e = "// QFAI:SPEC-0001:US-0001-0001\n// QFAI:SPEC-0001:TC-0001-9999\n";
    await put(context.root, "tests/integration/checkout.test.ts", integration);
    await put(context.root, "tests/e2e/checkout.test.ts", e2e);
    const result = await run(step08, context);
    expect(result.code).toBe(3);
    expect(await read(context.root, "tests/integration/checkout.test.ts")).toBe(
      integration.replace("QFAI:SPEC-0001:TC-0001-0001", ["QFAI", "EX-0001-0001-01"].join(":")),
    );
    expect(await read(context.root, "tests/e2e/checkout.test.ts")).toBe(
      e2e.replace("QFAI:SPEC-0001:US-0001-0001", ["QFAI", "BF-0001"].join(":")),
    );
    expect(await read(context.root, ".qfai/spec/01_policy/objective.md")).toContain(
      "x-qfai-status: external",
    );
    expect(result.output).toContain("## Annotations kept");
    expect(result.output).toContain("QFAI:SPEC-0001:US-0001-0001");
    expect(result.output).toContain("QFAI:SPEC-0001:TC-0001-9999");
    expect(result.output).toContain("## For a person");
  });

  // QFAI:EX-0004-0003-01
  // QFAI:EX-0004-0003-03
  it("rejects an extra option and a missing root config before migration writes", async () => {
    const context = await fixture();
    await put(context.root, ".qfai/specs/spec-0001/01_Spec.md", "old");
    const before = await treeHash(context.root);
    const badOption = capture();
    expect(await runStep(1, ["--force"], { cwd: context.root, ...badOption.io })).toBe(2);
    expect(badOption.error).toContain("--force");
    expect(await treeHash(context.root)).toBe(before);
    const withDryRun = capture();
    expect(
      await runStep(1, ["--dry-run", "--force"], { cwd: context.root, ...withDryRun.io }),
    ).toBe(2);
    expect(withDryRun.error).toContain("--force");
    expect(withDryRun.output).toBe("");
    expect(await treeHash(context.root)).toBe(before);
    const missingRoot = capture();
    expect(await runStep(1, [], { cwd: path.join(context.root, ".qfai"), ...missingRoot.io })).toBe(
      2,
    );
    expect(missingRoot.error).toContain("qfai.config.yaml");
    expect(await treeHash(context.root)).toBe(before);
  });

  // QFAI:EX-0004-0003-02
  it("reports step 1 on dry run without changing bytes, then performs the same rename", async () => {
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

  // QFAI:EX-0004-0003-07
  // QFAI:EX-0004-0003-08
  it("requires step 1 before step 2 and an ID map before step 5", async () => {
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
    const annotationsWithoutMap = capture();
    expect(await runStep(8, [], { cwd: context.root, ...annotationsWithoutMap.io })).toBe(2);
    expect(annotationsWithoutMap.error).toContain("Run step 4");
    expect(await treeHash(context.root)).toBe(noMapBefore);
  });

  // QFAI:EX-0004-0012-01
  it("ships the plan, dry-run, printed report, deduplication and validation procedure in order", async () => {
    const skill = await readFile(
      path.join(getInitAssetsDir(), ".qfai/assistant/skill/qfai-migration-v1-to-v2/SKILL.md"),
      "utf8",
    );
    const markers = [
      "plan.yaml",
      "run `--dry-run` first",
      "Read the report each step prints",
      "Remove facts duplicated in different words",
      "Run steps 4 to 10 in order, each with `--dry-run` followed by the real run",
      "After step 10, run steps 11 and 12",
      "run `npx qfai validate` through the launcher proven by preflight",
    ];
    const prose = skill.replace(/\s+/g, " ");
    const positions = markers.map((marker) => prose.indexOf(marker));
    expect(markers.filter((_, index) => (positions[index] ?? -1) < 0)).toEqual([]);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(prose).toMatch(
      /already has the story tree and no migration ID map, run steps 1 to 10\. When every one of them prints `no 1\.x layout found under <specsDir> \(paths\.specsDir=<value>\)` first, then `none` under every section, and exits 0, report that there is nothing to migrate in the directory that line names and ask the person to check that the specs live there/,
    );
  });

  // QFAI:EX-0004-0012-06
  it("names the run on a 1.x project and the run on a project an earlier 2.x release migrated", async () => {
    const skillDir = path.join(getInitAssetsDir(), ".qfai/assistant/skill/qfai-migration-v1-to-v2");
    for (const file of ["SKILL.md", "references/migration-guide.md"]) {
      const prose = (await readFile(path.join(skillDir, file), "utf8")).replace(/\s+/g, " ");
      expect(prose, file).toContain("1.x");
      expect(prose, file).toContain(
        "Every step runs: steps 1 to 10 migrate the spec packs, and step 11 installs the free-text entry and the reminder hooks",
      );
      expect(prose, file).toContain("an earlier 2.x release");
      expect(prose, file).toContain("find no 1.x layout and change nothing");
      expect(prose, file).toMatch(/step 11 adds only what that release lacked[^.]*hooks/i);
    }
  });

  // QFAI:EX-0004-0012-08
  it("names the three first lines and directs the AI to name the directory and ask for a check", async () => {
    const skillDir = path.join(getInitAssetsDir(), ".qfai/assistant/skill/qfai-migration-v1-to-v2");
    for (const file of ["SKILL.md", "references/migration-guide.md"]) {
      const text = await readFile(path.join(skillDir, file), "utf8");
      const prose = text.replace(/\s+/g, " ");
      for (const line of [
        "`no 1.x layout found under <specsDir> (paths.specsDir=<value>)`",
        "`already migrated (id-map.json present)`",
        "`1.x layout found, migrating`",
      ]) {
        expect(prose, `${file} names ${line}`).toContain(line);
      }
      for (const [line, meaning] of [
        ["no 1.x layout found under", /no trace of the old layout/],
        ["1.x layout found, migrating", /trace of the old layout, or step 1, 9 or 10 has work/],
        ["already migrated (id-map.json present)", /earlier run migrated the project/],
      ] as const) {
        const row = expectSentence(text, `${file} says what ${line} means`, meaning);
        expect(row, `${file} says what ${line} means`).toContain(line);
      }
      expectSentence(
        text,
        `${file} directs the report, the directory and the check`,
        /every one of (?:them|steps 1 to 10) prints/,
        /nothing to migrate in the directory (?:that|the) line names/,
        /\bask the person to check that the specs live there/,
      );
    }
  });

  // QFAI:EX-0004-0012-02
  it("reports no operations for all ten steps in an already migrated project", async () => {
    const context = await fixture(
      "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
    );
    await put(context.root, ".qfai/spec/01_policy/objective.md", "# Objective\n");
    const before = await treeHash(context.root);
    const none = "no 1.x layout found under .qfai/spec (paths.specsDir=.qfai/spec)";
    for (let step = 1; step <= 10; step += 1) {
      const report = capture();
      expect(await runStep(step, [], { cwd: context.root, ...report.io })).toBe(0);
      expect(report.output.split("\n").slice(0, 3)).toEqual([none, "", "## Operations"]);
      expect(report.output).toContain("## Operations\nnone");
      expect(report.output.trimEnd().split("\n").at(-1)?.startsWith("Summary")).toBe(step === 10);
      expect(report.output).not.toContain("## For a person\n-");
      expect(report.output).not.toContain("## Git index");
      expect(await treeHash(context.root)).toBe(before);
    }
  });

  // QFAI:EX-0004-0012-07
  it("ships a guide that says each checkout and worktree needs its own install", async () => {
    const guide = await readFile(
      path.join(
        getInitAssetsDir(),
        ".qfai/assistant/skill/qfai-migration-v1-to-v2/references/migration-guide.md",
      ),
      "utf8",
    );
    expect(guide.replace(/\s+/g, " ")).toContain(
      "Each checkout and each git worktree needs its own install before `npx qfai` resolves 2.x",
    );
  });

  // QFAI:EX-0004-0012-04
  it("ships a guide that gives the exact release and old-layout support boundary", async () => {
    const guide = await readFile(
      path.join(
        getInitAssetsDir(),
        ".qfai/assistant/skill/qfai-migration-v1-to-v2/references/migration-guide.md",
      ),
      "utf8",
    );
    expect(guide).toContain("QFAI 2.0.0");
    expect(guide).not.toMatch(/QFAI v2\.0\.0/);
    expect(guide).toContain("QFAI 2.x does not read the old spec-pack layout");
    expect(guide).toContain("pinned 1.x release");
    expect(guide).toContain("migrate the project before using");
    expect(guide).toContain(
      "node .qfai/assistant/skill/qfai-migration-v1-to-v2/scripts/01-rename-directories.mjs",
    );
    expect(guide).toContain("## Resolve the reports");
    expect(guide).toContain("Resolve each `## For a person` row");
    for (const part of ["migration-guide.md", "migration-placement.md"]) {
      const text = await readFile(
        path.join(
          getInitAssetsDir(),
          ".qfai/assistant/skill/qfai-migration-v1-to-v2/references",
          part,
        ),
        "utf8",
      );
      expect(text, part).not.toMatch(/(?:BF|US|AC|EX|BR)-00(?:1\d|[2-9]\d)/);
    }
  });
});
