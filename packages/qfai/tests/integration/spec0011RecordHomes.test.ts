/**
 * Integration: the shipped `/qfai-implement` skill records a stop in the ledger row and sends
 * every other record to `/qfai-sdd`, and names no work-log surface.
 *
 * The cases read the package's own assets, not the `.qfai/assistant` mirror. Each text oracle
 * reads a unit it first finds exactly once, so an absence cannot pass on a unit that was not read.
 */
// QFAI:SPEC-0011:TC-0011-0013

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SKILL_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
);
const SKILL = path.join(SKILL_DIR, "SKILL.md");
const LEDGER = path.join(SKILL_DIR, "references", "execution-ledger.md");

async function linesOf(file: string): Promise<string[]> {
  return (await readFile(file, "utf-8")).split(/\r?\n/);
}

/** Every line from `heading` to the next heading of the same or a higher level; `[]` unless found once. */
function section(lines: readonly string[], heading: string): { count: number; body: string[] } {
  const starts = lines.flatMap((line, index) => (line === heading ? [index] : []));
  const level = /^#+/.exec(heading)?.[0].length ?? 0;
  const first = starts[0];
  if (starts.length !== 1 || first === undefined) return { count: starts.length, body: [] };
  const stop = new RegExp(`^#{1,${String(level)}} `);
  const rest = lines.slice(first + 1);
  const end = rest.findIndex((line) => stop.test(line));
  return { count: 1, body: end < 0 ? rest : rest.slice(0, end) };
}

/** The top-level bullet starting with `prefix`, up to the next top-level bullet or heading. */
function bullet(lines: readonly string[], prefix: string): { count: number; text: string } {
  const starts = lines.flatMap((line, index) => (line.startsWith(prefix) ? [index] : []));
  const first = starts[0];
  if (starts.length !== 1 || first === undefined) return { count: starts.length, text: "" };
  const rest = lines.slice(first + 1);
  const end = rest.findIndex((line) => line.startsWith("- ") || line.startsWith("#"));
  return { count: 1, text: [lines[first], ...(end < 0 ? rest : rest.slice(0, end))].join("\n") };
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

const STOP = /\bstops?\b/i;
const DECISION = /\bdecisions?\b/i;
const CONSULTATION = /\bconsultations?\b(?!-)/i;
const DISCOVERY = /\bout-of-scope discover(?:y|ies)\b/i;

describe("TC-0011-0013: records go to existing homes", () => {
  it("TC-0011-0013: the qfai-implement skill records a stop in Blocked-By and sends decisions, consultations and discoveries to /qfai-sdd as a Change Request", async () => {
    const constraints = section(await linesOf(SKILL), "## CRITICAL CONSTRAINTS (Read First)");
    const blockedEdge = bullet(await linesOf(LEDGER), "- Any active status -> `blocked`");

    expect(
      { constraints: constraints.count, blockedEdge: blockedEdge.count },
      "each unit read is found exactly once",
    ).toEqual({ constraints: 1, blockedEdge: 1 });

    const units = blocks(constraints.body);
    const missing = [
      units.some((block) => STOP.test(block) && block.includes("`Blocked-By`"))
        ? []
        : ["SKILL.md: a stop recorded in `Blocked-By`"],
      units.some(
        (block) =>
          DECISION.test(block) &&
          CONSULTATION.test(block) &&
          DISCOVERY.test(block) &&
          block.includes("/qfai-sdd") &&
          block.includes("Change Request"),
      )
        ? []
        : [
            "SKILL.md: a decision, a consultation and an out-of-scope discovery sent to /qfai-sdd as a Change Request",
          ],
      blockedEdge.text.includes("`Blocked-By`")
        ? []
        : ["execution-ledger.md: the -> blocked edge records the stop in `Blocked-By`"],
    ].flat();
    expect(missing).toEqual([]);
  });

  it("TC-0011-0013: the blocked -> todo bullet of execution-ledger.md closes no record", async () => {
    const lines = await linesOf(LEDGER);
    const transitions = section(lines, "### Allowed transitions");
    const resume = bullet(transitions.body, "- `blocked` -> `todo`");

    expect(
      { transitions: transitions.count, resume: resume.count },
      "the Allowed transitions section and its blocked -> todo bullet are found exactly once",
    ).toEqual({ transitions: 1, resume: 1 });

    const found = [
      ...(resume.text.includes("archived") ? ["archived"] : []),
      ...(resume.text.match(/\bclose\s+(?:the|its|a|an|that)\s+(?:\S+\s+)?(?:entry|record)\b/gi) ??
        []),
    ];
    expect(found).toEqual([]);
  });

  it("TC-0011-0013: no qfai-implement skill file names .qfai/steering/ or worklog-entry.schema.md or a work-log entry", async () => {
    const files: string[] = [];
    for (const entry of await readdir(SKILL_DIR, { recursive: true, withFileTypes: true })) {
      if (entry.isFile()) files.push(path.join(entry.parentPath, entry.name));
    }
    const relative = files.map((file) => path.relative(SKILL_DIR, file).replace(/\\/g, "/"));

    expect(
      ["SKILL.md", "references/execution-ledger.md"].filter((name) => !relative.includes(name)),
      "the walk read the skill directory",
    ).toEqual([]);

    const found: string[] = [];
    for (const [index, file] of files.entries()) {
      const text = await readFile(file, "utf-8");
      const name = relative[index] ?? file;
      for (const token of [".qfai/steering/", "worklog-entry.schema.md"]) {
        if (text.includes(token)) found.push(`${name}: ${token}`);
      }
      if (
        (name === "SKILL.md" || name === "references/execution-ledger.md") &&
        /work-log entry/i.test(text)
      ) {
        found.push(`${name}: work-log entry`);
      }
    }
    expect(found).toEqual([]);
  });
});
