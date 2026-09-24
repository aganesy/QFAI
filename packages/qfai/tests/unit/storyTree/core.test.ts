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
import { buildStoryTreeModel } from "../../../src/core/storyTree/tree.js";

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
    "x-qfai-rules:\n  - id: BR-0001\n    statement: Payment succeeds\n    examples: [EX-0001-0001-01]\n",
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
    expect(CONTRACT_LAYER_FILES).toEqual(["contracts.md", "tech.md", "structure.md"]);
    expect(CONTRACT_KIND_DIRS).toEqual(["api", "db", "ui", "cli", "design"]);
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

  it("checks exact shapes, parent prefixes, and never fills an ID gap", () => {
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
        "QFAI:BF-0001 QFAI:BF-0001-0002 QFAI:AC-0001-0001-01 QFAI:EX-0001-0001-01",
      ),
    ).toEqual({
      BF: ["BF-0001"],
      AC: ["AC-0001-0001-01"],
      EX: ["EX-0001-0001-01"],
    });
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
      ["BR-0001", ["EX-0001-0001-01"]],
    ]);
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

  it("reads YAML, SQL, and Markdown rule declarations and keeps refs separate", () => {
    expect(
      parseContractRules(
        "a.yaml",
        "x-qfai-rules:\n  - id: BR-0001\n    statement: Pay\n    examples: [EX-0001-0001-01]\nx-qfai-rule-refs: [BR-0002]\n",
      ).refs,
    ).toEqual(["BR-0002"]);
    expect(
      parseContractRules(
        "a.sql",
        "-- Rule BR-0002: Save\n-- Examples: EX-0001-0001-01\n-- Rule refs: BR-0001\n",
      ).rules,
    ).toEqual([{ id: "BR-0002", statement: "Save", examples: ["EX-0001-0001-01"], file: "a.sql" }]);
    expect(
      parseContractRules(
        "a.md",
        "## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0003 | Show | EX-0001-0001-01 |\n\nRule refs: BR-0001\n",
      ),
    ).toMatchObject({
      rules: [{ id: "BR-0003", statement: "Show", examples: ["EX-0001-0001-01"] }],
      refs: ["BR-0001"],
    });
    expect(
      parseContractRules(
        "a.json",
        JSON.stringify({
          "x-qfai-rules": [{ id: "BR-0004", statement: "Keep", examples: ["EX-0001-0001-01"] }],
          "x-qfai-rule-refs": ["BR-0003"],
        }),
      ).rules.map((rule) => rule.id),
    ).toEqual(["BR-0004"]);
    expect(
      parseContractRules("a.sql", "-- Rule BR-0005: Missing examples\nSELECT 1;\n").rules[0]
        ?.examples,
    ).toEqual([]);
    expect(parseContractRules("a.md", "## Rules\n\nNo table.\n").errors).not.toEqual([]);
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
      "x-qfai-rules:\n  - id: BR-0002\n    statement: Return succeeds\n    examples: [EX-0002-0001-01]\n",
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
      ruleIds: ["BR-0001"],
    });
  });
});
