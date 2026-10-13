import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import { validateProject } from "../../src/core/validate.js";

let root: string;
const specs = ".qfai/spec";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-decision-approaches-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function put(file: string, text: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text, "utf8");
}

async function approachFindings(rows: string[]) {
  await put(
    `${specs}/decisions.md`,
    [
      "# Decisions",
      "",
      "## Decisions",
      "",
      "| ID | Content | Approach | Status |",
      "| --- | --- | --- | --- |",
      ...rows,
      "",
    ].join("\n"),
  );
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = specs;
  config.paths.contractsDir = `${specs}/03_contract`;
  const result = await validateProject(
    root,
    { config, issues: [], configPath: path.join(root, "qfai.config.yaml") },
    { profile: "sdd" },
  );
  return result.issues.filter((item) => item.code === "QFAI-STORY-017");
}

describe("the Approach cell of a decision row above the checked ID", () => {
  // QFAI:AC-0001-0053-08
  // QFAI:EX-0001-0053-09
  it("is reported as an error naming the row when an item is missing", async () => {
    const findings = await approachFindings([
      "| DEC-2098 | Decide | - Evidence: file:a.ts - Residual risk: x - Rollback: y | DONE |",
    ]);
    expect(findings.map((item) => [item.refs, item.severity])).toEqual([[["DEC-2098"], "error"]]);
    expect(findings[0]?.message).toContain("lacks the item Grounds");
  });

  // QFAI:AC-0001-0053-08
  // QFAI:EX-0001-0053-12
  // QFAI:EX-0001-0053-23
  it("passes a complete row and leaves an earlier row unread", async () => {
    const findings = await approachFindings([
      "| DEC-0008 | Old | Kept | DONE |",
      "| DEC-2097 | Old | Kept | DONE |",
      "| DEC-2098 | Decide | - Evidence: file:a.ts - Grounds: g - Residual risk: none — read-only - Rollback: none — nothing to undo | DONE |",
    ]);
    expect(findings).toEqual([]);
  });
});

describe("inline code in a parsed decision Approach", () => {
  const complete = (grounds: string, evidence = "file:a.ts") =>
    `- Evidence: ${evidence} - Grounds: ${grounds} - Residual risk: x - Rollback: y`;
  const row = (approach: string) => `| DEC-2098 | Decide | ${approach} | DONE |`;

  // QFAI:AC-0001-0053-08
  // QFAI:EX-0001-0053-16
  it("retains a quoted label prefix and the original parsed Approach value", async () => {
    const prefix =
      "- Evidence: file:.qfai/spec/03_contract/cli/cli-0015-qfai-workflow.md; file:.qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0220/02_Acceptance-Criteria.md; file:.qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0220/03_Example.md - Grounds: ";
    const approach = complete("\u65e5\u672c\u8a9e The stored prefix is `" + prefix + "`.");
    const markdown = [
      "# Decisions",
      "",
      "## Decisions",
      "",
      "| ID | Content | Approach | Status |",
      "| --- | --- | --- | --- |",
      row(approach),
    ].join("\n");
    const tree = buildStoryTreeModel(new Map([[`${specs}/decisions.md`, markdown]]), {
      specsDir: specs,
      contractsDir: `${specs}/03_contract`,
    });
    expect(tree.decisions?.rows.map((item) => item.approach)).toEqual([approach]);
    expect(await approachFindings([row(approach)])).toEqual([]);
  });

  // QFAI:AC-0001-0053-08
  // QFAI:EX-0001-0053-17
  // QFAI:EX-0001-0053-18
  // QFAI:EX-0001-0053-20
  // QFAI:EX-0001-0053-23
  it.each([
    "` - Grounds: code-only content`",
    "`` - Evidence: file:quoted.ts ` and ``` - Grounds: literal``",
    "`unmatched then `` - Evidence: file:quoted.ts - Grounds: literal``",
    "` - Grounds: literal\\`",
    "\\\\`` - Grounds: literal``",
    "\\``` - Grounds: literal``",
  ])("keeps closed code literal through the Markdown table: %s", async (grounds) => {
    expect(await approachFindings([row(complete(grounds))])).toEqual([]);
  });

  // QFAI:AC-0001-0053-08
  // QFAI:EX-0001-0053-18
  // QFAI:EX-0001-0053-19
  // QFAI:EX-0001-0053-21
  // QFAI:EX-0001-0053-22
  // QFAI:EX-0001-0053-23
  it.each([
    [complete("\\` - Grounds: duplicate`"), "out of order"],
    [
      "- Evidence: file:a.ts quotes `text - Grounds: literal` - Residual risk: x - Rollback: y",
      "lacks the item Grounds",
    ],
    [complete("` - Grounds: literal\\` - Rollback: premature"), "out of order"],
    [complete("`` unmatched ``` - Grounds: duplicate"), "out of order"],
    [complete("g") + " - Grounds: duplicate", "out of order"],
    ["- Evidence: file:a.ts - Grounds: g - Rollback: y - Residual risk: x", "out of order"],
    [complete(""), "empty Grounds item"],
    [complete("g", "`file:a.ts`"), "neither file: nor command:"],
    [complete("none — obvious"), '"none —" in its Grounds item'],
  ])("retains real item failures after table parsing: %s", async (approach, problem) => {
    const findings = await approachFindings([row(approach)]);
    expect(findings.map((item) => [item.code, item.severity, item.file, item.refs])).toEqual([
      ["QFAI-STORY-017", "error", `${specs}/decisions.md`, ["DEC-2098"]],
    ]);
    expect(findings[0]?.message).toContain(problem);
  });
});
