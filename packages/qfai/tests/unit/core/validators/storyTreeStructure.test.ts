// QFAI:EX-0004-0001-01
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import { buildStoryTreeModel } from "../../../../src/core/storyTree/tree.js";
import {
  validateStoryDirectories,
  validateStoryTreeStructure,
  validateStoryTreeStructureModel,
} from "../../../../src/core/validators/storyTreeStructure.js";

const specs = ".qfai/spec";
const contracts = `${specs}/03_contract`;
const story = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001`;

function model(overrides: Record<string, string> = {}) {
  const files = new Map<string, string>([
    [`${specs}/02_business-flow/business-flow-0001/business-flow.md`, "# BF-0001: Checkout"],
    [`${story}/01_User-story.md`, "# US-0001-0001: Checkout"],
    [`${story}/02_Acceptance-Criteria.md`, "```gherkin\n# AC-0001-0001-01\nScenario: paid\n```"],
    [
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Example |\n| --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | paid |",
    ],
    [
      `${contracts}/api/checkout.yaml`,
      "x-qfai-rules:\n  - id: BR-0001\n    statement: Paid checkout\n    examples: [EX-0001-0001-01]",
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
