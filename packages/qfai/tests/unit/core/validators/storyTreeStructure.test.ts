import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import { architectureProblems, orderLayers } from "../../../../src/core/storyTree/architecture.js";
import { buildStoryTreeModel } from "../../../../src/core/storyTree/tree.js";
import {
  validateConstraintIds,
  validateStoryDirectories,
  validateStoryTreeStructure,
  validateStoryTreeStructureModel,
  validateTechArchitecture,
} from "../../../../src/core/validators/storyTreeStructure.js";

const specs = ".qfai/spec";
const contracts = `${specs}/03_contract`;
const story = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001`;

function model(overrides: Record<string, string> = {}) {
  const files = new Map<string, string>([
    [
      `${specs}/02_business-flow/business-flows.md`,
      "| BF-ID | Flow | Path |\n| --- | --- | --- |\n| BF-0001 | Checkout | `business-flow-0001/` |",
    ],
    [`${specs}/02_business-flow/business-flow-0001/business-flow.md`, "# BF-0001: Checkout"],
    [
      `${specs}/02_business-flow/business-flow-0001/user-stories.md`,
      "| US-ID | Story | Path |\n| --- | --- | --- |\n| US-0001-0001 | Checkout | `user-story-0001-0001/` |",
    ],
    [`${story}/01_User-story.md`, "# US-0001-0001: Checkout"],
    [`${story}/02_Acceptance-Criteria.md`, "```gherkin\n# AC-0001-0001-01\nScenario: paid\n```"],
    [
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Example |\n| --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | paid |",
    ],
    [
      `${contracts}/api/checkout.yaml`,
      "# QFAI-CONTRACT-ID: API-0001\nx-qfai-rules:\n  - id: BR-0001-0001\n    statement: Paid checkout\n    examples: [EX-0001-0001-01]",
    ],
    [`${specs}/decisions.md`, "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |"],
    [
      `${specs}/open-questions.md`,
      "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |",
    ],
  ]);
  for (const [file, text] of Object.entries(overrides)) files.set(file, text);
  return buildStoryTreeModel(files, { specsDir: specs, contractsDir: contracts });
}

// QFAI:EX-0001-0051-06
// QFAI:EX-0004-0001-01
describe("story-tree structure", () => {
  it("requires a Mermaid flowchart or sequence diagram in each flow file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-flow-mermaid-"));
    try {
      const specsDir = path.join(root, ".qfai", "spec");
      const flowFile = path.join(
        specsDir,
        "02_business-flow",
        "business-flow-0001",
        "business-flow.md",
      );
      await mkdir(path.dirname(flowFile), { recursive: true });
      const cases = [
        ["# BF-0001: Checkout\n", true],
        ["# BF-0001: Checkout\n\n```mermaid\nflowchart LR\nA --> B\n```\n", false],
        ["# BF-0001: Checkout\n\n~~~mermaid\nsequenceDiagram\nA->>B: pay\n~~~\n", false],
      ] as const;
      for (const [content, missing] of cases) {
        await writeFile(flowFile, content);
        const tree = buildStoryTreeModel(new Map([[flowFile, content]]), {
          specsDir,
          contractsDir: path.join(specsDir, "03_contract"),
        });
        const findings = await validateStoryTreeStructure(root, defaultConfig, tree);
        expect(findings.some((item) => item.code === "QFAI-STORY-011")).toBe(missing);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:EX-0001-0051-07
  it("reports a constraint ID that is not its row's place in its section", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-constraint-ids-"));
    try {
      const specsDir = path.join(root, ".qfai", "spec");
      const file = path.join(specsDir, "01_policy", "constraint.md");
      await mkdir(path.dirname(file), { recursive: true });
      const table = (rows: string[]): string =>
        ["| ID | Constraint | Rationale |", "| --- | --- | --- |", ...rows].join("\n");
      const document = (technical: string[], business: string[]): string =>
        `# Constraints\n\n## Technical Constraints\n\n${table(technical)}\n\n## Operational Constraints\n\n${table([])}\n\n## Business Constraints\n\n${table(business)}\n`;

      await writeFile(
        file,
        document(["| TC-01 | A | B |", "| TC-03 | C | D |"], ["| TC-01 | E | F |"]),
      );
      const reported = await validateConstraintIds(specsDir);
      expect(reported.map((item) => [item.code, item.refs])).toEqual([
        ["QFAI-STORY-012", ["TC-03"]],
        ["QFAI-STORY-012", ["TC-01"]],
      ]);
      expect(reported[0]?.message).toContain("so it is TC-02");
      expect(reported[1]?.message).toContain("so it is BC-01");

      await writeFile(file, document(["| TC-01 | A | B |", "| TC-02 | C | D |"], []));
      expect(await validateConstraintIds(specsDir)).toEqual([]);
      const tree = buildStoryTreeModel(new Map(), {
        specsDir,
        contractsDir: path.join(specsDir, "03_contract"),
      });
      const findings = await validateStoryTreeStructure(root, defaultConfig, tree);
      expect(findings.some((item) => item.code === "QFAI-STORY-012")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reads no constraint IDs when the tree has no constraint document", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-constraint-ids-"));
    try {
      expect(await validateConstraintIds(path.join(root, ".qfai", "spec"))).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  describe("the architecture of tech.md", () => {
    const LAYERS = [
      "| Layer | Responsibility | Depends on |",
      "| --- | --- | --- |",
      "| CLI | Parses arguments | Core, Shared |",
      "| Migration | Moves old trees | Core, Shared |",
      "| Core | Validates the tree | Shared |",
      "| Shared | Small helpers | - |",
    ];
    const DIAGRAM = [
      "flowchart TD",
      "  CLI --> Core",
      "  CLI --> Shared",
      '  Migration["Migration"] --> Core',
      "  Migration --> Shared",
      "  Core[Core] --> Shared",
    ];

    async function problems(diagram: string[], table: string[]): Promise<string[]> {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tech-architecture-"));
      try {
        const contractsDir = path.join(root, ".qfai", "spec", "03_contract");
        await mkdir(contractsDir, { recursive: true });
        await writeFile(
          path.join(contractsDir, "tech.md"),
          [
            "# Technology",
            "",
            "## Architecture",
            "",
            "```mermaid",
            ...diagram,
            "```",
            "",
            ...table,
            "",
            "## Dependencies",
            "",
            "- None.",
            "",
          ].join("\n"),
        );
        const findings = await validateTechArchitecture(contractsDir);
        expect(new Set(findings.map((item) => item.code))).toEqual(
          new Set(findings.length === 0 ? [] : ["QFAI-STORY-013"]),
        );
        return findings.map((item) => item.message.replace(/^.*?tech\.md: /, ""));
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }

    // QFAI:EX-0001-0051-08
    it("reports a layer that depends on one not below it", async () => {
      expect(await problems(DIAGRAM, LAYERS)).toEqual([]);
      const reordered = [LAYERS[0], LAYERS[1], LAYERS[4], LAYERS[2], LAYERS[3], LAYERS[5]].map(
        (line) => line ?? "",
      );
      expect(await problems(DIAGRAM, reordered)).toEqual([
        "CLI depends on Core, which is not in a row below it",
        "Migration depends on Core, which is not in a row below it",
      ]);
      const unknown = LAYERS.map((line) => line.replace("Core, Shared |", "Core, Domain |"));
      expect(await problems(DIAGRAM, unknown)).toEqual(
        expect.arrayContaining([
          "CLI depends on Domain, which is not a layer of the table",
          "the diagram has no edge CLI --> Domain",
        ]),
      );
    });

    // QFAI:EX-0001-0051-09
    it("reports every difference between the diagram and the table", async () => {
      expect(await problems(DIAGRAM, LAYERS)).toEqual([]);
      const diagram = [
        "flowchart LR",
        "  CLI --> Core",
        "  CLI --> Shared",
        "  CLI --> Migration",
        "  Core --> Shared",
        "  Extra",
        "  %% a comment",
      ];
      expect(await problems(diagram, LAYERS)).toEqual([
        'the diagram opens with "flowchart LR", not flowchart TD',
        'the diagram line "%% a comment" is neither a layer nor an edge',
        "the diagram draws Extra, which is not a layer of the table",
        "the diagram has no edge Migration --> Core",
        "the diagram has no edge Migration --> Shared",
        "the diagram draws CLI --> Migration, which no Depends on names",
      ]);
      expect(await problems(["flowchart TD", "  CLI --> Core"], LAYERS.slice(0, 3))).toEqual([
        "CLI depends on Core, which is not a layer of the table",
        "CLI depends on Shared, which is not a layer of the table",
        "the diagram draws Core, which is not a layer of the table",
        "the diagram has no edge CLI --> Shared",
      ]);
    });

    // QFAI:EX-0001-0051-09
    it("reads a diagram whose lines end in a semicolon", async () => {
      const semicolons = DIAGRAM.map((line) => `${line};`);
      expect(await problems(semicolons, LAYERS)).toEqual([]);
      expect(await problems(["flowchart LR;", ...DIAGRAM.slice(1)], LAYERS)).toEqual([
        'the diagram opens with "flowchart LR;", not flowchart TD',
      ]);
    });

    // QFAI:EX-0001-0051-09
    // QFAI:EX-0001-0051-13
    it("reads a quoted label, CRLF line ends, and a section missing its diagram or table", () => {
      const rows = "| Layer | Responsibility | Depends on |\n| --- | --- | --- |\n";
      const fence = "```";
      const body = `${fence}mermaid\nflowchart TD\n  L1["Say #quot;hi#quot;"]\n${fence}\n\n${rows}| Say "hi" | Greets | - |\n`;
      expect(architectureProblems(body)).toEqual([]);
      expect(architectureProblems(body.replaceAll("\n", "\r\n"))).toEqual([]);
      expect(architectureProblems(`${rows}| Core | Validates | - |\n`)).toEqual([]);
      expect(architectureProblems(`${fence}mermaid\nflowchart TD\n  Core\n${fence}\n`)).toEqual([]);
    });

    it("orders no layers that have two rows", () => {
      expect(
        orderLayers([
          { name: "Core", dependsOn: [] },
          { name: "Core", dependsOn: [] },
        ]),
      ).toBe("the layer Core has more than one row");
    });

    // QFAI:EX-0001-0051-08
    // QFAI:EX-0001-0051-13
    it("reports a layer that has two rows", async () => {
      const twice = [...LAYERS, "| Shared | Another row | - |"];
      expect(await problems(DIAGRAM, twice)).toEqual(["the layer Shared has more than one row"]);
    });

    // QFAI:EX-0001-0051-11
    it("reports a layer drawn as two nodes", async () => {
      const table = [
        "| Layer | Responsibility | Depends on |",
        "| --- | --- | --- |",
        "| CLI | Parses | Core |",
        "| Core | Validates | - |",
      ];
      const header = ["flowchart TD", '  A["CLI"] --> B["Core"]'];
      expect(await problems([...header, '  C["CLI"]'], table)).toEqual([
        "the diagram draws the layer CLI as 2 nodes",
      ]);
      expect(await problems(["flowchart TD", "  CLI --> Core", '  X["CLI"]'], table)).toEqual([
        "the diagram draws the layer CLI as 2 nodes",
      ]);
      expect(await problems([...header, '  A["CLI"]'], table)).toEqual([]);
    });

    // QFAI:EX-0001-0051-12
    it("reports an edge written twice", async () => {
      const table = [
        "| Layer | Responsibility | Depends on |",
        "| --- | --- | --- |",
        "| CLI | Parses | Core |",
        "| Core | Validates | - |",
      ];
      const once = ["flowchart TD", "  CLI --> Core"];
      expect(await problems([...once, "  CLI --> Core"], table)).toEqual([
        "the diagram draws CLI --> Core more than once",
      ]);
      expect(await problems([...once, "  CLI --> Core", "  CLI --> Core;"], table)).toEqual([
        "the diagram draws CLI --> Core more than once",
      ]);
      const sameEdge = ["flowchart TD", '  A["CLI"] --> B["Core"]', '  C["CLI"] --> B'];
      expect(await problems(sameEdge, table)).toEqual([
        "the diagram draws the layer CLI as 2 nodes",
        "the diagram draws CLI --> Core more than once",
      ]);
      expect(await problems(once, table)).toEqual([]);
    });

    it("reads nothing when the tree has no tech.md", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tech-architecture-"));
      try {
        expect(await validateTechArchitecture(path.join(root, "03_contract"))).toEqual([]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  });

  it("names missing and extra entries in a story directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-dir-"));
    try {
      const directory = path.join(
        root,
        "02_business-flow",
        "business-flow-0001",
        "user-story-0001-0001",
      );
      await mkdir(path.join(directory, "drafts"), { recursive: true });
      await writeFile(path.join(directory, "01_User-story.md"), "# Story\n");
      await writeFile(path.join(directory, "02_Acceptance-Criteria.md"), "# AC\n");
      await writeFile(path.join(directory, "notes.md"), "notes\n");
      const findings = await validateStoryDirectories(root);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.message).toContain("03_Example.md");
      expect(findings[0]?.message).toContain("notes.md");
      expect(findings[0]?.message).toContain("drafts");
      await rm(path.join(directory, "notes.md"));
      await rm(path.join(directory, "drafts"), { recursive: true });
      await writeFile(path.join(directory, "03_Example.md"), "# Examples\n");
      expect(await validateStoryDirectories(root)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports required flow and story files without a declared H1 ID", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-heading-"));
    try {
      const flowDir = path.join(root, "02_business-flow", "business-flow-0001");
      const storyDir = path.join(flowDir, "user-story-0001-0001");
      await mkdir(storyDir, { recursive: true });
      const flowFile = path.join(flowDir, "business-flow.md");
      const storyFile = path.join(storyDir, "01_User-story.md");
      await writeFile(flowFile, "# Checkout\n");
      await writeFile(storyFile, "# Story\n");
      for (const name of ["02_Acceptance-Criteria.md", "03_Example.md"]) {
        await writeFile(path.join(storyDir, name), "\n");
      }
      const tree = buildStoryTreeModel(
        new Map([
          [flowFile, "# Checkout\n"],
          [storyFile, "# Story\n"],
        ]),
        { specsDir: root, contractsDir: path.join(root, "03_contract") },
      );
      const findings = await validateStoryDirectories(root, tree);
      expect(findings.filter((item) => item.code === "QFAI-STORY-002")).toHaveLength(2);
      expect(findings.some((item) => item.file === flowFile)).toBe(true);
      expect(findings.some((item) => item.file === storyFile)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("accepts a linked story, example, rule and the four-column registers", () => {
    expect(validateStoryTreeStructureModel(model())).toEqual([]);
  });

  // QFAI:EX-0001-0053-07
  it("reports a cited decision or successor that no row declares", () => {
    const rule = (statement: string) =>
      `# QFAI-CONTRACT-ID: API-0001\nx-qfai-rules:\n  - id: BR-0001-0001\n    statement: ${statement}\n    examples: [EX-0001-0001-01]`;
    const register = (rows: string) =>
      `| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n${rows}`;
    const dangling = validateStoryTreeStructureModel(
      model({
        [`${contracts}/api/checkout.yaml`]: rule(
          "Approved by DEC-0008, again DEC-0008, then OQ-0002, not DEC-0001-0002",
        ),
        [`${specs}/decisions.md`]: register(
          "| DEC-0001 | Old | Kept | SUPERSEDED (by DEC-0009) |\n| DEC-0002 | Narrowed | Kept | PARTLY SUPERSEDED (by DEC-0010) |",
        ),
      }),
    ).filter((item) => item.code === "QFAI-STORY-003");
    expect(dangling.map((item) => item.refs)).toEqual([
      ["BR-0001-0001", "DEC-0008"],
      ["BR-0001-0001", "OQ-0002"],
      ["DEC-0001", "DEC-0009"],
      ["DEC-0002", "DEC-0010"],
    ]);
    expect(dangling.every((item) => item.severity === "error")).toBe(true);

    const declared = validateStoryTreeStructureModel(
      model({
        [`${contracts}/api/checkout.yaml`]: rule("Approved by DEC-0008 and OQ-0001"),
        [`${specs}/decisions.md`]: register(
          "| DEC-0001 | Old | Kept | SUPERSEDED (by DEC-0009) |\n| DEC-0002 | Narrowed | Kept | PARTLY SUPERSEDED (by DEC-0009) |\n| DEC-0008 | A | B | DONE |\n| DEC-0009 | C | D | DONE |",
        ),
        [`${specs}/open-questions.md`]: register("| OQ-0001 | Q | A | DEFERRED |"),
      }),
    );
    expect(declared).toEqual([]);
  });

  // QFAI:EX-0001-0053-09
  // QFAI:EX-0001-0053-10
  // QFAI:EX-0001-0053-11
  // QFAI:EX-0001-0053-12
  it("checks the Approach items of a decision row above DEC-2097", () => {
    const approach = (...items: string[]) => items.map((item) => `- ${item}`).join(" ");
    const row = (id: string, cell: string) => `| ${id} | Decide | ${cell} | DONE |`;
    const findings = (...rows: string[]) =>
      validateStoryTreeStructureModel(
        model({
          [`${specs}/decisions.md`]: `| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n${rows.join("\n")}`,
        }),
      ).filter((item) => item.code === "QFAI-STORY-017");
    const whole = approach(
      "Evidence: file:a.ts; command:pnpm build → passes.",
      "Grounds: a.ts shows it.",
      "Residual risk: none — read-only.",
      "Rollback: none — nothing to undo.",
    );
    expect(findings(row("DEC-2098", whole))).toEqual([]);
    expect(findings(row("DEC-0008", "Kept"), row("DEC-2097", "Kept"))).toEqual([]);

    const labels = findings(
      row("DEC-2098", approach("Evidence: file:a.ts", "Residual risk: x", "Rollback: y")),
      row(
        "DEC-2099",
        approach("Evidence: file:a.ts", "Grounds: g", "Rollback: y", "Residual risk: x"),
      ),
      row(
        "DEC-2100",
        approach("Evidence: file:a.ts", "Grounds: g", "Residual risk: x", "Rollback:"),
      ),
    );
    expect(labels.map((item) => [item.refs, item.severity])).toEqual([
      [["DEC-2098"], "error"],
      [["DEC-2099"], "error"],
      [["DEC-2100"], "error"],
    ]);
    expect(labels.map((item) => item.message)).toEqual([
      expect.stringContaining("lacks the item Grounds"),
      expect.stringContaining("out of order"),
      expect.stringContaining("empty Rollback item"),
    ]);

    expect(
      findings(
        row(
          "DEC-2098",
          approach(
            "Evidence: file:a.ts",
            "Grounds: none — obvious",
            "Residual risk: x",
            "Rollback: y",
          ),
        ),
      ).map((item) => item.message),
    ).toEqual([expect.stringContaining('"none —" in its Grounds item')]);

    expect(
      findings(
        row(
          "DEC-2098",
          approach(
            "Evidence: file:a.ts; looked at the code",
            "Grounds: g",
            "Residual risk: x",
            "Rollback: y",
          ),
        ),
      ).map((item) => item.message),
    ).toEqual([expect.stringContaining("neither file: nor command: (looked at the code)")]);
  });

  it("checks flow and story index membership against declarations", () => {
    const findings = validateStoryTreeStructureModel(
      model({
        [`${specs}/02_business-flow/business-flows.md`]:
          "| BF-ID | Flow | Path |\n| --- | --- | --- |\n| BF-0002 | Unknown | `business-flow-0002/` |",
        [`${specs}/02_business-flow/business-flow-0001/user-stories.md`]:
          "| US-ID | Story | Path |\n| --- | --- | --- |\n| US-0001-0001 | Checkout | `user-story-0001-0001/` |\n| US-0001-0001 | Duplicate | `user-story-0001-0001/` |",
      }),
    );
    expect(findings.some((item) => item.message.includes("does not list BF-0001"))).toBe(true);
    expect(findings.some((item) => item.message.includes("unknown or duplicate BF-0002"))).toBe(
      true,
    );
    expect(
      findings.some((item) => item.message.includes("unknown or duplicate US-0001-0001")),
    ).toBe(true);
  });

  it("reports an example that cites another story and an uncited criterion", () => {
    const issues = validateStoryTreeStructureModel(
      model({
        [`${story}/03_Example.md`]:
          "| EX-ID | AC-Ref | Example |\n| --- | --- | --- |\n| EX-0001-0001-01 | AC-0002-0001-01 | paid |",
      }),
    );
    expect(issues.some((item) => item.message.includes("EX-0001-0001-01"))).toBe(true);
    expect(issues.some((item) => item.message.includes("AC-0001-0001-01"))).toBe(true);
  });

  it("reports malformed and duplicate IDs with every defining file", () => {
    const issues = validateStoryTreeStructureModel(
      model({
        [`${story}/02_Acceptance-Criteria.md`]:
          "```gherkin\n# AC-0001-0001-001\n# AC-0001-0001-001\n```",
      }),
    );
    expect(issues.some((item) => item.message.includes("AC-0001-0001-001"))).toBe(true);
    expect(issues.some((item) => item.message.includes("defined more than once"))).toBe(true);
  });

  it("reports open unadjudicated rows and invalid register columns", () => {
    const issues = validateStoryTreeStructureModel(
      model({
        [`${specs}/decisions.md`]:
          "| ID | Content | Approach | Date | Status |\n| --- | --- | --- | --- | --- |",
        [`${specs}/open-questions.md`]:
          "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| OQ-0001 | Unadjudicated: Which path? | Ask | WIP |",
      }),
    );
    expect(issues.some((item) => item.code === "QFAI-SPACK-102")).toBe(true);
    expect(issues.some((item) => item.message.includes("Content, Approach and Status"))).toBe(true);
    const closed = validateStoryTreeStructureModel(
      model({
        [`${specs}/open-questions.md`]:
          "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n| OQ-0001 | Unadjudicated: Which path? | Ask | DONE |",
      }),
    );
    expect(closed.some((item) => item.code === "QFAI-SPACK-102")).toBe(false);
  });
});
