import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { nextId } from "../../src/core/storyTree/ids.js";
import { resolveStoryTreeRoots } from "../../src/core/storyTree/layout.js";
import { classifyRecordRow, parseRecordTable } from "../../src/core/storyTree/tables.js";
import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import {
  validateStoryDirectories,
  validateStoryTreeStructureModel,
} from "../../src/core/validators/storyTreeStructure.js";
import {
  validateStoryTreeObligationsModel,
  type StoryTestFile,
} from "../../src/core/validators/storyTreeObligations.js";

const roots: string[] = [];
const spec = ".qfai/spec";
const flow = `${spec}/02_business-flow/business-flow-0001`;
const story = `${flow}/user-story-0001-0001`;
const secondStory = `${flow}/user-story-0001-0002`;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function files(acRef = "AC-0001-0001-01"): Map<string, string> {
  return new Map([
    [`${flow}/business-flow.md`, "# BF-0001: Develop and verify\n"],
    [`${story}/01_User-story.md`, "# US-0001-0001: First story\n"],
    [
      `${story}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0001-01\nScenario: First criterion\n  Given a project\n  When it is checked\n  Then it passes\n```\n",
    ],
    [
      `${story}/03_Example.md`,
      `| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | ${acRef} | project | passes |\n`,
    ],
    [
      `${spec}/03_contract/cli/check.md`,
      "## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001 | Check the project | EX-0001-0001-01 |\n",
    ],
  ]);
}

function findings(contents: Map<string, string>, code: string) {
  return validateStoryTreeStructureModel(buildStoryTreeModel(contents)).filter(
    (entry) => entry.code === code,
  );
}

function table(rows: string[] = []): string {
  return ["| ID | Content | Approach | Status |", "| --- | --- | --- | --- |", ...rows, ""].join(
    "\n",
  );
}

function testFile(file: string, kind: StoryTestFile["kind"], annotation: string): StoryTestFile {
  return { file, kind, content: `// ${annotation}\n`, selectedForExample: true };
}

function annotation(kind: "BF" | "AC" | "EX", id: string): string {
  return `QFAI:${kind}-${id}`;
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

describe("BF-0001 story-directory examples", () => {
  it("resolves a custom contract layer outside the spec root", () => {
    // QFAI:EX-0001-0005-02
    const config = structuredClone(defaultConfig);
    config.paths.specsDir = ".qfai/spec";
    config.paths.contractsDir = "docs/contracts";
    const roots = resolveStoryTreeRoots("project", config);
    expect(roots.specsDir.replaceAll("\\", "/")).toMatch(/project\/\.qfai\/spec$/);
    expect(roots.contractsDir.replaceAll("\\", "/")).toMatch(/project\/docs\/contracts$/);
    expect(path.relative(roots.specsDir, roots.contractsDir).replaceAll("\\", "/")).not.toBe(
      "03_contract",
    );
  });

  it("accepts exactly the three story files", async () => {
    // QFAI:EX-0001-0005-04
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-story-"));
    roots.push(root);
    for (const [relative, content] of files()) {
      if (relative.startsWith(`${story}/`)) await put(root, relative, content);
    }
    expect((await readdir(path.join(root, story))).sort()).toEqual([
      "01_User-story.md",
      "02_Acceptance-Criteria.md",
      "03_Example.md",
    ]);
    expect(await validateStoryDirectories(path.join(root, spec))).toEqual([]);
  });

  async function extra(name: string, kind: "file" | "directory") {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-extra-"));
    roots.push(root);
    for (const [relative, content] of files()) {
      if (relative.startsWith(`${story}/`)) await put(root, relative, content);
    }
    if (kind === "file") await put(root, `${story}/${name}`, "extra");
    else await mkdir(path.join(root, story, name));
    const issues = await validateStoryDirectories(path.join(root, spec));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "QFAI-STORY-001", file: path.join(root, story) });
    expect(issues[0]?.message).toContain(name);
  }

  it("names an extra notes file", async () => {
    // QFAI:EX-0001-0005-05
    await extra("notes.md", "file");
  });

  it("names an extra fixtures directory", async () => {
    // QFAI:EX-0001-0005-06
    await extra("fixtures", "directory");
  });

  it("names a missing example file", async () => {
    // QFAI:EX-0001-0005-07
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-missing-"));
    roots.push(root);
    for (const [relative, content] of files()) {
      if (relative.startsWith(`${story}/`) && !relative.endsWith("03_Example.md")) {
        await put(root, relative, content);
      }
    }
    const issues = await validateStoryDirectories(path.join(root, spec));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "QFAI-STORY-001", file: path.join(root, story) });
    expect(issues[0]?.message).toContain("03_Example.md");
  });
});

describe("BF-0001 ID examples", () => {
  it("allocates the next story ID after a gap without reusing the gap", () => {
    // QFAI:EX-0001-0008-07
    expect(nextId("US", ["US-0001-0001", "US-0001-0003"], "BF-0001")).toBe("US-0001-0004");
  });

  it("treats flow and story IDs in indexes and policy prose as citations", () => {
    // QFAI:EX-0001-0008-08
    const contents = files();
    contents.set(
      `${spec}/02_business-flow/business-flows.md`,
      "| BF-ID | Path |\n| --- | --- |\n| BF-0001 | business-flow-0001/ |\n",
    );
    contents.set(
      `${spec}/01_policy/glossary.md`,
      "# Glossary\n\nUS-0001-0001 is the first story.\n",
    );
    const model = buildStoryTreeModel(contents);
    expect(model.declarations.filter((entry) => entry.id === "BF-0001")).toEqual([
      expect.objectContaining({ file: `${flow}/business-flow.md` }),
    ]);
    expect(model.declarations.filter((entry) => entry.id === "US-0001-0001")).toEqual([
      expect.objectContaining({ file: `${story}/01_User-story.md` }),
    ]);
    expect(findings(contents, "QFAI-STORY-002")).toEqual([]);
  });

  it("rejects an AC with a three-digit tail and names its file", () => {
    // QFAI:EX-0001-0008-02
    const contents = files();
    contents.set(
      `${story}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0001-001\nScenario: Malformed\n  Given a project\n```\n",
    );
    expect(findings(contents, "QFAI-STORY-002")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${story}/02_Acceptance-Criteria.md`,
          message: expect.stringContaining("AC-0001-0001-001"),
        }),
      ]),
    );
  });

  it("reports both files that declare one US ID", () => {
    // QFAI:EX-0001-0008-03
    const contents = files();
    contents.set(`${secondStory}/01_User-story.md`, "# US-0001-0001: Duplicate\n");
    const duplicates = findings(contents, "QFAI-STORY-002").filter((entry) =>
      entry.message.includes("defined more than once"),
    );
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.message).toContain(`${story}/01_User-story.md`);
    expect(duplicates[0]?.message).toContain(`${secondStory}/01_User-story.md`);
  });

  it("accepts matching flow, story, AC and EX IDs", () => {
    // QFAI:EX-0001-0008-04
    expect(findings(files(), "QFAI-STORY-002")).toEqual([]);
  });

  it("rejects a story numbered for another flow", () => {
    // QFAI:EX-0001-0008-05
    const contents = files();
    contents.set(`${story}/01_User-story.md`, "# US-0002-0001: Wrong flow\n");
    expect(findings(contents, "QFAI-STORY-002")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${story}/01_User-story.md`,
          message: expect.stringContaining("US-0002-0001"),
        }),
      ]),
    );
  });

  it("rejects a story directory numbered differently from its ID", () => {
    // QFAI:EX-0001-0008-06
    const contents = files();
    contents.set(
      `${secondStory}/01_User-story.md`,
      contents.get(`${story}/01_User-story.md`) ?? "",
    );
    contents.delete(`${story}/01_User-story.md`);
    expect(findings(contents, "QFAI-STORY-002")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${secondStory}/01_User-story.md`,
          message: expect.stringContaining("user-story-0001-0002"),
        }),
      ]),
    );
  });
});

describe("BF-0001 EX and BR reference examples", () => {
  it("reads a YAML rule with its statement and example", () => {
    // QFAI:EX-0001-0009-12
    const contents = files();
    contents.delete(`${spec}/03_contract/cli/check.md`);
    contents.set(
      `${spec}/03_contract/api/orders.yaml`,
      "x-qfai-rules:\n  - id: BR-0001\n    statement: Check the order\n    examples: [EX-0001-0001-01]\n",
    );
    const model = buildStoryTreeModel(contents);
    expect(model.rules).toEqual([
      {
        id: "BR-0001",
        statement: "Check the order",
        examples: ["EX-0001-0001-01"],
        file: `${spec}/03_contract/api/orders.yaml`,
      },
    ]);
    expect(findings(contents, "QFAI-STORY-005")).toEqual([]);
  });

  it("reads a SQL rule with its adjacent examples line", () => {
    // QFAI:EX-0001-0009-13
    const contents = files();
    contents.delete(`${spec}/03_contract/cli/check.md`);
    contents.set(
      `${spec}/03_contract/db/orders.sql`,
      "-- Rule BR-0001: Save the order\n-- Examples: EX-0001-0001-01\nSELECT 1;\n",
    );
    expect(buildStoryTreeModel(contents).rules).toEqual([
      {
        id: "BR-0001",
        statement: "Save the order",
        examples: ["EX-0001-0001-01"],
        file: `${spec}/03_contract/db/orders.sql`,
      },
    ]);
    expect(findings(contents, "QFAI-STORY-005")).toEqual([]);
  });

  it("reads a Markdown Rules table with its statement and example", () => {
    // QFAI:EX-0001-0009-14
    const model = buildStoryTreeModel(files());
    expect(model.rules).toEqual([
      {
        id: "BR-0001",
        statement: "Check the project",
        examples: ["EX-0001-0001-01"],
        file: `${spec}/03_contract/cli/check.md`,
      },
    ]);
    expect(findings(files(), "QFAI-STORY-005")).toEqual([]);
  });

  it("keeps a cross-contract rule reference separate from its declaration", () => {
    // QFAI:EX-0001-0009-15
    const contents = files();
    contents.set(
      `${spec}/03_contract/api/orders.json`,
      JSON.stringify({ "x-qfai-rule-refs": ["BR-0001"] }),
    );
    const model = buildStoryTreeModel(contents);
    expect(model.rules.filter((entry) => entry.id === "BR-0001")).toHaveLength(1);
    expect(model.ruleRefs).toEqual([
      { id: "BR-0001", file: `${spec}/03_contract/api/orders.json` },
    ]);
    expect(findings(contents, "QFAI-STORY-005")).toEqual([]);
  });

  it("reports an undefined SQL rule reference at its contract file", () => {
    // QFAI:EX-0001-0009-16
    const contents = files();
    contents.set(`${spec}/03_contract/db/orders.sql`, "-- Rule refs: BR-9999\nSELECT 1;\n");
    expect(findings(contents, "QFAI-STORY-005")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${spec}/03_contract/db/orders.sql`,
          message: expect.stringContaining("BR-9999 is not defined"),
        }),
      ]),
    );
  });

  function invalidAcRef(acRef: string) {
    const issue = findings(files(acRef), "QFAI-STORY-004").find((entry) =>
      entry.refs?.includes("EX-0001-0001-01"),
    );
    expect(issue).toMatchObject({ file: `${story}/03_Example.md` });
    expect(issue?.message).toContain("EX-0001-0001-01");
  }

  it("accepts one existing same-story AC reference", () => {
    // QFAI:EX-0001-0009-01
    // QFAI:EX-0001-0009-06
    expect(findings(files(), "QFAI-STORY-004")).toEqual([]);
  });

  it("rejects an empty AC reference", () => {
    // QFAI:EX-0001-0009-02
    invalidAcRef("");
  });

  it("rejects two AC references", () => {
    // QFAI:EX-0001-0009-03
    invalidAcRef("AC-0001-0001-01, AC-0001-0001-02");
  });

  it("rejects an AC in another story", () => {
    // QFAI:EX-0001-0009-04
    const contents = files("AC-0001-0002-01");
    contents.set(
      `${secondStory}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0002-01\nScenario: Other story\n  Given a project\n```\n",
    );
    const issue = findings(contents, "QFAI-STORY-004").find((entry) =>
      entry.refs?.includes("EX-0001-0001-01"),
    );
    expect(issue).toMatchObject({ file: `${story}/03_Example.md` });
    expect(issue?.message).toContain("EX-0001-0001-01");
  });

  it("rejects an undeclared AC", () => {
    // QFAI:EX-0001-0009-05
    invalidAcRef("AC-0001-0001-02");
  });

  it("names a criterion with no example", () => {
    // QFAI:EX-0001-0009-07
    const contents = files();
    contents.set(
      `${story}/02_Acceptance-Criteria.md`,
      `${contents.get(`${story}/02_Acceptance-Criteria.md`) ?? ""}\n\`\`\`gherkin\n# AC-0001-0001-02\nScenario: Uncovered\n  Given a project\n\`\`\`\n`,
    );
    expect(findings(contents, "QFAI-STORY-004")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${story}/02_Acceptance-Criteria.md`,
          message: expect.stringContaining("AC-0001-0001-02 has no example"),
        }),
      ]),
    );
  });

  it("accepts an EX cited by two rules", () => {
    // QFAI:EX-0001-0009-08
    const contents = files();
    contents.set(
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | first | passes |\n| EX-0001-0001-02 | AC-0001-0001-01 | second | passes |\n",
    );
    contents.set(
      `${spec}/03_contract/cli/check.md`,
      "## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001 | First rule | EX-0001-0001-01, EX-0001-0001-02 |\n| BR-0002 | Second rule | EX-0001-0001-01 |\n",
    );
    expect(findings(contents, "QFAI-STORY-005")).toEqual([]);
  });

  it("names a rule with no examples", () => {
    // QFAI:EX-0001-0009-09
    const contents = files();
    contents.set(
      `${spec}/03_contract/cli/check.md`,
      "## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001 | No examples | |\n",
    );
    expect(findings(contents, "QFAI-STORY-005")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${spec}/03_contract/cli/check.md`,
          message: expect.stringContaining("BR-0001 has no examples"),
        }),
      ]),
    );
  });

  it("names an example no rule cites", () => {
    // QFAI:EX-0001-0009-10
    const contents = files();
    contents.delete(`${spec}/03_contract/cli/check.md`);
    expect(findings(contents, "QFAI-STORY-005")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${story}/03_Example.md`,
          message: expect.stringContaining("EX-0001-0001-01 is not cited"),
        }),
      ]),
    );
  });

  it("names an unknown example and the contract that cites it", () => {
    // QFAI:EX-0001-0009-11
    const contents = files();
    contents.set(
      `${spec}/03_contract/cli/check.md`,
      "## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001 | Unknown example | EX-0001-0001-99 |\n",
    );
    expect(findings(contents, "QFAI-STORY-005")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${spec}/03_contract/cli/check.md`,
          message: expect.stringContaining("BR-0001 cites unknown EX-0001-0001-99"),
        }),
      ]),
    );
  });
});

describe("BF-0001 decision and question examples", () => {
  it("rejects malformed supersession and a question-only status", () => {
    // QFAI:EX-0001-0055-02
    const contents = files();
    contents.set(
      `${spec}/decisions.md`,
      table(["| DEC-0001 | First decision | Reason | SUPERSEDED by DEC-0002 |"]),
    );
    contents.set(
      `${spec}/open-questions.md`,
      table(["| OQ-0001 | Open question | Reason | REJECTED |"]),
    );
    const issues = findings(contents, "QFAI-STORY-003");
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${spec}/decisions.md`,
          message: expect.stringContaining("DEC-0001"),
        }),
        expect.objectContaining({
          file: `${spec}/open-questions.md`,
          message: expect.stringContaining("OQ-0001"),
        }),
      ]),
    );
    contents.set(
      `${spec}/decisions.md`,
      table(["| DEC-0001 | First decision | Reason | SUPERSEDED (by DEC-0002) |"]),
    );
    expect(
      findings(contents, "QFAI-STORY-003").some((entry) => entry.file === `${spec}/decisions.md`),
    ).toBe(false);
  });

  it("rejects a question ID declared in the decision table", () => {
    // QFAI:EX-0001-0055-03
    const contents = files();
    contents.set(`${spec}/decisions.md`, table(["| OQ-0001 | Wrong ID kind | Reason | TODO |"]));
    expect(findings(contents, "QFAI-STORY-003")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${spec}/decisions.md`,
          message: expect.stringContaining("OQ-0001"),
        }),
      ]),
    );
  });

  it("classifies test exceptions and change requests by status and references", () => {
    // QFAI:EX-0001-0055-04
    const rows = parseRecordTable(
      table([
        "| DEC-0001 | Test exception: EX-0001-0001-01, AC-0001-0001-01 | Reason | DONE |",
        "| DEC-0002 | Change request: 01_policy/glossary.md | Reason | TODO |",
      ]),
      "decisions",
    ).rows;
    expect(rows).toHaveLength(2);
    const [exception, change] = rows;
    if (!exception || !change) throw new Error("Expected both decision rows");
    expect(classifyRecordRow(exception)).toMatchObject({
      kind: "test-exception",
      refs: ["EX-0001-0001-01", "AC-0001-0001-01"],
      inForce: true,
    });
    expect(classifyRecordRow(change)).toMatchObject({
      kind: "change-request",
      refs: ["01_policy/glossary.md"],
      inForce: false,
    });
  });

  it("blocks an unadjudicated WIP question and releases it at DONE", () => {
    // QFAI:EX-0001-0055-05
    const contents = files();
    contents.set(
      `${spec}/open-questions.md`,
      table(["| OQ-0001 | Unadjudicated: choose layout | Pending answer | WIP |"]),
    );
    const pending = findings(contents, "QFAI-SPACK-102");
    expect(pending).toEqual([
      expect.objectContaining({
        file: `${spec}/open-questions.md`,
        severity: "error",
        message: expect.stringContaining("OQ-0001"),
      }),
    ]);
    contents.set(
      `${spec}/open-questions.md`,
      table(["| OQ-0001 | Unadjudicated: choose layout | Settled | DONE |"]),
    );
    expect(findings(contents, "QFAI-SPACK-102")).toEqual([]);
  });
});

describe("BF-0001 layer and exception examples", () => {
  it("requires an E2E annotation for a business flow", () => {
    // QFAI:EX-0001-0058-01
    const model = buildStoryTreeModel(files());
    const integration = testFile(
      "tests/integration/flow.test.ts",
      "integration",
      annotation("BF", "0001"),
    );
    const uncovered = validateStoryTreeObligationsModel(model, [integration], "atdd");
    expect(uncovered).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "QFAI-STORY-006",
          file: `${flow}/business-flow.md`,
          refs: ["BF-0001"],
        }),
      ]),
    );
    const e2e = testFile("tests/e2e/flow.test.ts", "e2e", annotation("BF", "0001"));
    expect(
      validateStoryTreeObligationsModel(model, [integration, e2e], "atdd").some(
        (entry) => entry.code === "QFAI-STORY-006" && entry.refs?.includes("BF-0001"),
      ),
    ).toBe(false);
  });

  it("requires integration or API for AC coverage", () => {
    // QFAI:EX-0001-0058-02
    const contents = files();
    contents.set(
      `${story}/02_Acceptance-Criteria.md`,
      `${contents.get(`${story}/02_Acceptance-Criteria.md`) ?? ""}\n\`\`\`gherkin\n# AC-0001-0001-02\nScenario: Second criterion\n  Given a project\n\`\`\`\n`,
    );
    const model = buildStoryTreeModel(contents);
    const tests = [
      testFile("tests/e2e/criterion.test.ts", "e2e", annotation("AC", "0001-0001-01")),
      testFile("tests/api/criterion.test.ts", "api", annotation("AC", "0001-0001-02")),
    ];
    const issues = validateStoryTreeObligationsModel(model, tests, "atdd");
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "QFAI-STORY-006",
          file: `${story}/02_Acceptance-Criteria.md`,
          refs: ["AC-0001-0001-01"],
        }),
      ]),
    );
    expect(
      issues.some(
        (entry) => entry.code === "QFAI-STORY-006" && entry.refs?.includes("AC-0001-0001-02"),
      ),
    ).toBe(false);
  });

  it("respects configured EX selection and does not credit an unselected annotation", () => {
    // QFAI:EX-0001-0058-03
    const contents = files();
    contents.set(
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | first | passes |\n| EX-0001-0001-02 | AC-0001-0001-01 | second | passes |\n",
    );
    const model = buildStoryTreeModel(contents);
    const unselected = testFile(
      "tests/unit/unselected.test.ts",
      null,
      annotation("EX", "0001-0001-01"),
    );
    unselected.selectedForExample = false;
    const selected = testFile(
      "tests/unit/selected.test.ts",
      null,
      annotation("EX", "0001-0001-02"),
    );
    const issues = validateStoryTreeObligationsModel(model, [unselected, selected], "tdd");
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "QFAI-STORY-006",
          file: `${story}/03_Example.md`,
          refs: ["EX-0001-0001-01"],
        }),
      ]),
    );
    expect(
      issues.some(
        (entry) => entry.code === "QFAI-STORY-006" && entry.refs?.includes("EX-0001-0001-02"),
      ),
    ).toBe(false);
  });

  it("names BF and AC annotations in the wrong test layers", () => {
    // QFAI:EX-0001-0058-04
    const model = buildStoryTreeModel(files());
    const tests = [
      testFile("tests/integration/flow.test.ts", "integration", annotation("BF", "0001")),
      testFile("tests/unit/criterion.test.ts", null, annotation("AC", "0001-0001-01")),
    ];
    const issues = validateStoryTreeObligationsModel(model, tests, "atdd");
    for (const file of tests.map((entry) => entry.file)) {
      expect(issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: "QFAI-STORY-007", file })]),
      );
    }
  });

  it("names undeclared BF and EX annotations in both profiles", () => {
    // QFAI:EX-0001-0058-05
    const model = buildStoryTreeModel(files());
    const tests = [
      testFile("tests/e2e/unknown-flow.test.ts", "e2e", annotation("BF", "9999")),
      testFile("tests/unit/unknown-example.test.ts", null, annotation("EX", "0001-0001-99")),
    ];
    for (const profile of ["atdd", "tdd"] as const) {
      const issues = validateStoryTreeObligationsModel(model, tests, profile);
      expect(issues.filter((entry) => entry.code === "QFAI-STORY-008")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ file: tests[0]?.file, refs: ["BF-9999"] }),
          expect.objectContaining({ file: tests[1]?.file, refs: ["EX-0001-0001-99"] }),
        ]),
      );
    }
  });

  it("applies a DONE BF test exception without exempting its AC", () => {
    // QFAI:EX-0001-0058-06
    const contents = files();
    contents.set(
      `${spec}/decisions.md`,
      table(["| DEC-0001 | Test exception: BF-0001 | No E2E environment | DONE |"]),
    );
    const done = validateStoryTreeObligationsModel(buildStoryTreeModel(contents), [], "atdd");
    expect(done).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "QFAI-STORY-009", refs: ["BF-0001", "DEC-0001"] }),
        expect.objectContaining({ code: "QFAI-STORY-006", refs: ["AC-0001-0001-01"] }),
      ]),
    );
    expect(
      done.some((entry) => entry.code === "QFAI-STORY-006" && entry.refs?.includes("BF-0001")),
    ).toBe(false);
    contents.set(
      `${spec}/decisions.md`,
      table(["| DEC-0001 | Test exception: BF-0001 | No E2E environment | WIP |"]),
    );
    expect(validateStoryTreeObligationsModel(buildStoryTreeModel(contents), [], "atdd")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "QFAI-STORY-006", refs: ["BF-0001"] }),
      ]),
    );
  });

  it("does not apply a test exception to a misspelled EX", () => {
    // QFAI:EX-0001-0058-07
    const contents = files();
    contents.set(
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | first | passes |\n| EX-0001-0001-02 | AC-0001-0001-01 | second | passes |\n",
    );
    contents.set(
      `${spec}/decisions.md`,
      table([
        "| DEC-0001 | Test exception: EX-0001-0001-01, EX-0001-0001-03 | No test yet | DONE |",
      ]),
    );
    const issues = validateStoryTreeObligationsModel(buildStoryTreeModel(contents), [], "tdd");
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "QFAI-STORY-009",
          severity: "info",
          refs: ["EX-0001-0001-01", "DEC-0001"],
        }),
        expect.objectContaining({ code: "QFAI-STORY-006", refs: ["EX-0001-0001-02"] }),
      ]),
    );
    expect(issues.some((entry) => entry.refs?.includes("EX-0001-0001-03"))).toBe(false);
    expect(
      issues.some(
        (entry) => entry.code === "QFAI-STORY-006" && entry.refs?.includes("EX-0001-0001-01"),
      ),
    ).toBe(false);
  });
});
