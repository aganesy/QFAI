/**
 * What the shipping lint counts as scanned, and how its command ends.
 *
 * `node:fs/promises` is wrapped so a listing, stat or read can fail for one
 * named path on every platform; every other call reaches the real module.
 */
import type * as FsPromises from "node:fs/promises";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runLintShipping, runLintShippingCli } from "../../scripts/lint-shipping.js";

/** Basenames whose listing, stat or read fails with EACCES. */
const FAILING = { readdir: "unlistable", stat: "unstatable.ts", readFile: "unreadable.ts" };

function denied(operation: string, target: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`EACCES: permission denied, ${operation} '${target}'`), {
    code: "EACCES",
  });
}

vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof FsPromises>();
  const failsFor = (target: unknown, name: string): boolean =>
    typeof target === "string" && path.basename(target) === name;
  return {
    ...real,
    readdir: (...args: Parameters<typeof real.readdir>) =>
      failsFor(args[0], FAILING.readdir)
        ? Promise.reject(denied("scandir", String(args[0])))
        : real.readdir(...args),
    stat: (...args: Parameters<typeof real.stat>) =>
      failsFor(args[0], FAILING.stat)
        ? Promise.reject(denied("stat", String(args[0])))
        : real.stat(...args),
    readFile: (...args: Parameters<typeof real.readFile>) =>
      failsFor(args[0], FAILING.readFile)
        ? Promise.reject(denied("open", String(args[0])))
        : real.readFile(...args),
  };
});

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-lint-ship-io-"));
  tempDirs.push(dir);
  return dir;
}

/** A package root holding `src/guard.ts` with one internal ID in a comment. */
async function packageWithOneViolation(root: string): Promise<void> {
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "guard.ts"), "// BF-0010\nexport const guard = true;\n");
}

/** Everything written to stdout and stderr while `run` was awaited. */
async function captured(
  run: () => Promise<number>,
): Promise<{ exitCode: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const outSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    out.push(String(chunk));
    return true;
  });
  const errSpy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
    err.push(String(chunk));
    return true;
  });
  try {
    return { exitCode: await run(), out: out.join(""), err: err.join("") };
  } finally {
    outSpy.mockRestore();
    errSpy.mockRestore();
  }
}

afterEach(async () => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("lint-shipping exclusions read the path inside the package", () => {
  it("scans a package checked out beneath a directory named tests", async () => {
    const root = path.join(await newTempDir(), "tests", "__tests__", "pkg");
    await packageWithOneViolation(root);
    await mkdir(path.join(root, "src", "__tests__"), { recursive: true });
    await writeFile(path.join(root, "src", "__tests__", "fixture.ts"), "// BF-0011\n");
    await writeFile(path.join(root, "src", "guard.test.ts"), "// BF-0012\n");

    const { violations, scannedFileCount } = await runLintShipping(root);

    expect(scannedFileCount).toBe(1);
    expect(violations.map(({ file, matched }) => [file, matched])).toEqual([
      ["src/guard.ts", "BF-0010"],
    ]);
  });
});

describe("lint-shipping fails on files it could not inspect", () => {
  it.each([
    ["a directory it cannot list", path.join("src", FAILING.readdir, "inner.ts")],
    ["an entry it cannot stat", path.join("src", FAILING.stat)],
    ["a file it cannot read", path.join("src", FAILING.readFile)],
  ])("rejects on %s instead of reporting a clean scan", async (_case, relative) => {
    const root = await newTempDir();
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await writeFile(path.join(root, relative), "export const x = 1;\n");

    await expect(runLintShipping(root)).rejects.toMatchObject({ code: "EACCES" });
  });

  it("counts a package without some target trees as scanning only what exists", async () => {
    const root = await newTempDir();
    await packageWithOneViolation(root);

    expect((await runLintShipping(root)).scannedFileCount).toBe(1);
  });
});

describe("lint-shipping command result", () => {
  it("returns 2 with every violation written, and never calls process.exit", async () => {
    const root = await newTempDir();
    await packageWithOneViolation(root);
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    const { exitCode, err } = await captured(() => runLintShippingCli(root));

    expect(exitCode).toBe(2);
    expect(err).toContain("src/guard.ts:1  [internal-story-bf-id-jsdoc-leak]  'BF-0010'");
    expect(err).toContain("qfai-shipping:allow");
    expect(exit).not.toHaveBeenCalled();
  });

  it("returns 0 on a clean package", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "src", "clean.ts"), "export const x = 1;\n");

    const { exitCode, out } = await captured(() => runLintShippingCli(root));

    expect(exitCode).toBe(0);
    expect(out).toContain("1 files scanned");
  });

  it("returns 2 and names the failure when a file cannot be read", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "src", FAILING.readFile), "export const x = 1;\n");

    const { exitCode, err } = await captured(() => runLintShippingCli(root));

    expect(exitCode).toBe(2);
    expect(err).toContain("EACCES");
    expect(err).toContain(FAILING.readFile);
  });
});
