/**
 * Spawn-based tests for `scripts/check-doc-clarity.mjs`.
 *
 * The guard has two scopes (`--scope changed`, the default, and `--scope
 * all`), a comment-only reading of source files versus a whole-line reading
 * of Markdown, and several exclusion mechanisms that must not silently widen
 * to cover content the rule still applies to. Both scopes and every
 * exclusion class are exercised here directly against a real git repository,
 * since the guard's own logic depends on `git ls-files` and `git diff`
 * rather than a fixture list it could be handed instead.
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
const SCRIPT = path.join(REPO_ROOT, "scripts/check-doc-clarity.mjs");

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runGuard(cwd: string, args: string[] = []): RunResult {
  const child = spawnSync("node", [SCRIPT, ...args], { cwd, encoding: "utf-8" });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function git(dir: string, args: string[]): void {
  spawnSync("git", args, { cwd: dir, encoding: "utf-8" });
}

async function writeFiles(dir: string, files: Record<string, string>): Promise<void> {
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(dir, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf-8");
  }
}

/** A one-commit repository on `main`, everything already committed. */
async function newRepo(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-check-doc-clarity-"));
  tempDirs.push(dir);
  git(dir, ["init", "--quiet", "--initial-branch=main"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "user.name", "test"]);
  await writeFiles(dir, files);
  git(dir, ["add", "--all"]);
  git(dir, ["commit", "--quiet", "-m", "base"]);
  return dir;
}

/**
 * Branches off `newRepo`'s `main` and commits `files` there, so `main` and
 * `HEAD` diverge — the shape `--scope changed` needs to compute a merge base
 * against. Committing straight onto `main` instead would make it and `HEAD`
 * the same ref, and every diff against "the branch's own tip" is empty.
 */
async function branchAndCommit(dir: string, files: Record<string, string>): Promise<void> {
  git(dir, ["checkout", "--quiet", "-b", "work"]);
  await writeFiles(dir, files);
  git(dir, ["add", "--all"]);
  git(dir, ["commit", "--quiet", "-m", "change"]);
}

describe("check-doc-clarity: pattern detection (--scope all)", () => {
  it("passes a repository with no local identifiers", async () => {
    const dir = await newRepo({
      "src/clean.ts": "// A comment with no local identifiers.\nexport const a = 1;\n",
      "docs/notes.md": "# Notes\n\nOrdinary prose, no citations.\n",
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  it.each([
    ["issue-or-pr-number", "// fixed in #1234, see the tracker.\n"],
    ["gh-issue-number", "// see GH-1234 for background.\n"],
    ["pr-or-issue-word", "// closed by PR #1234.\n"],
    ["codex-review-id", "// flagged by codex r3271234567.\n"],
    ["review-wave-label", "// an 18th-wave regression.\n"],
    ["review-wave-label (reverse order)", "// fixed in wave-12 of review.\n"],
    ["review-shortcode-list", "// review ABCD/EFGH raised this.\n"],
    ["review-finding-bracket", "// Review finding [42] measured this.\n"],
  ])("flags %s in a source comment", async (_label, comment) => {
    const dir = await newRepo({ "src/file.ts": `${comment}export const a = 1;\n` });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("local identifier");
  });

  it("does not flag a local identifier outside a comment in a source file", async () => {
    const dir = await newRepo({
      "src/file.ts": 'export const url = "https://example.com/issues/#1234";\n',
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  it("flags a local identifier anywhere in a Markdown file, not only in a fence", async () => {
    const dir = await newRepo({ "docs/notes.md": "Fixed in PR #1234.\n" });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
  });

  it("skips a fenced code block in Markdown", async () => {
    const dir = await newRepo({
      "docs/notes.md": ["# Notes", "", "```text", "PR #1234", "```", ""].join("\n"),
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  it("rejects an unknown --scope value", () => {
    const result = spawnSync("node", [SCRIPT, "--scope", "bogus"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });

    expect(result.status).toBe(2);
  });
});

describe("check-doc-clarity: exclusions", () => {
  it("does not scan a path under an excluded prefix", async () => {
    const dir = await newRepo({
      ".qfai/evidence/discussion-1.md": "Filed as PR #1234.\n",
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  it("does not scan CHANGELOG.md", async () => {
    const dir = await newRepo({ "CHANGELOG.md": "## [1.0.0]\n\n- Fixed in PR #1234.\n" });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  it("does not scan a spec pack's own delta log", async () => {
    const dir = await newRepo({
      ".qfai/specs/spec-0001/09_delta.md": "Filed from #1105.\n",
      ".qfai/specs/_policies/10_delta.md": "Adopted per PR #192.\n",
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  it("still scans a file that merely ends in delta without the underscore", async () => {
    const dir = await newRepo({ "docs/agenda.md": "Filed from #1105.\n" });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
  });

  it("does not flag a wave label naming a tracked change's delivery batch", async () => {
    const dir = await newRepo({
      ".qfai/specs/spec-0012/tdd/test-list.md":
        "| TDD-0453 | done | CHG-005 wave-1. New module. |\n",
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  it("does not flag a deferred wave batch with no change id yet", async () => {
    const dir = await newRepo({
      ".qfai/specs/spec-0012/tdd/test-list.md":
        "| TDD-0401 | todo | (Wave 1 deferred) | Requires live wiring. |\n",
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(0);
  });

  it("still flags a review-round wave label with no change id on the line", async () => {
    const dir = await newRepo({
      "src/file.ts": "// the 18th-wave fix for this regression\nexport const a = 1;\n",
    });

    const result = runGuard(dir, ["--scope", "all"]);

    expect(result.status).toBe(1);
  });
});

describe("check-doc-clarity: --scope changed", () => {
  it("passes a change that adds no local identifier, even with a large existing backlog", async () => {
    const dir = await newRepo({ "src/legacy.ts": "// PR #1 legacy citation, pre-existing.\n" });
    await branchAndCommit(dir, { "src/new.ts": "// A clean new comment.\nexport const a = 1;\n" });

    const result = runGuard(dir, ["--scope", "changed"]);

    expect(result.status).toBe(0);
  });

  it("fails a change that adds a new local identifier", async () => {
    const dir = await newRepo({ "src/existing.ts": "export const a = 1;\n" });
    await branchAndCommit(dir, {
      "src/existing.ts": "// closed by PR #999\nexport const a = 1;\n",
    });

    const result = runGuard(dir, ["--scope", "changed"]);

    expect(result.status).toBe(1);
  });

  it("does not fail on a pre-existing identifier the change did not touch", async () => {
    const dir = await newRepo({
      "src/existing.ts": "// PR #1 legacy citation\nexport const a = 1;\nexport const b = 2;\n",
    });
    await branchAndCommit(dir, {
      "src/existing.ts": "// PR #1 legacy citation\nexport const a = 1;\nexport const b = 3;\n",
    });

    const result = runGuard(dir, ["--scope", "changed"]);

    expect(result.status).toBe(0);
  });
});
