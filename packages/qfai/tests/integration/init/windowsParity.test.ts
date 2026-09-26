/**
 * Integration: init and upgrade give the same result on a CRLF checkout as on Linux.
 *
 * CRLF comes from the fixture, never from `core.autocrlf`.
 */
// QFAI:SPEC-0003:TC-0003-0092
// QFAI:SPEC-0003:TC-0003-0076
// QFAI:SPEC-0003:TC-0003-0080
// QFAI:SPEC-0003:TC-0003-0088
import { spawnSync } from "node:child_process";
import { readdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { QFAI_GITIGNORE_MARKER } from "../../../src/core/gitignore.js";
import {
  initQuietly,
  isIgnored,
  lockConflicts,
  modeLines,
  readLock,
  withEmptyRepo,
  withInstall,
} from "./upgradeStates.js";

async function toCrlf(file: string): Promise<void> {
  const text = await readFile(file, "utf-8");
  await writeFile(file, text.replace(/\r?\n/g, "\r\n"), "utf-8");
}

describe("windows parity", () => {
  it("TC-0003-0092: The previous managed block in a CRLF .gitignore", async () => {
    await withInstall(["older-gitignore"], async (root) => {
      const file = path.join(root, ".gitignore");
      await toCrlf(file);
      await initQuietly(root);

      const lines = (await readFile(file, "utf-8")).split(/\r?\n/).filter((line) => line !== "");
      expect(lines.filter((line) => line === QFAI_GITIGNORE_MARKER)).toHaveLength(1);
      const duplicated = lines.filter((line, index) => lines.indexOf(line) !== index);
      expect(duplicated, "no block line is duplicated").toEqual([]);
      expect(isIgnored(root, ".qfai/runs/x")).toBe(true);
      expect(isIgnored(root, ".qfai/evidence/workflow/x/summary.json")).toBe(false);
    });
  });

  it("TC-0003-0076: A CRLF copy of an unmodified plan is not a conflict", async () => {
    await withInstall(["crlf-plan"], async (root) => {
      const output = await initQuietly(root);

      expect(await lockConflicts(root)).toEqual([]);
      expect(modeLines(output)).toEqual(["Workflow mode: active"]);
    });
  });

  it("TC-0003-0080: Every provenance lock key is a slash-separated path", async () => {
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
        keys.some((key) => key.split("/").length > 2),
        "a nested key uses /",
      ).toBe(true);
    });
  });

  it("TC-0003-0088: Built CLI init and upgrade under a root with a space", async () => {
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
      for (let run = 0; run < 2; run += 1)
        inProcess.push(await viewOf(root, await initQuietly(root)));
    });

    expect(spawned).toEqual(inProcess);
    expect(spawned.map((view) => view.modeLines)).toEqual([
      ["Workflow mode: active"],
      ["Workflow mode: active"],
    ]);
  });
});

const CLI = path.resolve(import.meta.dirname, "../../../dist/cli/index.mjs");
const HOST_SKILL_DIRS = [".agents/skills", ".claude/skills", ".codex/skills", ".github/skills"];

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
