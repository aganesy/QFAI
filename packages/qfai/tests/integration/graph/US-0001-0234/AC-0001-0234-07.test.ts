// QFAI:AC-0001-0234-07

import { link, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  documentAnalysisFixture,
  graphifyExtractionFixture,
} from "../../../helpers/graphAnalysis.js";
import { prepareDocumentAnalysis } from "../../../../src/core/graph/documents.js";
import { exploreGraph } from "../../../../src/core/graph/query.js";
import { installGraphEntrypoints } from "../../../../src/core/graph/entrypoints.js";

describe("AC-0001-0234-07", () => {
  it("excludes secret files and retains credential settings while passing only the selected credential to processing", async () => {
    const fixture = await documentAnalysisFixture();
    const prior = process.env.QFAI_TEST_SELECTED_KEY;
    const secret = "fixture-corpus-secret";
    const credential = "fixture-explicit-processing-credential";
    try {
      await writeFile(path.join(fixture.root, ".env"), secret);
      await writeFile(path.join(fixture.root, "private.key"), secret);
      await link(path.join(fixture.root, ".env"), path.join(fixture.root, "alias.ts"));
      const settings = JSON.stringify({
        mcpServers: { adopter: { command: "existing", env: { TOKEN: credential } } },
      });
      await writeFile(path.join(fixture.root, ".mcp.json"), settings);
      const entries = await installGraphEntrypoints(fixture.root);
      expect(entries.conflicts).toEqual([]);
      expect(entries.files).toContain(".qfai/tools/graph-cli.mjs");
      expect(JSON.stringify(entries)).not.toContain(credential);
      expect(await readFile(path.join(fixture.root, ".mcp.json"), "utf8")).toBe(settings);
      process.env.QFAI_TEST_SELECTED_KEY = credential;
      await writeFile(
        path.join(fixture.root, ".qfai", "graph-processing.json"),
        JSON.stringify({
          backend: "ollama",
          model: "selected-local-model",
          endpoint: "http://127.0.0.1:11434/v1",
          credentialEnv: "QFAI_TEST_SELECTED_KEY",
          scope: ["rationale.md"],
        }),
      );
      const prepared = await prepareDocumentAnalysis(
        fixture.root,
        graphifyExtractionFixture(fixture),
      );
      expect(prepared.status).toBe("prepared");
      const extract = fixture.calls.find((call) => call.args.includes("extract"));
      expect(extract?.env?.OLLAMA_API_KEY).toBe(credential);
      fixture.calls.length = 0;
      const answers = await Promise.all([
        exploreGraph(fixture.root, { domain: "code", question: "checkout" }, fixture.run),
        exploreGraph(fixture.root, { domain: "documents", question: "rationale" }, fixture.run),
      ]);
      expect(answers.every((answer) => answer.status === "answered")).toBe(true);
      expect(
        fixture.calls.every((call) => !Object.values(call.env ?? {}).includes(credential)),
      ).toBe(true);
      expect(JSON.stringify({ prepared, answers })).not.toContain(credential);
      for (const analysis of [fixture.analysis, fixture.documentAnalysis]) {
        for (const file of [".env", "private.key", "alias.ts"])
          await expect(readFile(path.join(analysis, file))).rejects.toMatchObject({
            code: "ENOENT",
          });
        const scan = async (directory: string): Promise<void> => {
          for (const entry of await readdir(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) await scan(file);
            else if (entry.isFile()) {
              const bytes = await readFile(file, "utf8");
              expect(bytes).not.toContain(secret);
              expect(bytes).not.toContain(credential);
            }
          }
        };
        await scan(analysis);
      }
      expect(await readFile(path.join(fixture.root, ".env"), "utf8")).toBe(secret);
      expect(await readFile(path.join(fixture.root, "private.key"), "utf8")).toBe(secret);
    } finally {
      if (prior === undefined) delete process.env.QFAI_TEST_SELECTED_KEY;
      else process.env.QFAI_TEST_SELECTED_KEY = prior;
      await fixture.dispose();
    }
  });
});
