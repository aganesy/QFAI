/**
 * Integration: `qfai init` neither seeds nor touches the work-log directory `.qfai/steering/`,
 * and the instructions file it generates names no work-log surface.
 *
 * Each case builds its own tree in a fresh temporary directory and runs init in-process from
 * `src`. An absent path or line proves nothing unless the tree or the file was read, so each case
 * also requires what only reading it can show.
 */
// QFAI:SPEC-0003:TC-0003-0059
// QFAI:SPEC-0003:TC-0003-0060

import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { removeTempTree } from "../helpers/tempTree.js";

/** `.qfai/steering` followed by `/` or the end of the string, so `.qfai/assistant/steering/` never matches. */
const STEERING_PATH = /\.qfai\/steering(?:\/|$)/;

/** The EX-0003-0053 set: an edited `README.md` and one adopter entry, nothing the seed writes. */
const POPULATED_STEERING: Readonly<Record<string, string>> = {
  "README.md": "# Our work-log\n\nEdited by the project: entries are kept for one release.\n",
  "2026-09-01-adopter-note.md": "---\nid: 2026-09-01-adopter-note\nkind: milestone\n---\n\nKept.\n",
};

type Report = {
  readonly stdout: readonly string[];
  readonly stderr: readonly string[];
};

function lines(chunks: readonly string[]): string[] {
  return chunks
    .join("")
    .split(/\r?\n/)
    .map((line) => line.replace(/\\/g, "/"));
}

/**
 * Runs `action` with both streams captured, and returns what it printed, one entry per line:
 * `info` and `warn` write to stdout, `error` to stderr.
 */
async function captureReport(action: () => Promise<void>): Promise<Report> {
  const out: string[] = [];
  const err: string[] = [];
  const collect =
    (into: string[]) =>
    (chunk: unknown): boolean => {
      into.push(typeof chunk === "string" ? chunk : String(chunk));
      return true;
    };
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation(collect(out));
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(collect(err));
  try {
    await action();
  } finally {
    stdout.mockRestore();
    stderr.mockRestore();
  }
  return { stdout: lines(out), stderr: lines(err) };
}

function init(root: string, force: boolean): Promise<Report> {
  return captureReport(() => runInit({ dir: root, force, dryRun: false, yes: true }));
}

/** The `lstat` outcome: `exists`, or the error code it failed with. */
async function lstatOutcome(target: string): Promise<string> {
  return lstat(target).then(
    () => "exists",
    (error: unknown) =>
      error instanceof Error && "code" in error ? String(error.code) : "unknown",
  );
}

/**
 * Every entry under `dir`, by POSIX path relative to it: a file mapped to the SHA-256 of its
 * bytes, anything else to its kind, so an added empty directory or link changes the snapshot.
 */
async function snapshot(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    const full = path.join(entry.parentPath, entry.name);
    const relative = path.relative(dir, full).replace(/\\/g, "/");
    out[relative] = entry.isFile()
      ? createHash("sha256")
          .update(await readFile(full))
          .digest("hex")
      : entry.isDirectory()
        ? "directory"
        : entry.isSymbolicLink()
          ? "symlink"
          : "other";
  }
  return out;
}

/** Creates the two-file adopter directory before taking the snapshot. */
async function populateSteering(root: string): Promise<string> {
  const steering = path.join(root, ".qfai", "steering");
  await rm(steering, { recursive: true, force: true });
  await mkdir(steering, { recursive: true });
  for (const [name, body] of Object.entries(POPULATED_STEERING)) {
    await writeFile(path.join(steering, name), body, "utf-8");
  }
  return steering;
}

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0003-init-worklog-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("TC-0003-0059: no work-log path or instructions line after init", () => {
  it("TC-0003-0059: init in an empty directory creates no .qfai/steering/ path and its report names none", async () => {
    const report = await init(root, false);

    expect(
      report.stdout.filter((line) => line.startsWith("qfai init: dest=")),
      "the captured report is the one init printed",
    ).toHaveLength(1);

    const steering = await lstatOutcome(path.join(root, ".qfai", "steering"));
    const reportLines = [...report.stdout, ...report.stderr].filter((line) =>
      STEERING_PATH.test(line),
    );
    expect({ steering, reportLines }).toEqual({ steering: "ENOENT", reportLines: [] });
  });

  it("TC-0003-0059: the generated copilot-instructions.md has no work-log line", async () => {
    await init(root, false);
    const text = await readFile(path.join(root, ".github", "copilot-instructions.md"), "utf-8");
    const lines = text.split(/\r?\n/);

    expect(
      lines.filter((line) => line === "## Golden rules"),
      "the instructions file init generated was read",
    ).toHaveLength(1);

    const workLogLines = lines.filter(
      (line) =>
        line.includes(".qfai/steering/") ||
        line.includes("worklog-entry.schema.md") ||
        /work-log/i.test(line),
    );
    expect(workLogLines).toEqual([]);
  });
});

describe("TC-0003-0060: populated work-log directory unchanged by init and init --force", () => {
  it("TC-0003-0060: plain init leaves a populated .qfai/steering/ byte-identical", async () => {
    await init(root, false);
    const steering = await populateSteering(root);
    const before = await snapshot(steering);

    expect(Object.keys(before).sort(), "the walk read the populated directory").toEqual([
      "2026-09-01-adopter-note.md",
      "README.md",
    ]);

    await init(root, false);
    expect(await snapshot(steering)).toEqual(before);
  });

  it("TC-0003-0060: init --force leaves a populated .qfai/steering/ byte-identical", async () => {
    await init(root, false);
    const steering = await populateSteering(root);
    const before = await snapshot(steering);

    expect(Object.keys(before).sort(), "the walk read the populated directory").toEqual([
      "2026-09-01-adopter-note.md",
      "README.md",
    ]);

    await init(root, false);
    await init(root, true);
    expect(await snapshot(steering)).toEqual(before);
  });
});
