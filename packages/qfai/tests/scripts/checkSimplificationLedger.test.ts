/**
 * Spawn-based tests for `scripts/check-simplification-ledger.mjs`.
 *
 * The lane has two jobs and they fail differently. It COLLECTS every deliberate
 * simplification the tree records, and it REFUSES one that names no condition
 * for lifting it. A test that only checked the exit code would pass for a lane
 * that prints nothing, and a marker nobody sees is the state the rule exists to
 * leave behind — so the listing is asserted as well as the verdict.
 *
 * Each case is a throwaway git repository, because the scan reads `git
 * ls-files` rather than walking the filesystem.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-simplification-ledger.mjs");

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runGuard(cwd: string): RunResult {
  const child = spawnSync("node", [SCRIPT], { cwd, encoding: "utf-8" });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function newRepo(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-simplification-"));
  tempDirs.push(dir);
  spawnSync("git", ["init", "--quiet"], { cwd: dir, encoding: "utf-8" });
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(dir, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  spawnSync("git", ["add", "--all"], { cwd: dir, encoding: "utf-8" });
  return dir;
}

/** The shape the rule asks for: a ceiling, and the condition that lifts it. */
const COMPLETE = [
  "// SIMPLIFIED: reads one file at a time.",
  "// Lift when: a caller needs a directory and the per-file cost is measured.",
  "export function readOne(p: string): string {",
  "  return p;",
  "}",
  "",
].join("\n");

/** Half of it: the deferral with nothing that would ever end it. */
const CEILING_ONLY = [
  "// SIMPLIFIED: one connection, opened per call.",
  "export function open(): void {}",
  "",
].join("\n");

describe("check-simplification-ledger", () => {
  it("says so plainly when the tree records none", async () => {
    const dir = await newRepo({ "src/a.ts": "export const a = 1;\n" });

    const result = runGuard(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no deliberate simplifications recorded");
  });

  it("lists a complete marker with its ceiling and its lifting condition", async () => {
    const dir = await newRepo({ "src/read.ts": COMPLETE });

    const result = runGuard(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 marker(s) in 1 file(s)");
    expect(result.stdout).toContain("src/read.ts");
    expect(result.stdout).toContain("reads one file at a time.");
    expect(result.stdout).toContain(
      "lift when: a caller needs a directory and the per-file cost is measured.",
    );
  });

  it("refuses a marker that names no lifting condition, and names the line", async () => {
    const dir = await newRepo({ "src/open.ts": CEILING_ONLY });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src/open.ts:1");
    expect(result.stderr).toContain("names a ceiling and no lifting condition");
    // The listing still prints it, marked, so the report is the whole ledger
    // rather than only the part that passed.
    expect(result.stdout).toContain("NOT NAMED");
  });

  it("does not fail on the count — a complete marker beside an incomplete one is not the fault", async () => {
    const dir = await newRepo({ "src/a.ts": COMPLETE, "src/b.ts": COMPLETE, "src/c.ts": COMPLETE });

    const result = runGuard(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("3 marker(s) in 3 file(s)");
  });

  it("reads the condition across a wrapped ceiling, and stops at the end of the comment block", async () => {
    const dir = await newRepo({
      "src/wrapped.ts": [
        "// SIMPLIFIED: keeps the whole index in memory, because the tree it",
        "// indexes is bounded by the spec pack count.",
        "// Lift when: a project carries more packs than one process can hold.",
        "export const index = new Map();",
        "// Lift when: this one belongs to no marker and must not rescue the next.",
        "// SIMPLIFIED: no lifting condition follows this one.",
        "export const other = 1;",
        "",
      ].join("\n"),
    });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("a project carries more packs than one process can hold.");
    expect(result.stderr).toContain("src/wrapped.ts:6");
  });

  it("reads comment lines only, so the word in a string literal is not a marker", async () => {
    const dir = await newRepo({
      "src/message.ts": 'export const help = "SIMPLIFIED: not a marker, a message.";\n',
    });

    const result = runGuard(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no deliberate simplifications recorded");
  });

  it("reads shell comments too", async () => {
    const dir = await newRepo({
      "scripts/one.sh": ["# SIMPLIFIED: serial upload.", "echo hi", ""].join("\n"),
    });

    const result = runGuard(dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("scripts/one.sh:1");
  });

  it("leaves Markdown alone, so the rule's own example is not a finding", async () => {
    const dir = await newRepo({
      "docs/rule.md": ["```ts", "// SIMPLIFIED: reads one file at a time.", "```", ""].join("\n"),
    });

    const result = runGuard(dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no deliberate simplifications recorded");
  });
});
