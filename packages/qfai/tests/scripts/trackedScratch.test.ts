/**
 * A tracked file under the repository's scratch directory.
 *
 * `.gitignore` lists `/tmp/`, which is why the rule reads as held. An ignore
 * rule does not stop tracking a file that is already tracked, so one added
 * before the entry — or with `git add -f` — stays in the index and `git status`
 * never mentions it again. A scratch report sat on the default branch that way
 * for three days.
 *
 * The cases below are about the two answers the guard has to get right: a
 * tracked path under `tmp/` fails, and an untracked one there does not.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCRIPT = path.join(repoRoot, "scripts", "check-tracked-scratch.mjs");

const tempDirs: string[] = [];

/**
 * A git repository holding the given files.
 *
 * `tracked` decides whether they reach the index. An untracked file has to be
 * written without being added, which is the case the ignore entry already
 * covers and the guard must not report.
 */
async function repoWith(
  files: Record<string, string>,
  options: { readonly tracked: boolean },
): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tracked-scratch-"));
  tempDirs.push(root);
  execFileSync("git", ["init", "-q"], { cwd: root });
  for (const [relative, body] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, body, "utf-8");
  }
  if (options.tracked) execFileSync("git", ["add", "-A", "-f"], { cwd: root });
  return root;
}

/** One field of the error `execFileSync` throws on a non-zero exit. */
function fieldOf(cause: unknown, key: "status" | "stdout" | "stderr"): unknown {
  return typeof cause === "object" && cause !== null && key in cause
    ? Reflect.get(cause, key)
    : undefined;
}

/** Runs the guard over `root`, whether it passes or fails. */
function check(root: string): { status: number; output: string } {
  try {
    return {
      status: 0,
      output: execFileSync(process.execPath, [SCRIPT], {
        cwd: root,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (cause) {
    const status = fieldOf(cause, "status");
    const stdout = fieldOf(cause, "stdout");
    const stderr = fieldOf(cause, "stderr");
    return {
      status: typeof status === "number" ? status : -1,
      output: `${typeof stdout === "string" ? stdout : ""}${typeof stderr === "string" ? stderr : ""}`,
    };
  }
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("nothing under the scratch directory is tracked", () => {
  it("fails on a tracked path under tmp/, and names it", async () => {
    const root = await repoWith(
      { "tmp/spec-migration/gap-report.md": "# scratch\n" },
      {
        tracked: true,
      },
    );
    const { status, output } = check(root);
    expect(status).toBe(1);
    expect(output).toContain("tmp/spec-migration/gap-report.md");
    expect(output).toContain("git rm --cached");
  });

  it("passes when the same file is present but untracked", async () => {
    // The ordinary state: scratch output sitting in an ignored directory. A
    // guard that reported this would fire on every working tree that has ever
    // been used.
    const root = await repoWith(
      { "tmp/spec-migration/gap-report.md": "# scratch\n" },
      {
        tracked: false,
      },
    );
    const { status, output } = check(root);
    expect(status).toBe(0);
    expect(output).toContain("No tracked files under tmp/");
  });

  it("ignores a tracked path outside tmp/", async () => {
    const root = await repoWith({ "packages/qfai/docs/note.md": "# note\n" }, { tracked: true });
    expect(check(root).status).toBe(0);
  });

  it("holds this repository", () => {
    // The guard's own subject. A tracked file here is the defect it exists for,
    // and the check above runs against temporary trees only.
    expect(check(repoRoot).status).toBe(0);
  });
});
