import { spawnSync } from "node:child_process";
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
import { ensureRootGitignoreEntries } from "../../../src/core/init/rootGitignore.js";
import { collectTemplateFiles } from "../../../src/core/fs/templateCopy.js";
import { hashAssistantAssetFile } from "../../../src/core/assistantAssetProvenance.js";
import { loadConfig, readWorkflowMode } from "../../../src/core/config.js";
import { validateProject } from "../../../src/core/validate.js";
import { checkPlans } from "../../../src/core/workflow/plans.js";
import { isRecord } from "../../../src/core/workflow/parse.js";
import { runStep } from "../../../src/migration/specToStory/harness.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { defaultRoutingEntries } from "../../helpers/shippedAssistant.js";
import { captureStdout } from "../../helpers/stdout.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(__dirname, "../../..");
const FIXTURE = path.join(PACKAGE_ROOT, "tests/fixtures/migration-spec-to-story/old-layout");
const CRITERIA = path.join(
  PACKAGE_ROOT,
  "tests/fixtures/bf0004MigrationCutover/legacy-criteria.md",
);
const ASSISTANT_ASSETS = path.join(getInitAssetsDir(), ".qfai/assistant");
const SKILL_ASSETS = path.join(ASSISTANT_ASSETS, "skill");
const STEP_ASSETS = path.join(ASSISTANT_ASSETS, "step");
const HOST_SKILL_DIRS = [".claude/skills", ".agents/skills", ".codex/skills", ".github/skills"];
const ARCHIVE = ".qfai/evidence/migration-spec-to-story/legacy/skill";
const DIRECTIVE =
  "Send a first free-text change request to the `qfai-run` skill, which takes it through `npx qfai workflow` to completion.";
const STEP11_WRITE_SET = [
  ".qfai/assistant/skill/",
  ".qfai/assistant/step/",
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

async function sameAsPackage(root: string, id: string, layer = "skill"): Promise<boolean> {
  const shipped = path.join(ASSISTANT_ASSETS, layer, id);
  const installed = path.join(root, ".qfai/assistant", layer, id);
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

async function shippedSteps(): Promise<string[]> {
  return (await readdir(STEP_ASSETS)).sort();
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

/** The default `sdd-triage` routing entry with `completion-reviewer` taken out of its review phase. */
async function routingWithoutCompletionReviewer(): Promise<Record<string, unknown>> {
  const routing = await defaultRoutingEntries();
  const entry: unknown = routing.find((item) => isRecord(item) && item.step === "sdd-triage");
  if (!isRecord(entry) || !Array.isArray(entry.phases)) throw new Error("no sdd-triage routing");
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

const MARKER = "# ── QFAI managed (generated by qfai init) ──";
const TRACKED_EVIDENCE = [
  ".qfai/evidence/sdd-BF-0001.md",
  ".qfai/evidence/migration-spec-to-story/id-map.json",
  ".qfai/evidence/workflow/r1/summary.json",
];

function git(root: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout;
}

function ignored(root: string, file: string): boolean {
  return spawnSync("git", ["check-ignore", "--quiet", file], { cwd: root }).status === 0;
}

async function put(root: string, relative: string, content: string): Promise<void> {
  await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  await writeFile(path.join(root, relative), content);
}

/** A git repository whose last commit tracks three evidence files and one source file. */
async function trackingRepository(source: string): Promise<string> {
  const root = await clone(source);
  git(root, ["init", "-q"]);
  for (const file of TRACKED_EVIDENCE.filter((file) => !file.endsWith("id-map.json"))) {
    await put(root, file, `${file}\n`);
  }
  await put(root, "src/index.ts", "export {};\n");
  git(root, ["add", "-f", "--", ...TRACKED_EVIDENCE, "src/index.ts"]);
  git(root, ["-c", "user.name=QFAI", "-c", "user.email=qfai@example.com", "commit", "-qm", "1.x"]);
  return root;
}

/** A 1.x managed block that re-includes two evidence paths, with project negations below it. */
async function writeLegacyIgnore(root: string): Promise<void> {
  const file = path.join(root, ".gitignore");
  const current = await readFile(file, "utf8");
  const legacy = current.replace(
    `${MARKER}\n`,
    `${MARKER}\n!.qfai/evidence/decision/\n!.qfai/evidence/workflow/\n`,
  );
  await writeFile(
    file,
    `${legacy}!.qfai/evidence/\n!/.qfai/evidence/atdd-*.md\n!.qfai/\n!.qfai/assistant/**\n!.qfai/install-provenance.json\nnode_modules/\n`,
  );
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

describe("migration step 10: the evidence directory stays local", () => {
  // QFAI:AC-0004-0011-03
  it("removes every evidence re-include and keeps the project's other lines in order", async () => {
    // QFAI:EX-0004-0011-03
    const root = await clone(migrated10);
    git(root, ["init", "-q"]);
    await writeLegacyIgnore(root);
    await put(root, ".qfai/evidence/decision/r.md", "record\n");
    await put(root, ".qfai/evidence/atdd-BF-0001.md", "atdd\n");
    const result = await stepIn(root, 10);
    expect(result.code, result.output).toBe(0);
    const ignore = await readFile(path.join(root, ".gitignore"), "utf8");
    expect(ignore.split("\n").filter((line) => /^!\/?\.qfai\/evidence/.test(line))).toEqual([]);
    expect(ignore).toContain(
      "\n!.qfai/\n!.qfai/assistant/**\n!.qfai/install-provenance.json\nnode_modules/\n",
    );
    expect((await ensureRootGitignoreEntries(root, true, () => {})).copied).toEqual([]);
    expect(section(result.output, "Operations")).toEqual(
      expect.arrayContaining([
        ".gitignore: maintain the managed QFAI block and its staging",
        ".gitignore: remove `!.qfai/evidence/`",
        ".gitignore: remove `!/.qfai/evidence/atdd-*.md`",
      ]),
    );
    expect(ignored(root, ".qfai/evidence/decision/r.md")).toBe(true);
    expect(ignored(root, ".qfai/evidence/atdd-BF-0001.md")).toBe(true);
  });

  // QFAI:AC-0004-0011-03
  it("deletes a nested evidence ignore file and leaves anything else at that path", async () => {
    // QFAI:EX-0004-0011-04
    // QFAI:EX-0004-0011-05
    const root = await clone(migrated10);
    git(root, ["init", "-q"]);
    await put(root, ".qfai/evidence/.gitignore", "*\n# decisions stay\n!decision/\n!atdd-*.md\n");
    await put(root, ".qfai/evidence/decision/r.md", "record\n");
    const result = await stepIn(root, 10);
    expect(result.code, result.output).toBe(0);
    expect(await lstat(path.join(root, ".qfai/evidence/.gitignore")).catch(() => null)).toBeNull();
    expect(section(result.output, "Operations")).toContain(".qfai/evidence/.gitignore: delete");
    expect(await readFile(path.join(root, ".qfai/evidence/decision/r.md"), "utf8")).toBe(
      "record\n",
    );
    expect(ignored(root, ".qfai/evidence/decision/r.md")).toBe(true);

    const occupied = await clone(migrated10);
    await put(occupied, ".qfai/evidence/.gitignore/inside.txt", "kept\n");
    await appendFile(path.join(occupied, ".gitignore"), "!/.qfai/evidence/x.md\n");
    const held = await stepIn(occupied, 10);
    expect(held.code).toBe(3);
    expect(section(held.output, "For a person")).toEqual([
      expect.stringMatching(/^\.qfai\/evidence\/\.gitignore: it is not a regular file/),
    ]);
    expect(
      await readFile(path.join(occupied, ".qfai/evidence/.gitignore/inside.txt"), "utf8"),
    ).toBe("kept\n");
    expect(await readFile(path.join(occupied, ".gitignore"), "utf8")).not.toContain(
      "!/.qfai/evidence/x.md",
    );
  });

  // QFAI:AC-0004-0011-04
  it("removes tracked evidence from the index, keeps the files and commits nothing", async () => {
    // QFAI:EX-0004-0011-06
    const root = await trackingRepository(migrated10);
    const head = git(root, ["rev-parse", "HEAD"]);
    const before = await entries(root);
    const result = await stepIn(root, 10);
    expect(result.code, result.output).toBe(0);
    expect(git(root, ["ls-files", "--", ".qfai/evidence"])).toBe("");
    expect(git(root, ["ls-files", "--", "src/index.ts"])).toBe("src/index.ts\n");
    const status = git(root, ["status", "--porcelain", "--", ".qfai/evidence"]);
    for (const file of TRACKED_EVIDENCE) expect(status).toContain(`D  ${file}`);
    expect(git(root, ["rev-parse", "HEAD"])).toBe(head);
    expect(changedPaths(before, await entries(root))).toEqual([]);
    expect(section(result.output, "Git index")).toEqual([
      "3 paths under `.qfai/evidence/` left the git index; the files stay on disk",
    ]);
  });

  // QFAI:AC-0004-0011-04
  it("passes a path to git without a shell", async () => {
    // QFAI:EX-0004-0011-07
    const root = await clone(migrated10);
    git(root, ["init", "-q"]);
    const hostile = ".qfai/evidence/a b;$(touch pwned).md";
    await put(root, hostile, "hostile\n");
    git(root, ["add", "-f", "--", hostile]);
    const result = await stepIn(root, 10);
    expect(result.code, result.output).toBe(0);
    expect(git(root, ["ls-files", "--", ".qfai/evidence"])).toBe("");
    expect(await readFile(path.join(root, hostile), "utf8")).toBe("hostile\n");
    expect([...(await entries(root)).keys()].filter((file) => file.endsWith("pwned"))).toEqual([]);
    expect(section(result.output, "Git index")).toEqual([
      "1 path under `.qfai/evidence/` left the git index; the files stay on disk",
    ]);
  });

  // QFAI:AC-0004-0011-05
  it("says why the index is unchanged outside a repository and with nothing tracked", async () => {
    // QFAI:EX-0004-0011-08
    const plain = await clone(migrated10);
    const outside = await stepIn(plain, 10);
    expect(outside.code).toBe(0);
    expect(section(outside.output, "Git index")).toEqual([
      "the project is not a git repository, so the index is unchanged",
    ]);
    expect(section(outside.output, "For a person")).toEqual([]);

    const empty = await clone(migrated10);
    git(empty, ["init", "-q"]);
    const stage = git(empty, ["ls-files", "--stage"]);
    const untouched = await stepIn(empty, 10);
    expect(untouched.code).toBe(0);
    expect(section(untouched.output, "Git index")).toEqual([
      "the git index tracks nothing under `.qfai/evidence/`, so it is unchanged",
    ]);
    expect(section(untouched.output, "For a person")).toEqual([]);
    expect(git(empty, ["ls-files", "--stage"])).toBe(stage);
  });

  // QFAI:AC-0004-0011-06
  it("previews the real run and changes nothing when run again", async () => {
    // QFAI:EX-0004-0011-09
    const root = await trackingRepository(migrated10);
    await writeLegacyIgnore(root);
    const before = await fingerprint(root);
    const stage = git(root, ["ls-files", "--stage"]);
    const preview = await stepIn(root, 10, ["--dry-run"]);
    expect(await fingerprint(root)).toBe(before);
    expect(git(root, ["ls-files", "--stage"])).toBe(stage);
    expect(section(preview.output, "Git index")).toEqual([
      "3 paths under `.qfai/evidence/` would leave the git index",
    ]);
    const real = await stepIn(root, 10);
    expect(section(real.output, "Operations")).toEqual(section(preview.output, "Operations"));
    const after = await fingerprint(root);
    const settled = git(root, ["ls-files", "--stage"]);
    const again = await stepIn(root, 10);
    expect(again.code).toBe(0);
    expect(again.output).toContain("## Operations\nnone\n");
    expect(section(again.output, "Git index")).toEqual([
      "the git index tracks nothing under `.qfai/evidence/`, so it is unchanged",
    ]);
    expect(await fingerprint(root)).toBe(after);
    expect(git(root, ["ls-files", "--stage"])).toBe(settled);
  });
});

describe("migration steps 11 and 12: the free-text entry", () => {
  // QFAI:AC-0004-0013-01
  it("installs the skills, host links, entry directive and ignore lines", async () => {
    // QFAI:EX-0004-0013-01
    // QFAI:EX-0004-0013-11
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
    const steps = await shippedSteps();
    expect(steps).toEqual(expect.arrayContaining(["sdd-gate", "maintain-edit"]));
    for (const id of steps) {
      expect(await sameAsPackage(root, id, "step"), id).toBe(true);
      for (const dir of HOST_SKILL_DIRS) {
        expect(await lstat(path.join(root, dir, id)).catch(() => null), `${dir}/${id}`).toBeNull();
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
    expect(ignore).not.toContain("!.qfai/evidence/");
    expect(await readFile(path.join(root, ARCHIVE, "qfai-sdd/SKILL.md"), "utf8")).toBe(
      await readFile(path.join(FIXTURE, ".qfai/assistant/skills/qfai-sdd/SKILL.md"), "utf8"),
    );
    const outside = changedPaths(before, await entries(root)).filter(
      (file) => !STEP11_WRITE_SET.some((allowed) => file === allowed || file.startsWith(allowed)),
    );
    expect(outside).toEqual([]);
  });

  // QFAI:AC-0004-0013-01
  it("leaves an occupied link path or a linked entry point for a person", async () => {
    // QFAI:EX-0004-0013-02
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

  // QFAI:AC-0004-0013-02
  it("archives a customised shipped skill whole and never overwrites the archive", async () => {
    // QFAI:EX-0004-0013-03
    // QFAI:EX-0004-0013-04
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

  // QFAI:AC-0004-0013-03
  it("passes on a migrated project without writing, and workflow start is not refused", async () => {
    // QFAI:EX-0004-0013-05
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

  // QFAI:AC-0004-0013-04
  it("names a routing override that drops a required reviewer", async () => {
    // QFAI:EX-0004-0013-06
    const root = await clone(migrated11);
    const override = await routingWithoutCompletionReviewer();
    await writeConfig(root, (config) => {
      config.routing = [override];
    });
    const before = await fingerprint(root);
    const result = await stepIn(root, 12);
    expect(result.code).toBe(3);
    expect(section(result.output, "For a person")).toEqual([
      "reviewer-missing: qfai.config.yaml: the `routing:` override for `sdd-triage` drops `completion-reviewer`, which the package's default routing requires",
    ]);
    expect(await fingerprint(root)).toBe(before);
  });

  // QFAI:AC-0004-0013-04
  it("names an invalid workflow mode and a plan step that is not installed", async () => {
    // QFAI:EX-0004-0013-07
    // QFAI:EX-0004-0013-08
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

    const missing = await clone(migrated11);
    await rm(path.join(missing, ".qfai/assistant/step/sdd-gate"), { recursive: true });
    const before12 = await fingerprint(missing);
    const contract = await stepIn(missing, 12);
    expect(contract.code).toBe(3);
    expect(section(contract.output, "For a person")).toEqual([
      "contract-undeclared: .qfai/assistant/step/sdd-gate/STEP.md: the repair-consistency plan runs this step and it is not installed",
    ]);
    expect(await fingerprint(missing)).toBe(before12);
  });

  // QFAI:AC-0004-0013-04
  it("names a lost entry directive, ignore line or qfai-run link", async () => {
    // QFAI:EX-0004-0013-09
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

  // QFAI:AC-0004-0013-05
  it("changes nothing on a rerun and reports the same in a dry run", async () => {
    // QFAI:EX-0004-0013-10
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

  // QFAI:AC-0004-0013-05
  it("refuses only before step 1", async () => {
    // QFAI:EX-0004-0013-12
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

  // QFAI:AC-0004-0013-06
  it("ends the skill procedure by handing over to qfai-run", async () => {
    // QFAI:EX-0004-0013-13
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

  // QFAI:AC-0004-0013-07
  it("retires the old skill name on init --force", async () => {
    // QFAI:EX-0004-0013-14
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

  // QFAI:AC-0004-0013-04
  it("names an evidence re-include line and leaves the managed negations alone", async () => {
    // QFAI:EX-0004-0013-15
    const root = await clone(migrated11);
    await appendFile(path.join(root, ".gitignore"), "!.qfai/evidence/workflow/\n");
    const before = await fingerprint(root);
    const result = await stepIn(root, 12);
    expect(result.code).toBe(3);
    expect(section(result.output, "For a person")).toEqual([
      "gitignore: .gitignore: `!.qfai/evidence/workflow/` re-includes `.qfai/evidence/`",
    ]);
    expect(await fingerprint(root)).toBe(before);
  });

  // QFAI:AC-0004-0013-04
  it("names every evidence path git still tracks", async () => {
    // QFAI:EX-0004-0013-16
    const root = await clone(migrated11);
    git(root, ["init", "-q"]);
    const tracked = [".qfai/evidence/sdd-BF-0001.md", ".qfai/evidence/workflow/r1/summary.json"];
    for (const file of tracked) await put(root, file, `${file}\n`);
    git(root, ["add", "-f", "--", ...tracked]);
    const stage = git(root, ["ls-files", "--stage"]);
    const before = await fingerprint(root);
    const result = await stepIn(root, 12);
    expect(result.code).toBe(3);
    expect(section(result.output, "For a person")).toEqual([
      `evidence-tracked: git tracks ${tracked.map((file) => `\`${file}\``).join(", ")}`,
    ]);
    expect(git(root, ["ls-files", "--stage"])).toBe(stage);
    expect(await fingerprint(root)).toBe(before);
  });

  // QFAI:AC-0004-0013-03
  it("passes with local evidence inside and outside a repository", async () => {
    // QFAI:EX-0004-0013-17
    const ignore = await readFile(path.join(migrated11, ".gitignore"), "utf8");
    expect(ignore).toContain("\n!.qfai/\n");
    expect(ignore).toContain("\n!.qfai/assistant/**\n");
    const repository = await clone(migrated11);
    git(repository, ["init", "-q"]);
    const plain = await clone(migrated11);
    for (const root of [repository, plain]) {
      await put(root, ".qfai/evidence/sdd-BF-0001.md", "local\n");
      const before = await fingerprint(root);
      const result = await stepIn(root, 12);
      expect(result.code, result.output).toBe(0);
      expect(section(result.output, "For a person")).toEqual([]);
      expect(await fingerprint(root)).toBe(before);
    }
  });
});
