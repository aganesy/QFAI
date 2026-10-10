import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { resolveFlowScope } from "../../../src/core/flowScope.js";
import { parseContractRules } from "../../../src/core/storyTree/contractRules.js";
import {
  isStoryTreeId,
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
import { buildStoryTreeModel, nextStoryTreeId } from "../../../src/core/storyTree/tree.js";

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
    expect(storyTreeMarkdownPatterns("docs/spec", "docs/contracts")).toHaveLength(15);
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
    expect(nextId("DEC", ["DEC-0001", "DEC-0003"])).toBe("DEC-0004");
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

  // QFAI:EX-0001-0008-04
  it("reserves IDs named by decision rows when allocating a story ID", () => {
    const files = new Map(storyFiles);
    files.set(
      ".qfai/spec/decisions.md",
      "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| DEC-0001 | Retired US-0001-0004 | Keep its ID reserved | DONE |\n",
    );
    const tree = buildStoryTreeModel(files);
    expect(nextStoryTreeId(tree, "US", "BF-0001")).toBe("US-0001-0005");
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
  it("reports a row inserted above an existing row as that row's ID cell rewritten", () => {
    const header = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
    const base = `${header}| DEC-0001 | First | Keep | TODO |\n`;
    const head = `${header}| DEC-0002 | Inserted | Keep | TODO |\n| DEC-0001 | First | Keep | TODO |\n`;
    expect(diffRecordTables(base, head, "decisions").rewritten).toContainEqual(
      expect.objectContaining({ id: "DEC-0001", cell: "id" }),
    );
  });

  // QFAI:EX-0001-0147-06
  it("lets only the Status cell move when a decision is superseded and a question deferred", () => {
    const header = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
    const decisionBase = `${header}| DEC-0001 | Choice | Reason | DONE |\n`;
    const decisionHead = `${header}| DEC-0001 | Choice | Reason | SUPERSEDED (by DEC-0002) |\n| DEC-0002 | Newer choice | Reason | DONE |\n`;
    const decisions = diffRecordTables(decisionBase, decisionHead, "decisions");
    expect(decisions.rewritten).toEqual([]);
    expect(decisions.removed).toEqual([]);
    expect(decisions.changed).toEqual([
      { id: "DEC-0001", cell: "status", before: "DONE", after: "SUPERSEDED (by DEC-0002)" },
    ]);
    expect(decisions.appended.map((row) => row.id)).toEqual(["DEC-0002"]);
    expect(parseRecordTable(decisionHead, "decisions").errors).toEqual([]);

    const questionBase = `${header}| OQ-0001 | Which layout | Pending | TODO |\n`;
    const questionHead = `${header}| OQ-0001 | Which layout | Pending | DEFERRED |\n`;
    const questions = diffRecordTables(questionBase, questionHead, "open-questions");
    expect(questions.rewritten).toEqual([]);
    expect(questions.changed).toEqual([
      { id: "OQ-0001", cell: "status", before: "TODO", after: "DEFERRED" },
    ]);
    expect(parseRecordTable(questionHead, "open-questions").errors).toEqual([]);
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

  it("checks table shape, status vocabulary, keyword force, and append-only diff", () => {
    const header = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
    const base = `${header}| DEC-0001 | First | Keep | TODO |\n`;
    const head = `${header}| DEC-0001 | First | Keep | DONE |\n| DEC-0002 | Change request: 01_policy/glossary.md | Re-run owner | TODO |\n`;
    expect(parseRecordTable(header, "decisions").errors).toEqual([]);
    expect(diffRecordTables(base, head, "decisions")).toMatchObject({
      removed: [],
      rewritten: [],
      appended: [{ id: "DEC-0002" }],
      onlyChangeRequestRows: false,
    });
    expect(
      diffRecordTables(
        header,
        `${header}| DEC-0002 | Change request: 01_policy/glossary.md | Re-run owner | TODO |\n`,
        "decisions",
      ).onlyChangeRequestRows,
    ).toBe(true);
    const request = "| DEC-0002 | Change request: 01_policy/glossary.md | Re-run owner |";
    expect(
      diffRecordTables(`${header}${request} TODO |\n`, `${header}${request} WIP |\n`, "decisions")
        .onlyChangeRequestRows,
    ).toBe(true);
    expect(diffRecordTables(header, "no table", "decisions").onlyChangeRequestRows).toBe(false);
    expect(
      classifyRecordRow(
        parseRecordTable(head, "decisions").rows[1] ?? {
          id: "",
          content: "",
          approach: "",
          status: "",
        },
      ),
    ).toMatchObject({
      kind: "change-request",
      inForce: false,
      refs: ["01_policy/glossary.md"],
    });
    expect(
      classifyRecordRow({
        id: "DEC-0003",
        content: "Test exception: BF-0001, AC-0001-0001-01",
        approach: "Temporary",
        status: "DONE",
      }),
    ).toMatchObject({
      kind: "test-exception",
      refs: ["BF-0001", "AC-0001-0001-01"],
      inForce: true,
    });
    expect(
      classifyRecordRow({
        id: "OQ-0001",
        content: "Unadjudicated: Which path?",
        approach: "Discuss",
        status: "WIP",
      }).inForce,
    ).toBe(true);
    expect(
      parseRecordTable(`${header}| DEC-0001 | Wrong | - | DEFERRED |\n`, "decisions").errors,
    ).not.toEqual([]);
    expect(
      parseRecordTable(`${header}| DEC-0001 | Old | - | SUPERSEDED (by DEC-0002) |\n`, "decisions")
        .errors,
    ).toEqual([]);
    expect(
      diffRecordTables(base, `${header}| DEC-0001 | Rewritten | Keep | TODO |\n`, "decisions")
        .rewritten,
    ).toMatchObject([{ id: "DEC-0001", cell: "content" }]);
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
  {
    kind: "decisions" as const,
    id: "DEC-0001",
    allowed: [
      "TODO",
      "WIP",
      "DONE",
      "REJECTED",
      "SUPERSEDED (by DEC-NNNN)",
      "PARTLY SUPERSEDED (by DEC-NNNN)",
    ],
    wrongKindStatus: "DEFERRED",
  },
  {
    kind: "open-questions" as const,
    id: "OQ-0001",
    allowed: ["TODO", "WIP", "DONE", "DEFERRED"],
    wrongKindStatus: "REJECTED",
  },
])("$kind row diagnostics", ({ kind, id, allowed, wrongKindStatus }) => {
  const header = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
  const table = (status: string): string => `${header}| ${id} | Choice | Reason | ${status} |\n`;
  const diagnostic = (preview: string): string =>
    `${kind} row ${id} has an invalid Status: "${preview}"; allowed: ${allowed.join(", ")}`;

  it.each([3, 5])("reports expected four and actual %i cells", (count) => {
    const cells = [id, "Choice", "Reason", "TODO", "Extra"].slice(0, count);
    const parsed = parseRecordTable(`${header}| ${cells.join(" | ")} |\n`, kind);
    const error = parsed.errors.find((message) => /(?:cells|columns)/i.test(message)) ?? "";
    expect(error).toContain(`${kind} row 1`);
    expect(error).toMatch(/expected\s+4\b/i);
    expect(error).toMatch(new RegExp(`(?:actual|got|found)\\s+${count}\\b`, "i"));
  });

  it.each(["INVALID", "", wrongKindStatus])(
    "lists only this kind's allowed values for Status %j",
    (status) => {
      const parsed = parseRecordTable(table(status), kind);
      expect(parsed.errors).toEqual([diagnostic(status)]);
      expect(parsed.rows[0]?.status).toBe(status);
    },
  );

  it.each([39, 40, 41])(
    "bounds the preview at forty Unicode characters for a %i-character value",
    (length) => {
      const status = "\u{1f680}".repeat(length);
      const preview = "\u{1f680}".repeat(Math.min(length, 40)) + (length > 40 ? "..." : "");
      const parsed = parseRecordTable(table(status), kind);
      expect(parsed.errors).toEqual([diagnostic(preview)]);
      expect(parsed.rows[0]?.status).toBe(status);
    },
  );

  it("sanitizes control and format runs and Unicode breaks only in the one-line diagnostic", () => {
    const status = '\u202e\0First  "quoted"\t\u0085\u200dSecond\u2028Third\u2029Fourth\rLast\u2066';
    const parsed = parseRecordTable(table(status), kind);
    expect(parsed.errors).toEqual([diagnostic('First  "quoted" Second Third Fourth Last')]);
    expect(parsed.errors.join("")).not.toMatch(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u);
    expect(parsed.rows[0]?.status).toBe(status);
  });

  it("applies the forty-character limit after sanitizing rather than to the raw value", () => {
    const status = "A".repeat(20) + "\t\0\u202e\u2028\u2029" + "B".repeat(19);
    const parsed = parseRecordTable(table(status), kind);
    expect(parsed.errors).toEqual([diagnostic("A".repeat(20) + " " + "B".repeat(19))]);
    expect(parsed.rows[0]?.status).toBe(status);
  });

  it("continues accepting every existing status without changing its returned value", () => {
    for (const pattern of allowed) {
      const status = pattern.replace("DEC-NNNN", "DEC-0042");
      const parsed = parseRecordTable(table(status), kind);
      expect(parsed.errors).toEqual([]);
      expect(parsed.rows[0]?.status).toBe(status);
    }
  });
});
