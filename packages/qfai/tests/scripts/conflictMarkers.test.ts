/**
 * A merge-conflict marker left in a tracked file.
 *
 * The gap this closes is not theoretical: an evidence document reached the
 * default branch carrying a separator, a superseded line and a closing marker,
 * and every lane stayed green — Markdown lint reads `=======` as a heading
 * underline, prettier reformats the block rather than rejecting it, and the
 * guard that reads the figure in that paragraph takes the first matching line
 * and stops.
 *
 * Two decisions carry the check, and the cases below are about them: what
 * counts as a marker, and where an example is allowed to look like one.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCRIPT = path.join(repoRoot, "scripts", "check-conflict-markers.mjs");

const tempDirs: string[] = [];

/** A git repository with the given files, all tracked. */
async function repoWith(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-conflict-markers-"));
  tempDirs.push(root);
  execFileSync("git", ["init", "-q"], { cwd: root });
  for (const [relative, body] of Object.entries(files)) {
    const abs = path.join(root, relative);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, body, "utf-8");
  }
  execFileSync("git", ["add", "-A"], { cwd: root });
  return root;
}

/** Runs the script over `root` and returns its exit code and output. */
function check(root: string): { status: number; output: string } {
  const result = execFileSync(process.execPath, [SCRIPT], {
    cwd: root,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { status: 0, output: result };
}

/** One field of the error `execFileSync` throws on a non-zero exit. */
function fieldOf(cause: unknown, key: "status" | "stdout" | "stderr"): unknown {
  return typeof cause === "object" && cause !== null && key in cause
    ? Reflect.get(cause, key)
    : undefined;
}

/** The same, for a run expected to fail. */
function checkFailing(root: string): { status: number; output: string } {
  try {
    return check(root);
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

describe("what counts as a marker", () => {
  it("reports the three git writes on a merge", async () => {
    const root = await repoWith({
      "notes.md": ["<<<<<<< HEAD", "ours", "=======", "theirs", ">>>>>>> origin/main", ""].join(
        "\n",
      ),
    });

    const { status, output } = checkFailing(root);

    expect(status).toBe(1);
    expect(output).toContain("notes.md:1");
    expect(output).toContain("notes.md:3");
    expect(output).toContain("notes.md:5");
  });

  it("reports the base marker a diff3 merge adds", async () => {
    const root = await repoWith({
      "notes.md": [
        "<<<<<<< HEAD",
        "ours",
        "||||||| base",
        "was",
        "=======",
        "theirs",
        ">>>>>>> x",
        "",
      ].join("\n"),
    });

    expect(checkFailing(root).output).toContain("notes.md:3");
  });

  it("reports a marker left behind on its own", async () => {
    // The shape that reached the default branch: the opening marker resolved,
    // the separator and the closing marker left in the prose.
    const root = await repoWith({
      "notes.md": [
        "the current figure",
        "=======",
        "the stale figure",
        ">>>>>>> origin/main",
        "",
      ].join("\n"),
    });

    expect(checkFailing(root).status).toBe(1);
  });

  it("reports a marker in source, not only in prose", async () => {
    const root = await repoWith({
      "src/a.ts": ["export const a = 1;", "=======", "export const a = 2;", ""].join("\n"),
    });

    expect(checkFailing(root).output).toContain("src/a.ts:2");
  });
});

describe("what is not a marker", () => {
  it("leaves a horizontal rule of equals signs alone", async () => {
    const root = await repoWith({ "notes.md": ["Heading", "========", ""].join("\n") });

    expect(check(root).status).toBe(0);
  });

  it("leaves a six-character run alone", async () => {
    const root = await repoWith({ "notes.md": ["======", ">>>>>>", ""].join("\n") });

    expect(check(root).status).toBe(0);
  });

  it("leaves a marker-length run with no boundary alone", async () => {
    // `>>>>>>>>` in ASCII art, and a row of eight equals signs.
    const root = await repoWith({ "notes.md": ["========", ">>>>>>>>", ""].join("\n") });

    expect(check(root).status).toBe(0);
  });

  it("leaves an indented line alone", async () => {
    // A marker git wrote starts at column one. An indented run is content.
    const root = await repoWith({ "notes.md": ["  =======", ""].join("\n") });

    expect(check(root).status).toBe(0);
  });
});

describe("an example that is meant to look like one", () => {
  it("is allowed inside a fenced block in Markdown", async () => {
    const root = await repoWith({
      "guide.md": ["Resolving a conflict:", "", "```", "=======", ">>>>>>> theirs", "```", ""].join(
        "\n",
      ),
    });

    expect(check(root).status).toBe(0);
  });

  it("is reported again once the fence closes", async () => {
    const root = await repoWith({
      "guide.md": ["```", "=======", "```", "", "=======", ""].join("\n"),
    });

    const { status, output } = checkFailing(root);

    expect(status).toBe(1);
    expect(output).toContain("guide.md:5");
    expect(output).not.toContain("guide.md:2");
  });

  it("is allowed inside a longer fence holding a shorter one", async () => {
    const root = await repoWith({
      "guide.md": ["````", "```", "=======", "```", "````", ""].join("\n"),
    });

    expect(check(root).status).toBe(0);
  });

  it("is not allowed inside a fence in source, where a fence is not a fence", async () => {
    const root = await repoWith({
      "src/a.ts": ["const doc = `", "```", "=======", "```", "`;", ""].join("\n"),
    });

    expect(checkFailing(root).status).toBe(1);
  });
});

describe("a tree it cannot read", () => {
  it("says so and exits 2 rather than reporting a clean run", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-conflict-markers-bare-"));
    tempDirs.push(root);

    const { status, output } = checkFailing(root);

    expect(status).toBe(2);
    expect(output).toContain("nothing was scanned");
  });
});
