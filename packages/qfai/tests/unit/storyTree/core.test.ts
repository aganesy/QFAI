import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { resolveFlowScope } from "../../../src/core/flowScope.js";
import { parseContractRules } from "../../../src/core/storyTree/contractRules.js";
import {
  isStoryTreeId,
  isTimestampRecordId,
  nextId,
  parseStoryTestAnnotations,
  storyIdMatchesFlow,
} from "../../../src/core/storyTree/ids.js";
import {
  CONTRACT_KIND_DIRS,
  CONTRACT_LAYER_FILES,
  POLICY_FILES,
  STORY_FILES,
  STORY_TREE_ROOT_ENTRIES,
  storyPaths,
  hasLegacySpecPackEntries,
  hasStoryTreeEntries,
  resolveStoryTreeRoots,
  storyTreeMarkdownPatterns,
} from "../../../src/core/storyTree/layout.js";
import {
  classifyRecordRow,
  diffRecordTables,
  parseRecordTable,
} from "../../../src/core/storyTree/tables.js";
import {
  buildStoryTreeModel as buildModel,
  nextStoryTreeId,
  type StoryTreeModelOptions,
} from "../../../src/core/storyTree/tree.js";

function buildStoryTreeModel(
  files: ReadonlyMap<string, string>,
  options: StoryTreeModelOptions = {},
) {
  const complete = new Map(files);
  for (const [file, text] of complete) {
    if (file.endsWith("/decisions.md") && text.startsWith("|"))
      complete.set(file, "# Decisions\n\n## Decisions\n\n" + text);
  }
  return buildModel(complete, options);
}

const storyFiles = new Map([
  [".qfai/spec/02_business-flow/business-flow-0001/business-flow.md", "# BF-0001: Checkout\n"],
  [
    ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md",
    "# US-0001-0001: Buy\n",
  ],
  [
    ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/02_Acceptance-Criteria.md",
    "```gherkin\n# AC-0001-0001-01\nGiven a cart\n```\n",
  ],
  [
    ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md",
    "| EX-ID | AC-Ref | Given | When | Then |\n| --- | --- | --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | Cart | Buy | Paid |\n",
  ],
  [
    ".qfai/spec/03_contract/api/pay.yaml",
    "# QFAI-CONTRACT-ID: API-0001\nx-qfai-rules:\n  - id: BR-0001-0001\n    statement: Payment succeeds\n    examples: [EX-0001-0001-01]\n",
  ],
]);

describe("story-tree core", () => {
  it("declares fixed story files and resolves paths under configured roots", () => {
    expect(STORY_TREE_ROOT_ENTRIES).toEqual([
      "decisions.md",
      "open-questions.md",
      "01_policy",
      "02_business-flow",
    ]);
    expect(POLICY_FILES).toEqual([
      "objective.md",
      "initiative.md",
      "principle.md",
      "glossary.md",
      "constraint.md",
    ]);
    expect(CONTRACT_LAYER_FILES).toEqual(["contracts.md", "tech.md"]);
    expect(CONTRACT_KIND_DIRS).toEqual(["api", "db", "ui", "cli"]);
    expect(STORY_TREE_ROOT_ENTRIES).not.toContain(".qfai/decisions");
    expect(STORY_FILES).not.toContain("01_Spec-retired.md");
    expect(STORY_FILES).toEqual(["01_User-story.md", "02_Acceptance-Criteria.md", "03_Example.md"]);
    expect(storyPaths("docs/spec", "BF-0001", "US-0001-0001").storyDir).toBe(
      "docs/spec/02_business-flow/business-flow-0001/user-story-0001-0001",
    );
    expect(() => storyPaths("docs/spec", "BF-0001", "US-0002-0001")).toThrow(TypeError);
    expect(hasLegacySpecPackEntries(["01_policy", "02_business-flow"])).toBe(false);
    expect(hasLegacySpecPackEntries(["spec-0001"])).toBe(true);
    expect(hasLegacySpecPackEntries(["_policies"])).toBe(true);
    expect(hasStoryTreeEntries(["01_policy"])).toBe(true);
    expect(storyTreeMarkdownPatterns("docs/spec", "docs/contracts")).toHaveLength(16);
    expect(storyTreeMarkdownPatterns("docs/spec", "docs/contracts")).toContain(
      "docs/spec/decisions/page-????.md",
    );
    expect(storyTreeMarkdownPatterns("docs/spec", "docs/contracts")).toContain(
      "docs/contracts/contracts.md",
    );
    const config = {
      ...defaultConfig,
      paths: { ...defaultConfig.paths, specsDir: ".qfai/spec", contractsDir: "docs/contracts" },
    };
    expect(resolveStoryTreeRoots("project", config).contractsDir.replace(/\\/g, "/")).toMatch(
      /project\/docs\/contracts$/,
    );
    expect(storyTreeMarkdownPatterns("docs/spec", "docs/contracts")).toContain(
      "docs/spec/02_business-flow/business-flow-*/user-stories.md",
    );
  });

  // QFAI:EX-0001-0008-06
  it("counts only the parent flow's stories when allocating a story ID", () => {
    expect(
      nextId("US", ["US-0001-0001", "US-0001-0002", "US-0001-0003", "US-0002-0007"], "BF-0001"),
    ).toBe("US-0001-0004");
  });

  it("checks exact shapes, parent prefixes, and never fills an ID gap", () => {
    const marker = "QFAI:";
    expect(isStoryTreeId("AC-0001-0002-01", "AC")).toBe(true);
    expect(isStoryTreeId("AC-0001-0002-1", "AC")).toBe(false);
    expect(storyIdMatchesFlow("US-0001-0002", "BF-0001")).toBe(true);
    expect(storyIdMatchesFlow("US-0002-0001", "BF-0001")).toBe(false);
    expect(nextId("AC", ["AC-0001-0001-01", "AC-0001-0001-03"], "US-0001-0001")).toBe(
      "AC-0001-0001-04",
    );
    expect(() => nextId("DEC", ["DEC-0001", "DEC-0003"])).toThrow(TypeError);
    expect(() => nextId("OQ", [])).toThrow(/OQ-yyyymmddhhMMss/u);
    expect(nextId("US", ["US-0001-0001", "US-0001-0003"], "BF-0001")).toBe("US-0001-0004");
    expect(
      nextId("US", ["US-0001-0001", "US-0001-0002", "US-0001-0003", "US-0001-0004"], "BF-0001"),
    ).toBe("US-0001-0005");
    expect(() => nextId("EX", ["EX-0001-0001-99"], "US-0001-0001")).toThrow(RangeError);
    expect(() => nextId("US", [], "BF-1")).toThrow(TypeError);
    expect(
      parseStoryTestAnnotations(
        `${marker}BF-0001 ${marker}BF-0001-0002 ${marker}AC-0001-0001-01 ${marker}EX-0001-0001-01`,
      ),
    ).toEqual({
      BF: ["BF-0001"],
      AC: ["AC-0001-0001-01"],
      EX: ["EX-0001-0001-01"],
    });
  });

  // QFAI:EX-0001-0147-08
  it("keeps AC and EX allocation scoped and two-digit at the upper boundary", () => {
    for (const kind of ["AC", "EX"] as const) {
      expect(nextId(kind, [], "US-0001-0001")).toBe(`${kind}-0001-0001-01`);
      expect(nextId(kind, [`${kind}-0001-0001-89`, `${kind}-0001-0002-99`], "US-0001-0001")).toBe(
        `${kind}-0001-0001-90`,
      );
      expect(nextId(kind, [`${kind}-0001-0001-98`], "US-0001-0001")).toBe(`${kind}-0001-0001-99`);
      expect(() => nextId(kind, [`${kind}-0001-0001-99`], "US-0001-0001")).toThrow(RangeError);
    }
  });

  // QFAI:EX-0001-0008-25
  it("reports the exhausted EX scope reserved by a retired decision without reusing a gap", () => {
    const files = new Map(storyFiles);
    files.set(
      ".qfai/spec/decisions.md",
      "| ID | Content | Approach |\n| --- | --- | --- |\n| DEC-0001 | Retired EX-0001-0001-99 | Keep the original case's ID reserved |\n",
    );
    const model = buildStoryTreeModel(files);
    expect(model.examples.map(({ id }) => id)).toEqual(["EX-0001-0001-01"]);
    const allocate = (): string => nextStoryTreeId(model, "EX", "US-0001-0001");
    expect(allocate).toThrow(RangeError);
    expect(allocate).toThrow(/EX ID space is exhausted under US-0001-0001/u);
    expect(allocate).toThrow(/upper bound 99.*remaining 0/u);
    expect(allocate).toThrow(/sdd-triage\.md#capacity-partition/u);
    expect(model.examples.map(({ id }) => id)).toEqual(["EX-0001-0001-01"]);
    expect(files.get(".qfai/spec/decisions.md")).toContain("Retired EX-0001-0001-99");
  });

  it("names AC exhaustion separately from another story's remaining EX capacity", () => {
    const names = ["AC-0001-0001-99", "EX-0001-0002-99"];
    const allocate = (): string => nextId("AC", names, "US-0001-0001");
    expect(allocate).toThrow(RangeError);
    expect(allocate).toThrow(/AC ID space is exhausted under US-0001-0001/u);
    expect(allocate).toThrow(/upper bound 99.*remaining 0/u);
    expect(allocate).toThrow(/sdd-triage\.md#capacity-partition/u);
    expect(nextId("EX", names, "US-0001-0001")).toBe("EX-0001-0001-01");
    expect(names).toEqual(["AC-0001-0001-99", "EX-0001-0002-99"]);
  });

  // QFAI:EX-0001-0008-04
  it("reserves IDs named by decision rows of either ID form when allocating a story ID", () => {
    const files = new Map(storyFiles);
    files.set(
      ".qfai/spec/decisions.md",
      "| ID | Content | Approach |\n| --- | --- | --- |\n| DEC-0001 | Retired US-0001-0004 | Keep its ID reserved |\n| DEC-20261105093000 | Retired US-0001-0007 | Keep its ID reserved |\n",
    );
    const tree = buildStoryTreeModel(files);
    expect(nextStoryTreeId(tree, "US", "BF-0001")).toBe("US-0001-0008");
    expect(() => nextStoryTreeId(tree, "DEC")).toThrow(TypeError);
  });

  it("reads every declaration from the declaring file, not index citations", () => {
    const model = buildStoryTreeModel(storyFiles);
    expect(model.flows.map((flow) => flow.id)).toEqual(["BF-0001"]);
    expect(model.stories.map((story) => story.id)).toEqual(["US-0001-0001"]);
    expect(model.acceptanceCriteria.map((criterion) => criterion.id)).toEqual(["AC-0001-0001-01"]);
    expect(model.examples.map((example) => [example.id, example.acRef])).toEqual([
      ["EX-0001-0001-01", "AC-0001-0001-01"],
    ]);
    expect(model.rules.map((rule) => [rule.id, rule.examples])).toEqual([
      ["BR-0001-0001", ["EX-0001-0001-01"]],
    ]);
  });

  it("reads rules from the contract layer's tech file", () => {
    const files = new Map(storyFiles);
    files.delete(".qfai/spec/03_contract/api/pay.yaml");
    files.set(
      ".qfai/spec/03_contract/tech.md",
      "# Tech\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001-0002 | The CLI runs | EX-0001-0001-01 |\n",
    );

    const model = buildStoryTreeModel(files);
    expect(model.rules.map((rule) => rule.id)).toEqual(["BR-0001-0002"]);
  });

  it("retains malformed declarations so the validator can report their source", () => {
    const files = new Map(storyFiles);
    files.set(".qfai/spec/02_business-flow/business-flow-0001/business-flow.md", "# BF-1: Bad\n");
    files.set(
      ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/02_Acceptance-Criteria.md",
      "```gherkin\n# AC-0001-0001-1\nGiven a cart\n```\n",
    );
    const model = buildStoryTreeModel(files);
    expect(model.flows[0]?.id).toBe("BF-1");
    expect(model.acceptanceCriteria[0]?.id).toBe("AC-0001-0001-1");
  });

  it("reads YAML, SQL, and Markdown rule declarations", () => {
    expect(
      parseContractRules(
        "a.yaml",
        "x-qfai-rules:\n  - id: BR-0001-0001\n    statement: Pay\n    examples: [EX-0001-0001-01]\n",
      ).rules.map((rule) => rule.id),
    ).toEqual(["BR-0001-0001"]);
    expect(
      parseContractRules("a.sql", "-- Rule BR-0001-0002: Save\n-- Examples: EX-0001-0001-01\n")
        .rules,
    ).toEqual([
      { id: "BR-0001-0002", statement: "Save", examples: ["EX-0001-0001-01"], file: "a.sql" },
    ]);
    expect(
      parseContractRules(
        "a.md",
        "## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001-0003 | Show | EX-0001-0001-01 |\n",
      ),
    ).toMatchObject({
      rules: [{ id: "BR-0001-0003", statement: "Show", examples: ["EX-0001-0001-01"] }],
    });
    expect(
      parseContractRules(
        "a.json",
        JSON.stringify({
          "x-qfai-rules": [
            { id: "BR-0001-0004", statement: "Keep", examples: ["EX-0001-0001-01"] },
          ],
        }),
      ).rules.map((rule) => rule.id),
    ).toEqual(["BR-0001-0004"]);
    expect(
      parseContractRules("a.sql", "-- Rule BR-0001-0005: Missing examples\nSELECT 1;\n").rules[0]
        ?.examples,
    ).toEqual([]);
    expect(parseContractRules("a.md", "## Business rules\n\nNo table.\n").errors).not.toEqual([]);
  });

  // QFAI:EX-0001-0007-11
  it("matches a base row by its ID when a new row sits above it", () => {
    const header = "| ID | Content | Approach |\n| --- | --- | --- |\n";
    const base = `${header}| DEC-0001 | First | Keep |\n`;
    const head = `${header}| DEC-20261105093000 | Inserted | Keep |\n| DEC-0001 | First | Keep |\n`;
    expect(diffRecordTables(base, head, "decisions")).toMatchObject({
      removed: [],
      changed: [],
      added: [{ id: "DEC-20261105093000" }],
    });
  });

  // QFAI:EX-0001-0147-06
  it("keeps a replaced decision and replaces a deferred question by appending new rows", () => {
    const header = "| ID | Content | Approach |\n| --- | --- | --- |\n";
    const decisionBase = `${header}| DEC-0007 | Choice | Reason |\n`;
    const decisionHead = `${decisionBase}| DEC-20261105093000 | Newer choice | Supersedes DEC-0007 |\n`;
    const decisions = diffRecordTables(decisionBase, decisionHead, "decisions");
    expect(decisions.changed).toEqual([]);
    expect(decisions.removed).toEqual([]);
    expect(decisions.added.map((row) => row.id)).toEqual(["DEC-20261105093000"]);
    expect(parseRecordTable(decisionHead, "decisions").errors).toEqual([]);

    const questionBase = `${header}| OQ-0012 | Which layout | Pending |\n`;
    const questionHead = `${header}| OQ-20261105093000 | Which layout | Replaces OQ-0012; next release |\n`;
    const questions = diffRecordTables(questionBase, questionHead, "open-questions");
    expect(questions.changed).toEqual([]);
    expect(questions.removed.map((row) => row.id)).toEqual(["OQ-0012"]);
    expect(questions.added.map((row) => row.id)).toEqual(["OQ-20261105093000"]);
    expect(parseRecordTable(questionHead, "open-questions").errors).toEqual([]);
  });

  // QFAI:EX-0001-0007-03
  it("accepts both record ID forms in each table", () => {
    const header = "| ID | Content | Approach |\n| --- | --- | --- |\n";
    expect(
      parseRecordTable(
        `${header}| DEC-0007 | A | B |\n| DEC-20261105093000 | C | D |\n`,
        "decisions",
      ).errors,
    ).toEqual([]);
    expect(
      parseRecordTable(
        `${header}| OQ-0012 | A | B |\n| OQ-20261105093000 | C | D |\n`,
        "open-questions",
      ).errors,
    ).toEqual([]);
  });

  // QFAI:EX-0001-0007-29
  it("rejects a timestamp ID with no real calendar time or the wrong digit count", () => {
    const header = "| ID | Content | Approach |\n| --- | --- | --- |\n";
    const parsed = parseRecordTable(
      `${header}| DEC-20261305093000 | A | B |\n| DEC-2026110509300 | C | D |\n`,
      "decisions",
    );
    expect(parsed.errors).toEqual([
      "decisions row 1 has an invalid ID: DEC-20261305093000",
      "decisions row 2 has an invalid ID: DEC-2026110509300",
    ]);
    for (const valid of ["DEC-20280229093000", "DEC-20261105235959", "OQ-0001"]) {
      expect(isStoryTreeId(valid, valid.startsWith("DEC") ? "DEC" : "OQ")).toBe(true);
    }
    for (const invalid of [
      "DEC-20260230093000",
      "DEC-20261105243000",
      "DEC-20261105096000",
      "DEC-20261105093060",
      "DEC-20270229093000",
      "DEC-202611050930001",
    ]) {
      expect(isStoryTreeId(invalid, "DEC")).toBe(false);
    }
    expect(isTimestampRecordId("OQ-20261105093000")).toBe(true);
    expect(isTimestampRecordId("OQ-0001")).toBe(false);
  });

  // QFAI:EX-0001-0147-08
  it("allocates the highest number in a scope plus one, and starts an empty scope at one", () => {
    const stories = ["US-0001-0001", "US-0001-0002", "US-0001-0003"];
    expect(nextId("US", stories, "BF-0001")).toBe("US-0001-0004");
    expect(nextId("AC", ["AC-0001-0001-01", "AC-0001-0001-02"], "US-0001-0001")).toBe(
      "AC-0001-0001-03",
    );
    expect(nextId("BF", [])).toBe("BF-0001");
    expect(nextId("AC", [], "US-0001-0001")).toBe("AC-0001-0001-01");
    expect(nextId("EX", [], "US-0001-0001")).toBe("EX-0001-0001-01");
  });

  it("checks table shape, row kinds, and the by-ID diff", () => {
    const header = "| ID | Content | Approach |\n| --- | --- | --- |\n";
    const base = `${header}| DEC-0001 | First | Keep |\n`;
    const head = `${header}| DEC-0001 | First | Keep |\n| DEC-20261105093000 | Change request: 01_policy/glossary.md | Re-run owner |\n`;
    expect(parseRecordTable(header, "decisions").errors).toEqual([]);
    expect(diffRecordTables(base, head, "decisions")).toMatchObject({
      removed: [],
      changed: [],
      added: [{ id: "DEC-20261105093000" }],
    });
    expect(
      classifyRecordRow(
        parseRecordTable(head, "decisions").rows[1] ?? { id: "", content: "", approach: "" },
      ),
    ).toMatchObject({ kind: "change-request", refs: ["01_policy/glossary.md"] });
    expect(
      diffRecordTables(base, `${header}| DEC-0001 | Rewritten | Keep |\n`, "decisions").changed,
    ).toMatchObject([{ id: "DEC-0001", cell: "content", before: "First", after: "Rewritten" }]);
    expect(diffRecordTables(base, header, "decisions").removed).toMatchObject([{ id: "DEC-0001" }]);
  });

  // QFAI:EX-0001-0053-04
  it("reads each row kind from its Content keyword alone", () => {
    const row = { id: "DEC-0001", approach: "Reason" };
    expect(
      classifyRecordRow({ ...row, content: "Test exception: EX-0001-0001-01, AC-0001-0001-01" }),
    ).toEqual({
      kind: "test-exception",
      refs: ["EX-0001-0001-01", "AC-0001-0001-01"],
      row: { ...row, content: "Test exception: EX-0001-0001-01, AC-0001-0001-01" },
    });
    expect(
      classifyRecordRow({ ...row, content: "Change request: 02_business-flow/business-flows.md" }),
    ).toMatchObject({ kind: "change-request", refs: ["02_business-flow/business-flows.md"] });
    expect(
      classifyRecordRow({ ...row, content: "Declined change request: 01_policy/principle.md" }),
    ).toMatchObject({ kind: "declined-change-request", refs: ["01_policy/principle.md"] });
    expect(classifyRecordRow({ ...row, content: "An ordinary decision" })).toMatchObject({
      kind: "other",
      refs: [],
    });
    expect(
      classifyRecordRow({ id: "OQ-0001", content: "Unadjudicated: Which path?", approach: "" }),
    ).toMatchObject({ kind: "unadjudicated", refs: [] });
  });

  it("scopes a flow to its stories, examples, and citing rules", () => {
    const files = new Map(storyFiles);
    files.set(
      ".qfai/spec/02_business-flow/business-flow-0002/business-flow.md",
      "# BF-0002: Returns\n",
    );
    files.set(
      ".qfai/spec/02_business-flow/business-flow-0002/user-story-0002-0001/01_User-story.md",
      "# US-0002-0001: Return\n",
    );
    files.set(
      ".qfai/spec/02_business-flow/business-flow-0002/user-story-0002-0001/03_Example.md",
      "| EX-ID | AC-Ref |\n| --- | --- |\n| EX-0002-0001-01 | AC-0002-0001-01 |\n",
    );
    files.set(
      ".qfai/spec/03_contract/api/returns.yaml",
      "# QFAI-CONTRACT-ID: API-0002\nx-qfai-rules:\n  - id: BR-0002-0001\n    statement: Return succeeds\n    examples: [EX-0002-0001-01]\n",
    );
    const model = buildStoryTreeModel(files, { contractsDir: ".qfai/spec/03_contract" });
    expect(resolveFlowScope(["BF-0001", "BF-0002", "../bad"], model)).toMatchObject({
      flowIds: ["BF-0001", "BF-0002"],
      invalidValues: ["../bad"],
    });
    expect(resolveFlowScope(["BF-0003"], model).invalidValues).toEqual(["BF-0003"]);
    expect(resolveFlowScope(["BF-0001"], model)).toMatchObject({
      flowIds: ["BF-0001"],
      invalidValues: [],
      storyIds: ["US-0001-0001"],
      ruleIds: ["BR-0001-0001"],
    });
  });
});

describe.each([
  { kind: "decisions" as const, id: "DEC-0001" },
  { kind: "open-questions" as const, id: "OQ-0001" },
])("$kind row diagnostics", ({ kind, id }) => {
  const header = "| ID | Content | Approach |\n| --- | --- | --- |\n";

  // QFAI:EX-0001-0053-13
  it.each([2, 4])("reports expected three and actual %i cells", (count) => {
    const cells = [id, "Choice", "Reason", "Extra"].slice(0, count);
    const parsed = parseRecordTable(`${header}| ${cells.join(" | ")} |\n`, kind);
    expect(parsed.errors).toEqual([
      `${kind} row 1 has the wrong number of cells: expected 3, actual ${count}`,
    ]);
  });

  // QFAI:EX-0001-0007-04
  it("reports a Status column as an unexpected column", () => {
    const parsed = parseRecordTable(
      `| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| ${id} | Choice | Reason | DONE |\n`,
      kind,
    );
    expect(parsed.errors).toContain(`${kind} has the unexpected column Status`);
    expect(parsed.errors).toContain(
      `${kind} row 1 has the wrong number of cells: expected 3, actual 4`,
    );
  });
});

describe("ordered decision pages in the existing story model", () => {
  const table = "| ID | Content | Approach |\n| --- | --- | --- |\n";
  const page = "# Decisions\n\n## Decisions\n\n" + table;
  // QFAI:EX-0001-0008-27
  it("reserves all historical page row and retired IDs before the root tail", () => {
    const files = new Map([
      [
        "docs/spec/decisions.md",
        "# Decisions\n\n## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions\n\n" +
          table +
          "| DEC-20261105093000 | Tail | Keep |\n",
      ],
      ["docs/spec/decisions/page-0001.md", page + "| DEC-0042 | Retired US-0001-0009 | Keep |\n"],
    ]);
    const model = buildStoryTreeModel(files, { specsDir: "docs/spec" });
    expect(model.decisions?.rows.map(({ id }) => id)).toEqual(["DEC-0042", "DEC-20261105093000"]);
    expect(nextStoryTreeId(model, "US", "BF-0001")).toBe("US-0001-0010");
    expect(model).toMatchObject({
      decisionFiles: ["docs/spec/decisions/page-0001.md", "docs/spec/decisions.md"],
      decisionOccurrences: [
        { origin: { path: "docs/spec/decisions/page-0001.md", actualRow: 7, rawOrdinal: 1 } },
        { origin: { path: "docs/spec/decisions.md", actualRow: 11, rawOrdinal: 2 } },
      ],
    });
  });
});

// Supplementary root-origin regression: the missing object is the root itself, not a named page.
it.each([".", "./", ""])(
  "normalizes configured root %j and refuses orphan page history",
  (specsDir) => {
    const header =
      "# Decisions\n\n## Decisions\n\n| ID | Content | Approach |\n| --- | --- | --- |\n";
    const page = "decisions/page-0001.md";
    const history = header + "| DEC-0001 | Historical choice | Keep |\n";
    const tail =
      header.replace(
        "## Decisions",
        "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
      ) + "| DEC-0002 | Append tail | Keep |\n";
    const valid = buildModel(
      new Map([
        ["decisions.md", tail],
        [page, history],
      ]),
      { specsDir },
    );
    expect(valid.decisionRegisterComplete).toBe(true);
    expect(valid.decisionFile).toBe("decisions.md");
    expect(valid.decisionOccurrences.map(({ row }) => row.id)).toEqual(["DEC-0001", "DEC-0002"]);
    expect(nextStoryTreeId(valid, "BF")).toBe("BF-0001");
    const orphan = buildModel(new Map([[page, history]]), { specsDir });
    expect(orphan.decisionRegisterComplete).toBe(false);
    expect(orphan.decisionRegisterErrors).toContainEqual({
      file: "decisions.md",
      message: "Missing decisions root",
    });
    expect(nextStoryTreeId.bind(null, orphan, "BF")).toThrow(
      /complete decision register.*unavailable/i,
    );
  },
);
