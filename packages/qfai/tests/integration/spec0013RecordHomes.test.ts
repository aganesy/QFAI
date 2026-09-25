/**
 * Integration: the shipped `/qfai-sdd` skill sends every record to the spec pack or a Change
 * Request, and the shipped assistant tree names no work-log surface.
 *
 * The cases read the package's own assets, not the `.qfai/assistant` mirror. Each text oracle
 * reads a unit it first finds, so an absence cannot pass on files that were not read.
 */
// QFAI:SPEC-0013:TC-0013-0038

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ASSISTANT_DIR = path.resolve(__dirname, "..", "..", "assets", "init", ".qfai", "assistant");
const SKILL_DIR = path.join(ASSISTANT_DIR, "skills", "qfai-sdd");
const SKILL = path.join(SKILL_DIR, "SKILL.md");
/** A heading `AC-0013-0029` names in `SKILL.md`, found once so the file read is the skill. */
const SKILL_ANCHOR = "### `--auto` and approval-required rows";

async function linesOf(file: string): Promise<string[]> {
  return (await readFile(file, "utf-8")).split(/\r?\n/);
}

/** Every file under `dir`, by absolute path and by POSIX path relative to `dir`. */
async function walk(dir: string): Promise<Array<{ file: string; name: string }>> {
  const out: Array<{ file: string; name: string }> = [];
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    out.push({ file, name: path.relative(dir, file).replace(/\\/g, "/") });
  }
  return out;
}

/** Paragraphs and list items: a new block starts at a list marker or after a blank line. */
function blocks(lines: readonly string[]): string[] {
  const out: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    const startsItem = /^\s*(?:[-*]|\d+\.)\s/.test(line);
    if (line.trim() === "" || startsItem) {
      if (current.length > 0) out.push(current.join("\n"));
      current = line.trim() === "" ? [] : [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) out.push(current.join("\n"));
  return out;
}

const DECISION = /\bdecisions?\b/i;
const CONSULTATION = /\bconsultations?\b(?!-)/i;
const DISCOVERY = /\bout-of-scope discover(?:y|ies)\b/i;

describe("TC-0013-0038: records go to the spec pack", () => {
  it("TC-0013-0038: the qfai-sdd skill sends a decision to 07_Decisions.md and a consultation or discovery to 08_Open-questions.md", async () => {
    const files = (await walk(SKILL_DIR)).filter(
      ({ name }) => name === "SKILL.md" || name.startsWith("references/"),
    );

    expect(
      {
        skill: files.some(({ name }) => name === "SKILL.md"),
        references: files.filter(({ name }) => name.startsWith("references/")).length > 0,
      },
      "the walk read SKILL.md and the references",
    ).toEqual({ skill: true, references: true });

    const all: string[] = [];
    for (const { file } of files) all.push(...blocks(await linesOf(file)));
    const stated = {
      decision: all.some(
        (block) =>
          DECISION.test(block) &&
          block.includes("07_Decisions.md") &&
          block.includes("Change Request"),
      ),
      consultationOrDiscovery: all.some(
        (block) =>
          CONSULTATION.test(block) &&
          DISCOVERY.test(block) &&
          block.includes("08_Open-questions.md") &&
          block.includes("Change Request"),
      ),
    };
    expect(stated).toEqual({ decision: true, consultationOrDiscovery: true });
  });

  it("TC-0013-0038: the qfai-sdd SKILL.md has no Work-log entries section", async () => {
    const lines = await linesOf(SKILL);

    expect(
      lines.filter((line) => line === SKILL_ANCHOR),
      "the file read is the qfai-sdd skill",
    ).toHaveLength(1);

    expect(lines.filter((line) => line.includes("## Work-log entries"))).toEqual([]);
  });

  it("TC-0013-0038: the qfai-sdd SKILL.md cites no W-PENDING-PROMOTION example", async () => {
    const lines = await linesOf(SKILL);

    expect(
      lines.filter((line) => line === SKILL_ANCHOR),
      "the file read is the qfai-sdd skill",
    ).toHaveLength(1);

    expect(lines.filter((line) => line.includes("W-PENDING-PROMOTION"))).toEqual([]);
  });

  it("TC-0013-0038: no file of the shipped assistant tree names .qfai/steering/ or worklog-entry.schema.md", async () => {
    const files = await walk(ASSISTANT_DIR);

    expect(
      ["skills/qfai-sdd/SKILL.md", "skills/qfai-implement/SKILL.md"].filter(
        (name) => !files.some((entry) => entry.name === name),
      ),
      "the walk read the shipped assistant tree",
    ).toEqual([]);

    const found: string[] = [];
    for (const { file, name } of files) {
      const text = await readFile(file, "utf-8");
      for (const token of [".qfai/steering/", "worklog-entry.schema.md"]) {
        if (text.includes(token)) found.push(`${name}: ${token}`);
      }
    }
    expect(found).toEqual([]);
  });
});
