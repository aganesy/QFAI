/**
 * Integration: init and upgrade give the same result on a CRLF checkout, and through the built
 * CLI under a root whose name contains a space, as they do in process on Linux.
 *
 * CRLF comes from the fixture, never from `core.autocrlf`.
 */
// QFAI:AC-0001-0203-06
// QFAI:EX-0001-0203-16
// QFAI:EX-0001-0203-17
// QFAI:EX-0001-0203-18
import { spawnSync } from "node:child_process";
import { readdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { hashAssistantAssetFile } from "../../../src/core/assistantAssetProvenance.js";
import {
  HOST_SKILL_DIRS,
  initQuietly,
  modeLines,
  readLock,
  withEmptyRepo,
  withInstall,
} from "./upgradeStates.js";

const CLI = path.resolve(import.meta.dirname, "../../../dist/cli/index.mjs");
const RULE = "rule/quality.md";

type RunView = { modeLines: string[]; lock: unknown; wrappers: string[] };

/** What a run must give alike in and out of process: the mode line, the lock, wrapper targets. */
async function viewOf(root: string, output: string): Promise<RunView> {
  const realRoot = await realpath(root);
  const wrappers: string[] = [];
  for (const host of HOST_SKILL_DIRS) {
    const dir = path.join(root, ...host.split("/"));
    for (const name of await readdir(dir).catch(() => [])) {
      const target = path.relative(realRoot, await realpath(path.join(dir, name)));
      wrappers.push(`${host}/${name} -> ${target.split(path.sep).join("/")}`);
    }
  }
  return { modeLines: modeLines(output), lock: (await readLock(root)).lock, wrappers };
}

describe("windows parity", () => {
  it("Every provenance lock key is a slash-separated relative path", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      const keys = Object.keys((await readLock(root)).files);

      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(key, "no backslash").not.toContain("\\");
        expect(path.posix.isAbsolute(key) || path.win32.isAbsolute(key), `${key} is relative`).toBe(
          false,
        );
        expect(
          key.split("/").every((segment) => segment !== "" && segment !== ".."),
          key,
        ).toBe(true);
      }
      expect(
        keys.some((key) => key.includes("/")),
        "a nested key uses /",
      ).toBe(true);
    });
  });

  it("Built CLI init and upgrade under a root with a space", async () => {
    const spawned: RunView[] = [];
    await withEmptyRepo(async (root) => {
      for (let run = 0; run < 2; run += 1) {
        const result = spawnSync(process.execPath, [CLI, "init", "--yes"], {
          cwd: root,
          encoding: "utf-8",
        });
        expect(result.status, result.stderr).toBe(0);
        spawned.push(await viewOf(root, result.stdout));
      }
    });
    const inProcess: RunView[] = [];
    await withEmptyRepo(async (root) => {
      for (let run = 0; run < 2; run += 1) {
        inProcess.push(await viewOf(root, await initQuietly(root)));
      }
    });

    expect(spawned).toEqual(inProcess);
    expect(spawned.map((view) => view.modeLines)).toEqual([
      ["Workflow mode: active"],
      ["Workflow mode: active"],
    ]);
  });

  it("A CRLF copy of an unmodified shipped rule is treated as unmodified", async () => {
    await withInstall([], async (root) => {
      const file = path.join(root, ".qfai", "assistant", ...RULE.split("/"));
      await writeFile(file, (await readFile(file, "utf-8")).replace(/\r?\n/g, "\r\n"), "utf-8");
      const crlf = await readFile(file);

      const output = await initQuietly(root);

      expect(await hashAssistantAssetFile(file)).toBe((await readLock(root)).files[RULE]);
      expect(await readFile(file), "the CRLF copy is left as it is").toEqual(crlf);
      const notes = output.split("\n").filter((line) => line.includes("quality.md"));
      expect(notes, "no manual-merge note names the rule").toEqual([]);
    });
  });
});
