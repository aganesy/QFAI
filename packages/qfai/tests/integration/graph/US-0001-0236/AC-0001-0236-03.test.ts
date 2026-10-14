// QFAI:AC-0001-0236-03

import { cp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  completedCodeSnapshotFixture,
  localCodeGenerationProcess,
} from "../../../helpers/graphReuse.js";
import { prepareCodeAnalysis } from "../../../../src/core/graph/codePreparation.js";
import { exploreGraph } from "../../../../src/core/graph/query.js";
import type { GraphProcess } from "../../../../src/core/graph/process.js";

describe("AC-0001-0236-03", () => {
  it("reconciles edited added deleted and renamed files before returning current native evidence", async () => {
    for (const change of ["edit", "add", "delete", "rename"]) {
      const fixture = await completedCodeSnapshotFixture();
      const collect = async (directory: string) => {
        const result: Record<string, string> = {};
        for (const entry of await readdir(directory, { withFileTypes: true }))
          if (entry.isFile() && entry.name.endsWith(".ts"))
            result[entry.name] = await readFile(path.join(directory, entry.name), "utf8");
        return result;
      };
      let indexed = await collect(path.join(fixture.candidate, "analysis"));
      const generation = localCodeGenerationProcess(fixture);
      const run: GraphProcess = async (command, args, options) => {
        const result = await generation(command, args, options);
        if (
          args.some((arg) => arg.endsWith("codegraph-native.mjs")) &&
          !["inventory", "coverage"].includes(args.at(-1) ?? "")
        ) {
          indexed = await collect(args[3] ?? "");
          return result;
        }
        if (args.includes("status")) {
          const corpus = args[2];
          if (!corpus) throw new Error("Missing native status corpus");
          const actual = await collect(corpus);
          const stale = Object.keys({ ...indexed, ...actual }).some(
            (file) => indexed[file] !== actual[file],
          );
          const status: Record<string, unknown> = JSON.parse(result.stdout);
          return {
            ...result,
            stdout: JSON.stringify({
              ...status,
              pendingChanges: { added: 0, modified: stale ? 1 : 0, removed: 0 },
            }),
          };
        }
        if (args.includes("context")) {
          const files = Object.keys(indexed);
          return {
            exitCode: 0,
            stdout: JSON.stringify({
              query: args[args.indexOf("context") + 1],
              summary: JSON.stringify(indexed),
              entryPoints: [],
              nodes: files.map((filePath) => ({ kind: "function", filePath, startLine: 1 })),
              edges: [],
              codeBlocks: [],
              relatedFiles: files,
              stats: {
                nodeCount: files.length,
                edgeCount: 0,
                fileCount: files.length,
                codeBlockCount: 0,
                totalCodeSize: 0,
              },
            }),
          };
        }
        return result;
      };
      try {
        await cp(path.join(fixture.candidate, "analysis"), fixture.analysis, { recursive: true });
        await rm(fixture.candidate, { recursive: true });
        const source = path.join(fixture.root, "checkout.ts");
        if (change === "edit")
          await writeFile(source, "export function checkout() { return 8; }\n");
        if (change === "add")
          await writeFile(
            path.join(fixture.root, "total.ts"),
            "export function total() { return 9; }\n",
          );
        if (change === "delete") await rm(source);
        if (change === "rename") await rename(source, path.join(fixture.root, "purchase.ts"));
        expect(
          await prepareCodeAnalysis(fixture.root, run, fixture.environment),
          change,
        ).toMatchObject({ status: "prepared", source: "generated" });
        expect(await collect(fixture.analysis)).toEqual(await collect(fixture.root));
        const answer = await exploreGraph(
          fixture.root,
          { domain: "code", question: "checkout" },
          run,
        );
        expect(answer.status).toBe(change === "delete" ? "no-match" : "answered");
        const native: Record<string, unknown> = JSON.parse(answer.answer ?? "{}");
        expect(native.relatedFiles).toEqual(Object.keys(await collect(fixture.root)));
        if (change === "edit") expect(native.summary).toContain("return 8");
        if (change === "rename") expect(native.relatedFiles).not.toContain("checkout.ts");
        expect(
          fixture.observed.filter((args) => args.includes("status")).length,
        ).toBeGreaterThanOrEqual(3);
      } finally {
        await fixture.dispose();
      }
    }
  });
});
