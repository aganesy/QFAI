// QFAI:AC-0001-0240-01
// QFAI:AC-0001-0240-02
// QFAI:AC-0001-0240-03

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig, loadConfig, type QfaiConfig } from "../../src/core/config.js";
import { validateProject } from "../../src/core/validate.js";
import { validateDiagramBudget } from "../../src/core/validators/diagramBudget.js";
import { diagramSize } from "../../src/core/validators/mermaidDiagramSize.js";

const FLOW = ".qfai/spec/02_business-flow/business-flow-0001/business-flow.md";
const PACK = ".qfai/discussion/discussion-20260101000000000/03_Story-Workshop.md";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-diagram-budget-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function write(relative: string, diagram: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `# Flow\n\n## Flow\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`);
}

/** A flowchart `N1 --> N2 --> …` of `count` nodes in one chain. */
function chain(count: number): string {
  const nodes = Array.from({ length: count }, (_, index) => `N${index + 1}`);
  return `flowchart TD\n  ${nodes.join(" --> ")}`;
}

const budgetFindings = async (config: QfaiConfig = defaultConfig) => [
  ...(await validateDiagramBudget(root, config, "story-tree")),
  ...(await validateDiagramBudget(root, config, "discussion-pack")),
];

describe("the diagram budget", () => {
  // QFAI:EX-0001-0240-01
  it("warns on a 13-node chain, naming the file, the fence line, both counts and the limits", async () => {
    await write(FLOW, chain(13));
    const findings = await budgetFindings();
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ code: "QFAI-FLOW-006", severity: "warning", file: FLOW });
    expect(findings[0]?.message).toBe(
      "The Mermaid diagram at line 5 draws 13 nodes and 12 edges; the budget is 12 nodes and 16 edges.",
    );
  });

  // QFAI:EX-0001-0240-02
  it("warns on 6 nodes with 17 edges", async () => {
    const links = Array.from(
      { length: 17 },
      (_, index) => `  A${index % 6} --> A${(index + 1) % 6}`,
    );
    await write(FLOW, `flowchart LR\n${links.join("\n")}`);
    const [finding] = await budgetFindings();
    expect(finding?.message).toContain("6 nodes and 17 edges");
  });

  // QFAI:EX-0001-0240-03
  it("warns on a sequence diagram with 13 participants in the latest discussion pack", async () => {
    const messages = Array.from(
      { length: 12 },
      (_, index) => `  P${index} ->> P${index + 1}: hello`,
    );
    await write(PACK, `sequenceDiagram\n${messages.join("\n")}`);
    const findings = (
      await validateProject(root, undefined, { profile: "discussion" })
    ).issues.filter((found) => found.code === "QFAI-FLOW-006");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.file).toBe(PACK);
    expect(findings[0]?.message).toContain("13 nodes");
  });

  it("raises one warning per diagram in sdd, full and verify, and none in prototyping", async () => {
    await write(FLOW, chain(13));
    await write(PACK, chain(14));
    const flow006 = async (profile: "sdd" | "full" | "verify" | "prototyping") =>
      (await validateProject(root, undefined, { profile })).issues
        .filter((found) => found.code === "QFAI-FLOW-006")
        .map((found) => found.file)
        .sort();
    expect(await flow006("sdd")).toEqual([FLOW]);
    expect(await flow006("full")).toEqual([PACK, FLOW].sort());
    expect(await flow006("verify")).toEqual([PACK, FLOW].sort());
    expect(await flow006("prototyping")).toEqual([]);
  });

  // QFAI:EX-0001-0240-04
  it("counts the states of a state diagram but not the start and end marker", async () => {
    const states = Array.from({ length: 12 }, (_, index) => `  S${index} --> S${index + 1}: next`);
    await write(FLOW, `stateDiagram-v2\n  [*] --> S0\n${states.join("\n")}\n  S12 --> [*]`);
    const [finding] = await budgetFindings();
    expect(finding?.message).toContain("13 nodes");
  });

  // QFAI:EX-0001-0240-05
  it("counts the entities of an entity-relationship diagram", async () => {
    const relations = Array.from(
      { length: 12 },
      (_, index) => `  E${index} ||--o{ E${index + 1} : has`,
    );
    await write(FLOW, `erDiagram\n${relations.join("\n")}`);
    const [finding] = await budgetFindings();
    expect(finding?.message).toContain("13 nodes and 12 edges");
  });

  // QFAI:EX-0001-0240-06
  it("counts each pair of an ampersand link as its own edge", async () => {
    const lines = Array.from(
      { length: 4 },
      (_, index) => `  A${index} --> B${index} & C${index} --> D${index}`,
    );
    await write(FLOW, `flowchart TD\n${lines.join("\n")}`);
    const [finding] = await budgetFindings();
    expect(finding?.message).toContain("16 nodes and 16 edges");
  });

  // QFAI:EX-0001-0240-07
  it("stays silent at exactly 12 nodes and 16 edges", async () => {
    const links = [
      ...Array.from({ length: 11 }, (_, index) => `  N${index} --> N${index + 1}`),
      ...Array.from({ length: 5 }, (_, index) => `  N${index} --> N${index + 6}`),
    ];
    await write(FLOW, `flowchart TD\n${links.join("\n")}`);
    expect(await budgetFindings()).toEqual([]);
  });

  // QFAI:EX-0001-0240-08
  it("stays silent on a pie chart, which draws no nodes and edges", async () => {
    const slices = Array.from({ length: 20 }, (_, index) => `  "S${index}" : ${index + 1}`);
    await write(FLOW, `pie title Shares\n${slices.join("\n")}`);
    expect(await budgetFindings()).toEqual([]);
  });

  // QFAI:EX-0001-0240-09
  it("counts no subgraph boundary, style or class line", async () => {
    const links = Array.from(
      { length: 11 },
      (_, index) => `    N${index}["Step ${index}"] --> N${index + 1}`,
    );
    await write(
      FLOW,
      [
        "flowchart TD",
        "  %% a comment",
        "  subgraph Group[One group]",
        ...links,
        "  end",
        "  classDef hot fill:#f00",
        "  class N0 hot",
        "  style N1 fill:#0f0",
        "  linkStyle 0 stroke:#00f",
      ].join("\n"),
    );
    expect(await budgetFindings()).toEqual([]);
  });

  it.each([
    ["A --> |yes| B", { nodes: 2, edges: 1 }],
    ["A -->|yes| B", { nodes: 2, edges: 1 }],
    ["A -- text --> B", { nodes: 2, edges: 1 }],
    ["A--text-->B", { nodes: 2, edges: 1 }],
    ["A -. text .-> B", { nodes: 2, edges: 1 }],
    ["A == text === B", { nodes: 2, edges: 1 }],
    ["A-.->B", { nodes: 2, edges: 1 }],
    ["A ==> B", { nodes: 2, edges: 1 }],
    ["A --- B --- C", { nodes: 3, edges: 2 }],
    ['my-node["A label"] --> other-node', { nodes: 2, edges: 1 }],
  ])("counts the flowchart link %s", (link, size) => {
    expect(diagramSize(`flowchart TD\n  ${link}`)).toEqual(size);
  });

  it("does not split a statement on a semicolon inside a quoted label", () => {
    expect(diagramSize('flowchart TD\n  A["save; exit"] --> B')).toEqual({ nodes: 2, edges: 1 });
    expect(diagramSize('graph TD; A["x;y"]-->B; B-->C')).toEqual({ nodes: 3, edges: 2 });
  });

  it("reads a one-line graph and a diagram behind a front-matter block", () => {
    expect(diagramSize("graph TD; A-->B; B-->C")).toEqual({ nodes: 3, edges: 2 });
    expect(diagramSize("---\ntitle: Flow\n---\nflowchart LR\n  A --> B")).toEqual({
      nodes: 2,
      edges: 1,
    });
  });

  // QFAI:EX-0001-0240-10
  it("takes the limits from the configuration", async () => {
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "validation:\n  diagramBudget:\n    nodes: 20\n    edges: 30\n",
    );
    await write(FLOW, chain(13));
    const { config, issues } = await loadConfig(root);
    expect(issues).toEqual([]);
    expect(await budgetFindings(config)).toEqual([]);
  });

  // QFAI:EX-0001-0240-11
  it("rejects a node limit of 0 and keeps the default", async () => {
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "validation:\n  diagramBudget:\n    nodes: 0\n",
    );
    await write(FLOW, chain(13));
    const { config, issues } = await loadConfig(root);
    expect(issues.map((found) => [found.code, found.message])).toEqual([
      ["QFAI-CFG-002", "validation.diagramBudget.nodes must be an integer of 1 or more."],
    ]);
    const [finding] = await budgetFindings(config);
    expect(finding?.message).toContain("the budget is 12 nodes and 16 edges");
  });

  // QFAI:EX-0001-0240-12
  it("rejects a budget that is not a mapping and keeps both defaults", async () => {
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "validation:\n  diagramBudget:\n    - 20\n",
    );
    const { config, issues } = await loadConfig(root);
    expect(issues.map((found) => [found.code, found.message])).toEqual([
      ["QFAI-CFG-002", "validation.diagramBudget must be an object."],
    ]);
    expect(config.validation.diagramBudget).toBeUndefined();
  });

  it("rejects a key that is not a limit", async () => {
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "validation:\n  diagramBudget:\n    node: 20\n",
    );
    const { issues } = await loadConfig(root);
    expect(issues.map((found) => found.message)).toEqual([
      "validation.diagramBudget.node is not a setting.",
    ]);
  });
});
