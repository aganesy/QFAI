/**
 * Rename handling in the base-branch diff.
 *
 * Driven against a real git repository rather than a mocked `execFileSync`:
 * the whole question is what git prints for a rename under two different flag
 * sets, so a mock would only assert that this file and the module agree with
 * each other.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { getChangedFilesAgainstBase } from "../../src/core/gitChanges.js";

const tempDirs: string[] = [];

const git = (cwd: string, ...args: string[]): void => {
  execFileSync("git", args, { cwd, stdio: ["ignore", "ignore", "ignore"] });
};

async function write(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf-8");
}

async function newRepo(seed: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-git-changes-"));
  tempDirs.push(root);
  git(root, "init", "--initial-branch=base");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "test");
  for (const [rel, content] of Object.entries(seed)) {
    await write(root, rel, content);
  }
  git(root, "add", "-A");
  git(root, "commit", "-m", "seed");
  git(root, "checkout", "-b", "work");
  return root;
}

/** Identical content at a new path — the shape git reports as a rename. */
const MODULE_BODY = [
  "export function evaluate(input: number): number {",
  "  return input * 2;",
  "}",
  "",
].join("\n");

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/**
 * `getChangedFilesAgainstBase` returns `null` for "git could not answer" —
 * no repository, no resolvable base. Every fixture below is a real repository
 * with a `base` ref, so a `null` here is a broken fixture rather than the case
 * under test, and it fails loudly instead of narrowing away with `?.`.
 */
function changedFilesOrThrow(root: string, baseBranch: string): Set<string> {
  const changed = getChangedFilesAgainstBase(root, baseBranch);
  if (changed === null) {
    throw new Error("getChangedFilesAgainstBase could not diff the fixture repository");
  }
  return changed;
}

describe("getChangedFilesAgainstBase", () => {
  it("reports both endpoints of a rename by default", async () => {
    const root = await newRepo({ "src/core/old.ts": MODULE_BODY });
    git(root, "mv", "src/core/old.ts", "src/core/new.ts");
    git(root, "commit", "-m", "move");

    // The drift guard wants the source: an artifact moved out from under its
    // protected path is exactly what it exists to notice.
    const changed = changedFilesOrThrow(root, "base");
    expect(changed.has("src/core/old.ts")).toBe(true);
    expect(changed.has("src/core/new.ts")).toBe(true);
  });

  it("reports a path git would quote, by the name it actually has", async () => {
    // Under the default `core.quotePath` a non-ASCII path is C-quoted in the
    // listing — wrapped in quotes with its bytes octal-escaped — and that
    // string matches no file. Reading it as the path exempted every artifact a
    // non-English project names from every diff-gated check downstream.
    const root = await newRepo({ "src/core/kept.ts": "export const kept = 1;\n" });
    await write(root, ".qfai/contracts/db/\u5951\u7d04.sql", "SELECT 1;\n");
    git(root, "add", "-A");
    git(root, "commit", "-m", "add a contract with a non-ASCII name");

    // The premise: git really does quote it.
    const quoted = execFileSync("git", ["diff", "--numstat", "base...HEAD"], {
      cwd: root,
      encoding: "utf-8",
    });
    expect(quoted).toContain("\\");

    expect(changedFilesOrThrow(root, "base").has(".qfai/contracts/db/\u5951\u7d04.sql")).toBe(true);
  });

  it("keeps an empty file whose name git would quote", async () => {
    // The `0 0` row is confirmed by a second per-path diff, and a quoted name
    // reaches it as a pathspec matching nothing — read as clean, dropped.
    const root = await newRepo({ "src/core/kept.ts": "export const kept = 1;\n" });
    await write(root, ".qfai/contracts/db/\u7a7a.sql", "");
    git(root, "add", "-A");
    git(root, "commit", "-m", "add an empty contract with a non-ASCII name");

    expect(changedFilesOrThrow(root, "base").has(".qfai/contracts/db/\u7a7a.sql")).toBe(true);
  });

  it("keeps a removed path", async () => {
    const root = await newRepo({ "src/core/gone.ts": MODULE_BODY });
    git(root, "rm", "src/core/gone.ts");
    git(root, "commit", "-m", "delete");

    // The drift guard wants it: an artifact removed from under its protected
    // path is exactly what it exists to notice.
    expect(changedFilesOrThrow(root, "base").has("src/core/gone.ts")).toBe(true);
  });
});
