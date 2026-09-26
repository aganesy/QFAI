import { createHash } from "node:crypto";
import {
  appendFile,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { runInit } from "../../../src/cli/commands/init.js";
import { collectTemplateFiles } from "../../../src/cli/lib/fs.js";
import { hashAssistantAssetFile } from "../../../src/core/assistantAssetProvenance.js";
import { loadConfig, readWorkflowMode } from "../../../src/core/config.js";
import { validateProject } from "../../../src/core/validate.js";
import { checkPlans } from "../../../src/core/workflow/plans.js";
import { isRecord } from "../../../src/core/workflow/parse.js";
import { runStep } from "../../../src/migration/specToStory/harness.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { captureStdout } from "../../helpers/stdout.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(__dirname, "../../..");
const FIXTURE = path.join(PACKAGE_ROOT, "tests/fixtures/migration-spec-to-story/old-layout");
const CRITERIA = path.join(
  PACKAGE_ROOT,
  "tests/fixtures/bf0004MigrationCutover/legacy-criteria.md",
);
const SKILL_ASSETS = path.join(getInitAssetsDir(), ".qfai/assistant/skill");
const HOST_SKILL_DIRS = [".claude/skills", ".agents/skills", ".codex/skills", ".github/skills"];
const ARCHIVE = ".qfai/evidence/migration-spec-to-story/legacy/skill";
const DIRECTIVE =
  "Send a first free-text change request to the `qfai-run` skill, which takes it through `npx qfai workflow` to completion.";
const STEP11_WRITE_SET = [
  ".qfai/assistant/skill/",
  `${ARCHIVE}/`,
  ...HOST_SKILL_DIRS.map((dir) => `${dir}/`),
  "AGENTS.md",
  "CLAUDE.md",
  ".gitignore",
];
const temporary: string[] = [];

type Run = { code: number; output: string; errors: string };

async function stepIn(root: string, step: number, args: string[] = []): Promise<Run> {
  const output: string[] = [];
  const errors: string[] = [];
  const code = await runStep(step, args, {
    cwd: root,
    stdout: { write: (value: string) => output.push(value) },
    stderr: { write: (value: string) => errors.push(value) },
  });
  return { code, output: output.join(""), errors: errors.join("") };
}

function section(report: string, name: string): string[] {
  const body = report.split(`## ${name}\n`)[1]?.split("\n## ")[0] ?? "";
  return body
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
}

/** Every file and link under `root` with what it holds; directories and `.git` are left out. */
async function entries(root: string): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    const file = path.join(entry.parentPath, entry.name);
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (relative === ".git" || relative.startsWith(".git/") || entry.isDirectory()) continue;
    const content = entry.isSymbolicLink()
      ? `link:${await readlink(file)}`
      : createHash("sha256")
          .update(await readFile(file))
          .digest("hex");
    found.set(relative, content);
  }
  return found;
}

async function fingerprint(root: string): Promise<string> {
  return JSON.stringify([...(await entries(root))].sort());
}

function changedPaths(before: Map<string, string>, after: Map<string, string>): string[] {
  const all = new Set([...before.keys(), ...after.keys()]);
  return [...all].filter((file) => before.get(file) !== after.get(file)).sort();
}

async function sameAsPackage(root: string, id: string): Promise<boolean> {
  const shipped = path.join(SKILL_ASSETS, id);
  const installed = path.join(root, ".qfai/assistant/skill", id);
  const files = await collectTemplateFiles(shipped);
  const present = (await readdir(installed, { recursive: true, withFileTypes: true })).filter(
    (entry) => !entry.isDirectory(),
  );
  if (present.length !== files.length) return false;
  for (const file of files) {
    const target = path.join(installed, path.relative(shipped, file));
    const expected = await hashAssistantAssetFile(file, { allowSymlink: true });
    if (expected === null || (await hashAssistantAssetFile(target)) !== expected) return false;
  }
  return true;
}

async function shippedSkills(): Promise<string[]> {
  return (await readdir(SKILL_ASSETS)).sort();
}

/**
 * Whether `link` is a link naming `target`. Read lexically: on Windows `fs.cp`
 * copies a directory link as a file link, which `realpath` cannot follow.
 */
async function linkReaches(link: string, target: string): Promise<boolean> {
  const stats = await lstat(link).catch(() => null);
  if (stats?.isSymbolicLink() !== true) return false;
  const named = path.resolve(path.dirname(link), await readlink(link));
  return named === target && (await lstat(target)).isDirectory();
}

async function scratch(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporary.push(root);
  return root;
}

async function oldProject(): Promise<string> {
  const root = await scratch("qfai-migrate-11-12-");
  await cp(FIXTURE, root, { recursive: true });
  await cp(CRITERIA, path.join(root, ".qfai/specs/spec-0001/03_Acceptance-Criteria.md"));
  await rename(path.join(root, "gitignore.input"), path.join(root, ".gitignore"));
  await rename(
    path.join(root, ".qfai/assistant/skill-local.input"),
    path.join(root, ".qfai/assistant/skills.local"),
  );
  await writeFile(path.join(root, "AGENTS.md"), "# Our agents\n\nProject text.\n");
  await writeFile(path.join(root, "CLAUDE.md"), "# Our Claude\n\nProject text.\n");
  for (const dir of HOST_SKILL_DIRS) {
    await mkdir(path.join(root, dir), { recursive: true });
    await symlink("../../.qfai/assistant/skills/qfai-sdd", path.join(root, dir, "qfai-sdd"), "dir");
  }
  return root;
}

async function throughStep(root: string, last: number): Promise<void> {
  for (let step = 1; step <= last; step += 1) {
    const result = await stepIn(root, step);
    if (result.code === 2) throw new Error(`Step ${step} refused: ${result.errors}`);
  }
}

async function clone(source: string): Promise<string> {
  const root = await scratch("qfai-migrate-clone-");
  await cp(source, root, { recursive: true, verbatimSymlinks: true });
  return root;
}

async function writeConfig(root: string, edit: (config: Record<string, unknown>) => void) {
  const file = path.join(root, "qfai.config.yaml");
  const parsed: unknown = parseYaml(await readFile(file, "utf8"));
  const config = isRecord(parsed) ? parsed : {};
  edit(config);
  await writeFile(file, stringifyYaml(config));
}

/** The default `qfai-sdd` routing entry with `completion-reviewer` taken out of its review phase. */
async function routingWithoutCompletionReviewer(): Promise<Record<string, unknown>> {
  const defaults: unknown = parseYaml(
    await readFile(path.resolve(getInitAssetsDir(), "../defaults/agent-routing.yml"), "utf8"),
  );
  const routing = isRecord(defaults) && Array.isArray(defaults.routing) ? defaults.routing : [];
  const entry: unknown = routing.find((item) => isRecord(item) && item.skill === "qfai-sdd");
  if (!isRecord(entry) || !Array.isArray(entry.phases)) throw new Error("no qfai-sdd routing");
  const phases = entry.phases.map((phase: unknown) =>
    isRecord(phase) && phase.id === "review"
      ? {
          ...phase,
          mandatory_agents: ["architecture-reviewer"],
          conditional_agents: [],
          blocking_agents: ["architecture-reviewer"],
        }
      : phase,
  );
  return { ...entry, phases };
}

let migrated10 = "";
let migrated11 = "";

beforeAll(async () => {
  migrated10 = await oldProject();
  await throughStep(migrated10, 10);
  migrated11 = await clone(migrated10);
  const installed = await stepIn(migrated11, 11);
  if (installed.code !== 0) throw new Error(`Step 11 failed: ${installed.output}`);
}, 300_000);

afterAll(async () => {
  for (const root of temporary) await removeTempTree(root);
});

describe("migration steps 11 and 12: the free-text entry", () => {
  // QFAI:AC-0004-0041-01
  it("installs the skills, host links, entry directive and ignore lines", async () => {
    // QFAI:EX-0004-0041-01
    // QFAI:EX-0004-0041-11
    const root = await clone(migrated10);
    const before = await entries(root);
    const preview = await stepIn(root, 11, ["--dry-run"]);
    expect(await entries(root)).toEqual(before);
    const result = await stepIn(root, 11);
    expect(result.code).toBe(0);
    expect(section(result.output, "Operations")).toEqual(section(preview.output, "Operations"));
    expect(section(result.output, "For a person")).toEqual([]);

    const ids = await shippedSkills();
    expect(ids).toEqual(expect.arrayContaining(["qfai-run", "qfai-maintain"]));
    for (const id of ids) {
      expect(await sameAsPackage(root, id), id).toBe(true);
      for (const dir of HOST_SKILL_DIRS) {
        const reached = await linkReaches(
          path.join(root, dir, id),
          path.join(root, ".qfai/assistant/skill", id),
        );
        expect(reached, `${dir}/${id}`).toBe(true);
      }
    }
    for (const [name, heading] of [
      ["AGENTS.md", "# Our agents"],
      ["CLAUDE.md", "# Our Claude"],
    ] as const) {
      const text = await readFile(path.join(root, name), "utf8");
      expect(text).toBe(`${DIRECTIVE}\n${heading}\n\nProject text.\n`);
    }
    const ignore = await readFile(path.join(root, ".gitignore"), "utf8");
    expect(ignore).toContain(".qfai/run/\n");
    expect(ignore).toContain("!.qfai/evidence/workflow/\n");
    expect(await readFile(path.join(root, ARCHIVE, "qfai-sdd/SKILL.md"), "utf8")).toBe(
      await readFile(path.join(FIXTURE, ".qfai/assistant/skills/qfai-sdd/SKILL.md"), "utf8"),
    );
    const outside = changedPaths(before, await entries(root)).filter(
      (file) => !STEP11_WRITE_SET.some((allowed) => file === allowed || file.startsWith(allowed)),
    );
    expect(outside).toEqual([]);
  });

  // QFAI:AC-0004-0041-01
  it("leaves an occupied link path or a linked entry point for a person", async () => {
    // QFAI:EX-0004-0041-02
    const occupied = await clone(migrated10);
    await mkdir(path.join(occupied, ".claude/skills/qfai-run"), { recursive: true });
    await writeFile(path.join(occupied, ".claude/skills/qfai-run/notes.md"), "ours\n");
    const first = await stepIn(occupied, 11);
    expect(first.code).toBe(3);
    expect(section(first.output, "For a person")).toEqual([
      expect.stringMatching(/^\.claude\/skills\/qfai-run: a directory the project wrote/),
    ]);
    expect(await readFile(path.join(occupied, ".claude/skills/qfai-run/notes.md"), "utf8")).toBe(
      "ours\n",
    );
    expect(await readFile(path.join(occupied, "AGENTS.md"), "utf8")).toContain(DIRECTIVE);

    const linked = await clone(migrated10);
    await rename(path.join(linked, "AGENTS.md"), path.join(linked, "shared-agents.md"));
    await symlink("shared-agents.md", path.join(linked, "AGENTS.md"), "file");
    const second = await stepIn(linked, 11);
    expect(second.code).toBe(3);
    expect(section(second.output, "For a person")).toEqual([
      expect.stringMatching(/^AGENTS\.md: the entry directive was not added\..*symbolic link/),
    ]);
    expect(await readlink(path.join(linked, "AGENTS.md"))).toBe("shared-agents.md");
    expect(await readFile(path.join(linked, "shared-agents.md"), "utf8")).not.toContain(DIRECTIVE);
    expect(await readFile(path.join(linked, "CLAUDE.md"), "utf8")).toContain(DIRECTIVE);
    expect(
      await linkReaches(
        path.join(linked, ".codex/skills/qfai-run"),
        path.join(linked, ".qfai/assistant/skill/qfai-run"),
      ),
    ).toBe(true);
  });

  // QFAI:AC-0004-0041-02
  it("archives a customised shipped skill whole and never overwrites the archive", async () => {
    // QFAI:EX-0004-0041-03
    // QFAI:EX-0004-0041-04
    const root = await clone(migrated10);
    const skill = path.join(root, ".qfai/assistant/skill/qfai-sdd/SKILL.md");
    await appendFile(skill, "\nA line the project added.\n");
    const edited = await readFile(skill, "utf8");
    const result = await stepIn(root, 11);
    expect(result.code).toBe(0);
    const operations = section(result.output, "Operations");
    const archived = operations.findIndex((line) => line.startsWith(`${ARCHIVE}/qfai-sdd:`));
    const installed = operations.findIndex((line) =>
      line.startsWith(".qfai/assistant/skill/qfai-sdd/SKILL.md:"),
    );
    expect(archived).toBeGreaterThanOrEqual(0);
    expect(archived).toBeLessThan(installed);
    expect(await readFile(path.join(root, ARCHIVE, "qfai-sdd/SKILL.md"), "utf8")).toBe(edited);
    expect(await sameAsPackage(root, "qfai-sdd")).toBe(true);

    await appendFile(skill, "Another line.\n");
    const before = await fingerprint(root);
    const again = await stepIn(root, 11);
    expect(again.code).toBe(3);
    expect(section(again.output, "For a person")).toEqual([
      `.qfai/assistant/skill/qfai-sdd and ${ARCHIVE}/qfai-sdd: the archive already holds a different copy; keep the one you need, delete the other and run step 11 again`,
    ]);
    expect(await fingerprint(root)).toBe(before);
  });

  // QFAI:AC-0004-0041-03
  it("passes on a migrated project without writing, and workflow start is not refused", async () => {
    // QFAI:EX-0004-0041-05
    const root = await clone(migrated11);
    const before = await fingerprint(root);
    const result = await stepIn(root, 12);
    expect(result.code).toBe(0);
    expect(result.output).toBe("## Operations\nnone\n\n## For a person\nnone\n\n");
    expect(await fingerprint(root)).toBe(before);
    expect(await lstat(path.join(root, ".qfai/run")).catch(() => null)).toBeNull();
    const loaded = await loadConfig(root);
    expect(readWorkflowMode(loaded.document)).toBe("active");
    expect((await checkPlans(root, loaded.config)).cause).toBeUndefined();
  });

  // QFAI:AC-0004-0041-04
  it("names a routing override that drops a required reviewer", async () => {
    // QFAI:EX-0004-0041-06
    const root = await clone(migrated11);
    const override = await routingWithoutCompletionReviewer();
    await writeConfig(root, (config) => {
      config.routing = [override];
    });
    const before = await fingerprint(root);
    const result = await stepIn(root, 12);
    expect(result.code).toBe(3);
    expect(section(result.output, "For a person")).toEqual([
      "reviewer-missing: qfai.config.yaml: the `routing:` override for `qfai-sdd` drops `completion-reviewer`, which the package's default routing requires",
    ]);
    expect(await fingerprint(root)).toBe(before);
  });

  // QFAI:AC-0004-0041-04
  it("names an invalid workflow mode and a skill whose Operations table lacks a plan operation", async () => {
    // QFAI:EX-0004-0041-07
    // QFAI:EX-0004-0041-08
    const paused = await clone(migrated11);
    await writeConfig(paused, (config) => {
      config.workflow = { mode: "paused" };
    });
    const before = await fingerprint(paused);
    const mode = await stepIn(paused, 12);
    expect(mode.code).toBe(3);
    expect(section(mode.output, "For a person")).toEqual([
      'invalid-mode: qfai.config.yaml: workflow.mode is "paused", not active, shadow or off',
    ]);
    expect(await fingerprint(paused)).toBe(before);

    const table = await clone(migrated11);
    const reference = path.join(
      table,
      ".qfai/assistant/skill/qfai-sdd/references/orchestrated-mode.md",
    );
    const text = await readFile(reference, "utf8");
    const row = text.split("\n").find((line) => /^\| `[a-z-]+` \|/.test(line));
    if (row === undefined) throw new Error("qfai-sdd declares no operation");
    const operation = /`([a-z-]+)`/.exec(row)?.[1] ?? "";
    await writeFile(reference, text.replace(`${row}\n`, ""));
    const contract = await stepIn(table, 12);
    expect(contract.code).toBe(3);
    const items = section(contract.output, "For a person");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item).toMatch(
        new RegExp(
          `^contract-undeclared: \\.qfai/assistant/skill/qfai-sdd/references/orchestrated-mode\\.md: the Operations table of \`qfai-sdd\` lacks \`${operation}\``,
        ),
      );
    }
  });

  // QFAI:AC-0004-0041-04
  it("names a lost entry directive, ignore line or qfai-run link", async () => {
    // QFAI:EX-0004-0041-09
    const cases: Array<[string, (root: string) => Promise<void>, string]> = [
      [
        "entry-directive",
        async (root) => {
          const file = path.join(root, "CLAUDE.md");
          await writeFile(file, (await readFile(file, "utf8")).replace(`${DIRECTIVE}\n`, ""));
        },
        "entry-directive: CLAUDE.md: it carries no operative entry directive",
      ],
      [
        "gitignore",
        async (root) => {
          const file = path.join(root, ".gitignore");
          await writeFile(file, (await readFile(file, "utf8")).replace(".qfai/run/\n", ""));
        },
        "gitignore: .gitignore: the QFAI managed block lacks `.qfai/run/`",
      ],
      [
        "qfai-run-link",
        async (root) => {
          await rm(path.join(root, ".codex/skills/qfai-run"), { recursive: true, force: true });
        },
        "qfai-run-link: .codex/skills/qfai-run: no link here resolves to .qfai/assistant/skill/qfai-run/",
      ],
    ];
    for (const [name, damage, item] of cases) {
      const root = await clone(migrated11);
      await damage(root);
      const before = await fingerprint(root);
      const result = await stepIn(root, 12);
      expect(result.code, name).toBe(3);
      expect(section(result.output, "For a person"), name).toEqual([item]);
      expect(await fingerprint(root), name).toBe(before);
    }
  });

  // QFAI:AC-0004-0041-05
  it("changes nothing on a rerun and reports the same in a dry run", async () => {
    // QFAI:EX-0004-0041-10
    const root = await clone(migrated11);
    const before = await fingerprint(root);
    const again = await stepIn(root, 11);
    expect(again.code).toBe(0);
    expect(section(again.output, "Operations")).toEqual([]);
    const first = await stepIn(root, 12);
    const second = await stepIn(root, 12);
    const dry = await stepIn(root, 12, ["--dry-run"]);
    expect(second.output).toBe(first.output);
    expect(dry.output).toBe(first.output);
    expect(await fingerprint(root)).toBe(before);
  });

  // QFAI:AC-0004-0041-05
  it("refuses only before step 1", async () => {
    // QFAI:EX-0004-0041-12
    const old = await oldProject();
    const before = await fingerprint(old);
    for (const step of [11, 12]) {
      const result = await stepIn(old, step);
      expect(result.code).toBe(2);
      expect(result.errors).toContain(`Run step 1 before step ${step}.`);
    }
    expect(await fingerprint(old)).toBe(before);

    const fresh = await scratch("qfai-migrate-fresh-");
    await captureStdout(() => runInit({ dir: fresh, force: false, dryRun: false, yes: true }));
    for (const step of [11, 12]) {
      const result = await stepIn(fresh, step);
      expect(result.code, result.errors).not.toBe(2);
    }
  });

  // QFAI:AC-0004-0041-06
  it("ends the skill procedure by handing over to qfai-run", async () => {
    // QFAI:EX-0004-0041-13
    const skill = await readFile(
      path.join(SKILL_ASSETS, "qfai-migration-v1-to-v2/SKILL.md"),
      "utf8",
    );
    const prose = skill.replace(/\s+/g, " ");
    const markers = [
      "After step 10, run steps 11 and 12 in order, each with `--dry-run` followed by the real run",
      "Resolve every item step 12 lists",
      "run `npx qfai validate`",
      "Hand the project's first free-text change request to `qfai-run`",
    ];
    const positions = markers.map((marker) => prose.indexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  // QFAI:AC-0004-0041-07
  it("retires the old skill name on init --force", async () => {
    // QFAI:EX-0004-0041-14
    const root = await scratch("qfai-migrate-retired-");
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    const old = "qfai-migration-spec-to-story";
    const oldDir = path.join(root, ".qfai/assistant/skill", old);
    await cp(path.join(SKILL_ASSETS, "qfai-migration-v1-to-v2"), oldDir, { recursive: true });
    const doc = path.join(oldDir, "SKILL.md");
    const edited = (await readFile(doc, "utf8"))
      .replace("name: qfai-migration-v1-to-v2", `name: ${old}`)
      .concat("\nA note the project kept.\n");
    await writeFile(doc, edited);
    for (const dir of HOST_SKILL_DIRS) {
      await symlink(`../../.qfai/assistant/skill/${old}`, path.join(root, dir, old), "dir");
    }

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));
    for (const dir of HOST_SKILL_DIRS) {
      expect(await readdir(path.join(root, dir))).not.toContain(old);
      expect(
        await linkReaches(
          path.join(root, dir, "qfai-migration-v1-to-v2"),
          path.join(root, ".qfai/assistant/skill/qfai-migration-v1-to-v2"),
        ),
      ).toBe(true);
    }
    expect(await readFile(path.join(root, ARCHIVE, old, "SKILL.md"), "utf8")).toBe(edited);
    const result = await validateProject(root);
    const naming = result.issues.filter((issue) => JSON.stringify(issue).includes(old));
    expect(naming).toEqual([]);
  });

  // QFAI:AC-0004-0041-07
  it("continues a migration the old skill name began from its ID map", async () => {
    // QFAI:EX-0004-0041-15
    const root = await oldProject();
    await throughStep(root, 4);
    const map = path.join(root, ".qfai/evidence/migration-spec-to-story/id-map.json");
    const written = await readFile(map, "utf8");
    const result = await stepIn(root, 5);
    expect([0, 3]).toContain(result.code);
    expect(section(result.output, "Cases to examples").length).toBeGreaterThan(0);
    expect(await readFile(map, "utf8")).toBe(written);
  });
});
