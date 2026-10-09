import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { classifyRecordRow, parseRecordTable } from "../../src/core/storyTree/tables.js";
import { captureStdout } from "../helpers/stdout.js";

const headings = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";

describe("BF-0001 project records", () => {
  // QFAI:AC-0001-0007-01
  // QFAI:EX-0001-0007-01
  it("accepts an empty decisions table with the four canonical columns", () => {
    expect(parseRecordTable(headings, "decisions").errors).toEqual([]);
  });

  // QFAI:EX-0001-0007-02
  it("rejects an added Date column in open questions", () => {
    const text = "| ID | Content | Approach | Status | Date |\n| --- | --- | --- | --- | --- |\n";
    expect(parseRecordTable(text, "open-questions").errors).toContain(
      "open-questions has the unexpected column Date",
    );
  });

  it("names a missing column and a column order that differs", () => {
    const missing = "| ID | Content | Status |\n| --- | --- | --- |\n";
    expect(parseRecordTable(missing, "decisions").errors).toEqual([
      "decisions is missing the column Approach",
    ]);
    const reordered = "| ID | Content | Status | Approach |\n| --- | --- | --- | --- |\n";
    expect(parseRecordTable(reordered, "decisions").errors).toEqual([
      "decisions columns must be ID, Content, Approach and Status, in that order",
    ]);
  });

  // QFAI:AC-0001-0007-01
  // QFAI:EX-0001-0007-03
  it("accepts the declared decision and question statuses", () => {
    const decisions = ["TODO", "WIP", "DONE", "SUPERSEDED (by DEC-0005)", "REJECTED"]
      .map((status, index) => `| DEC-000${index + 1} | Choice | Reason | ${status} |`)
      .join("\n");
    const questions = ["TODO", "WIP", "DONE", "DEFERRED"]
      .map((status, index) => `| OQ-000${index + 1} | Question | Owner | ${status} |`)
      .join("\n");
    expect(parseRecordTable(`${headings}${decisions}\n`, "decisions").errors).toEqual([]);
    expect(parseRecordTable(`${headings}${questions}\n`, "open-questions").errors).toEqual([]);
  });

  // QFAI:EX-0001-0007-12
  it("accepts a parenthesised partial supersession and keeps the row in force", () => {
    const accepted = parseRecordTable(
      `${headings}| DEC-0001 | Change request: 01_policy/glossary.md | Reason | PARTLY SUPERSEDED (by DEC-0002) |\n`,
      "decisions",
    );
    expect(accepted.errors).toEqual([]);
    expect(accepted.rows.map((row) => classifyRecordRow(row).inForce)).toEqual([true]);
    const rejected = parseRecordTable(
      `${headings}| DEC-0001 | Choice | Reason | PARTLY SUPERSEDED by DEC-0002 |\n`,
      "decisions",
    );
    expect(rejected.errors).toContain(
      "decisions row DEC-0001 has an invalid Status: PARTLY SUPERSEDED by DEC-0002",
    );
  });

  // QFAI:EX-0001-0007-04
  it("rejects DEFERRED on a decision row and identifies that row", () => {
    const result = parseRecordTable(
      `${headings}| DEC-0001 | Choice | Reason | DEFERRED |\n`,
      "decisions",
    );
    expect(result.errors).toContain("decisions row DEC-0001 has an invalid Status: DEFERRED");
  });

  // QFAI:EX-0001-0007-05
  it("rejects a decision ID in open questions and identifies the row", () => {
    const result = parseRecordTable(
      `${headings}| DEC-0001 | Question | Owner | TODO |\n`,
      "open-questions",
    );
    expect(result.errors).toContain("open-questions row 1 has an invalid ID: DEC-0001");
  });

  // QFAI:AC-0001-0053-04
  it("reads the references of a keyword row and holds the row by its Status alone", () => {
    const classify = (kind: "decisions" | "open-questions", content: string, status: string) => {
      const id = kind === "decisions" ? "DEC-0001" : "OQ-0001";
      const parsed = parseRecordTable(
        `${headings}| ${id} | ${content} | Reason | ${status} |\n`,
        kind,
      );
      expect(parsed.errors).toEqual([]);
      return parsed.rows.map((row) => classifyRecordRow(row));
    };
    const heldAt = (kind: "decisions" | "open-questions", content: string, statuses: string[]) =>
      statuses.map((status) => classify(kind, content, status).map((row) => row.inForce));

    const exception = classify(
      "decisions",
      "Test exception: EX-0001-0001-01, AC-0001-0001-01",
      "DONE",
    );
    expect(exception.map((row) => [row.kind, row.refs])).toEqual([
      ["test-exception", ["EX-0001-0001-01", "AC-0001-0001-01"]],
    ]);
    const request = classify(
      "decisions",
      "Change request: 01_policy/glossary.md, 01_policy/constraint.md",
      "WIP",
    );
    expect(request.map((row) => [row.kind, row.refs])).toEqual([
      ["change-request", ["01_policy/glossary.md", "01_policy/constraint.md"]],
    ]);

    const statuses = ["TODO", "WIP", "DONE", "REJECTED"];
    expect(heldAt("decisions", "Test exception: EX-0001-0001-01", statuses)).toEqual([
      [false],
      [false],
      [true],
      [false],
    ]);
    expect(heldAt("decisions", "Change request: 01_policy/glossary.md", statuses)).toEqual([
      [false],
      [true],
      [true],
      [false],
    ]);
    expect(
      heldAt("open-questions", "Unadjudicated: choose a layout", [
        "TODO",
        "WIP",
        "DONE",
        "DEFERRED",
      ]),
    ).toEqual([[true], [true], [false], [false]]);
  });
});

describe("BF-0001 init preserves project content", () => {
  // QFAI:EX-0001-0006-01
  // QFAI:EX-0001-0006-02
  // QFAI:EX-0001-0012-01
  // QFAI:EX-0001-0022-01
  // QFAI:EX-0001-0029-01
  // QFAI:EX-0001-0029-02
  it("refreshes shipped skills while retaining local skills and Copilot prose", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-early-init-"));
    try {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
      const spec = path.join(root, ".qfai", "spec");
      expect(await readdir(path.join(spec, "01_policy"))).toEqual(
        expect.arrayContaining([
          "objective.md",
          "initiative.md",
          "principle.md",
          "glossary.md",
          "constraint.md",
        ]),
      );
      expect(await readdir(path.join(spec, "03_contract"))).toEqual(
        expect.arrayContaining(["contracts.md", "tech.md", "api", "db", "ui", "cli"]),
      );
      const assistant = path.join(root, ".qfai", "assistant");
      expect(await readdir(assistant)).toEqual(
        expect.arrayContaining(["rule", "skill", "agent", "prompt"]),
      );
      const skill = path.join(assistant, "skill", "qfai-discussion", "SKILL.md");
      const localSkill = path.join(assistant, "skill.local", "my-skill", "SKILL.md");
      const copilot = path.join(root, ".github", "copilot-instructions.md");
      expect(await readFile(copilot, "utf8")).toContain(".qfai/assistant/rule/");

      await mkdir(path.dirname(localSkill), { recursive: true });
      await writeFile(localSkill, "# My skill\n", "utf8");
      expect(await readdir(assistant)).toContain("skill.local");
      await writeFile(skill, "# Stale shipped skill\n", "utf8");
      await writeFile(
        copilot,
        `${await readFile(copilot, "utf8")}\nProject-specific paragraph.\n`,
        "utf8",
      );
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
      expect(await readFile(copilot, "utf8")).toContain("Project-specific paragraph.");
      await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

      expect(await readFile(skill, "utf8")).not.toBe("# Stale shipped skill\n");
      expect(await readFile(localSkill, "utf8")).toBe("# My skill\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
