/**
 * A completed-analysis candidate whose analysis copy fails, such as on a file
 * inside it that cannot be read, must not decide cache selection for the rest:
 * its partial copy is removed and a later valid candidate is still restored.
 *
 * File permissions do not deny a read on every platform CI runs, so the copy of
 * one named candidate is made to fail after it has written part of its files
 * rather than arranged on disk. Directory order differs between file systems,
 * so the cache directory is listed by name and the failing candidate always
 * comes first.
 */

import { Dirent } from "node:fs";
import type * as NativeFs from "node:fs/promises";
import { cp, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { prepareCodeAnalysis } from "../../../src/core/graph/codePreparation.js";
import { prepareDocumentAnalysis } from "../../../src/core/graph/documents.js";
import { graphAnalysisRoot } from "../../../src/core/graph/layout.js";
import {
  completedCodeSnapshotFixture,
  completedDocumentSnapshotFixture,
  localCodeGenerationProcess,
} from "../../helpers/graphReuse.js";

// "-" sorts before every digit and letter, so this name precedes a UUID-named candidate.
const UNREADABLE = "0-unreadable";
const failing = vi.hoisted((): { copy: boolean } => ({ copy: false }));

function entryName(entry: unknown): string {
  if (typeof entry === "string") return entry;
  return entry instanceof Dirent ? entry.name : "";
}

vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof NativeFs>();
  return {
    ...fs,
    cp: async (...args: unknown[]) => {
      await Reflect.apply(fs.cp, undefined, args);
      const [source] = args;
      if (
        failing.copy &&
        typeof source === "string" &&
        path.basename(source) === "analysis" &&
        path.basename(path.dirname(source)) === UNREADABLE
      )
        throw Object.assign(new Error(`EACCES: permission denied, open '${source}'`), {
          code: "EACCES",
        });
    },
    readdir: async (...args: unknown[]) => {
      const listed: unknown = await Reflect.apply(fs.readdir, undefined, args);
      const [directory] = args;
      if (
        !Array.isArray(listed) ||
        typeof directory !== "string" ||
        path.basename(path.dirname(path.dirname(directory))) !== "qfai-graph-cache"
      )
        return listed;
      const entries: unknown[] = listed;
      // Code-unit order: locale collation would ignore the "-" that puts the failing name first.
      return [...entries].sort((a, b) => (entryName(a) < entryName(b) ? -1 : 1));
    },
  };
});

async function restoringCopies(analysis: string): Promise<string[]> {
  return (await readdir(path.dirname(analysis))).filter((name) => name.startsWith(".restoring-"));
}

it("restores a later completed code analysis past a candidate whose copy fails", async () => {
  const fixture = await completedCodeSnapshotFixture();
  try {
    await cp(fixture.candidate, path.join(path.dirname(fixture.candidate), UNREADABLE), {
      recursive: true,
    });
    failing.copy = true;
    const result = await prepareCodeAnalysis(
      fixture.root,
      localCodeGenerationProcess(fixture),
      fixture.environment,
    );
    expect(result).toMatchObject({ status: "prepared", source: "restored" });
    expect(await readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8")).toBe(
      "Process-port DB marker",
    );
    expect(await restoringCopies(fixture.analysis)).toEqual([]);
  } finally {
    failing.copy = false;
    await fixture.dispose();
  }
});

it("restores a later completed document analysis past a candidate whose copy fails", async () => {
  const fixture = await completedDocumentSnapshotFixture();
  try {
    const cache = path.join(fixture.common, "qfai-graph-cache", "win32-x64", "graphify");
    const [published] = await readdir(cache);
    if (!published) throw new Error("Document fixture published no completed analysis");
    await cp(path.join(cache, published), path.join(cache, UNREADABLE), { recursive: true });
    failing.copy = true;
    const result = await prepareDocumentAnalysis(
      fixture.root,
      fixture.run,
      undefined,
      fixture.environment,
    );
    expect(result).toMatchObject({ status: "prepared", source: "restored" });
    expect(fixture.calls.some((call) => call.args.includes("extract"))).toBe(false);
    expect(await restoringCopies(graphAnalysisRoot(fixture.root, "graphify"))).toEqual([]);
  } finally {
    failing.copy = false;
    await fixture.dispose();
  }
});
