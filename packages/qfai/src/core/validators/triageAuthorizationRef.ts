import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import {
  TRIAGE_TOP_LEVEL_OPS,
  TRIAGE_UPDATE_SUBOPS,
  requiresApproval,
  type TriageOp,
} from "../sddTriage.js";
import { parseIdsFromText } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/** Where a workflow run's tracked evidence lives, relative to the project root. */
const WORKFLOW_DIR = path.join(".qfai", "evidence", "workflow");
const REFERENCE = /^(run-\d{17})\/([A-Za-z0-9_-]{1,64})$/;

type Check = "Resolves" | "Kind" | "Operation" | "Binding" | "Answerer";
type Verdict = { check: Check; detail: string } | null;

/** The cells of one triage row the reference checks read, by header name. */
export type AuthorizationRow = {
  label: string;
  operation: string;
  subOp: string;
  approvedBy: string;
  rationale: string;
  reference: string;
};

/**
 * `QFAI-TRIAGE-011` for a row whose operation needs approval and whose `Authorization-Ref` cites a
 * record that fails a check. A row needing no approval, or carrying no reference, is not read.
 */
export async function authorizationRefIssue(
  row: AuthorizationRow,
  projectRoot: string,
  deltaPath: string,
): Promise<Issue | null> {
  const op = triageOpOf(row.operation, row.subOp);
  if (op === null || !requiresApproval(op)) return null;
  if (row.reference === "" || row.reference === "-") return null;
  const verdict = await firstFailedCheck(row, projectRoot);
  if (verdict === null) return null;
  return issue(
    "QFAI-TRIAGE-011",
    `Triage row (${row.label}) cites authorization ${row.reference}, which fails the ${verdict.check} check: ${verdict.detail}.`,
    "error",
    deltaPath,
    "triage.authorizationRef",
    [row.label, row.reference],
    "canonical",
    "Cite the human_decision record the run wrote for this CREATE row, and copy its answeredBy into Approved By.",
  );
}

function triageOpOf(operation: string, subOp: string): TriageOp | null {
  const op = operation.toUpperCase();
  const top = TRIAGE_TOP_LEVEL_OPS.find((each) => each === op);
  if (top !== undefined) return top;
  const sub = TRIAGE_UPDATE_SUBOPS.find((each) => each === subOp.toUpperCase());
  return op === "UPDATE" && sub !== undefined ? { update: sub } : null;
}

// The checks of the closed set, in order; the first that fails is the one reported.
async function firstFailedCheck(row: AuthorizationRow, projectRoot: string): Promise<Verdict> {
  if (row.operation.toUpperCase() !== "CREATE") {
    return { check: "Operation", detail: "only a CREATE row may carry a reference" };
  }
  const match = REFERENCE.exec(row.reference);
  if (match === null) {
    return { check: "Resolves", detail: "the value is not run-<17 digits>/<authorizationId>" };
  }
  const [, runId = "", authorizationId = ""] = match;
  const workflowDir = await containedRealPath(projectRoot, WORKFLOW_DIR);
  if (workflowDir === null) {
    return {
      check: "Resolves",
      detail: "the workflow directory is missing or outside the project",
    };
  }
  const record = await readContainedJson(
    workflowDir,
    path.join(runId, "authorizations", `${authorizationId}.json`),
  );
  if (record === null) {
    return { check: "Resolves", detail: "no readable record is at that path" };
  }
  if (record.kind !== "human_decision") {
    return { check: "Kind", detail: "the record is not a human_decision" };
  }
  if (record.operation !== "CREATE") {
    return { check: "Operation", detail: "the record's operation is not CREATE" };
  }
  const summary = await readContainedJson(workflowDir, path.join(runId, "summary.json"));
  if (!bindsCitedCapability(record, summary, parseIdsFromText(row.rationale, "CAP"))) {
    return {
      check: "Binding",
      detail: "the run binds the record's slot to no CAP the Rationale cites",
    };
  }
  const approver = row.approvedBy.split("@")[0] ?? "";
  if (record.answeredBy !== approver) {
    return { check: "Answerer", detail: "the record's answeredBy differs from Approved By" };
  }
  return null;
}

function bindsCitedCapability(
  record: Record<string, unknown>,
  summary: Record<string, unknown> | null,
  cited: readonly string[],
): boolean {
  const target = record.target;
  const slotId = isRecord(target) ? target.slotId : undefined;
  const bindings =
    summary !== null && Array.isArray(summary.targetBindings) ? summary.targetBindings : [];
  return bindings.some(
    (binding: unknown) =>
      isRecord(binding) &&
      binding.slotId === slotId &&
      typeof binding.capabilityId === "string" &&
      cited.includes(binding.capabilityId),
  );
}

// The real path of `relative` under `base`, or null when it does not exist or its real path lies
// outside the real path of `base`. Nothing is read before this answers.
async function containedRealPath(base: string, relative: string): Promise<string | null> {
  const [realBase, realTarget] = await Promise.all([
    realpath(base),
    realpath(path.join(base, relative)).catch(() => null),
  ]);
  if (realTarget === null) return null;
  const inside = path.relative(realBase, realTarget);
  const escapes = inside.split(path.sep)[0] === ".." || path.isAbsolute(inside);
  return escapes ? null : realTarget;
}

// A JSON object at `relative` under `base`, read only once its real path is inside `base`'s and it
// is a regular file. Anything else is null.
async function readContainedJson(
  base: string,
  relative: string,
): Promise<Record<string, unknown> | null> {
  const file = await containedRealPath(base, relative);
  if (file === null || file === base || !(await stat(file)).isFile()) return null;
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf-8"));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
