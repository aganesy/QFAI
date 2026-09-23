/**
 * Integration: `qfai validate` does not read the work-log directory `.qfai/steering/`.
 *
 * Each case builds its own tree in a fresh temporary directory and runs validate in-process
 * from `src`. An absent finding proves nothing unless validate read the tree, so each case also
 * requires a finding that only reading a file of that tree can produce.
 */
// QFAI:SPEC-0004:TC-0004-0074

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { removeTempTree } from "../helpers/tempTree.js";

const WORKLOG_CODES: readonly string[] = [
  "W-WORKLOG-SCHEMA",
  "W-WORKLOG-BROKEN-LINK",
  "W-WORKLOG-STALE",
  "W-PENDING-PROMOTION",
  "R-HANDOFF-INCOMPLETE",
];

/** `.qfai/steering` followed by `/` or the end of the string, so `.qfai/assistant/steering/` never matches. */
const STEERING_PATH = /\.qfai\/steering(?:\/|$)/;

type ReportedIssue = {
  readonly code: string;
  /** Every field that can name a path, with `\` normalised to `/`. */
  readonly texts: readonly string[];
};

function stringsOf(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

async function reportedIssues(root: string): Promise<ReportedIssue[]> {
  const text = await readFile(path.join(root, ".qfai", "report", "validate-full.json"), "utf-8");
  const report: unknown = JSON.parse(text);
  if (report === null || typeof report !== "object" || !("issues" in report)) {
    throw new Error("validate-full.json carries no issues array");
  }
  const { issues } = report;
  if (!Array.isArray(issues)) throw new Error("validate-full.json issues is not an array");
  return issues.map((raw: unknown) => {
    const record: Record<string, unknown> =
      raw !== null && typeof raw === "object" ? { ...raw } : {};
    const texts = [
      ...stringsOf(record.file),
      ...stringsOf(record.relatedFiles),
      ...stringsOf(record.refs),
      ...stringsOf(record.message),
      ...stringsOf(record.suggested_action),
    ].map((value) => value.replace(/\\/g, "/"));
    return { code: typeof record.code === "string" ? record.code : "", texts };
  });
}

function entry(fields: Record<string, string>, body: string): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return ["---", ...lines, "---", body].join("\n");
}

/** A well-formed entry's fields. Each fixture entry breaks exactly one rule. */
function validFields(id: string): Record<string, string> {
  return {
    id,
    kind: "milestone",
    status: "archived",
    created: "2026-01-05",
    updated: "2026-01-05",
    scope: "global",
    blocking: "false",
    links: "[]",
    "promote-to": "null",
  };
}

/** The five entries of EX-0004-0042, one per work-log code. */
const STEERING_ENTRIES: Readonly<Record<string, string>> = {
  "broken-frontmatter.md": ["---", "id: broken-frontmatter", "kind: [unclosed", "---", ""].join(
    "\n",
  ),
  "broken-link.md": entry({ ...validFields("broken-link"), links: "[spec-9999]" }, ""),
  "stale-entry.md": entry(
    {
      ...validFields("stale-entry"),
      status: "active",
      created: "2020-01-05",
      updated: "2020-01-05",
    },
    "",
  ),
  "pending-promotion.md": entry(
    {
      ...validFields("pending-promotion"),
      kind: "decision",
      "promote-to": "spec-0001/07_Decisions.md",
    },
    "",
  ),
  "incomplete-handoff.md": entry(
    { ...validFields("incomplete-handoff"), kind: "handoff", status: "handoff" },
    "## State of the task\n\nOnly one of the five sections.\n",
  ),
};

/** A spec overview with no `Status` bullet: `QFAI-STATUS-001` names it only if validate read it. */
const CONTROL_SPEC = ".qfai/specs/spec-0001/01_Spec.md";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0004-worklog-removal-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("TC-0004-0074: validate does not read the work-log directory", () => {
  it("TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path", async () => {
    // A fresh directory, so the tree has no `.qfai/assistant/steering/`.
    const steering = path.join(root, ".qfai", "steering");
    await mkdir(steering, { recursive: true });
    for (const [name, body] of Object.entries(STEERING_ENTRIES)) {
      await writeFile(path.join(steering, name), body, "utf-8");
    }
    await mkdir(path.dirname(path.join(root, CONTROL_SPEC)), { recursive: true });
    await writeFile(path.join(root, CONTROL_SPEC), "# Spec\n", "utf-8");

    await runValidate({ root, strict: false, profile: "full" });
    const issues = await reportedIssues(root);

    const controlReads = issues.filter(
      (issue) => issue.code === "QFAI-STATUS-001" && issue.texts.includes(CONTROL_SPEC),
    );
    expect(controlReads, "validate read this tree").toHaveLength(1);

    const workLogCodes = issues
      .map((issue) => issue.code)
      .filter((code) => WORKLOG_CODES.includes(code));
    const steeringTexts = issues.flatMap((issue) =>
      issue.texts.filter((text) => STEERING_PATH.test(text)),
    );
    expect({ workLogCodes, steeringTexts }).toEqual({ workLogCodes: [], steeringTexts: [] });
  });
});
