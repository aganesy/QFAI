/**
 * Upgrade-state fixtures for the `qfai init` integration modules.
 *
 * Every state starts from a tree a fresh `qfai init` wrote into a temp root whose name contains a
 * space, plus the named overlays. An overlay name this factory does not know fails the test, so a
 * case cannot quietly run against a state nobody built.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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

/** Runs git in `root` and returns its stdout; a failed command fails the test. */
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

const HOST_SKILL_DIRS = [".agents/skills", ".claude/skills", ".codex/skills", ".github/skills"];
const ASSISTANT = ".qfai/assistant";
const LOCK = path.join(ASSISTANT, ".assets.lock.json");

/** The plan each plan overlay changes, so a case can name the file it expects. */
export const OLDER_PLAN = "process/workflows/direct.yml";
export const EDITED_PLAN = "process/workflows/bugfix.yml";
export const CRLF_PLAN = "process/workflows/feature.yml";
export const EDITED_MEMO = "process/migrations/v1.4.27-atdd-alignment.md";
export const OLDER_LOCK_VERSION = "0.0.1";
export const ROUTING = "manifest/agent-routing.yml";

/** The installed file at a path relative to `.qfai/assistant/`. */
export function assistantFile(root: string, relative: string): string {
  return path.join(root, ASSISTANT, ...relative.split("/"));
}

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

async function editLock(root: string, edit: (record: LockRecord) => void): Promise<void> {
  const record = await readLock(root);
  edit(record);
  const body = { ...record.lock, files: record.files };
  await writeFile(path.join(root, LOCK), `${JSON.stringify(body, null, 2)}\n`, "utf-8");
}

async function dropLockRecords(root: string, prefix: string): Promise<void> {
  await editLock(root, (record) => {
    const kept = Object.entries(record.files).filter(([key]) => !key.startsWith(prefix));
    record.files = Object.fromEntries(kept);
  });
}

/** The routing manifest split into the text before, each `- skill:` block, and the text after. */
function routingBlocks(text: string): { head: string[]; blocks: string[][]; tail: string[] } {
  const lines = text.split("\n");
  const starts = lines.flatMap((line, index) => (line.startsWith("  - skill: ") ? [index] : []));
  const first = starts[0] ?? lines.length;
  const last = starts[starts.length - 1] ?? lines.length;
  const end = lines.findIndex((line, index) => index > last && /^\S/.test(line));
  const stop = end === -1 ? lines.length : end;
  const blocks = starts.map((start, i) => lines.slice(start, starts[i + 1] ?? stop));
  return { head: lines.slice(0, first), blocks, tail: lines.slice(stop) };
}

async function appendLine(file: string, line: string): Promise<void> {
  await writeFile(file, `${await readFile(file, "utf-8")}${line}\n`, "utf-8");
}

const OVERLAYS: Record<string, (root: string) => Promise<void>> = {
  "older-plan": async (root) => {
    const body = "# An earlier release of this plan.\nstages: []\n";
    await writeFile(assistantFile(root, OLDER_PLAN), body, "utf-8");
    await editLock(root, ({ files }) => {
      files[OLDER_PLAN] = createHash("sha256").update(body, "utf8").digest("hex");
    });
  },
  "edited-plan": async (root) => {
    await appendLine(assistantFile(root, EDITED_PLAN), "# edited by the project");
  },
  "crlf-plan": async (root) => {
    const file = assistantFile(root, CRLF_PLAN);
    const text = await readFile(file, "utf-8");
    await writeFile(file, text.replace(/\r?\n/g, "\r\n"), "utf-8");
  },
  "edited-memo": async (root) => {
    await appendLine(assistantFile(root, EDITED_MEMO), "Edited by the project.");
  },
  "older-lock": async (root) => {
    await editLock(root, ({ lock }) => {
      lock.packageVersion = OLDER_LOCK_VERSION;
    });
  },
  "absent-route": async (root) => {
    const file = assistantFile(root, ROUTING);
    const { head, blocks, tail } = routingBlocks(await readFile(file, "utf-8"));
    const kept = blocks.filter((block) => block[0] !== "  - skill: qfai-maintain");
    if (kept.length !== blocks.length - 1) throw new Error("no qfai-maintain routing entry");
    const [a, b, ...rest] = kept;
    if (a === undefined || b === undefined) throw new Error("fewer than two routing entries");
    const added = a
      .join("\n")
      .replace(
        /conditional_agents: \[([^\]]*)\]/,
        (_match, list: string) =>
          `conditional_agents: [${list === "" ? "" : `${list}, `}completion-reviewer]`,
      );
    if (added === a.join("\n")) throw new Error("no conditional_agents list to add an agent to");
    const body = [...head, ...b, ...added.split("\n"), ...rest.flat(), ...tail];
    await writeFile(file, body.join("\n"), "utf-8");
  },
  "absent-skills": async (root) => {
    for (const skill of ["qfai-run", "qfai-maintain"]) {
      await rm(path.join(root, ASSISTANT, "skills", skill), { recursive: true, force: true });
      for (const host of HOST_SKILL_DIRS) {
        await rm(path.join(root, host, skill), { recursive: true, force: true });
      }
    }
    await rm(path.join(root, ASSISTANT, "process", "workflows"), { recursive: true, force: true });
    await dropLockRecords(root, "process/workflows/");
  },
  "older-gitignore": async (root) => {
    const file = path.join(root, ".gitignore");
    const kept = (await readFile(file, "utf-8"))
      .split("\n")
      .filter((line) => line !== ".qfai/runs/" && line !== "!.qfai/evidence/workflow/");
    await writeFile(file, kept.join("\n"), "utf-8");
  },
};

/** Applies the named overlays in order. An unknown name throws. */
export async function applyOverlays(root: string, names: readonly string[]): Promise<void> {
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
