import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runInit } from "../helpers/legacyInit.js";
import { classifyRecordRow, parseRecordTable } from "../../src/core/storyTree/tables.js";
import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import { validateStoryTreeStructureModel } from "../../src/core/validators/storyTreeStructure.js";
import { captureStdout } from "../helpers/stdout.js";

const headings = "| ID | Content | Approach |\n| --- | --- | --- |\n";

describe("BF-0001 project records", () => {
  // QFAI:AC-0001-0007-01
  // QFAI:EX-0001-0007-01
  it("accepts an empty decisions table with the three canonical columns", () => {
    expect(parseRecordTable(headings, "decisions").errors).toEqual([]);
  });

  // QFAI:EX-0001-0007-02
  it("rejects an added Date column in open questions", () => {
    const text = "| ID | Content | Approach | Date |\n| --- | --- | --- | --- |\n";
    expect(parseRecordTable(text, "open-questions").errors).toContain(
      "open-questions has the unexpected column Date",
    );
  });

  // QFAI:EX-0001-0007-04
  it("rejects a Status column that a decisions table still has", () => {
    const text = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
    expect(parseRecordTable(text, "decisions").errors).toEqual([
      "decisions has the unexpected column Status",
    ]);
  });

  it("names a missing column and a column order that differs", () => {
    const missing = "| ID | Content |\n| --- | --- |\n";
    expect(parseRecordTable(missing, "decisions").errors).toEqual([
      "decisions is missing the column Approach",
    ]);
    const reordered = "| ID | Approach | Content |\n| --- | --- | --- |\n";
    expect(parseRecordTable(reordered, "decisions").errors).toEqual([
      "decisions columns must be ID, Content and Approach, in that order",
    ]);
  });

  // QFAI:AC-0001-0007-01
  // QFAI:EX-0001-0007-03
  it("accepts both ID forms in each table", () => {
    const decisions = "| DEC-0007 | Choice | Reason |\n| DEC-20261105093000 | Choice | Reason |\n";
    const questions = "| OQ-0012 | Question | Owner |\n| OQ-20261105093000 | Question | Owner |\n";
    expect(parseRecordTable(`${headings}${decisions}`, "decisions").errors).toEqual([]);
    expect(parseRecordTable(`${headings}${questions}`, "open-questions").errors).toEqual([]);
  });

  // QFAI:AC-0001-0007-02
  // QFAI:EX-0001-0007-38
  it("requires the decision a Supersedes or Narrows citation names to be a row", () => {
    const tree = (rows: string) =>
      buildStoryTreeModel(
        new Map([
          ["spec/decisions.md", `# Decisions\n\n## Decisions\n\n${headings}${rows}`],
          [
            "spec/02_business-flow/business-flows.md",
            "| BF-ID | Flow | Path |\n| --- | --- | --- |\n",
          ],
        ]),
        { specsDir: "spec", contractsDir: "spec/03_contract" },
      );
    const findings = validateStoryTreeStructureModel(
      tree(
        "| DEC-0007 | Choice | Reason |\n" +
          "| DEC-20261105093000 | Newer choice | Supersedes DEC-0007 |\n" +
          "| DEC-20261105093001 | Narrower choice | Narrows DEC-0999 |\n",
      ),
    );
    expect(findings.map(({ code, refs, file }) => [code, refs, file])).toEqual([
      ["QFAI-STORY-003", ["DEC-20261105093001", "DEC-0999"], "spec/decisions.md"],
    ]);
  });

  // QFAI:EX-0001-0007-05
  it("rejects a decision ID in open questions and identifies the row", () => {
    const result = parseRecordTable(
      `${headings}| DEC-0001 | Question | Owner |\n`,
      "open-questions",
    );
    expect(result.errors).toContain("open-questions row 1 has an invalid ID: DEC-0001");
  });

  // QFAI:AC-0001-0053-04
  it("reads the kind and references of a keyword row from its Content alone", () => {
    const classify = (kind: "decisions" | "open-questions", content: string) => {
      const id = kind === "decisions" ? "DEC-0001" : "OQ-0001";
      const parsed = parseRecordTable(`${headings}| ${id} | ${content} | Reason |\n`, kind);
      expect(parsed.errors).toEqual([]);
      return parsed.rows.map((row) => {
        const { kind: rowKind, refs } = classifyRecordRow(row);
        return [rowKind, refs];
      });
    };
    expect(classify("decisions", "Test exception: EX-0001-0001-01, AC-0001-0001-01")).toEqual([
      ["test-exception", ["EX-0001-0001-01", "AC-0001-0001-01"]],
    ]);
    expect(
      classify("decisions", "Change request: 01_policy/glossary.md, 01_policy/constraint.md"),
    ).toEqual([["change-request", ["01_policy/glossary.md", "01_policy/constraint.md"]]]);
    expect(classify("decisions", "Declined change request: 01_policy/glossary.md")).toEqual([
      ["declined-change-request", ["01_policy/glossary.md"]],
    ]);
    expect(classify("decisions", "Declined: 01_policy/glossary.md")).toEqual([["other", []]]);
    expect(classify("open-questions", "Unadjudicated: choose a layout")).toEqual([
      ["unadjudicated", []],
    ]);
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

  // QFAI:AC-0001-0029-04
  // QFAI:EX-0001-0029-04
  it("keeps the project's rule-list entries and sections when --force rewrites the Copilot file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-copilot-force-"));
    try {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
      const copilot = path.join(root, ".github", "copilot-instructions.md");
      const shipped = await readFile(copilot, "utf8");
      const ownRule = [
        "- `.agents/rules/house-style.md` — read when you write prose: follow the house style.",
        "  It also covers commit messages.",
      ].join("\n");
      const ownSection = ["## Project notes", "", "Deploy from the main branch only."].join("\n");
      const lastShippedBullet = shipped
        .split("\n")
        .filter((line) => line.startsWith("- `.agents/rules/"))
        .at(-1);
      if (lastShippedBullet === undefined) throw new Error("the shipped file has no rule bullet");
      const withRule = shipped.replace(
        `${lastShippedBullet}\n`,
        `${lastShippedBullet}\n${ownRule}\n`,
      );
      await writeFile(copilot, `${withRule}\n${ownSection}\n`, "utf8");

      const stderr = await captureStderr(() =>
        captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true })),
      );

      const after = await readFile(copilot, "utf8");
      expect(after.startsWith(withRule)).toBe(true);
      expect(after).toContain(ownSection);
      expect(stderr).not.toContain("copilot-instructions.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // QFAI:EX-0001-0029-05
  it("names each line --force changed or removed in the Copilot file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-copilot-removed-"));
    try {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
      const copilot = path.join(root, ".github", "copilot-instructions.md");
      const shipped = await readFile(copilot, "utf8");
      const shippedLine = "- Always match the user's language in your outputs.";
      const editedLine = "- Always answer in English.";
      expect(shipped).toContain(shippedLine);
      const edited = shipped.replace(shippedLine, editedLine);
      await writeFile(copilot, edited, "utf8");

      const preview = await captureStderr(() =>
        captureStdout(() => runInit({ dir: root, force: true, dryRun: true, yes: true })),
      );

      expect(await readFile(copilot, "utf8")).toBe(edited);
      expect(preview).toContain("would change or remove");
      expect(preview).toContain(editedLine);

      const stderr = await captureStderr(() =>
        captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true })),
      );

      expect(await readFile(copilot, "utf8")).toBe(shipped);
      expect(stderr).toContain(".github/copilot-instructions.md");
      expect(stderr).toContain(editedLine);
      expect(stderr).not.toContain(shippedLine);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function captureStderr(task: () => Promise<unknown>): Promise<string> {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  });
  try {
    await task();
  } finally {
    spy.mockRestore();
  }
  return chunks.join("");
}
