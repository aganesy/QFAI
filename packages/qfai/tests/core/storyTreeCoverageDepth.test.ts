import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveFlowScope } from "../../src/core/flowScope.js";
import { validateStoryTreeCoverageDepth } from "../../src/core/validators/storyTreeCoverageDepth.js";
import type { StoryTreeModel } from "../../src/core/storyTree/tree.js";

const MODEL: StoryTreeModel = {
  flows: [
    {
      id: "BF-0001",
      file: ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md",
      directory: ".qfai/spec/02_business-flow/business-flow-0001",
    },
  ],
  stories: [{ id: "US-0001-0001", flowId: "BF-0001", file: "story.md", directory: "story" }],
  acceptanceCriteria: [{ id: "AC-0001-0001-0001", storyId: "US-0001-0001", file: "ac.md" }],
  examples: [
    { id: "EX-0001-0001-0001", storyId: "US-0001-0001", acRef: "AC-0001-0001-0001", file: "ex.md" },
  ],
  rules: [],
  ruleRefs: [],
  declarations: [],
  decisions: null,
  decisionFile: null,
  openQuestions: null,
  openQuestionsFile: null,
  contractFiles: [],
  additionalContractFiles: [],
  errors: [],
};

const MATRIX = [
  "# Coverage Depth Matrix BF-0001",
  "",
  "BF-0001 E2E obligation: [flow test](../../tests/e2e/flow.test.ts).",
  "",
  "| ID | Layer | Normal | Error | Boundary | Special | State transition | Combinatorial | Oracle and test |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  "| US-0001-0001 | E2E | ✅ | N/A | N/A | N/A | N/A | N/A | test 1 |",
  "| AC-0001-0001-0001 | Integration | ✅ | N/A | N/A | N/A | N/A | N/A | test 2 |",
  "| EX-0001-0001-0001 | Unit | ❌ not yet tested | N/A | N/A | N/A | N/A | N/A | owner: implement |",
  "",
].join("\n");

const EVIDENCE = [
  "# ATDD BF-0001",
  "",
  "## Coverage Depth Matrix",
  "",
  "See `.qfai/evidence/coverage-depth-BF-0001.md`. Totals: ✅ 2 / ⚠️ 0 / ❌ 1.",
  "",
].join("\n");

describe("story-tree Coverage Depth Matrix", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-coverage-"));
    await mkdir(path.join(root, ".qfai", "evidence"), { recursive: true });
    await mkdir(path.join(root, "tests", "e2e"), { recursive: true });
    await writeFile(path.join(root, "tests", "e2e", "flow.test.ts"), "// QFAI:BF-0001\n");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function writeEvidence(matrix = MATRIX, evidence = EVIDENCE): Promise<void> {
    await writeFile(path.join(root, ".qfai", "evidence", "coverage-depth-BF-0001.md"), matrix);
    await writeFile(path.join(root, ".qfai", "evidence", "atdd-BF-0001.md"), evidence);
  }

  it("reports a missing BF matrix under QFAI-ATDD-131", async () => {
    const findings = await validateStoryTreeCoverageDepth(root, MODEL);
    expect(findings.map((finding) => finding.code)).toEqual(["QFAI-ATDD-131"]);
    expect(findings[0]?.refs).toEqual(["BF-0001"]);
  });

  it("accepts complete BF, US, AC and EX rows with matching ATDD totals", async () => {
    await writeEvidence();
    expect(await validateStoryTreeCoverageDepth(root, MODEL)).toEqual([]);
  });

  it("reports missing AC rows and totals that do not match the matrix", async () => {
    await writeEvidence(MATRIX.replace(/^\| AC-.*\n/m, ""));
    const findings = await validateStoryTreeCoverageDepth(root, MODEL);
    expect(findings.map((finding) => finding.code)).toContain("QFAI-ATDD-133");
    expect(findings[0]?.message).toContain("missing coverage row AC-0001-0001-0001");
    expect(findings[0]?.message).toContain("disagrees with matrix");
  });

  it("rejects a code span or missing E2E target in the BF header", async () => {
    await writeEvidence(
      MATRIX.replace("[flow test](../../tests/e2e/flow.test.ts)", "`../../tests/e2e/flow.test.ts`"),
    );
    expect((await validateStoryTreeCoverageDepth(root, MODEL))[0]?.message).toContain(
      "E2E obligation",
    );
    await writeEvidence(
      MATRIX.replace("../../tests/e2e/flow.test.ts", "../../tests/e2e/missing.test.ts"),
    );
    expect((await validateStoryTreeCoverageDepth(root, MODEL))[0]?.message).toContain(
      "E2E obligation",
    );
    await writeEvidence(MATRIX.replace("../../tests/e2e/flow.test.ts", "tests/e2e/flow.test.ts"));
    expect((await validateStoryTreeCoverageDepth(root, MODEL))[0]?.message).toContain(
      "E2E obligation",
    );
  });

  it("rejects a linked E2E test that belongs to another BF", async () => {
    await writeFile(path.join(root, "tests", "e2e", "flow.test.ts"), "// QFAI:BF-0002\n");
    await writeEvidence();
    expect((await validateStoryTreeCoverageDepth(root, MODEL))[0]?.message).toContain(
      "E2E obligation",
    );
  });

  it("accepts a matrix link into the configured external tests directory", async () => {
    const testsDir = await mkdtemp(path.join(os.tmpdir(), "qfai-shared-tests-"));
    try {
      await mkdir(path.join(testsDir, "e2e"));
      const externalTest = path.join(testsDir, "e2e", "flow.test.ts");
      await writeFile(externalTest, "// QFAI:BF-0001\n");
      const relative = path
        .relative(path.join(root, ".qfai", "evidence"), externalTest)
        .replace(/\\/g, "/");
      await writeEvidence(MATRIX.replace("../../tests/e2e/flow.test.ts", relative));
      expect((await validateStoryTreeCoverageDepth(root, MODEL))[0]?.message).toContain(
        "E2E obligation",
      );
      expect(await validateStoryTreeCoverageDepth(root, MODEL, undefined, testsDir)).toEqual([]);
    } finally {
      await rm(testsDir, { recursive: true, force: true });
    }
  });

  it("requires reasons for partial or missing coverage and an owner for gaps", async () => {
    const bare = MATRIX.replace("❌ not yet tested", "❌").replace("owner: implement", "test 3");
    await writeEvidence(bare);
    const message = (await validateStoryTreeCoverageDepth(root, MODEL))[0]?.message ?? "";
    expect(message).toContain("needs a reason");
    expect(message).toContain("needs an owner");
  });

  it("requires all three totals on one line", async () => {
    await writeEvidence(
      MATRIX,
      EVIDENCE.replace("Totals: ✅ 2 / ⚠️ 0 / ❌ 1.", "Totals: ✅ 2\n⚠️ 0\n❌ 1"),
    );
    expect((await validateStoryTreeCoverageDepth(root, MODEL))[0]?.message).toContain(
      "one ✅ N / ⚠️ N / ❌ N totals line",
    );
  });

  it("rejects an inline table and a missing matrix link in ATDD evidence", async () => {
    await writeEvidence(
      MATRIX,
      EVIDENCE.replace(
        "See `.qfai/evidence/coverage-depth-BF-0001.md`.",
        "| ID | Layer |\n| --- | --- |\n| BF-0001 | E2E |",
      ),
    );
    const findings = await validateStoryTreeCoverageDepth(root, MODEL);
    expect(findings[0]?.message).toContain("inlining its table");
    expect(findings[0]?.message).toContain("does not link");
  });

  it("reports ignored matrix and ATDD evidence until they are tracked", async () => {
    execFileSync("git", ["init", "-q"], { cwd: root });
    await writeFile(path.join(root, ".gitignore"), ".qfai/evidence/*.md\n");
    await writeEvidence();
    const findings = await validateStoryTreeCoverageDepth(root, MODEL);
    expect(findings.filter((finding) => finding.code === "QFAI-ATDD-132")).toHaveLength(2);
    execFileSync(
      "git",
      [
        "add",
        "-f",
        "--",
        ".qfai/evidence/coverage-depth-BF-0001.md",
        ".qfai/evidence/atdd-BF-0001.md",
      ],
      { cwd: root },
    );
    expect(await validateStoryTreeCoverageDepth(root, MODEL)).toEqual([]);
  });

  it("reports ATDD evidence alone when the matrix remains includable", async () => {
    execFileSync("git", ["init", "-q"], { cwd: root });
    await writeFile(path.join(root, ".gitignore"), ".qfai/evidence/atdd-BF-*.md\n");
    await writeEvidence();
    const findings = await validateStoryTreeCoverageDepth(root, MODEL);
    expect(findings.map((finding) => finding.code)).toEqual(["QFAI-ATDD-132"]);
    expect(findings[0]?.file).toBe(".qfai/evidence/atdd-BF-0001.md");
  });

  it("limits findings to the selected BF", async () => {
    const firstFlow = MODEL.flows[0];
    if (!firstFlow) throw new Error("test fixture has no flow");
    const second = {
      ...MODEL,
      flows: [...MODEL.flows, { ...firstFlow, id: "BF-0002" }],
    };
    await writeEvidence();
    const scope = resolveFlowScope(["BF-0001"], second);
    expect(await validateStoryTreeCoverageDepth(root, second, scope)).toEqual([]);
  });
});
