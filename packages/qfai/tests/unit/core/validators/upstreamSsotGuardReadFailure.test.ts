/**
 * How the story-tree drift guard reads a file that may not exist.
 *
 * Only a missing file counts as empty. Every other read failure is rethrown
 * unchanged, including a rejection that is not an `Error` at all, which the
 * guard must not mistake for a failure of its own.
 *
 * `readFile` is mocked for the register document, because an unreadable file
 * cannot be made portably on every platform the suite runs on. `vi.mock` is
 * hoisted to module scope, so these cases live in their own file.
 */
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import type * as gitChanges from "../../../../src/core/gitChanges.js";

type FsPromises = typeof fsPromises;
type GitChanges = typeof gitChanges;

const read = vi.hoisted(() => ({ failure: undefined as unknown, fails: false }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    readFile: async (...args: Parameters<FsPromises["readFile"]>) => {
      if (read.fails && String(args[0]).endsWith("decisions.md")) {
        return Promise.reject(read.failure);
      }
      return actual.readFile(...args);
    },
  };
});

vi.mock("../../../../src/core/gitChanges.js", async () => {
  const actual = await vi.importActual<GitChanges>("../../../../src/core/gitChanges.js");
  return {
    ...actual,
    getChangedFilesAgainstBase: () => new Set<string>(),
    readFileAtBase: () => "",
  };
});

const { validateStoryTreeDrift } =
  await import("../../../../src/core/validators/upstreamSsotGuard.js");

function validate() {
  return validateStoryTreeDrift(
    path.join(os.tmpdir(), "qfai-drift-read-failure"),
    defaultConfig,
    "tdd",
  );
}

describe("validateStoryTreeDrift reading the decision register", () => {
  it("treats a missing register as empty", async () => {
    read.fails = true;
    read.failure = Object.assign(new Error("ENOENT: no such file"), { code: "ENOENT" });

    await expect(validate()).resolves.toEqual(expect.any(Array));
  });

  it("rethrows a failure that is not a missing file", async () => {
    const failure = Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
    read.fails = true;
    read.failure = failure;

    await expect(validate()).rejects.toBe(failure);
  });

  it("rethrows a rejection that carries no error object", async () => {
    read.fails = true;
    read.failure = undefined;

    await expect(validate()).rejects.toBeUndefined();
  });
});
