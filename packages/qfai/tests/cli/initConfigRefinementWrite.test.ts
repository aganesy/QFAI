/**
 * How `qfai init` writes the `testFileGlobs` it derives back into the config.
 *
 * The refinement rewrites a file every later `validate` and `doctor` run reads.
 * Writing over it truncates it first, so an `ENOSPC`, an `EIO` or a signal
 * partway through leaves a half-written `qfai.config.yaml` and no copy of what
 * it replaced. The content goes to a temp file beside the target and is renamed
 * over it instead: `rename` is atomic against the pathname, so any failure
 * before it leaves the original exactly as it was.
 *
 * That is also what makes the refinement's swallowed error safe. Init treats it
 * as best-effort — the template's `[]` is a valid value — and a failure must
 * therefore leave the config init already wrote, not a fragment of the one it
 * was building.
 *
 * `rename` and `writeFile` are spied because the distinction is invisible in
 * the result: both leave the same bytes at the same path, and only the route
 * differs. `vi.mock` is hoisted to module scope, so this case lives apart from
 * `initTestGlobDerivation.test.ts` rather than mocking every case beside it.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { renameSpy, writeFileSpy } = vi.hoisted(() => ({
  renameSpy: vi.fn(),
  writeFileSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    rename: (...args: unknown[]) => renameSpy(actual, ...args),
    writeFile: (...args: unknown[]) => writeFileSpy(actual, ...args),
  };
});

const { runInit } = await import("../../src/cli/commands/init.js");

let root: string;

beforeEach(async () => {
  renameSpy.mockReset();
  writeFileSpy.mockReset();
  // The parameter tuples of the functions being wrapped. `never[]` is not a
  // tuple, so a spread of it into a fixed-arity call is a type error.
  renameSpy.mockImplementation((actual: FsPromises, ...args: Parameters<FsPromises["rename"]>) =>
    actual.rename(...args),
  );
  writeFileSpy.mockImplementation(
    (actual: FsPromises, ...args: Parameters<FsPromises["writeFile"]>) => actual.writeFile(...args),
  );
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-config-write-"));
  await mkdir(path.join(root, "tests", "unit"), { recursive: true });
  await writeFile(path.join(root, "tests", "unit", "thing.test.ts"), "// a test file\n", "utf-8");
  // Seeding the sandbox goes through the same mocked module, so its own call
  // would satisfy "the spy is recording" on a build where init writes nothing
  // at all — the one reading that makes the assertion below vacuous.
  renameSpy.mockClear();
  writeFileSpy.mockClear();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

// Each spy is called as `(actual, ...args)`, so the wrapped call's own
// arguments start at index 1: `writeFile(path, content)` puts its target
// there, and `rename(from, to)` puts its target one further along.
const written = (): string[] => writeFileSpy.mock.calls.map((call) => String(call[1]));
const renamedOnto = (): string[] => renameSpy.mock.calls.map((call) => String(call[2]));

describe("the derived testFileGlobs reach the config by rename", () => {
  it("renames a temp file beside the config over it", async () => {
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const config = path.join(root, "qfai.config.yaml");
    expect(await readFile(config, "utf-8")).toContain(`testFileGlobs: ["tests/**/*.test.ts"]`);

    const onto = renameSpy.mock.calls.find((call) => String(call[2]) === config);
    expect(
      onto,
      `no rename onto the config; renamed onto ${renamedOnto().join(", ")}`,
    ).toBeDefined();
    // Beside it, so the rename stays within one filesystem and cannot degrade
    // into a copy.
    expect(path.dirname(String(onto?.[1]))).toBe(root);
    expect(path.basename(String(onto?.[1]))).toMatch(/^\.qfai\.config\.yaml\..+\.tmp$/);
  });

  it("never writes over the config in place", async () => {
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    // The truncating route. Init writes many files this way, so the spy is
    // known to be recording; the config is the one that must not be among them.
    expect(written().length).toBeGreaterThan(0);
    expect(written()).not.toContain(path.join(root, "qfai.config.yaml"));
  });
});
