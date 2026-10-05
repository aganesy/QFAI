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
    [
      `${spec}/02_business-flow/business-flows.md`,
      "| BF-ID | Path |\n| --- | --- |\n| BF-0001 | business-flow-0001/ |\n",
    ],
    [`${flow}/business-flow.md`, "# BF-0001: Develop and verify\n"],
    [
      `${flow}/user-stories.md`,
      "| US-ID | Path |\n| --- | --- |\n| US-0001-0001 | user-story-0001-0001/ |\n",
    ],
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
      "# CLI-0001: Check\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001-0001 | Check the project | EX-0001-0001-01 |\n",
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
  return {
    file,
    kind,
    content: `// ${annotation}\nit("sample", () => {});\n`,
    selectedForExample: true,
  };
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
  // QFAI:EX-0001-0005-02
  it("resolves a custom contract layer outside the spec root", () => {
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

  // QFAI:EX-0001-0005-04
  it("accepts exactly the three story files", async () => {
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

  // QFAI:EX-0001-0005-05
  it("names an extra notes file", async () => {
    await extra("notes.md", "file");
  });

  // QFAI:EX-0001-0005-06
  it("names an extra fixtures directory", async () => {
    await extra("fixtures", "directory");
  });

  // QFAI:EX-0001-0005-07
  it("names a missing example file", async () => {
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
  // QFAI:EX-0001-0051-03
  it("accepts one declaration of every story-tree ID shape", () => {
    const contents = files();
    contents.set(`${spec}/decisions.md`, table(["| DEC-0001 | Accepted choice | Reason | DONE |"]));
    contents.set(
      `${spec}/open-questions.md`,
      table(["| OQ-0001 | Resolved question | Answer | DONE |"]),
    );
    const model = buildStoryTreeModel(contents);
    expect(model.declarations.map((entry) => entry.id)).toEqual([
      "AC-0001-0001-01",
      "BF-0001",
      "BR-0001-0001",
      "DEC-0001",
      "EX-0001-0001-01",
      "OQ-0001",
      "US-0001-0001",
    ]);
    expect(
      validateStoryTreeStructureModel(model).filter((entry) => entry.code === "QFAI-STORY-002"),
    ).toEqual([]);
  });

  // QFAI:EX-0001-0008-02
  it("allocates the next story ID after a gap without reusing the gap", () => {
    expect(nextId("US", ["US-0001-0001", "US-0001-0003"], "BF-0001")).toBe("US-0001-0004");
  });

  // QFAI:EX-0001-0008-03
  it("treats flow and story IDs in indexes and policy prose as citations", () => {
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

  // QFAI:EX-0001-0051-03
  it("rejects an AC with a three-digit tail and names its file", () => {
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

  // QFAI:EX-0001-0051-04
  it("reports both files that declare one US ID", () => {
    const contents = files();
    contents.set(`${secondStory}/01_User-story.md`, "# US-0001-0001: Duplicate\n");
    const duplicates = findings(contents, "QFAI-STORY-002").filter((entry) =>
      entry.message.includes("defined more than once"),
    );
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.message).toContain(`${story}/01_User-story.md`);
    expect(duplicates[0]?.message).toContain(`${secondStory}/01_User-story.md`);
  });

  // QFAI:EX-0001-0008-05
  it("reports both contract files that declare one BR ID", () => {
    const contents = files();
    contents.delete(`${spec}/03_contract/cli/check.md`);
    const yaml = `${spec}/03_contract/api/orders.yaml`;
    const sql = `${spec}/03_contract/db/orders.sql`;
    contents.set(
      yaml,
      "x-qfai-rules:\n  - id: BR-0001-0001\n    statement: Check the order\n    examples: [EX-0001-0001-01]\n",
    );
    contents.set(
      sql,
      "-- Rule BR-0001-0001: Save the order\n-- Examples: EX-0001-0001-01\nSELECT 1;\n",
    );
    const duplicates = findings(contents, "QFAI-STORY-002").filter((entry) =>
      entry.message.includes("BR-0001-0001 is defined more than once"),
    );
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.message).toContain(yaml);
    expect(duplicates[0]?.message).toContain(sql);
  });

  // QFAI:EX-0001-0008-01
  // QFAI:EX-0001-0051-05
  it("accepts matching flow, story, AC and EX IDs", () => {
    expect(findings(files(), "QFAI-STORY-002")).toEqual([]);
  });

  // QFAI:EX-0001-0051-05
  it("rejects a story numbered for another flow", () => {
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

  // QFAI:EX-0001-0051-05
  it("rejects a story directory numbered differently from its ID", () => {
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

  // QFAI:EX-0001-0051-05
  it("rejects an EX numbered for another story and a flow directory named for another flow", () => {
    const contents = files();
    contents.set(
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0002-01 | AC-0001-0001-01 | project | passes |\n",
    );
    contents.set(`${flow}/business-flow.md`, "# BF-0003: Misplaced flow\n");
    expect(findings(contents, "QFAI-STORY-002")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${story}/03_Example.md`,
          message: expect.stringContaining("EX-0001-0002-01 disagrees"),
        }),
        expect.objectContaining({
          file: `${flow}/business-flow.md`,
          message: expect.stringContaining("BF-0003 disagrees"),
        }),
      ]),
    );
  });
});

describe("BF-0001 EX and BR reference examples", () => {
  // QFAI:EX-0001-0009-04
  it("reads a YAML rule with its statement and example", () => {
    const contents = files();
    contents.delete(`${spec}/03_contract/cli/check.md`);
    contents.set(
      `${spec}/03_contract/api/orders.yaml`,
      "# QFAI-CONTRACT-ID: API-0002\nx-qfai-rules:\n  - id: BR-0002-0001\n    statement: Check the order\n    examples: [EX-0001-0001-01]\n",
    );
    const model = buildStoryTreeModel(contents);
    expect(model.rules).toEqual([
      {
        id: "BR-0002-0001",
        statement: "Check the order",
        examples: ["EX-0001-0001-01"],
        file: `${spec}/03_contract/api/orders.yaml`,
      },
    ]);
    expect(findings(contents, "QFAI-STORY-005")).toEqual([]);
  });

  // QFAI:EX-0001-0009-05
  it("reads a SQL rule with its adjacent examples line", () => {
    const contents = files();
    contents.delete(`${spec}/03_contract/cli/check.md`);
    contents.set(
      `${spec}/03_contract/db/orders.sql`,
      "-- QFAI-CONTRACT-ID: DB-0003\n-- Rule BR-0003-0001: Save the order\n-- Examples: EX-0001-0001-01\nSELECT 1;\n",
    );
    expect(buildStoryTreeModel(contents).rules).toEqual([
      {
        id: "BR-0003-0001",
        statement: "Save the order",
        examples: ["EX-0001-0001-01"],
        file: `${spec}/03_contract/db/orders.sql`,
      },
    ]);
    expect(findings(contents, "QFAI-STORY-005")).toEqual([]);
  });

  // QFAI:EX-0001-0009-06
  it("reads a Markdown Business rules table with its statement and example", () => {
    const model = buildStoryTreeModel(files());
    expect(model.rules).toEqual([
      {
        id: "BR-0001-0001",
        statement: "Check the project",
        examples: ["EX-0001-0001-01"],
        file: `${spec}/03_contract/cli/check.md`,
      },
    ]);
    expect(findings(files(), "QFAI-STORY-005")).toEqual([]);
  });

  function invalidAcRef(acRef: string) {
    const issue = findings(files(acRef), "QFAI-STORY-004").find((entry) =>
      entry.refs?.includes("EX-0001-0001-01"),
    );
    expect(issue).toMatchObject({ file: `${story}/03_Example.md` });
    expect(issue?.message).toContain("EX-0001-0001-01");
  }

  // QFAI:EX-0001-0009-01
  // QFAI:EX-0001-0009-02
  // QFAI:EX-0001-0055-01
  it("accepts one existing same-story AC reference", () => {
    expect(findings(files(), "QFAI-STORY-004")).toEqual([]);
  });

  // QFAI:EX-0001-0055-01
  it("rejects an empty AC reference", () => {
    invalidAcRef("");
  });

  // QFAI:EX-0001-0055-01
  it("rejects two AC references", () => {
    invalidAcRef("AC-0001-0001-01, AC-0001-0001-02");
  });

  // QFAI:EX-0001-0055-02
  it("rejects an AC in another story", () => {
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

  // QFAI:EX-0001-0055-02
  it("rejects an undeclared AC", () => {
    invalidAcRef("AC-0001-0001-02");
  });

  // QFAI:EX-0001-0055-03
  it("names a criterion with no example", () => {
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

  // QFAI:EX-0001-0009-03
  it("accepts an EX cited by two rules", () => {
    const contents = files();
    contents.set(
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | first | passes |\n| EX-0001-0001-02 | AC-0001-0001-01 | second | passes |\n",
    );
    contents.set(
      `${spec}/03_contract/cli/check.md`,
      "# CLI-0001: Check\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001-0001 | First rule | EX-0001-0001-01, EX-0001-0001-02 |\n| BR-0001-0002 | Second rule | EX-0001-0001-01 |\n",
    );
    expect(findings(contents, "QFAI-STORY-005")).toEqual([]);
  });

  // QFAI:EX-0001-0055-05
  it("names a rule with no examples", () => {
    const contents = files();
    contents.set(
      `${spec}/03_contract/cli/check.md`,
      "# CLI-0001: Check\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001-0001 | No examples | |\n",
    );
    expect(findings(contents, "QFAI-STORY-005")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${spec}/03_contract/cli/check.md`,
          message: expect.stringContaining("BR-0001-0001 has no examples"),
        }),
      ]),
    );
    contents.delete(`${spec}/03_contract/cli/check.md`);
    const yaml = `${spec}/03_contract/api/orders.yaml`;
    const sql = `${spec}/03_contract/db/orders.sql`;
    contents.set(
      yaml,
      "# QFAI-CONTRACT-ID: API-0002\nx-qfai-rules:\n  - id: BR-0002-0001\n    statement: Empty\n    examples: []\n",
    );
    contents.set(
      sql,
      "-- QFAI-CONTRACT-ID: DB-0003\n-- Rule BR-0003-0001: No examples line\nSELECT 1;\n",
    );
    expect(findings(contents, "QFAI-STORY-005")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: yaml,
          message: expect.stringContaining("BR-0002-0001 has no examples"),
        }),
        expect.objectContaining({
          file: sql,
          message: expect.stringContaining("BR-0003-0001 has no examples"),
        }),
      ]),
    );
  });

  // QFAI:EX-0001-0055-07
  it("names an example no rule cites", () => {
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
    expect(
      findings(files(), "QFAI-STORY-005").some((entry) => entry.message.includes("is not cited")),
    ).toBe(false);
  });

  // QFAI:EX-0001-0055-06
  it("names an unknown example and the contract that cites it", () => {
    const contents = files();
    contents.set(
      `${spec}/03_contract/cli/check.md`,
      "# CLI-0001: Check\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001-0001 | Unknown example | EX-0001-0001-99 |\n",
    );
    expect(findings(contents, "QFAI-STORY-005")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${spec}/03_contract/cli/check.md`,
          message: expect.stringContaining("BR-0001-0001 cites unknown EX-0001-0001-99"),
        }),
      ]),
    );
  });
});

describe("BF-0001 decision and question examples", () => {
  // QFAI:EX-0001-0053-02
  it("rejects malformed supersession and a question-only status", () => {
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

  // QFAI:EX-0001-0053-03
  it("rejects a question ID declared in the decision table", () => {
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

  // QFAI:EX-0001-0053-04
  it("classifies test exceptions and change requests by status and references", () => {
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

  // QFAI:EX-0001-0053-05
  it("blocks an unadjudicated WIP question and releases it at DONE", () => {
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
    contents.set(
      `${spec}/open-questions.md`,
      table(["| OQ-0001 | Unadjudicated: choose layout | Deferred | DEFERRED |"]),
    );
    expect(findings(contents, "QFAI-SPACK-102")).toEqual([]);
  });
});

describe("BF-0001 layer and exception examples", () => {
  // QFAI:EX-0001-0056-01
  it("requires an E2E annotation for a business flow", () => {
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

  // QFAI:EX-0001-0056-02
  // QFAI:EX-0001-0069-01
  it("requires integration or API for AC coverage", () => {
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

  // QFAI:EX-0001-0056-03
  it("respects configured EX selection and does not credit an unselected annotation", () => {
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

  // QFAI:EX-0001-0056-04
  it("names BF and AC annotations in the wrong test layers", () => {
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

  // QFAI:EX-0001-0056-05
  it("names undeclared BF and EX annotations in both profiles", () => {
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

  // QFAI:EX-0001-0071-03
  it("names an undeclared AC annotation and accepts a defined EX annotation", () => {
    const model = buildStoryTreeModel(files());
    const tests = [
      testFile(
        "tests/integration/unknown.test.ts",
        "integration",
        annotation("AC", "0001-0001-99"),
      ),
      testFile("tests/unit/known.test.ts", null, annotation("EX", "0001-0001-01")),
    ];
    const undeclared = validateStoryTreeObligationsModel(model, tests, "atdd").filter(
      (entry) => entry.code === "QFAI-STORY-008",
    );
    expect(undeclared).toEqual([
      expect.objectContaining({ file: tests[0]?.file, refs: ["AC-0001-0001-99"] }),
    ]);
  });

  // QFAI:EX-0001-0056-06
  it("applies a DONE BF test exception without exempting its AC", () => {
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

  // QFAI:EX-0001-0056-06
  it("applies a DONE AC test exception without exempting its EX", () => {
    const contents = files();
    contents.set(
      `${spec}/decisions.md`,
      table(["| DEC-0001 | Test exception: AC-0001-0001-01 | No API environment | DONE |"]),
    );
    const model = buildStoryTreeModel(contents);
    const atdd = validateStoryTreeObligationsModel(model, [], "atdd");
    expect(
      atdd.some(
        (entry) => entry.code === "QFAI-STORY-006" && entry.refs?.includes("AC-0001-0001-01"),
      ),
    ).toBe(false);
    expect(validateStoryTreeObligationsModel(model, [], "tdd")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "QFAI-STORY-006", refs: ["EX-0001-0001-01"] }),
      ]),
    );
  });

  // QFAI:EX-0001-0056-07
  it("does not apply a test exception to a misspelled EX", () => {
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
