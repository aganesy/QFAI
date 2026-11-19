/**
 * One completed-analysis candidate that cannot be inspected must not decide
 * cache selection for the rest: a later valid candidate is still restored, and
 * with none left the analysis is generated locally.
 *
 * File permissions do not deny a read on every platform CI runs, so the
 * inspection is made to fail for one named candidate rather than arranged on
 * disk. Directory order differs between file systems, so the cache directory is
 * listed by name and the failing candidate always comes first.
 */

import { Dirent } from "node:fs";
import type * as NativeFs from "node:fs/promises";
import { cp, readFile, readdir, rename } from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { prepareCodeAnalysis } from "../../../src/core/graph/codePreparation.js";
import { prepareDocumentAnalysis } from "../../../src/core/graph/documents.js";
import {
  completedCodeSnapshotFixture,
  completedDocumentSnapshotFixture,
  localCodeGenerationProcess,
} from "../../helpers/graphReuse.js";

// "-" sorts before every digit and letter, so this name precedes a UUID-named candidate.
const UNREADABLE = "0-unreadable";
type Failure = "candidate" | "metadata-lstat" | "metadata-read";
const failing = vi.hoisted((): { failure: Failure | undefined } => ({ failure: undefined }));

function denied(target: unknown, failure: Failure): boolean {
  if (failing.failure !== failure || typeof target !== "string") return false;
  if (failure === "candidate") return path.basename(target) === UNREADABLE;
  return (
    path.basename(target) === "completed.json" && path.basename(path.dirname(target)) === UNREADABLE
  );
}

function accessDenied(target: unknown): Error {
  return Object.assign(new Error(`EACCES: permission denied '${String(target)}'`), {
    code: "EACCES",
  });
}

function entryName(entry: unknown): string {
  if (typeof entry === "string") return entry;
  return entry instanceof Dirent ? entry.name : "";
}

vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof NativeFs>();
  return {
    ...fs,
    lstat: async (...args: unknown[]) => {
      if (denied(args[0], "candidate") || denied(args[0], "metadata-lstat"))
        throw accessDenied(args[0]);
      const stats: unknown = await Reflect.apply(fs.lstat, undefined, args);
      return stats;
    },
    readFile: async (...args: unknown[]) => {
      if (denied(args[0], "metadata-read")) throw accessDenied(args[0]);
      const content: unknown = await Reflect.apply(fs.readFile, undefined, args);
      return content;
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

const failures: Failure[] = ["candidate", "metadata-lstat", "metadata-read"];

it("restores a later completed code analysis past an unreadable candidate", async () => {
  for (const failure of failures) {
    const fixture = await completedCodeSnapshotFixture();
    try {
      await cp(fixture.candidate, path.join(path.dirname(fixture.candidate), UNREADABLE), {
        recursive: true,
      });
      failing.failure = failure;
      const result = await prepareCodeAnalysis(
        fixture.root,
        localCodeGenerationProcess(fixture),
        fixture.environment,
      );
      expect(result, failure).toMatchObject({ status: "prepared", source: "restored" });
      expect(
        await readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8"),
        failure,
      ).toBe("Process-port DB marker");
    } finally {
      failing.failure = undefined;
      await fixture.dispose();
    }
  }
});

it("generates code analysis locally when the only candidate is unreadable", async () => {
  for (const failure of failures) {
    const fixture = await completedCodeSnapshotFixture();
    try {
      await rename(fixture.candidate, path.join(path.dirname(fixture.candidate), UNREADABLE));
      failing.failure = failure;
      const result = await prepareCodeAnalysis(
        fixture.root,
        localCodeGenerationProcess(fixture),
        fixture.environment,
      );
      expect(result, failure).toMatchObject({ status: "prepared", source: "generated" });
      expect(
        await readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8"),
        failure,
      ).toBe("Native generation process-port marker");
    } finally {
      failing.failure = undefined;
      await fixture.dispose();
    }
  }
});

it("restores a later completed document analysis past an unreadable candidate", async () => {
  for (const failure of failures) {
    const fixture = await completedDocumentSnapshotFixture();
    try {
      const cache = path.join(fixture.common, "qfai-graph-cache", "win32-x64", "graphify");
      const [published] = await readdir(cache);
      if (!published) throw new Error("Document fixture published no completed analysis");
      await cp(path.join(cache, published), path.join(cache, UNREADABLE), { recursive: true });
      failing.failure = failure;
      const result = await prepareDocumentAnalysis(
        fixture.root,
        fixture.run,
        undefined,
        fixture.environment,
      );
      expect(result, failure).toMatchObject({ status: "prepared", source: "restored" });
      expect(
        fixture.calls.some((call) => call.args.includes("extract")),
        failure,
      ).toBe(false);
    } finally {
      failing.failure = undefined;
      await fixture.dispose();
    }
  }
});
