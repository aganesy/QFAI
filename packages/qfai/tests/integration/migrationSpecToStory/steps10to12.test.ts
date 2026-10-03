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
import {
  hashAssistantAssetFile,
  hashAssistantAssetText,
} from "../../../src/core/assistantAssetProvenance.js";
import { loadConfig, readWorkflowMode } from "../../../src/core/config.js";
import { validateProject } from "../../../src/core/validate.js";
import { allPlanRefusals } from "../../../src/core/workflow/plans.js";
import { isRecord } from "../../../src/core/workflow/parse.js";
import { runStep } from "../../../src/migration/specToStory/harness.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { deleteE2eCaseAnnotation } from "../../helpers/migrationE2eAnnotation.js";
import {
  MIGRATION_REPORT_DIR,
  isMigrationReportPath,
  migrationReportFiles,
  readMigrationReport,
} from "../../helpers/migrationReport.js";
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
// The line that earlier releases seeded; step 11 neither adds nor removes it.
const EARLIER_LINE =
  "Send a first free-text change request to the `qfai-run` skill, which takes it through `npx qfai workflow` to completion.";
const AGENTS_TEXT = "# Our agents\n\nProject text.\n";
const CLAUDE_TEXT = "# Our Claude\n\nProject text.\n";
const STEP11_WRITE_SET = [
  ".qfai/assistant/skill/",
  ".qfai/assistant/step/",
  `${ARCHIVE}/`,
  ...HOST_SKILL_DIRS.map((dir) => `${dir}/`),
  ".gitignore",
  ".claude/settings.json",
  ".codex/hooks.json",
  ".agents/rules/reminders.json",
  ".agents/rules/.qfai-rules.lock.json",
];
const HOOK_FILES = [".claude/settings.json", ".codex/hooks.json"] as const;
const REMINDERS = ".agents/rules/reminders.json";
const RULE_LOCK = ".agents/rules/.qfai-rules.lock.json";
const SHIPPED_REMINDERS = path.join(getInitAssetsDir(), "root", REMINDERS);
const EARLIER_CODEX_HOOKS = path.join(
  PACKAGE_ROOT,
  "tests/fixtures/codex-hooks/earlier-hooks.json",
);
const FREE_TEXT_HOOK = "QFAI free-text entry reminder";
const HOOK_WRITES = HOOK_FILES.map((file) => `${file}: write from the package's hook template`);
const TRUST_CODEX_HOOKS =
  "Codex runs the hooks in .codex/hooks.json only after you review and trust them with /hooks.";
const ALREADY_DONE =
  "Already done: an earlier run migrated this project, and steps 1 to 10 have nothing left to do.";
const VERDICT_DONE = "already migrated (id-map.json present)";
const VERDICT_FOUND = "1.x layout found, migrating";
// Step 12 on a migrated project outside a git repository: nothing to list, and the scan says why
// it did not run.
const CLEAN_REPORT =
  "## Operations\nnone\n\n## Files scanned\n- not checked: the project is not a git repository\n\n## For a person\nnone\n\n";
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

/**
 * Every file and link under `root` with what it holds. Directories, `.git` and the report
 * directory are left out: a report file is not a change wherever a step changes no file.
 */
async function entries(root: string): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    const file = path.join(entry.parentPath, entry.name);
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (relative === ".git" || relative.startsWith(".git/") || entry.isDirectory()) continue;
    if (isMigrationReportPath(relative)) continue;
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
  await writeFile(path.join(root, "AGENTS.md"), AGENTS_TEXT);
  await writeFile(path.join(root, "CLAUDE.md"), CLAUDE_TEXT);
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

async function put(root: string, relative: string, content: string | Uint8Array): Promise<void> {
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

/** Reads a file of `root`, or `null` when nothing is there. */
async function textOrNull(root: string, relative: string): Promise<string | null> {
  return readFile(path.join(root, relative), "utf8").catch(() => null);
}

/** Replaces one test annotation with another, spelled so this file declares neither. */
async function reannotate(root: string, file: string, from: string, to: string): Promise<void> {
  const target = path.join(root, file);
  const text = await readFile(target, "utf8");
  const annotation = ["QFAI", from].join(":");
  if (!text.includes(annotation)) throw new Error(`${file} has no ${annotation}`);
  await writeFile(target, text.replace(annotation, ["QFAI", to].join(":")));
}

type EarlierMigration = { root: string; afterStep7: string };

/**
 * The tree a migration by an earlier 2.x release leaves: all twelve steps run,
 * each item they listed for a person settled, and no hook file, since that
 * release's step 11 wrote none. The fixture's agent links let step 9 repoint
 * the agent wrappers, as a project `qfai init` set up has them.
 */
async function migratedByEarlierRelease(): Promise<EarlierMigration> {
  const root = await oldProject();
  for (const [dir, name] of [
    [".claude/agents", "orchestrator.md"],
    [".github/agents", "orchestrator.agent.md"],
  ] as const) {
    await mkdir(path.join(root, dir), { recursive: true });
    await symlink(
      "../../.qfai/assistant/agents/orchestrator.md",
      path.join(root, dir, name),
      "file",
    );
  }
  let afterStep7 = "";
  for (let step = 1; step <= 12; step += 1) {
    const result = await stepIn(root, step);
    if (result.code === 2) throw new Error(`Step ${step} refused: ${result.errors}`);
    if (step === 7) afterStep7 = await clone(root);
  }
  await rm(path.join(root, ".qfai/spec/spec-0002"), { recursive: true });
  const test = "tests/integration/order.test.ts";
  await reannotate(root, test, "CON-API-0001", "API-0001");
  await reannotate(root, test, "SPEC-0001:US-0001-0001", "AC-0001-0001-01");
  await deleteE2eCaseAnnotation(root, "tests/e2e/order.test.ts");
  // What an earlier release left: no Claude Code settings, its own Codex hook
  // file, and a recorded reminder text without the free-text entry.
  await rm(path.join(root, ".claude/settings.json"));
  await cp(EARLIER_CODEX_HOOKS, path.join(root, ".codex/hooks.json"));
  await recordReminderText(root, await remindersWithout("free-text-entry"));
  return { root, afterStep7 };
}

/** The shipped reminder text with one message taken out. */
async function remindersWithout(key: string): Promise<string> {
  const parsed: unknown = JSON.parse(await readFile(SHIPPED_REMINDERS, "utf8"));
  if (!isRecord(parsed) || !(key in parsed)) throw new Error(`no ${key} in reminders.json`);
  const rest = Object.fromEntries(Object.entries(parsed).filter(([name]) => name !== key));
  return `${JSON.stringify(rest, null, 2)}\n`;
}

/** Writes `text` as the project's reminder text and records it as a run's write. */
async function recordReminderText(root: string, text: string, recorded = text): Promise<void> {
  await put(root, REMINDERS, text);
  const lockFile = path.join(root, RULE_LOCK);
  const lock: unknown = JSON.parse(await readFile(lockFile, "utf8").catch(() => "{}"));
  const entries = isRecord(lock) ? lock : {};
  await put(
    root,
    RULE_LOCK,
    `${JSON.stringify({ ...entries, "reminders.json": hashAssistantAssetText(recorded) }, null, 2)}\n`,
  );
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** What the installed free-text hook prints for Claude Code and for Codex, run in `root`. */
async function freeTextHookOutput(root: string): Promise<{ claude: string; codex: string }> {
  const hook = async (file: string): Promise<Record<string, unknown>> => {
    const parsed: unknown = JSON.parse(await readFile(path.join(root, file), "utf8"));
    const groups =
      isRecord(parsed) && isRecord(parsed.hooks) ? parsed.hooks.UserPromptSubmit : undefined;
    const entries = isUnknownArray(groups)
      ? groups.flatMap((group) =>
          isRecord(group) && isUnknownArray(group.hooks) ? group.hooks : [],
        )
      : [];
    const found = entries.find(
      (entry): entry is Record<string, unknown> =>
        isRecord(entry) && entry.statusMessage === FREE_TEXT_HOOK,
    );
    if (found === undefined) throw new Error(`${file} has no free-text entry hook`);
    return found;
  };
  const claudeHook = await hook(".claude/settings.json");
  const args = Array.isArray(claudeHook.args) ? claudeHook.args.map(String) : [];
  const claude = spawnSync(
    process.execPath,
    args.map((arg) => arg.replace(["$", "{CLAUDE_PROJECT_DIR}"].join(""), root)),
    { cwd: root, encoding: "utf8" },
  );
  const codexHook = await hook(".codex/hooks.json");
  const codex = spawnSync(String(codexHook.command), {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  return { claude: claude.stdout.trim(), codex: codex.stdout.trim() };
}

async function shippedFreeTextReminder(): Promise<string> {
  const parsed: unknown = JSON.parse(await readFile(SHIPPED_REMINDERS, "utf8"));
  if (!isRecord(parsed)) throw new Error("reminders.json is not an object");
  return JSON.stringify(parsed["free-text-entry"]);
}

function reportFile(kind: "dry-run" | "run", name: string): string {
  return `${MIGRATION_REPORT_DIR}/${kind}/${name}`;
}

function lastLine(report: string): string | undefined {
  return report.trimEnd().split("\n").at(-1);
}

let migrated10 = "";
let migrated11 = "";
let initialised = "";
let earlierMigration: Promise<EarlierMigration> | undefined;

beforeAll(async () => {
  migrated10 = await oldProject();
  await throughStep(migrated10, 10);
  migrated11 = await clone(migrated10);
  const installed = await stepIn(migrated11, 11);
  if (installed.code !== 0) throw new Error(`Step 11 failed: ${installed.output}`);
  initialised = await scratch("qfai-init-hooks-");
  await captureStdout(() => runInit({ dir: initialised, force: false, dryRun: false, yes: true }));
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
  it("installs the skills, host links and ignore lines, and leaves the entry points alone", async () => {
    // QFAI:EX-0004-0013-01
    // QFAI:EX-0004-0013-11
    const root = await clone(migrated10);
    await writeFile(path.join(root, "CLAUDE.md"), `${EARLIER_LINE}\n${CLAUDE_TEXT}`);
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
    expect(await readFile(path.join(root, "AGENTS.md"), "utf8")).toBe(AGENTS_TEXT);
    expect(await readFile(path.join(root, "CLAUDE.md"), "utf8")).toBe(
      `${EARLIER_LINE}\n${CLAUDE_TEXT}`,
    );
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
  it("leaves an occupied link path for a person and a linked entry point alone", async () => {
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
    expect(await readFile(path.join(occupied, "AGENTS.md"), "utf8")).toBe(AGENTS_TEXT);

    const linked = await clone(migrated10);
    await rename(path.join(linked, "AGENTS.md"), path.join(linked, "shared-agents.md"));
    await symlink("shared-agents.md", path.join(linked, "AGENTS.md"), "file");
    const second = await stepIn(linked, 11);
    expect(second.code).toBe(0);
    expect(section(second.output, "For a person")).toEqual([]);
    expect(await readlink(path.join(linked, "AGENTS.md"))).toBe("shared-agents.md");
    expect(await readFile(path.join(linked, "shared-agents.md"), "utf8")).toBe(AGENTS_TEXT);
    expect(await readFile(path.join(linked, "CLAUDE.md"), "utf8")).toBe(CLAUDE_TEXT);
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
  it("passes on a migrated project without writing, and every plan loads", async () => {
    // QFAI:EX-0004-0013-05
    const root = await clone(migrated11);
    const before = await fingerprint(root);
    const result = await stepIn(root, 12);
    expect(result.code).toBe(0);
    expect(result.output).toBe(CLEAN_REPORT);
    expect(await fingerprint(root)).toBe(before);
    expect(await lstat(path.join(root, ".qfai/run")).catch(() => null)).toBeNull();
    const loaded = await loadConfig(root);
    expect(readWorkflowMode(loaded.document)).toBe("active");
    expect(await allPlanRefusals(root, loaded.config)).toEqual([]);
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
      "plan-invalid: .qfai/assistant/step/sdd-gate/STEP.md: the repair-consistency plan runs this step and it is not installed",
    ]);
    expect(await fingerprint(missing)).toBe(before12);
  });

  // QFAI:AC-0004-0013-04
  it("names a lost ignore line or qfai-run link", async () => {
    // QFAI:EX-0004-0013-09
    const cases: Array<[string, (root: string) => Promise<void>, string]> = [
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

  // QFAI:AC-0004-0013-03
  it("neither requires nor lists an entry line, with or without the earlier one", async () => {
    // QFAI:EX-0004-0013-23
    const root = await clone(migrated11);
    await writeFile(path.join(root, "CLAUDE.md"), `${EARLIER_LINE}\n${CLAUDE_TEXT}`);
    const before = await fingerprint(root);
    const result = await stepIn(root, 12);
    expect(result.code, result.output).toBe(0);
    expect(section(result.output, "For a person")).toEqual([]);
    expect(await readFile(path.join(root, "AGENTS.md"), "utf8")).toBe(AGENTS_TEXT);
    expect(await fingerprint(root)).toBe(before);
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

  // QFAI:AC-0004-0013-01
  it("writes both hook files as qfai init does, and a dry run writes neither", async () => {
    // QFAI:EX-0004-0013-18
    const root = await clone(migrated10);
    for (const file of HOOK_FILES) expect(await textOrNull(root, file), file).toBeNull();
    const preview = await stepIn(root, 11, ["--dry-run"]);
    for (const file of HOOK_FILES) expect(await textOrNull(root, file), file).toBeNull();
    const result = await stepIn(root, 11);
    expect(result.code).toBe(0);
    expect(section(preview.output, "Operations")).toEqual(expect.arrayContaining(HOOK_WRITES));
    expect(section(result.output, "Operations")).toEqual(section(preview.output, "Operations"));
    expect(section(result.output, "Reminder hooks")).toEqual([TRUST_CODEX_HOOKS]);
    for (const file of HOOK_FILES) {
      expect(await textOrNull(root, file), file).toBe(await textOrNull(initialised, file));
    }
  });

  // QFAI:AC-0004-0013-01
  it("merges into the project's settings and keeps a hook group the project edited", async () => {
    // QFAI:EX-0004-0013-19
    const template = await readFile(path.join(getInitAssetsDir(), ".claude/settings.json"), "utf8");
    const settings: unknown = JSON.parse(
      template.replace('"structured-question"', '"our-own-question"'),
    );
    if (!isRecord(settings) || !isRecord(settings.hooks)) throw new Error("no hooks in template");
    const prompts: unknown = settings.hooks.UserPromptSubmit;
    if (!Array.isArray(prompts)) throw new Error("no UserPromptSubmit groups in template");
    settings.hooks.UserPromptSubmit = prompts.filter(
      (group: unknown) => !JSON.stringify(group).includes("QFAI free-text entry reminder"),
    );
    settings.permissions = { allow: ["Bash(ls)"] };
    const projectSettings = `${JSON.stringify(settings, null, 2)}\n`;

    const root = await clone(migrated10);
    await put(root, ".claude/settings.json", projectSettings);
    const byInit = await scratch("qfai-init-merge-");
    await put(byInit, ".claude/settings.json", projectSettings);
    await captureStdout(() => runInit({ dir: byInit, force: false, dryRun: false, yes: true }));

    const kept =
      'kept: .claude/settings.json hook group UserPromptSubmit "QFAI structured-question reminder" (edited here)';
    const first = await stepIn(root, 11);
    expect(first.code).toBe(0);
    expect(section(first.output, "Operations")).toContain(
      ".claude/settings.json: update (reminder hooks: UserPromptSubmit; permission entries; existing settings kept)",
    );
    expect(section(first.output, "Reminder hooks")).toEqual([kept, TRUST_CODEX_HOOKS]);
    const merged = await readFile(path.join(root, ".claude/settings.json"), "utf8");
    expect(merged).toBe(await readFile(path.join(byInit, ".claude/settings.json"), "utf8"));
    expect(merged).toContain('"our-own-question"');
    expect(merged).toContain("QFAI free-text entry reminder");
    expect(merged).toContain('"Bash(ls)"');

    const before = await fingerprint(root);
    const again = await stepIn(root, 11);
    expect(again.code).toBe(0);
    expect(section(again.output, "Operations")).toEqual([]);
    expect(section(again.output, "Reminder hooks")).toEqual([kept]);
    expect(await fingerprint(root)).toBe(before);
  });

  // QFAI:AC-0004-0013-01
  it("leaves a linked hook file for a person and still writes the other", async () => {
    // QFAI:EX-0004-0013-20
    const root = await clone(migrated10);
    const outside = path.join(await scratch("qfai-hooks-outside-"), "hooks.json");
    await writeFile(outside, "{}\n");
    await mkdir(path.join(root, ".codex"), { recursive: true });
    await symlink(outside, path.join(root, ".codex/hooks.json"), "file");
    const result = await stepIn(root, 11);
    expect(result.code).toBe(3);
    expect(section(result.output, "For a person")).toEqual([
      ".codex/hooks.json was left unchanged: it, or a directory above it, is a symbolic link or not a directory, so the reminder hooks are not wired up.",
    ]);
    expect(section(result.output, "Reminder hooks")).toEqual([]);
    expect(await readlink(path.join(root, ".codex/hooks.json"))).toBe(outside);
    expect(await readFile(outside, "utf8")).toBe("{}\n");
    expect(await textOrNull(root, ".claude/settings.json")).toBe(
      await textOrNull(initialised, ".claude/settings.json"),
    );
  });

  // QFAI:AC-0004-0013-01
  it("migrates a 1.x project in one run, the reminder hooks included", async () => {
    // QFAI:EX-0004-0013-21
    const root = await clone(migrated11);
    const checked = await stepIn(root, 12);
    expect(checked.code, checked.output).toBe(0);
    expect(await lstat(path.join(root, ".qfai/specs")).catch(() => null)).toBeNull();
    expect(
      await textOrNull(root, ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md"),
    ).not.toBeNull();
    expect(
      await textOrNull(root, ".qfai/evidence/migration-spec-to-story/id-map.json"),
    ).not.toBeNull();
    expect(await sameAsPackage(root, "qfai-run")).toBe(true);
    for (const dir of HOST_SKILL_DIRS) {
      const link = path.join(root, dir, "qfai-run");
      expect(await linkReaches(link, path.join(root, ".qfai/assistant/skill/qfai-run")), dir).toBe(
        true,
      );
    }
    expect(await readFile(path.join(root, "AGENTS.md"), "utf8")).toBe(AGENTS_TEXT);
    expect(await readFile(path.join(root, ".gitignore"), "utf8")).toContain(".qfai/run/\n");
    for (const file of HOOK_FILES) {
      expect(await textOrNull(root, file), file).toBe(await textOrNull(initialised, file));
    }
    expect(await textOrNull(root, REMINDERS)).toBe(await readFile(SHIPPED_REMINDERS, "utf8"));
    git(root, ["init", "-q"]);
    const printed = await freeTextHookOutput(root);
    const reminder = await shippedFreeTextReminder();
    expect(printed).toEqual({ claude: reminder, codex: reminder });
  });
});

describe("migration step 11: the text the reminder hooks print", () => {
  // QFAI:AC-0004-0013-01
  it("refreshes an unedited reminders.json, writes a missing one, keeps an edited or a deleted one and refuses a link", async () => {
    // QFAI:EX-0004-0013-22
    const shipped = await readFile(SHIPPED_REMINDERS, "utf8");
    const shippedHash = hashAssistantAssetText(shipped);
    const lockEntry = async (root: string): Promise<unknown> => {
      const lock: unknown = JSON.parse(await readFile(path.join(root, RULE_LOCK), "utf8"));
      return isRecord(lock) ? lock["reminders.json"] : undefined;
    };

    const absent = await clone(migrated10);
    const created = await stepIn(absent, 11);
    expect(created.code, created.output).toBe(0);
    expect(section(created.output, "Operations")).toEqual(
      expect.arrayContaining([
        `${REMINDERS}: write from the package`,
        `${RULE_LOCK}: record the shipped reminder text`,
      ]),
    );
    expect(await textOrNull(absent, REMINDERS)).toBe(shipped);
    expect(await lockEntry(absent)).toBe(shippedHash);

    const unedited = await clone(migrated10);
    await recordReminderText(unedited, await remindersWithout("free-text-entry"));
    const refreshed = await stepIn(unedited, 11);
    expect(refreshed.code, refreshed.output).toBe(0);
    expect(section(refreshed.output, "Operations")).toContain(
      `${REMINDERS}: update (rule master, unedited here)`,
    );
    expect(await textOrNull(unedited, REMINDERS)).toBe(shipped);
    expect(await lockEntry(unedited)).toBe(shippedHash);

    const edited = await clone(migrated10);
    const ours = await remindersWithout("free-text-entry");
    await recordReminderText(edited, ours, await remindersWithout("api-budget"));
    const before = await textOrNull(edited, RULE_LOCK);
    const kept = await stepIn(edited, 11);
    expect(kept.code, kept.output).toBe(0);
    expect(section(kept.output, "Reminder hooks")).toContain(
      `kept: ${REMINDERS} (edited here, or written before this record existed)`,
    );
    expect(await textOrNull(edited, REMINDERS)).toBe(ours);
    expect(await textOrNull(edited, RULE_LOCK)).toBe(before);

    const linked = await clone(migrated10);
    const elsewhere = await scratch("qfai-rules-elsewhere-");
    await writeFile(path.join(elsewhere, "reminders.json"), "{}\n");
    await mkdir(path.join(linked, ".agents"), { recursive: true });
    await symlink(elsewhere, path.join(linked, ".agents/rules"), "dir");
    const refused = await stepIn(linked, 11);
    expect(refused.code).toBe(3);
    expect(section(refused.output, "For a person")).toContain(
      `${REMINDERS} was left unchanged: it, or a directory above it, is a symbolic link or not a directory, so the reminder text is not refreshed.`,
    );
    expect(await readFile(path.join(elsewhere, "reminders.json"), "utf8")).toBe("{}\n");

    const deleted = await clone(migrated10);
    await recordReminderText(deleted, await remindersWithout("free-text-entry"));
    await rm(path.join(deleted, REMINDERS));
    const lockBefore = await textOrNull(deleted, RULE_LOCK);
    const skipped = await stepIn(deleted, 11);
    expect(skipped.code, skipped.output).toBe(0);
    expect(await textOrNull(deleted, REMINDERS)).toBeNull();
    expect(await textOrNull(deleted, RULE_LOCK)).toBe(lockBefore);
    const named = section(skipped.output, "Reminder hooks").filter((line) =>
      line.includes(REMINDERS),
    );
    expect(
      named.some((line) => line.includes("kept deleted")),
      `Reminder hooks: ${named.join(" | ")}`,
    ).toBe(true);
  });
});

describe("migration steps 1 to 12 on a project an earlier 2.x release migrated", () => {
  function earlierRelease(): Promise<EarlierMigration> {
    earlierMigration ??= migratedByEarlierRelease();
    return earlierMigration;
  }

  // QFAI:AC-0004-0003-04
  it("says steps 1 to 10 are already done and brings only the hooks and their text up to date", async () => {
    // QFAI:EX-0004-0003-30
    const { root } = await earlierRelease();
    for (const pass of [1, 2]) {
      const before = await entries(root);
      for (let step = 1; step <= 12; step += 1) {
        const preview = await stepIn(root, step, ["--dry-run"]);
        const result = await stepIn(root, step);
        expect(result.code, `pass ${pass} step ${step}: ${result.output}`).toBe(0);
        expect(result.output, `pass ${pass} step ${step}`).toBe(preview.output);
        if (step <= 10) {
          expect(result.output.split("\n").slice(0, 3), `step ${step}`).toEqual([
            VERDICT_DONE,
            "",
            "## Operations",
          ]);
          expect(result.output.endsWith(`\n${ALREADY_DONE}\n`), `step ${step}`).toBe(true);
          expect(
            result.output.split("\n").filter((line) => line.startsWith("Summary")),
            `step ${step}`,
          ).toEqual([]);
          const items = result.output.split("\n").filter((line) => line.startsWith("- "));
          expect(items, `step ${step}`).toEqual([]);
        } else {
          expect(result.output.startsWith("## Operations\n"), `step ${step}`).toBe(true);
        }
        if (step === 11 && pass === 1) {
          const operations = section(result.output, "Operations");
          expect(operations).toHaveLength(4);
          expect(operations[0]).toBe(HOOK_WRITES[0]);
          expect(operations[1]).toMatch(
            /^\.codex\/hooks\.json: update \(reminder hooks: .+; existing settings kept\)$/,
          );
          expect(operations.slice(2)).toEqual([
            `${REMINDERS}: update (rule master, unedited here)`,
            `${RULE_LOCK}: record the shipped reminder text`,
          ]);
          expect(section(result.output, "Reminder hooks")).toEqual([TRUST_CODEX_HOOKS]);
        }
        if (step === 11 && pass === 2) {
          expect(section(result.output, "Operations")).toEqual([]);
          expect(section(result.output, "Reminder hooks")).toEqual([]);
        }
      }
      const changed = changedPaths(before, await entries(root));
      expect(changed, `pass ${pass}`).toEqual(
        pass === 1 ? [RULE_LOCK, REMINDERS, ...HOOK_FILES] : [],
      );
    }
    for (const file of HOOK_FILES) {
      expect(await textOrNull(root, file), file).toBe(await textOrNull(initialised, file));
    }
    expect(await textOrNull(root, REMINDERS)).toBe(await readFile(SHIPPED_REMINDERS, "utf8"));

    git(root, ["init", "-q"]);
    const printed = await freeTextHookOutput(root);
    const reminder = await shippedFreeTextReminder();
    expect(printed.claude).toBe(reminder);
    expect(printed.codex).toBe(reminder);
  }, 300_000);

  // QFAI:AC-0004-0003-04
  it("never reads a 1.x project, a stopped migration or a step 5 item as finished", async () => {
    // QFAI:EX-0004-0003-31
    const { root: finished, afterStep7 } = await earlierRelease();
    const stopped = await clone(afterStep7);
    await rm(path.join(stopped, ".qfai/spec/spec-0002"), { recursive: true });
    const unsettled = await clone(finished);
    await appendFile(
      path.join(
        unsettled,
        ".qfai/evidence/migration-spec-to-story/retired/spec-0001/06_Test-Cases.md",
      ),
      "| TC-0001-0009 | — | — | Cancel an order | The order is gone |\n",
    );
    const cases: Array<[string, string, number, number]> = [
      ["stopped after step 7", stopped, 8, 3],
      ["1.x", await oldProject(), 1, 0],
      ["unsettled step 5 case", unsettled, 5, 3],
    ];
    for (const [name, root, step, code] of cases) {
      const preview = await stepIn(root, step, ["--dry-run"]);
      const result = await stepIn(root, step);
      for (const run of [preview, result]) expect(run.output, name).not.toContain(ALREADY_DONE);
      expect(result.code, name).toBe(code);
      expect(section(result.output, "Operations"), name).toEqual(
        section(preview.output, "Operations"),
      );
      if (name === "unsettled step 5 case") {
        expect(section(result.output, "For a person"), name).toEqual([
          expect.stringContaining("TC-0001-0009: no criterion"),
        ]);
      } else {
        expect(section(result.output, "Operations").length, name).toBeGreaterThan(0);
      }
    }
    expect(await readFile(path.join(stopped, "tests/integration/order.test.ts"), "utf8")).toContain(
      ["QFAI", "EX-0001-0001-03"].join(":"),
    );
  }, 300_000);

  // QFAI:AC-0004-0003-04
  it("reads a finished migration as finished whatever plan.yaml now says", async () => {
    // QFAI:EX-0004-0003-32
    const { root: finished } = await earlierRelease();
    const plan = ".qfai/evidence/migration-spec-to-story/plan.yaml";
    const rewritten = await clone(finished);
    await put(rewritten, plan, "flows: []\nrules: []\n");
    const removed = await clone(finished);
    await rm(path.join(removed, plan));
    for (const [name, root] of [
      ["rewritten", rewritten],
      ["removed", removed],
    ] as const) {
      const before = await fingerprint(root);
      for (let step = 1; step <= 10; step += 1) {
        const preview = await stepIn(root, step, ["--dry-run"]);
        const result = await stepIn(root, step);
        expect(result.code, `${name} step ${step}: ${result.output}${result.errors}`).toBe(0);
        expect(result.output, `${name} step ${step}`).toBe(preview.output);
        expect(result.output.split("\n")[0], `${name} step ${step}`).toBe(VERDICT_DONE);
        expect(result.output.endsWith(`\n${ALREADY_DONE}\n`), `${name} step ${step}`).toBe(true);
      }
      expect(await fingerprint(root), name).toBe(before);
    }
  }, 300_000);

  // QFAI:AC-0004-0003-04
  it("needs no plan.yaml once no spec pack is left, and still refuses one while a pack is left", async () => {
    // QFAI:EX-0004-0003-35
    const { root: finished, afterStep7 } = await earlierRelease();
    const plan = ".qfai/evidence/migration-spec-to-story/plan.yaml";
    const unsettled = await clone(finished);
    await appendFile(
      path.join(
        unsettled,
        ".qfai/evidence/migration-spec-to-story/retired/spec-0001/06_Test-Cases.md",
      ),
      "| TC-0001-0009 | — | — | Cancel an order | The order is gone |\n",
    );
    const rewritten = await clone(unsettled);
    await put(rewritten, plan, "flows: []\nrules: []\n");
    const removed = await clone(unsettled);
    await rm(path.join(removed, plan));
    const packLeft = await clone(afterStep7);
    await rm(path.join(packLeft, plan));

    const beforePack = await entries(packLeft);
    const refused = await stepIn(packLeft, 4);
    expect(refused.code, refused.output).toBe(2);
    expect(refused.errors).toContain("plan.yaml");
    expect(changedPaths(beforePack, await entries(packLeft))).toEqual([]);

    for (const [name, root] of [
      ["rewritten", rewritten],
      ["removed", removed],
    ] as const) {
      for (const step of [4, 7]) {
        for (const args of [["--dry-run"], []]) {
          const label = `${name} step ${step} ${args.join(" ")}`.trimEnd();
          const before = await entries(root);
          const result = await stepIn(root, step, args);
          expect(result.code, `${label}: ${result.errors}`).toBe(0);
          expect(result.output, label).not.toContain(ALREADY_DONE);
          const headings = [...result.output.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
          expect(headings, label).toContain("Operations");
          for (const heading of headings) {
            expect(result.output, `${label}: ${heading}`).toContain(`## ${heading}\nnone\n`);
          }
          expect(changedPaths(before, await entries(root)), label).toEqual([]);
        }
      }
      const five = await stepIn(root, 5);
      expect(five.code, name).toBe(3);
      expect(section(five.output, "For a person"), name).toEqual([
        expect.stringContaining("TC-0001-0009: no criterion"),
      ]);
    }
  }, 300_000);

  // QFAI:AC-0004-0003-08
  it("opens a stopped migration with the found line in steps 4, 5 and 7 and never with the already-migrated line", async () => {
    // QFAI:EX-0004-0003-44
    const { root: finished } = await earlierRelease();
    const unsettled = await clone(finished);
    await appendFile(
      path.join(
        unsettled,
        ".qfai/evidence/migration-spec-to-story/retired/spec-0001/06_Test-Cases.md",
      ),
      "| TC-0001-0009 | — | — | Cancel an order | The order is gone |\n",
    );
    for (const step of [4, 5, 7]) {
      for (const args of [["--dry-run"], []]) {
        const label = `step ${step} ${args.join(" ")}`.trimEnd();
        const result = await stepIn(unsettled, step, args);
        expect(result.code, `${label}: ${result.errors}`).toBe(step === 5 ? 3 : 0);
        expect(result.output.split("\n").slice(0, 3), label).toEqual([
          VERDICT_FOUND,
          "",
          "## Operations",
        ]);
        expect(result.output, label).not.toContain(ALREADY_DONE);
        if (step === 5) {
          expect(section(result.output, "For a person"), label).toEqual([
            expect.stringContaining("TC-0001-0009: no criterion"),
          ]);
        } else {
          for (const heading of [...result.output.matchAll(/^## (.+)$/gm)].map((m) => m[1])) {
            expect(result.output, `${label}: ${heading}`).toContain(`## ${heading}\nnone\n`);
          }
        }
      }
    }
  }, 300_000);
});

describe("migration steps 1 to 12 on a project holding a retired configuration key", () => {
  // QFAI:AC-0004-0004-03
  it("removes the retired traceability keys and runs past the retired-key config issues", async () => {
    const root = await oldProject();
    expect((await loadConfig(root)).issues).toEqual([]);
    await writeConfig(root, (config) => {
      const validation = isRecord(config.validation) ? config.validation : {};
      const traceability = isRecord(validation.traceability) ? validation.traceability : {};
      traceability.scMustHaveTest = true;
      traceability.unknownContractIdSeverity = "warning";
      validation.traceability = traceability;
      config.validation = validation;
      config.prototyping = { primarySpecId: "spec-0001" };
    });
    const retired = (await loadConfig(root)).issues.filter((issue) =>
      issue.message.includes("is retired"),
    );
    expect(retired).toHaveLength(3);

    const result = await stepIn(root, 1);

    expect(result.code, result.errors).toBe(0);
    const operations = section(result.output, "Operations");
    for (const key of ["scMustHaveTest", "unknownContractIdSeverity"]) {
      expect(
        operations.some((line) => line.includes(key)),
        `${key} in ${operations.join(" | ")}`,
      ).toBe(true);
    }
    const config: unknown = parseYaml(await readFile(path.join(root, "qfai.config.yaml"), "utf8"));
    expect(config).not.toHaveProperty(["validation", "traceability", "scMustHaveTest"]);
    expect(config).not.toHaveProperty(["validation", "traceability", "unknownContractIdSeverity"]);
    expect(config).toHaveProperty(["prototyping", "primarySpecId"], "spec-0001");
  });

  it("runs steps 1 to 3 past primarySpecId and lists it for a person at step 3", async () => {
    // QFAI:EX-0004-0003-34
    const root = await oldProject();
    await writeConfig(root, (config) => {
      config.prototyping = { primarySpecId: "spec-0001" };
    });
    expect((await loadConfig(root)).issues.map((issue) => issue.message)).toEqual([
      expect.stringContaining("prototyping.primarySpecId"),
    ]);
    for (const step of [1, 2]) {
      const result = await stepIn(root, step);
      expect(result.code, `step ${step}: ${result.errors}`).not.toBe(2);
    }
    const third = await stepIn(root, 3);
    expect(third.code, third.errors).toBe(3);
    const items = section(third.output, "For a person");
    expect(
      items.some(
        (item) => item.includes("prototyping.primarySpecId") && item.includes("spec-0001"),
      ),
      items.join(" | "),
    ).toBe(true);
  }, 300_000);

  it("refuses steps 4 to 12 naming primarySpecId and writes nothing but the report", async () => {
    // QFAI:EX-0004-0003-34
    const root = await oldProject();
    await throughStep(root, 3);
    const control = await stepIn(root, 4, ["--dry-run"]);
    expect(control.code, control.errors).not.toBe(2);
    await writeConfig(root, (config) => {
      config.prototyping = { primarySpecId: "spec-0001" };
    });
    for (let step = 4; step <= 12; step += 1) {
      const before = await entries(root);
      const result = await stepIn(root, step);
      expect(result.code, `step ${step}: ${result.output}`).toBe(2);
      expect(result.errors, `step ${step}`).toContain("prototyping.primarySpecId");
      expect(changedPaths(before, await entries(root)), `step ${step}`).toEqual([]);
    }
  }, 300_000);
});

describe("migration steps 11 and 12: the report file", () => {
  // QFAI:AC-0004-0003-06
  it("prints each report, keeps it with its exit code, and leaves the file out of a no-change check", async () => {
    const occupied = await clone(migrated10);
    await mkdir(path.join(occupied, ".claude/skills/qfai-run"), { recursive: true });
    await writeFile(path.join(occupied, ".claude/skills/qfai-run/notes.md"), "ours\n");
    const before = await entries(occupied);

    const dry = await stepIn(occupied, 11, ["--dry-run"]);
    const dryFile = reportFile("dry-run", "step-11-001.md");
    expect(await migrationReportFiles(occupied, "dry-run", 11)).toEqual([dryFile]);
    expect(await migrationReportFiles(occupied, "run", 11)).toEqual([]);
    expect(dry.code).toBe(3);
    expect(changedPaths(before, await entries(occupied))).toEqual([]);
    const dryReport = await readMigrationReport(occupied, dryFile);
    expect(dryReport).toContain(dry.output);
    expect(lastLine(dryReport)).toBe("Exit code: 3");

    const real = await stepIn(occupied, 11);
    const runFile = reportFile("run", "step-11-001.md");
    expect(real.code).toBe(3);
    const items = section(real.output, "For a person");
    expect(items).toHaveLength(1);
    expect(await migrationReportFiles(occupied, "run", 11)).toEqual([runFile]);
    const runReport = await readMigrationReport(occupied, runFile);
    expect(runReport).toContain(real.output);
    expect(runReport).toContain(items[0]);
    expect(lastLine(runReport)).toBe("Exit code: 3");
    for (const line of section(real.output, "Operations")) {
      expect(line).not.toContain(MIGRATION_REPORT_DIR);
    }

    const clean = await clone(migrated11);
    const beforeClean = await entries(clean);
    const passed = await stepIn(clean, 12);
    expect(passed.code).toBe(0);
    expect(passed.output).toBe(CLEAN_REPORT);
    const passedFile = reportFile("run", "step-12-001.md");
    expect(await migrationReportFiles(clean, "run", 12)).toEqual([passedFile]);
    const passedReport = await readMigrationReport(clean, passedFile);
    expect(passedReport).toContain(passed.output);
    expect(lastLine(passedReport)).toBe("Exit code: 0");
    expect(changedPaths(beforeClean, await entries(clean))).toEqual([]);
  }, 300_000);
});

/** The thirteen 1.x paths step 12 looks for: a line that names it, and the label the item prints. */
const OLD_PATH_LINES: ReadonlyArray<readonly [line: string, label: string]> = [
  [".qfai/specs/", ".qfai/specs"],
  [".qfai/contracts/", ".qfai/contracts"],
  [".qfai/prototypes/", ".qfai/prototypes"],
  [".qfai/assistant/skills/", ".qfai/assistant/skills"],
  [".qfai/assistant/agents/", ".qfai/assistant/agents"],
  [".qfai/assistant/prompts/", ".qfai/assistant/prompts"],
  [".qfai/evidence/decisions/", ".qfai/evidence/decisions"],
  [".qfai/report/specs-coverage/", ".qfai/report/specs-coverage"],
  ["_policies/", "_policies/"],
  ["spec-0001", "spec-NNNN"],
  ["assistant/steering/", "assistant/steering"],
  ["assistant/instructions/", "assistant/instructions"],
  ["01_Spec.md", "01_Spec.md"],
];

/** Lines that look like a 1.x path and are not one. */
const NEAR_MISSES = [
  ".qfai/spec/01_policy/objective.md",
  ".qfai/assistant/skill/qfai-sdd/SKILL.md",
  "aspec-0001",
  "spec-00012",
  "qfai-spec-0001",
  "spec-abcd",
  "spec-0001-x",
  "spec-0001_x",
  "security_policies/",
];

type Seed = Record<string, string | Uint8Array | null>;

/** `total` lines, numbered from 1: filler everywhere but at the lines `named` gives. */
function linesWith(total: number, named: Record<number, string>, eol = "\n"): string {
  const lines = Array.from({ length: total }, (_, at) => named[at + 1] ?? `Filler line ${at + 1}.`);
  return `${lines.join(eol)}${eol}`;
}

/** The item step 12 prints for one line of a project file. */
function oldPathItem(file: string, line: number, ...labels: string[]): string {
  const paths = labels.map((label) => `\`${label}\``).join(", ");
  return `old-path: ${file}:${line}: still names 1.x paths: ${paths}`;
}

/**
 * A copy of `source` that is a git repository whose index holds exactly the files of `seed`,
 * nothing committed. A `null` value stands for a file the copy already holds.
 */
async function indexedProject(source: string, seed: Seed): Promise<string> {
  const root = await clone(source);
  git(root, ["init", "-q"]);
  for (const [file, content] of Object.entries(seed)) {
    if (content !== null) await put(root, file, content);
  }
  git(root, ["add", "-f", "--", ...Object.keys(seed)]);
  return root;
}

/** Writes a symbolic link and records it in the index as one, whatever a checkout would write. */
async function indexLink(
  root: string,
  link: string,
  target: string,
  type: "file" | "dir",
): Promise<void> {
  await mkdir(path.dirname(path.join(root, link)), { recursive: true });
  await symlink(target, path.join(root, link), type);
  indexLinkEntry(root, link, target);
}

/** Records `link` in the index as a symbolic link to `target`, whatever the working tree holds. */
function indexLinkEntry(root: string, link: string, target: string): void {
  const blob = spawnSync("git", ["hash-object", "-w", "--stdin"], {
    cwd: root,
    encoding: "utf8",
    input: target,
  });
  if (blob.status !== 0) throw new Error(`git hash-object: ${blob.stderr}`);
  git(root, ["update-index", "--add", "--cacheinfo", `120000,${blob.stdout.trim()},${link}`]);
}

/** Runs step 12 and holds that it wrote no file but its report and created no run. */
async function checkedStep12(root: string, args: string[] = []): Promise<Run> {
  const before = await fingerprint(root);
  const result = await stepIn(root, 12, args);
  expect(await fingerprint(root), "step 12 changed a file").toBe(before);
  expect(await lstat(path.join(root, ".qfai/run")).catch(() => null)).toBeNull();
  return result;
}

function scanned(count: number): string[] {
  return [`files checked for 1.x paths: ${count}`];
}

/** The rows of every Markdown table in `text`, as trimmed cells, one block per table. */
function tableBlocks(text: string): string[][][] {
  const blocks: string[][][] = [];
  let current: string[][] = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("|")) {
      current.push(
        line
          .replace(/^\||\|\s*$/g, "")
          .split("|")
          .map((cell) => cell.trim()),
      );
    } else if (current.length > 0) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

/** The position of each marker in `prose`, each searched for after the one before it. */
function markerPositions(prose: string, markers: readonly string[]): number[] {
  const found: number[] = [];
  const text = prose.toLowerCase();
  let from = 0;
  for (const marker of markers) {
    const at = text.indexOf(marker.toLowerCase(), from);
    found.push(at);
    if (at >= 0) from = at + marker.length;
  }
  return found;
}

/** Each 1.x path the guide's table names, and what its row gives as where the content is now. */
const GUIDE_TABLE: ReadonlyArray<readonly [oldPath: string, now: readonly string[]]> = [
  [".qfai/specs", ["`.qfai/spec`"]],
  [".qfai/contracts", ["`.qfai/spec/03_contract`"]],
  [".qfai/prototypes", ["`.qfai/prototype`"]],
  [".qfai/assistant/skills", ["`.qfai/assistant/skill`", "`.qfai/assistant/skill.local`"]],
  [".qfai/assistant/agents", ["`.qfai/assistant/agent`"]],
  [".qfai/assistant/prompts", ["`.qfai/assistant/prompt`"]],
  [".qfai/evidence/decisions", ["`.qfai/evidence/decision`"]],
  [".qfai/report/specs-coverage", ["`.qfai/report/spec-coverage`"]],
  [
    "_policies/",
    [
      "`.qfai/spec/01_policy/`",
      "`objective.md`",
      "`initiative.md`",
      "`glossary.md`",
      "`constraint.md`",
      "`.qfai/spec/03_contract/contracts.md`",
      "`.qfai/spec/02_business-flow/`",
      "`.qfai/evidence/migration-spec-to-story/retired/_policies/`",
    ],
  ],
  [
    "spec-NNNN",
    [
      "`business-flow-NNNN/`",
      "`user-story-NNNN-NNNN/`",
      "`.qfai/spec/02_business-flow/`",
      "`.qfai/evidence/migration-spec-to-story/id-map.json`",
    ],
  ],
  ["01_Spec.md", ["`.qfai/evidence/migration-spec-to-story/retired/<spec-id>/`"]],
  [
    "assistant/steering",
    ["`.qfai/assistant/rule/`", "`.qfai/spec/01_policy/`", "`.qfai/spec/03_contract/tech.md`"],
  ],
  [
    "assistant/instructions",
    ["`.qfai/assistant/rule/`", "`.qfai/spec/01_policy/`", "`.qfai/spec/03_contract/tech.md`"],
  ],
];

describe("migration step 12: project files that still name a 1.x path", () => {
  // QFAI:AC-0004-0042-01
  it("lists each line that names 1.x paths, in file order and line order, whatever the line ending", async () => {
    // QFAI:EX-0004-0042-01
    const root = await indexedProject(migrated11, {
      ".agents/skills/intake/SKILL.md": linesWith(12, {
        7: "Read `.qfai/specs/_policies/01_Objective.md` first",
        12: "Open .qfai/specs/spec-0003/01_Spec.md",
      }),
      ".github/agents/reviewer.md": linesWith(
        6,
        { 4: "Follow .qfai/assistant/steering/test-layers.md" },
        "\r\n",
      ),
    });
    const result = await checkedStep12(root);
    expect(result.code, result.output).toBe(3);
    expect(section(result.output, "For a person")).toEqual([
      oldPathItem(".agents/skills/intake/SKILL.md", 7, ".qfai/specs", "_policies/"),
      oldPathItem(".agents/skills/intake/SKILL.md", 12, ".qfai/specs", "spec-NNNN", "01_Spec.md"),
      oldPathItem(".github/agents/reviewer.md", 4, "assistant/steering"),
    ]);
    expect(section(result.output, "Files scanned")).toEqual(scanned(2));
  });

  // QFAI:AC-0004-0042-01
  it("names each of the thirteen 1.x paths, and only the one a line holds", async () => {
    // QFAI:EX-0004-0042-02
    const named = Object.fromEntries(OLD_PATH_LINES.map(([line], at) => [at + 1, line]));
    const root = await indexedProject(migrated11, {
      "docs/paths.md": linesWith(OLD_PATH_LINES.length, named),
    });
    const result = await checkedStep12(root);
    expect(result.code, result.output).toBe(3);
    expect(section(result.output, "For a person")).toEqual(
      OLD_PATH_LINES.map(([, label], at) => oldPathItem("docs/paths.md", at + 1, label)),
    );
  });

  // QFAI:AC-0004-0042-01
  it("reads a line that only looks like a 1.x path as no 1.x path", async () => {
    // QFAI:EX-0004-0042-03
    const named = Object.fromEntries(NEAR_MISSES.map((line, at) => [at + 1, line]));
    const root = await indexedProject(migrated11, {
      "docs/near.md": linesWith(NEAR_MISSES.length, named),
    });
    const result = await checkedStep12(root);
    expect(result.code, result.output).toBe(0);
    expect(section(result.output, "For a person")).toEqual([]);
    expect(section(result.output, "Files scanned")).toEqual(scanned(1));
  });

  // QFAI:AC-0004-0042-01
  it("prints a name as git stores it, neither quoted nor escaped", async () => {
    // QFAI:EX-0004-0042-13
    const file = "docs/my notes é.md";
    const root = await indexedProject(migrated11, {
      [file]: linesWith(2, { 2: "Open .qfai/specs" }),
    });
    const result = await checkedStep12(root);
    expect(result.code, result.output).toBe(3);
    expect(section(result.output, "For a person")).toEqual([oldPathItem(file, 2, ".qfai/specs")]);
  });

  // QFAI:AC-0004-0042-02
  it("leaves out the QFAI tree, the init-written copilot file and the files it does not own", async () => {
    // QFAI:EX-0004-0042-04
    const copilot = await readFile(
      path.join(initialised, ".github/copilot-instructions.md"),
      "utf8",
    );
    expect(copilot).toContain("assistant/steering");
    expect(copilot).toContain("assistant/instructions");
    const old = "| DEC-0001 | Read .qfai/specs/spec-0001/07_Decisions.md |\n";
    const root = await indexedProject(migrated11, {
      ".qfai/spec/decisions.md": old,
      ".qfai/assistant/skill/qfai-sdd/SKILL.md": old,
      ".qfai/assistant/skill.local/mine/SKILL.md": old,
      ".github/copilot-instructions.md": copilot,
      "qfai.config.yaml": null,
      "README.md": "# Project\n",
    });
    const result = await checkedStep12(root);
    expect(result.code, result.output).toBe(0);
    expect(section(result.output, "For a person")).toEqual([]);
    expect(section(result.output, "Files scanned")).toEqual(scanned(2));
  });

  // QFAI:AC-0004-0042-02
  it("lists a file a link leads to once, under its own path, and never a link", async () => {
    // QFAI:EX-0004-0042-05
    const root = await indexedProject(migrated11, {
      ".agents/skills/intake/SKILL.md": linesWith(3, { 3: "Read .qfai/specs" }),
    });
    await indexLink(root, ".claude/skills/intake", "../../.agents/skills/intake", "dir");
    await indexLink(root, "docs/intake.md", "../.agents/skills/intake/SKILL.md", "file");
    // A checkout that cannot make links writes a regular file for a link the index records.
    await put(root, "docs/copy.md", "Read .qfai/specs\n");
    indexLinkEntry(root, "docs/copy.md", "../.agents/skills/intake/SKILL.md");
    const result = await checkedStep12(root);
    expect(result.code, result.output).toBe(3);
    expect(section(result.output, "For a person")).toEqual([
      oldPathItem(".agents/skills/intake/SKILL.md", 3, ".qfai/specs"),
    ]);
    expect(section(result.output, "Files scanned")).toEqual(scanned(1));
  });

  // QFAI:AC-0004-0042-02
  it("leaves out a binary file, a file gone from the working tree and a file git does not track", async () => {
    // QFAI:EX-0004-0042-06
    const root = await indexedProject(migrated11, {
      "assets/blob.bin": Buffer.concat([Buffer.from([0]), Buffer.from(".qfai/specs\n")]),
      "docs/old.md": "Read .qfai/specs\n",
    });
    await rm(path.join(root, "docs/old.md"));
    await put(root, "docs/draft.md", "Read .qfai/specs\n");
    const result = await checkedStep12(root);
    expect(result.code, result.output).toBe(0);
    expect(section(result.output, "For a person")).toEqual([]);
    expect(section(result.output, "Files scanned")).toEqual(scanned(0));
  });

  // QFAI:AC-0004-0042-02
  it("leaves out a submodule and an indexed file that is a directory in the working tree", async () => {
    // QFAI:EX-0004-0042-12
    const root = await indexedProject(migrated11, { "docs/dir.md": "placeholder\n" });
    git(root, ["update-index", "--add", "--cacheinfo", `160000,${"1".repeat(40)},vendor/lib`]);
    await rm(path.join(root, "docs/dir.md"));
    await put(root, "docs/dir.md/inner.md", "Read .qfai/specs\n");
    const result = await checkedStep12(root);
    expect(result.code, result.output).toBe(0);
    expect(section(result.output, "For a person")).toEqual([]);
    expect(section(result.output, "Files scanned")).toEqual(scanned(0));
  });

  // QFAI:AC-0004-0042-02
  it("leaves out the configured spec and contract directories", async () => {
    // QFAI:EX-0004-0042-14
    const configured = await clone(migrated11);
    await writeConfig(configured, (config) => {
      const paths = isRecord(config.paths) ? config.paths : {};
      config.paths = { ...paths, specsDir: "docs/spec", contractsDir: "docs/contract" };
    });
    const root = await indexedProject(configured, {
      "docs/spec/decisions.md": "| DEC-0001 | Read .qfai/specs/spec-0001/07_Decisions.md |\n",
      "docs/contract/cli/cli-0001-tool.md": "Follows spec-0001\n",
    });
    const result = await checkedStep12(root);
    expect(result.code, result.output).toBe(0);
    expect(section(result.output, "For a person")).toEqual([]);
    expect(section(result.output, "Files scanned")).toEqual(scanned(0));
  });

  // QFAI:AC-0004-0042-03
  it("says how many files it checked when it finds nothing, in a dry run too", async () => {
    // QFAI:EX-0004-0042-07
    const root = await indexedProject(migrated11, {
      "README.md": "# Project\n",
      "qfai.config.yaml": null,
      ".gitignore": null,
      ".qfai/spec/decisions.md": "# Decisions\n",
    });
    await indexLink(root, "docs/link.md", "../README.md", "file");
    const real = await checkedStep12(root);
    const dry = await checkedStep12(root, ["--dry-run"]);
    for (const result of [real, dry]) {
      expect(result.code, result.output).toBe(0);
      expect(section(result.output, "Files scanned")).toEqual(scanned(3));
      expect(section(result.output, "For a person")).toEqual([]);
      const headings = result.output.split("\n").filter((line) => line.startsWith("## "));
      expect(headings).toEqual(["## Operations", "## Files scanned", "## For a person"]);
    }
    expect(dry.output).toBe(real.output);
  });

  // QFAI:AC-0004-0042-03
  it("says that a project outside git was not checked, and lists nothing for it", async () => {
    // QFAI:EX-0004-0042-08
    const root = await clone(migrated11);
    await put(root, "docs/old.md", "Read .qfai/specs\n");
    const real = await checkedStep12(root);
    const dry = await checkedStep12(root, ["--dry-run"]);
    for (const result of [real, dry]) {
      expect(result.code, result.output).toBe(0);
      expect(section(result.output, "Files scanned")).toEqual([
        "not checked: the project is not a git repository",
      ]);
      expect(section(result.output, "For a person")).toEqual([]);
    }
    expect(dry.output).toBe(real.output);
  });

  // QFAI:AC-0004-0042-05
  it("fails with git's message when git cannot read the index, and does not call it no repository", async () => {
    // QFAI:EX-0004-0042-11
    const root = await indexedProject(migrated11, { "README.md": "# Project\n" });
    await writeFile(path.join(root, ".git/index"), "not an index\n");
    // A failure no step handles ends the script with exit 1, so a thrown error reads as that.
    const before = await fingerprint(root);
    const result = await stepIn(root, 12).catch((error: unknown): Run => ({
      code: 1,
      output: "",
      errors: String(error),
    }));
    expect(await fingerprint(root)).toBe(before);
    expect(result.code, result.output).toBe(2);
    expect(result.errors).toMatch(/index/i);
    expect(result.errors).not.toMatch(/not a git repository/i);
    expect(result.output).not.toContain("## Files scanned");
    expect(result.output).not.toContain("not checked");
  });

  // QFAI:AC-0004-0042-04
  it("tells in the guide what the migration leaves alone and what each 1.x path is now", async () => {
    // QFAI:EX-0004-0042-09
    const guide = await readFile(
      path.join(SKILL_ASSETS, "qfai-migration-v1-to-v2/references/migration-guide.md"),
      "utf8",
    );
    const prose = guide.replace(/\s+/g, " ");
    const markers = [
      "does not rewrite a skill, agent or document the project wrote",
      "step 12 lists each line of a tracked file that names a 1.x path",
      "`old-path`",
      "configured spec and contract directories",
      "`.github/copilot-instructions.md`",
      "a symbolic link",
      "a file git does not track",
      "`.qfai/assistant/skill.local/`",
      "by hand",
    ];
    const positions = markerPositions(prose, markers);
    expect(
      markers.filter((_, at) => (positions[at] ?? -1) < 0),
      "markers the guide lacks, in this order",
    ).toEqual([]);
    expect(prose).toMatch(/retired\/`[\s\S]{0,200}only in (?:this|the) working copy/);

    const firstCell = (cells: string[], oldPath: string): boolean =>
      (cells[0] ?? "").includes(`\`${oldPath}\``);
    const table = tableBlocks(guide).find((rows) =>
      GUIDE_TABLE.every(([oldPath]) => rows.some((cells) => firstCell(cells, oldPath))),
    );
    expect(table, "one table that gives each of the thirteen 1.x paths").toBeDefined();
    for (const [oldPath, now] of GUIDE_TABLE) {
      const row = (table ?? []).find((cells) => firstCell(cells, oldPath)) ?? [];
      const where = row.slice(1).join(" | ");
      for (const fragment of now) expect(where, `${oldPath} -> ${fragment}`).toContain(fragment);
    }
    // The skills directory is given together with its project-local sibling, on the old side.
    const skillsRow = (table ?? []).find((cells) => firstCell(cells, ".qfai/assistant/skills"));
    expect((skillsRow ?? []).join(" | ")).toContain("`.qfai/assistant/skills.local`");
  });

  // QFAI:AC-0004-0042-04
  it("tells the AI in SKILL.md to resolve each old-path item with the person who wrote the file", async () => {
    // QFAI:EX-0004-0042-10
    const skill = await readFile(
      path.join(SKILL_ASSETS, "qfai-migration-v1-to-v2/SKILL.md"),
      "utf8",
    );
    const prose = skill.replace(/\s+/g, " ");
    const markers = [
      "Resolve every item step 12 lists",
      "`old-path`",
      "with the person who wrote the file",
      "rewording the line so that it no longer names the old path",
      "2.x path",
      "table",
      "Rerun step 12 until it exits 0",
    ];
    const positions = markerPositions(prose, markers);
    expect(
      markers.filter((_, at) => (positions[at] ?? -1) < 0),
      "markers SKILL.md lacks, in this order",
    ).toEqual([]);
  });
});
