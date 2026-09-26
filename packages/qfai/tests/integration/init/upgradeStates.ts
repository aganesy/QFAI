/**
 * Upgrade-state fixtures for the `qfai init` integration modules.
 *
 * Every state starts from a tree a fresh `qfai init` wrote into a temp root whose name contains a
 * space, plus the named overlays. An overlay name this factory does not know fails the test, so a
 * case cannot quietly run against a state nobody built.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { vi } from "vitest";

import { runInit } from "../../../src/cli/commands/init.js";
import { captureStdout } from "../../helpers/stdout.js";

/**
 * Runs `qfai init` on `root` with its report captured rather than printed. `yes` is `false` for a
 * run without `--yes`.
 */
export async function initQuietly(root: string, force = false, yes = true): Promise<string> {
  const lines: string[] = [];
  const capture = (...args: unknown[]): void => {
    lines.push(args.map(String).join(" "));
  };
  const log = vi.spyOn(console, "log").mockImplementation(capture);
  const warn = vi.spyOn(console, "warn").mockImplementation(capture);
  const error = vi.spyOn(console, "error").mockImplementation(capture);
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    lines.push(String(chunk));
    return true;
  });
  let stdout: string;
  try {
    stdout = await captureStdout(() => runInit({ dir: root, force, dryRun: false, yes }));
  } finally {
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
    stderr.mockRestore();
  }
  return [...lines, stdout].join("\n");
}

/** Runs git in `root` and returns its exit status and stdout. */
export function git(root: string, args: string[]): { status: number; stdout: string } {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf-8" });
  if (result.error) throw result.error;
  return { status: result.status ?? -1, stdout: result.stdout };
}

/** Whether git reports `relativePath` ignored in `root`. */
export function isIgnored(root: string, relativePath: string): boolean {
  const { status } = git(root, ["check-ignore", "-q", relativePath]);
  if (status !== 0 && status !== 1) throw new Error(`git check-ignore exited ${String(status)}`);
  return status === 0;
}

export const HOST_SKILL_DIRS = [
  ".agents/skills",
  ".claude/skills",
  ".codex/skills",
  ".github/skills",
];
export const SKILLS = ".qfai/assistant/skill";
export const ENTRY_SKILLS = ["qfai-run", "qfai-maintain"];
const LOCK = path.join(".qfai", "assistant", ".assets.lock.json");

type LockRecord = { lock: Record<string, unknown>; files: Record<string, unknown> };

/** The provenance lock and its files map; a lock with no files map fails the test. */
export async function readLock(root: string): Promise<LockRecord> {
  const lock: unknown = JSON.parse(await readFile(path.join(root, LOCK), "utf-8"));
  if (typeof lock !== "object" || lock === null || !("files" in lock)) {
    throw new Error("the provenance lock has no files map");
  }
  const files = lock.files;
  if (typeof files !== "object" || files === null) throw new Error("lock files is not a map");
  return { lock: { ...lock }, files: { ...files } };
}

/** Every `Workflow mode:` line of an init summary. */
export function modeLines(output: string): string[] {
  return output.match(/^Workflow mode: .*$/gm) ?? [];
}

const OVERLAYS: Record<string, (root: string) => Promise<void>> = {
  "absent-skills": async (root) => {
    for (const skill of ENTRY_SKILLS) {
      await rm(path.join(root, SKILLS, skill), { recursive: true, force: true });
      for (const host of HOST_SKILL_DIRS) {
        await rm(path.join(root, host, skill), { recursive: true, force: true });
      }
    }
  },
  "older-gitignore": async (root) => {
    const file = path.join(root, ".gitignore");
    const kept = (await readFile(file, "utf-8"))
      .split("\n")
      .filter((line) => line !== ".qfai/run/" && line !== "!.qfai/evidence/workflow/");
    await writeFile(file, kept.join("\n"), "utf-8");
  },
};

/** Applies the named overlays in order. An unknown name throws. */
async function applyOverlays(root: string, names: readonly string[]): Promise<void> {
  for (const name of names) {
    const overlay = OVERLAYS[name];
    if (overlay === undefined) throw new Error(`unknown upgrade-state overlay: ${name}`);
    await overlay(root);
  }
}

/**
 * Runs `task` on a fresh install in a git repository, with the overlays applied, and removes the
 * temp root afterwards.
 */
export async function withInstall(
  overlays: readonly string[],
  task: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai init state-"));
  try {
    git(root, ["init", "-q"]);
    await initQuietly(root);
    await applyOverlays(root, overlays);
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Runs `task` on an empty temp root in a git repository, with no `qfai init` run yet. */
export async function withEmptyRepo(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai init empty-"));
  try {
    git(root, ["init", "-q"]);
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
