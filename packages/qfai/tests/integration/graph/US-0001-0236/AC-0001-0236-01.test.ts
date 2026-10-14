// QFAI:AC-0001-0236-01

import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  completedCodeSnapshotFixture,
  completedDocumentSnapshotFixture,
} from "../../../helpers/graphReuse.js";
import { prepareCodeAnalysis } from "../../../../src/core/graph/codePreparation.js";
import { prepareDocumentAnalysis } from "../../../../src/core/graph/documents.js";
import { exploreGraph } from "../../../../src/core/graph/query.js";

describe("AC-0001-0236-01", () => {
  it("restores independent completed copies and checks native freshness before querying each engine", async () => {
    const code = await completedCodeSnapshotFixture();
    try {
      expect(await prepareCodeAnalysis(code.root, code.run, code.environment)).toMatchObject({
        status: "prepared",
        source: "restored",
      });
      const working = path.join(code.analysis, ".codegraph", "codegraph.db");
      const cached = path.join(code.candidate, "analysis", ".codegraph", "codegraph.db");
      expect(await readFile(working)).toEqual(await readFile(cached));
      expect((await lstat(working)).nlink).toBe(1);
      expect((await lstat(working)).ino).not.toBe((await lstat(cached)).ino);
      expect(
        (await exploreGraph(code.root, { domain: "code", question: "checkout" }, code.run)).status,
      ).toBe("answered");
      expect(code.observed.findIndex((args) => args.includes("status"))).toBeLessThan(
        code.observed.findIndex((args) => args.includes("context")),
      );
      expect(code.observed.some((args) => args.includes("index") || args.includes("extract"))).toBe(
        false,
      );
    } finally {
      await code.dispose();
    }
    const documents = await completedDocumentSnapshotFixture();
    try {
      expect(
        await prepareDocumentAnalysis(
          documents.root,
          documents.run,
          undefined,
          documents.environment,
        ),
      ).toMatchObject({ status: "prepared", source: "restored" });
      const cache = path.join(documents.common, "qfai-graph-cache", "win32-x64", "graphify");
      const entries = await readdir(cache);
      expect(entries).toHaveLength(1);
      const cached = path.join(cache, entries[0] ?? "", "analysis", "graphify-out", "graph.json");
      const working = path.join(documents.documentAnalysis, "graphify-out", "graph.json");
      expect(await readFile(working)).toEqual(await readFile(cached));
      expect((await lstat(working)).nlink).toBe(1);
      expect((await lstat(working)).ino).not.toBe((await lstat(cached)).ino);
      expect(
        (
          await exploreGraph(
            documents.root,
            { domain: "documents", question: "rationale" },
            documents.run,
          )
        ).status,
      ).toBe("answered");
      expect(documents.observed.findIndex((args) => args.at(-1) === "semantic")).toBeLessThan(
        documents.observed.findIndex((args) => args.includes("query")),
      );
      expect(documents.observed.some((args) => args.includes("extract"))).toBe(false);
    } finally {
      await documents.dispose();
    }
  });
});
