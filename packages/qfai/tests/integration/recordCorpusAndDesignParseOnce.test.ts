/**
 * Integration: deliberation records stay out of the Graphify document corpus, and `verify` and
 * `full` report an unparseable root `DESIGN.md` once.
 */
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { exploreGraph } from "../../src/core/graph/query.js";
import { validateProject } from "../../src/core/validate.js";
import { documentAnalysisFixture } from "../helpers/graphAnalysis.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function put(root: string, file: string, content: string): Promise<void> {
  const target = path.join(root, ...file.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf-8");
}

describe("the Graphify document corpus", () => {
  // QFAI:EX-0001-0234-19
  it("holds no file under the deliberation directory, so no query result can name one", async () => {
    const fixture = await documentAnalysisFixture();
    try {
      const record = ".qfai/deliberation/20261112043225-pack-removal.md";
      await put(fixture.root, record, "# Deliberation record: the design rationale\n");
      await put(fixture.root, ".qfai/spec/decisions.md", "# Decisions\n");
      await exploreGraph(fixture.root, { domain: "documents", question: "rationale" }, fixture.run);
      await expect(
        readFile(path.join(fixture.documentAnalysis, ...record.split("/"))),
      ).rejects.toMatchObject({ code: "ENOENT" });
      expect(
        await readFile(
          path.join(fixture.documentAnalysis, ".qfai", "spec", "decisions.md"),
          "utf8",
        ),
      ).toBe("# Decisions\n");

      fixture.calls.length = 0;
      const run: typeof fixture.run = (command, args, options) =>
        args.at(-1) === "inventory" && args.some((arg) => arg.endsWith("graphify-native.py"))
          ? Promise.resolve({ exitCode: 0, stdout: JSON.stringify({ files: [record] }) })
          : fixture.run(command, args, options);
      const answer = await exploreGraph(
        fixture.root,
        { domain: "documents", question: "rationale" },
        run,
      );
      expect(answer.status).toBe("not-ready");
      expect(fixture.calls.some((call) => call.args.includes("query"))).toBe(false);
    } finally {
      await fixture.dispose();
    }
  });
});

describe("an unparseable root DESIGN.md", () => {
  async function project(withScreen: boolean): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-dcon033-once-"));
    roots.push(root);
    if (withScreen) {
      await put(
        root,
        ".qfai/spec/03_contract/ui/ui-0001-home.yaml",
        "# QFAI-CONTRACT-ID: UI-0001\nscreens:\n  - id: SCR-001\n    title: Home\n    route: /\n",
      );
    }
    await put(root, "DESIGN.md", "no front matter here\n");
    return root;
  }

  // QFAI:EX-0001-0042-16
  it("is reported once by verify and by full, with or without a UI contract", async () => {
    for (const withScreen of [true, false]) {
      const root = await project(withScreen);
      for (const profile of ["verify", "full"] as const) {
        const { issues } = await validateProject(root, await loadConfig(root), { profile });
        const label = `${profile}, UI contract: ${withScreen}`;
        expect(
          issues.filter((issue) => issue.code === "QFAI-DCON-033"),
          label,
        ).toHaveLength(1);
        const keys = issues.map(
          (issue) => `${issue.code}\u0000${issue.file}\u0000${issue.message}`,
        );
        expect(new Set(keys).size, label).toBe(keys.length);
      }
    }
  });
});
