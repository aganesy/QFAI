/**
 * Integration: the missing-approval stop of `/qfai-sdd` is stated the same way in the three files
 * that carry it, and none of them names a work-log entry.
 *
 * The cases read the package's own assets, not the `.qfai/assistant` mirror. Each finds the unit
 * that carries the stop exactly once in every file, so an absence cannot pass on a file that was
 * not read.
 */
// QFAI:SPEC-0013:TC-0013-0039

import { readFile } from "node:fs/promises";
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
  "qfai-sdd",
);

type Unit = { readonly count: number; readonly text: string };

/** Every line from the heading to the next heading of the same or a higher level. */
function section(lines: readonly string[], heading: string): Unit {
  const starts = lines.flatMap((line, index) => (line === heading ? [index] : []));
  const level = /^#+/.exec(heading)?.[0].length ?? 0;
  const first = starts[0];
  if (starts.length !== 1 || first === undefined) return { count: starts.length, text: "" };
  const stop = new RegExp(`^#{1,${String(level)}} `);
  const rest = lines.slice(first + 1);
  const end = rest.findIndex((line) => stop.test(line));
  return { count: 1, text: (end < 0 ? rest : rest.slice(0, end)).join("\n") };
}

/** The item starting with `prefix`, up to the next item matching `next` or a heading. */
function item(lines: readonly string[], prefix: string, next: RegExp): Unit {
  const starts = lines.flatMap((line, index) => (line.startsWith(prefix) ? [index] : []));
  const first = starts[0];
  if (starts.length !== 1 || first === undefined) return { count: starts.length, text: "" };
  const rest = lines.slice(first + 1);
  const end = rest.findIndex((line) => next.test(line) || line.startsWith("#"));
  return { count: 1, text: [lines[first], ...(end < 0 ? rest : rest.slice(0, end))].join("\n") };
}

/** The three files AC-0013-0029 names, each with the unit that carries the stop. */
const STOP_UNITS: ReadonlyArray<{
  readonly name: string;
  readonly unit: (lines: readonly string[]) => Unit;
}> = [
  {
    name: "SKILL.md",
    unit: (lines) => section(lines, "### `--auto` and approval-required rows"),
  },
  {
    name: "references/sdd-execution-playbook.md",
    unit: (lines) =>
      item(lines, "- Triage rows requiring approval but lacking `Approved By`", /^- /),
  },
  {
    name: "references/sdd-triage.md",
    unit: (lines) => item(lines, "7. **Stop.**", /^\d+\. /),
  },
];

async function readStopUnits(): Promise<
  Array<{ readonly name: string; readonly text: string; readonly unit: Unit }>
> {
  const out: Array<{ name: string; text: string; unit: Unit }> = [];
  for (const { name, unit } of STOP_UNITS) {
    const text = await readFile(path.join(SKILL_DIR, ...name.split("/")), "utf-8");
    out.push({ name, text, unit: unit(text.split(/\r?\n/)) });
  }
  return out;
}

/**
 * The three steps, read with backticks and emphasis markers removed and each run of whitespace,
 * line breaks included, read as one space.
 */
const STOP_STEPS: ReadonlyArray<readonly [string, RegExp]> = [
  ["leave Approved By as -", /\bApproved By as -/],
  ["do not enter Phase 0", /\bdo not enter Phase 0\b/i],
  [
    "report every unapproved row with its Operation and target",
    /\breport\b[^.]*?\bevery unapproved row\b[^.]*?\bOperation\b[^.]*?\btarget\b/i,
  ],
];

describe("TC-0013-0039: approval stop writes no entry", () => {
  it("TC-0013-0039: SKILL.md, the execution playbook and the triage reference each state the three stop steps", async () => {
    const units = await readStopUnits();

    expect(
      units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
      "each file's stop unit is found exactly once",
    ).toEqual(STOP_UNITS.map(({ name }) => `${name}: 1`));

    const missing = units.flatMap(({ name, unit }) => {
      const plain = unit.text.replace(/[`*]/g, "").replace(/\s+/g, " ");
      return STOP_STEPS.filter(([, pattern]) => !pattern.test(plain)).map(
        ([step]) => `${name}: ${step}`,
      );
    });
    expect(missing).toEqual([]);
  });

  it("TC-0013-0039: none of the three files names a work-log entry or consultation-needed", async () => {
    const units = await readStopUnits();

    expect(
      units.map(({ name, unit }) => `${name}: ${String(unit.count)}`),
      "each file's stop unit is found exactly once",
    ).toEqual(STOP_UNITS.map(({ name }) => `${name}: 1`));

    const found = units.flatMap(({ name, text }) => [
      ...(/work-log/i.test(text) ? [`${name}: work-log`] : []),
      ...(text.includes("consultation-needed") ? [`${name}: consultation-needed`] : []),
    ]);
    expect(found).toEqual([]);
  });
});
