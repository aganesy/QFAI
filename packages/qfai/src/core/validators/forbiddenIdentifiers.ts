import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants, type Stats } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { sameObject } from "../../shared/boundedRead.js";
import type { Issue } from "../types.js";

const execute = promisify(execFile);
// Capacity ceilings; lift only after a contract change with larger-repository CI measurements.
const FILE_BYTES = 16 * 1024 * 1024;
const TOTAL_BYTES = 64 * 1024 * 1024;
const WINDOWS = 1_000_000;

type Entry = { sha256: string; byteLength: number };
type Budget = { treeBytes: number; windows: number; hashBytes: number; matched: boolean };

function matchFinding(): Issue {
  return {
    code: "QFAI-SECURITY-001",
    severity: "error",
    category: "canonical",
    rule: "security.forbiddenIdentifiers",
    message: "Forbidden identifier detected in the tracked worktree.",
  };
}

function coverageFinding(): Issue {
  return {
    code: "QFAI-SECURITY-002",
    severity: "error",
    category: "canonical",
    rule: "security.forbiddenIdentifiers",
    message: "Forbidden-identifier scan could not safely cover the tracked worktree.",
  };
}

async function git(root: string, args: string[]): Promise<Buffer> {
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")),
  );
  const { stdout, stderr } = await execute(
    "git",
    ["--no-optional-locks", "-c", "core.fsmonitor=false", ...args],
    {
      cwd: root,
      env,
      encoding: "buffer",
      maxBuffer: TOTAL_BYTES,
    },
  );
  if (stdout.length > TOTAL_BYTES || stderr.length) throw new Error("Incomplete listing");
  return stdout;
}

function utf8(bytes: Buffer): string {
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
}

function ascii(byte: number): boolean {
  return (
    (byte >= 65 && byte <= 90) ||
    (byte >= 97 && byte <= 122) ||
    (byte >= 48 && byte <= 57) ||
    byte === 95 ||
    byte === 45
  );
}

function scan(
  bytes: Buffer,
  lengths: ReadonlyMap<number, ReadonlySet<string>>,
  budget: Budget,
): void {
  if (budget.treeBytes + bytes.length > TOTAL_BYTES) throw new Error("Tree capacity");
  budget.treeBytes += bytes.length;
  let start = 0;
  for (let end = 0; end < bytes.length; end++) {
    if (!ascii(bytes[end] ?? 0)) {
      start = end + 1;
      continue;
    }
    for (const [length, digests] of lengths) {
      if (end - start + 1 < length) continue;
      if (budget.windows + 1 > WINDOWS || budget.hashBytes + length > TOTAL_BYTES)
        throw new Error("Hash capacity");
      budget.windows++;
      budget.hashBytes += length;
      const digest = createHash("sha256")
        .update(bytes.subarray(end + 1 - length, end + 1))
        .digest("hex");
      if (digests.has(digest)) budget.matched = true;
    }
  }
}

function relativeName(bytes: Buffer, root: string): string {
  const name = utf8(bytes);
  const parts = name.split("/");
  if (
    name === "" ||
    path.isAbsolute(name) ||
    path.win32.isAbsolute(name) ||
    (path.sep === "\\" && /[\\:]/.test(name)) ||
    parts.some((part) => part === "" || part === "." || part === "..")
  )
    throw new Error("Invalid tracked name");
  const relative = path.relative(root, path.resolve(root, ...parts));
  if (path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`))
    throw new Error("Invalid tracked name");
  return name;
}

async function inspect(root: string, name: string): Promise<Stats[]> {
  let current = root;
  const result: Stats[] = [];
  const parts = name.split("/");
  for (const [index, part] of ["", ...parts].entries()) {
    if (part !== "") current = path.join(current, part);
    const stats = await lstat(current);
    if (stats.isSymbolicLink()) throw new Error("Unsafe tracked path");
    if (index === parts.length) {
      if (!stats.isFile() || stats.nlink > 1) throw new Error("Unsafe tracked file");
    } else if (!stats.isDirectory()) throw new Error("Unsafe tracked parent");
    result.push(stats);
  }
  return result;
}

function unchanged(before: Stats, after: Stats): boolean {
  return (
    sameObject(before, after) &&
    before.size === after.size &&
    before.mode === after.mode &&
    before.nlink === after.nlink &&
    before.mtimeMs === after.mtimeMs &&
    before.ctimeMs === after.ctimeMs &&
    before.birthtimeMs === after.birthtimeMs
  );
}

function sameParents(before: Stats[], after: Stats[]): boolean {
  return (
    before.length === after.length &&
    before.every((stats, index) => {
      const current = after[index];
      return current !== undefined && sameObject(stats, current);
    })
  );
}

// The shared identity check is reused; this reader also checks descriptor metadata after an exact read.
async function currentBytes(root: string, name: string): Promise<Buffer> {
  const before = await inspect(root, name);
  const leaf = before.at(-1);
  if (!leaf || !Number.isSafeInteger(leaf.size) || leaf.size < 0 || leaf.size > FILE_BYTES)
    throw new Error("File capacity");
  let flags = constants.O_RDONLY;
  if (typeof constants.O_NOFOLLOW === "number") flags |= constants.O_NOFOLLOW;
  if (typeof constants.O_NONBLOCK === "number") flags |= constants.O_NONBLOCK;
  const handle = await open(path.join(root, ...name.split("/")), flags);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink > 1 || !unchanged(leaf, opened))
      throw new Error("Changed tracked file");
    if (!sameParents(before, await inspect(root, name))) throw new Error("Changed tracked path");
    const bytes = Buffer.alloc(opened.size + 1);
    let filled = 0;
    while (filled < bytes.length) {
      const { bytesRead } = await handle.read(bytes, filled, bytes.length - filled, null);
      if (!Number.isInteger(bytesRead) || bytesRead < 0 || bytesRead > bytes.length - filled)
        throw new Error("Inconsistent tracked read");
      if (bytesRead === 0) break;
      filled += bytesRead;
    }
    const after = await handle.stat();
    const paths = await inspect(root, name);
    const last = paths.at(-1);
    if (
      filled !== opened.size ||
      !after.isFile() ||
      !unchanged(opened, after) ||
      !last ||
      !unchanged(after, last) ||
      !sameParents(before, paths)
    )
      throw new Error("Inconsistent tracked read");
    return bytes.subarray(0, filled);
  } finally {
    await handle.close();
  }
}

/** Checks current tracked names and bytes without exposing matches or failed paths. */
export async function validateForbiddenIdentifiers(
  root: string,
  entries: readonly Entry[] = [],
): Promise<Issue[]> {
  if (entries.length === 0) return [];
  const budget: Budget = { treeBytes: 0, windows: 0, hashBytes: 0, matched: false };
  try {
    const lengths = new Map<number, Set<string>>();
    for (const entry of entries) {
      if (
        !Number.isInteger(entry.byteLength) ||
        entry.byteLength < 1 ||
        entry.byteLength > 128 ||
        !/^[a-f0-9]{64}$/.test(entry.sha256)
      )
        throw new Error("Invalid scan policy");
      const group = lengths.get(entry.byteLength) ?? new Set<string>();
      group.add(entry.sha256);
      lengths.set(entry.byteLength, group);
    }
    if (entries.length > 64 || lengths.size > 8) throw new Error("Invalid scan policy");
    const requested = path.resolve(root);
    const rootStats = await lstat(requested);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) throw new Error("Unsafe worktree");
    const worktree = await realpath(requested);
    const top = await git(worktree, ["rev-parse", "--show-toplevel"]);
    if (top.at(-1) !== 10) throw new Error("Invalid worktree root");
    const declared = await realpath(utf8(top.subarray(0, top.length - 1)));
    if (path.relative(worktree, declared) !== "") throw new Error("Wrong worktree");
    if (!sameObject(rootStats, await lstat(worktree))) throw new Error("Changed worktree");
    const listing = await git(worktree, ["ls-files", "--cached", "--stage", "-z", "--"]);
    if (listing.length && listing.at(-1) !== 0) throw new Error("Incomplete listing");
    const seen = new Set<string>();
    let offset = 0;
    while (offset < listing.length) {
      const end = listing.indexOf(0, offset);
      const separator = listing.indexOf(9, offset);
      if (end < 0 || separator < offset || separator >= end) throw new Error("Invalid listing");
      const header = utf8(listing.subarray(offset, separator));
      if (!/^(?:100644|100755) (?:[a-f0-9]{40}|[a-f0-9]{64}) 0$/.test(header))
        throw new Error("Unsupported tracked entry");
      const rawName = listing.subarray(separator + 1, end);
      const name = relativeName(rawName, worktree);
      if (seen.has(name)) throw new Error("Duplicate tracked entry");
      seen.add(name);
      if (!sameObject(rootStats, await lstat(worktree))) throw new Error("Changed worktree");
      scan(rawName, lengths, budget);
      scan(await currentBytes(worktree, name), lengths, budget);
      offset = end + 1;
    }
    if (!sameObject(rootStats, await lstat(worktree))) throw new Error("Changed worktree");
    return budget.matched ? [matchFinding()] : [];
  } catch {
    return [...(budget.matched ? [matchFinding()] : []), coverageFinding()];
  }
}
