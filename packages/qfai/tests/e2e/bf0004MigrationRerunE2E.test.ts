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

async function cloneProject(source: string): Promise<string> {
  const root = await scratch("qfai-migration-rerun-copy-");
  await cp(source, root, { recursive: true, verbatimSymlinks: true });
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
    expect(applied[11]?.status, applied[11]?.stdout).toBe(0);
    expect(section(applied[10]?.stdout ?? "", "Operations")).toEqual(
      expect.arrayContaining(HOOK_WRITES),
    );
    expect(section(applied[10]?.stdout ?? "", "Reminder hooks")).toEqual([TRUST_CODEX_HOOKS]);

    await expect(lstat(path.join(root, ".qfai/specs"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await textOrNull(root, ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md"),
    ).not.toBeNull();
    expect(
      await textOrNull(root, ".qfai/evidence/migration-spec-to-story/id-map.json"),
    ).not.toBeNull();
    expect(await textOrNull(root, ".qfai/assistant/skill/qfai-run/SKILL.md")).toBe(
      await textOrNull(PACKAGE_ROOT, "assets/init/.qfai/assistant/skill/qfai-run/SKILL.md"),
    );
    for (const dir of HOST_SKILL_DIRS) {
      expect((await readlink(path.join(root, dir, "qfai-run"))).replace(/\\/g, "/")).toContain(
        "assistant/skill/qfai-run",
      );
    }
    expect(await textOrNull(root, "AGENTS.md")).toContain("`qfai-run`");
    expect(await textOrNull(root, ".gitignore")).toContain(".qfai/run/\n");
    for (const file of HOOK_FILES) {
      expect(await textOrNull(root, file), file).toBe(await textOrNull(initialised, file));
    }
  });

  it("runs again on a project an earlier release migrated and adds only the hook files", async () => {
    const root = await cloneProject(journey.root);
    // What a person settles from the first run's reports, then the tree an
    // earlier release's step 11 left: no hook file.
    await rm(path.join(root, ".qfai/spec/spec-0002"), { recursive: true });
    const test = "tests/integration/order.test.ts";
    await reannotate(root, test, "CON-API-0001", "API-0001");
    await reannotate(root, test, "SPEC-0001:US-0001-0001", "AC-0001-0001-01");
    for (const file of HOOK_FILES) await rm(path.join(root, file));

    for (const pass of [1, 2]) {
      const before = await snapshot(root);
      for (let number = 1; number <= 12; number += 1) {
        const dryRun = step(root, number, ["--dry-run"]);
        const real = step(root, number);
        expect(real.status, `pass ${pass} step ${number}: ${real.stdout}${real.stderr}`).toBe(0);
        expect(real.stdout, `pass ${pass} step ${number}`).toBe(dryRun.stdout);
        if (number <= 10) {
          expect(real.stdout.endsWith(`\n${ALREADY_DONE}\n`), `step ${number}`).toBe(true);
        } else {
          expect(real.stdout, `step ${number}`).not.toContain(ALREADY_DONE);
        }
        if (number === 11) {
          expect(section(real.stdout, "Operations")).toEqual(pass === 1 ? HOOK_WRITES : []);
        }
      }
      expect(changedPaths(before, await snapshot(root)), `pass ${pass}`).toEqual(
        pass === 1 ? [...HOOK_FILES] : [],
      );
    }
    for (const file of HOOK_FILES) {
      expect(await textOrNull(root, file), file).toBe(await textOrNull(journey.initialised, file));
    }
  }, 300_000);
});
