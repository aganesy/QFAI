// QFAI:AC-0001-0234-03

import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  documentAnalysisFixture,
  graphifyExtractionFixture,
} from "../../../helpers/graphAnalysis.js";
import { prepareDocumentAnalysis } from "../../../../src/index.js";

describe("AC-0001-0234-03", () => {
  it("uses selected local processing and requires separate authorization for external scope", async () => {
    const fixture = await documentAnalysisFixture();
    const prior = process.env.OPENAI_API_KEY;
    const definition = path.join(fixture.root, ".qfai", "graph-processing.json");
    const extract = graphifyExtractionFixture(fixture);
    const run: typeof fixture.run = async (command, args, options) => {
      const inspector = args.findIndex((arg) => arg.endsWith("graphify-native.py"));
      const corpus = args[inspector + 1];
      if (inspector >= 0 && corpus && args.at(-1) !== "inventory") {
        const graph = await readFile(path.join(corpus, "graphify-out", "graph.json")).catch(
          () => undefined,
        );
        if (!graph) return { exitCode: 0, stdout: '{"current":false}' };
      }
      return extract(command, args, options);
    };
    try {
      await rm(path.join(fixture.documentAnalysis, "graphify-out", "graph.json"));
      await rm(definition);
      process.env.OPENAI_API_KEY = "fixture-ambient-key";
      const missing = await prepareDocumentAnalysis(fixture.root, run);
      expect(missing.status).toBe("not-ready");
      expect(missing.recovery).toContain(".qfai/graph-processing.json");
      expect(missing.recovery).toContain(".agents/rules/graph-exploration.md");
      expect(missing.recovery).toContain("node .qfai/tools/graph-cli.mjs documents");
      expect(fixture.calls.some((call) => call.args.includes("extract"))).toBe(false);
      const selected = {
        backend: "ollama",
        model: "selected-local-model",
        endpoint: "http://127.0.0.1:11434/v1",
        scope: ["rationale.md"],
      };
      await writeFile(definition, JSON.stringify(selected));
      await writeFile(path.join(fixture.root, "outside.md"), "Unselected document.\n");
      expect((await prepareDocumentAnalysis(fixture.root, run)).status).toBe("prepared");
      const local = fixture.calls.find((call) => call.args.includes("extract"));
      expect(local?.env?.OLLAMA_BASE_URL).toBe(selected.endpoint);
      expect(local?.env?.OPENAI_API_KEY).toBeUndefined();
      await expect(
        readFile(path.join(fixture.documentAnalysis, "outside.md")),
      ).rejects.toMatchObject({ code: "ENOENT" });
      const external = {
        ...selected,
        backend: "openai",
        endpoint: "https://selected.example.invalid/v1",
      };
      await writeFile(definition, JSON.stringify(external));
      fixture.calls.length = 0;
      const blocked = await prepareDocumentAnalysis(fixture.root, run);
      expect(blocked.status).toBe("not-ready");
      expect(blocked.recovery).toContain("authorization");
      expect(fixture.calls.some((call) => call.args.includes("extract"))).toBe(false);
      for (const invalid of ["no", "false", { approved: false }]) {
        const result: unknown = await Reflect.apply(prepareDocumentAnalysis, undefined, [
          fixture.root,
          run,
          () => Promise.resolve(invalid),
        ]);
        expect(result).toMatchObject({ status: "not-ready" });
        expect(fixture.calls.some((call) => call.args.includes("extract"))).toBe(false);
      }
      const approvals: unknown[] = [];
      expect(
        (
          await prepareDocumentAnalysis(fixture.root, run, (request) => {
            approvals.push(request);
            return Promise.resolve(true);
          })
        ).status,
      ).toBe("prepared");
      expect(approvals).toEqual([
        {
          destination: external.endpoint,
          scope: external.scope,
          backend: external.backend,
          model: external.model,
          worktree: fixture.root,
        },
      ]);
      expect(
        fixture.calls.find((call) => call.args.includes("extract"))?.env?.OPENAI_BASE_URL,
      ).toBe(external.endpoint);
      expect(await readFile(path.join(fixture.root, "outside.md"), "utf8")).toBe(
        "Unselected document.\n",
      );
    } finally {
      if (prior === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prior;
      await fixture.dispose();
    }
  });
});
