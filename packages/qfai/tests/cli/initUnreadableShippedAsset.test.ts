/**
 * `qfai init` stops before any write when a shipped assistant file cannot be
 * read, rather than copying the rest and failing partway through.
 *
 * Listing the shipped tree succeeds while one file in it is unreadable, so the
 * preflight has to read each file. `readFile` is mocked to fail for one shipped
 * file, because an unreadable file cannot be made portably on every platform
 * the suite runs on. `vi.mock` is hoisted to module scope, so this case lives
 * in its own file.
 */

import { access, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";
import { removeTempTree } from "../helpers/tempTree.js";

type FsPromises = typeof fsPromises;

const UNREADABLE = path.join(getInitAssetsDir(), ".qfai", "assistant", "rule", "constitution.md");

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    readFile: (...args: Parameters<FsPromises["readFile"]>) => {
      if (typeof args[0] === "string" && path.resolve(args[0]) === UNREADABLE) {
        return Promise.reject(
          Object.assign(new Error(`EACCES: permission denied, open '${args[0]}'`), {
            code: "EACCES",
          }),
        );
      }
      return actual.readFile(...args);
    },
  };
});

const { runInit } = await import("../../src/cli/commands/init.js");

let root: string | undefined;

afterEach(async () => {
  if (root !== undefined) await removeTempTree(root);
  root = undefined;
});

describe("qfai init with an unreadable shipped asset", () => {
  it("stops before writing anything", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-unreadable-"));

    await expect(runInit({ dir: root, force: false, dryRun: false, yes: true })).rejects.toThrow(
      /cannot read the shipped assistant assets/,
    );

    await expect(access(path.join(root, ".qfai"))).rejects.toThrow();
  });
});
