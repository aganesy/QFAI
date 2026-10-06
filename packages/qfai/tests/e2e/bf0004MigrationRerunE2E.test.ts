// QFAI:BF-0004

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
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
import process from "node:process";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { deleteE2eCaseAnnotation } from "../helpers/migrationE2eAnnotation.js";
import { assertBuiltCliFresh } from "../helpers/builtCli.js";
import { expectLinkToCanonicalSkill } from "../helpers/skillLink.js";
import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const FIXTURE = path.join(PACKAGE_ROOT, "tests/fixtures/migration-spec-to-story/old-layout");
const CONVERTIBLE_CRITERIA = path.join(
  PACKAGE_ROOT,
  "tests/fixtures/bf0004MigrationCutover/legacy-criteria.md",
);
const SKILL_SCRIPTS = path.join(
  PACKAGE_ROOT,
  "assets/init/.qfai/assistant/skill/qfai-migration-v1-to-v2/scripts",
);
const CLI = path.join(PACKAGE_ROOT, "dist/cli/index.mjs");
assertBuiltCliFresh(CLI);
const SCRIPT_NAMES = [
  "01-rename-directories.mjs",
  "02-merge-tables.mjs",
  "03-move-catalog.mjs",
  "04-renumber-ids.mjs",
  "05-cases-to-examples.mjs",
  "06-derive-ac-refs.mjs",
  "07-rules-to-contracts.mjs",
  "08-rewrite-annotations.mjs",
  "09-repoint-links.mjs",
  "10-update-gitignore.mjs",
  "11-install-entry.mjs",
  "12-check-entry.mjs",
] as const;
const HOST_SKILL_DIRS = [".claude/skills", ".agents/skills", ".codex/skills", ".github/skills"];
const HOST_AGENTS = [
  [".claude/agents", "orchestrator.md"],
  [".github/agents", "orchestrator.agent.md"],
] as const;
const HOOK_FILES = [".claude/settings.json", ".codex/hooks.json"] as const;
const HOOK_WRITES = HOOK_FILES.map((file) => `${file}: write from the package's hook template`);
const TRUST_CODEX_HOOKS =
  "Codex runs the hooks in .codex/hooks.json only after you review and trust them with /hooks.";
const ALREADY_DONE =
  "Already done: an earlier run migrated this project, and steps 1 to 10 have nothing left to do.";
const REMINDERS = ".agents/rules/reminders.json";
const SHIPPED_REMINDERS = path.join(PACKAGE_ROOT, "assets/init/root", REMINDERS);
const EARLIER_CODEX_HOOKS = path.join(
  PACKAGE_ROOT,
  "tests/fixtures/codex-hooks/earlier-hooks.json",
);
const FREE_TEXT_HOOK = "QFAI free-text entry reminder";
const CLAUDE_PROJECT_DIR = ["$", "{CLAUDE_PROJECT_DIR}"].join("");
const temporary: string[] = [];

type Result = { status: number | null; stdout: string; stderr: string };
type Journey = { root: string; preview: Result[]; applied: Result[]; initialised: string };

function run(root: string, command: string, args: string[]): Result {
  const child = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout: 60_000 });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

function step(root: string, number: number, args: string[] = []): Result {
  const script = SCRIPT_NAMES[number - 1];
  if (!script) throw new Error(`Unknown migration step: ${number}`);
  return run(root, process.execPath, [path.join(SKILL_SCRIPTS, script), ...args]);
}

async function scratch(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporary.push(root);
  return root;
}

async function oldLink(root: string, relative: string, target: string, type: "dir" | "file") {
  const link = path.join(root, relative);
  await mkdir(path.dirname(link), { recursive: true });
  await symlink(path.relative(path.dirname(link), path.join(root, target)), link, type);
}

/** A 1.x project with the package installed and the host links a 1.x `qfai init` wrote. */
async function oldProject(): Promise<string> {
  const root = await scratch("qfai-migration-rerun-");
  await cp(FIXTURE, root, { recursive: true });
  await cp(
    CONVERTIBLE_CRITERIA,
    path.join(root, ".qfai/specs/spec-0001/03_Acceptance-Criteria.md"),
  );
  await rename(path.join(root, "gitignore.input"), path.join(root, ".gitignore"));
  await rename(
    path.join(root, ".qfai/assistant/skill-local.input"),
    path.join(root, ".qfai/assistant/skills.local"),
  );
  await mkdir(path.join(root, "node_modules"), { recursive: true });
  await symlink(
    PACKAGE_ROOT,
    path.join(root, "node_modules/qfai"),
    process.platform === "win32" ? "junction" : "dir",
  );
  for (const dir of HOST_SKILL_DIRS) {
    await oldLink(root, `${dir}/qfai-sdd`, ".qfai/assistant/skills/qfai-sdd", "dir");
  }
  for (const [dir, name] of HOST_AGENTS) {
    await oldLink(root, `${dir}/${name}`, ".qfai/assistant/agents/orchestrator.md", "file");
  }
  const git = run(root, "git", ["init", "-q"]);
  if (git.status !== 0) throw new Error(`git init failed: ${git.stderr}`);
  return root;
}

/** Every file and link the project holds, with what it holds; `.git` and the package are left out. */
async function snapshot(root: string): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    const file = path.join(entry.parentPath, entry.name);
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (/^(?:\.git|node_modules)(?:\/|$)/.test(relative) || entry.isDirectory()) continue;
    found.set(
      relative,
      entry.isSymbolicLink()
        ? `link:${await readlink(file)}`
        : createHash("sha256")
            .update(await readFile(file))
            .digest("hex"),
    );
  }
  return found;
}

function changedPaths(before: Map<string, string>, after: Map<string, string>): string[] {
  const all = new Set([...before.keys(), ...after.keys()]);
  return [...all].filter((file) => before.get(file) !== after.get(file)).sort();
}

function section(report: string, name: string): string[] {
  const body = report.split(`## ${name}\n`)[1]?.split("\n## ")[0] ?? "";
  return body
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
}

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

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || isUnknownArray(value)) {
    throw new Error("expected a JSON object");
  }
  return Object.fromEntries(Object.entries(value));
}

/** The free-text entry hook a hook file of `root` declares. */
async function freeTextHook(root: string, file: string): Promise<Record<string, unknown>> {
  const hooks = record(record(JSON.parse(await readFile(path.join(root, file), "utf8"))).hooks);
  const groups = isUnknownArray(hooks.UserPromptSubmit) ? hooks.UserPromptSubmit : [];
  for (const group of groups) {
    const entries = record(group).hooks;
    for (const entry of isUnknownArray(entries) ? entries : []) {
      const hook = record(entry);
      if (hook.statusMessage === FREE_TEXT_HOOK) return hook;
    }
  }
  throw new Error(`${file} has no free-text entry hook`);
}

let journey: Journey;

beforeAll(async () => {
  const root = await oldProject();
  const preview: Result[] = [];
  const applied: Result[] = [];
  for (let number = 1; number <= 12; number += 1) {
    const dryRun = step(root, number, ["--dry-run"]);
    preview.push(dryRun);
    if (dryRun.status === 2 || dryRun.status === null) {
      throw new Error(`Step ${number} dry run failed: ${dryRun.stderr}`);
    }
    const real = step(root, number);
    applied.push(real);
    if (real.status === 2 || real.status === null) {
      throw new Error(`Step ${number} failed: ${real.stderr}`);
    }
  }
  const initialised = await scratch("qfai-migration-rerun-init-");
  const init = run(initialised, process.execPath, [CLI, "init", "--yes"]);
  if (init.status !== 0) throw new Error(`qfai init failed: ${init.stderr}`);
  journey = { root, preview, applied, initialised };
}, 300_000);

afterAll(async () => {
  for (const root of temporary) await removeTempTree(root);
});

describe("BF-0004: the migration from a 1.x project, and again on a migrated one", () => {
  it("migrates a 1.x project through every bundled step, the reminder hooks included", async () => {
    const { root, preview, applied, initialised } = journey;
    for (const result of [...preview, ...applied]) {
      expect(result.stdout).not.toContain(ALREADY_DONE);
    }
    expect(applied.every((result) => result.status === 0 || result.status === 3)).toBe(true);
    // Steps 1 to 10 say what they found before they report; steps 11 and 12 open on their report.
    for (const [position, result] of [...preview, ...applied].entries()) {
      const index = position % 12;
      expect(result.stdout.split(/\r?\n/)[0], `step ${index + 1}`).toBe(
        index < 10 ? "1.x layout found, migrating" : "## Operations",
      );
    }
    expect(applied[11]?.status, applied[11]?.stdout).toBe(0);
    expect(section(applied[10]?.stdout ?? "", "Operations")).toEqual(
      expect.arrayContaining(HOOK_WRITES),
    );
    expect(section(applied[10]?.stdout ?? "", "Reminder hooks")).toEqual([
      TRUST_CODEX_HOOKS,
      `${REMINDERS}: write from the package`,
    ]);

    await expect(lstat(path.join(root, ".qfai/specs"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await textOrNull(root, ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md"),
    ).not.toBeNull();
    expect(await textOrNull(root, "tmp/qfai-migration/id-map.json")).not.toBeNull();
    const skill = ".qfai/assistant/skill/qfai-run/SKILL.md";
    const lf = (text: string | null) => text?.replace(/\r\n/g, "\n");
    expect(lf(await textOrNull(root, skill))).toBe(
      lf(await textOrNull(path.join(PACKAGE_ROOT, "assets/init"), skill)),
    );
    for (const dir of HOST_SKILL_DIRS) {
      await expectLinkToCanonicalSkill(
        path.join(root, dir, "qfai-run"),
        path.join(root, ".qfai/assistant/skill/qfai-run"),
      );
    }
    expect((await textOrNull(root, "AGENTS.md")) ?? "").not.toContain("`qfai-run`");
    expect(await textOrNull(root, ".gitignore")).toContain(".qfai/run/\n");
    for (const file of HOOK_FILES) {
      expect(await textOrNull(root, file), file).toBe(await textOrNull(initialised, file));
    }
  });

  it("finds no 1.x layout on a project 2.0.0 migrated and brings only the hooks and their text up to date", async () => {
    // The migrated tree itself, not a copy: on Windows a copy turns each host directory
    // link into a file link, which step 9 then has to repair. This is the last test.
    const root = journey.root;
    // What a person settles from the first run's reports, then what 2.0.0
    // left: no Claude Code settings, its own Codex hook file, and a reminder
    // text without the free-text entry.
    await rm(path.join(root, ".qfai/spec/spec-0002"), { recursive: true });
    const test = "tests/integration/order.test.ts";
    await reannotate(root, test, "CON-API-0001", "API-0001");
    await reannotate(root, test, "SPEC-0001:US-0001-0001", "AC-0001-0001-01");
    await deleteE2eCaseAnnotation(root, "tests/e2e/order.test.ts");
    await rm(path.join(root, ".claude/settings.json"));
    await cp(EARLIER_CODEX_HOOKS, path.join(root, ".codex/hooks.json"));
    const shipped = await readFile(SHIPPED_REMINDERS, "utf8");
    const messages = record(JSON.parse(shipped));
    const { "free-text-entry": freeText, ...older } = messages;
    const olderText = `${JSON.stringify(older, null, 2)}\n`;
    await writeFile(path.join(root, REMINDERS), olderText);
    // 2.0.0 kept its working state under the evidence tree, which no step reads.
    const evidence = path.join(root, ".qfai/evidence/migration-spec-to-story");
    await mkdir(path.dirname(evidence), { recursive: true });
    await rename(path.join(root, "tmp/qfai-migration"), evidence);
    const none = "no 1.x layout found under .qfai/spec (paths.specsDir=.qfai/spec)";

    for (const pass of [1, 2]) {
      const before = await snapshot(root);
      for (let number = 1; number <= 12; number += 1) {
        const dryRun = step(root, number, ["--dry-run"]);
        const real = step(root, number);
        expect(real.status, `pass ${pass} step ${number}: ${real.stdout}${real.stderr}`).toBe(0);
        expect(real.stdout, `pass ${pass} step ${number}`).toBe(dryRun.stdout);
        if (number <= 10) {
          expect(real.stdout.split(/\r?\n/).slice(0, 3), `step ${number}`).toEqual([
            none,
            "",
            "## Operations",
          ]);
          expect(real.stdout, `step ${number}`).not.toContain(ALREADY_DONE);
        } else {
          expect(real.stdout, `step ${number}`).not.toContain(ALREADY_DONE);
          expect(real.stdout.split(/\r?\n/)[0], `step ${number}`).toBe("## Operations");
        }
        if (number === 11) {
          expect(section(real.stdout, "Reminder hooks").join("\n")).not.toContain("edited here");
          expect(section(real.stdout, "Operations").map((line) => line.split(": ")[0])).toEqual(
            pass === 1 ? [...HOOK_FILES, REMINDERS] : [],
          );
        }
      }
      expect(changedPaths(before, await snapshot(root)), `pass ${pass}`).toEqual(
        pass === 1 ? [REMINDERS, ...HOOK_FILES] : [],
      );
    }
    for (const file of HOOK_FILES) {
      expect(await textOrNull(root, file), file).toBe(await textOrNull(journey.initialised, file));
    }
    expect(await textOrNull(root, ".codex/hooks.json")).toBe(
      await textOrNull(path.join(PACKAGE_ROOT, "assets/init"), ".codex/hooks.json"),
    );
    expect(await textOrNull(root, REMINDERS)).toBe(shipped);

    const reminder = JSON.stringify(freeText);
    const claudeHook = await freeTextHook(root, ".claude/settings.json");
    const claudeArgs = isUnknownArray(claudeHook.args) ? claudeHook.args.map(String) : [];
    const claude = spawnSync(
      process.execPath,
      claudeArgs.map((arg) => arg.replace(CLAUDE_PROJECT_DIR, root)),
      { cwd: root, encoding: "utf8" },
    );
    expect(claude.stdout.trim()).toBe(reminder);
    const codexHook = await freeTextHook(root, ".codex/hooks.json");
    const codex = spawnSync(String(codexHook.command), {
      cwd: root,
      encoding: "utf8",
      shell: true,
    });
    expect(codex.stdout.trim()).toBe(reminder);
  }, 300_000);
});
