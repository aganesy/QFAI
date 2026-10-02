// QFAI:AC-0001-0217-01
// QFAI:AC-0001-0217-02
// QFAI:AC-0001-0217-03
/**
 * The route catalog lane: the contract's route rows, the change requests they cite and the plans
 * the package ships, held together on the tree and against the base of a change.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

import {
  CONTRACT,
  DECISIONS,
  changeFaults,
  citationFaults,
  planFaults,
  readPlans,
} from "../../../../../scripts/check-route-catalog.mjs";

// tests/integration/scripts → tests/integration → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

const contract = readFileSync(path.join(REPO_ROOT, CONTRACT), "utf8");
const decisions = readFileSync(path.join(REPO_ROOT, DECISIONS), "utf8");

// The contract with one route row's statement changed.
function withRow(route: string, change: (row: string) => string): string {
  return contract
    .split("\n")
    .map((line) => (line.includes(`| Route \`${route}\` —`) ? change(line) : line))
    .join("\n");
}

function approvedBy(route: string): string {
  const row = contract.split("\n").find((line) => line.includes(`| Route \`${route}\` —`));
  return /Approved by (DEC-\d{4})/.exec(row ?? "")?.[1] ?? "";
}

// QFAI:EX-0001-0217-01
it("The shipped catalog, a row citing an unknown decision, and one citing a row that is no change request", () => {
  const unknown = withRow("edit-text", (row) =>
    row.replace(`Approved by ${approvedBy("edit-text")}.`, "Approved by DEC-9999."),
  );
  const notARequest = withRow("fix-crash", (row) =>
    row.replace(`Approved by ${approvedBy("fix-crash")}.`, "Approved by DEC-0003."),
  );

  expect({
    shipped: citationFaults(contract, decisions),
    unknown: citationFaults(unknown, decisions),
    notARequest: citationFaults(notARequest, decisions),
  }).toEqual({
    shipped: [],
    unknown: ["edit-text: the row cites DEC-9999, which decisions.md does not hold"],
    notARequest: [`fix-crash: DEC-0003 is not an in-force change request naming ${CONTRACT}`],
  });
});

// QFAI:EX-0001-0217-02
it("The shipped plans, an extra plan, a missing plan, and a plan its row no longer states", () => {
  const plans = readPlans(REPO_ROOT);
  const extra = new Map([...plans, ["triage-everything", plans.get("close-no-change") ?? ""]]);
  const missing = new Map([...plans].filter(([route]) => route !== "fix-crash"));
  const drifted = new Map(plans);
  drifted.set(
    "fix-crash",
    (plans.get("fix-crash") ?? "").replace(
      "steps: [implement-minimize]",
      "steps: [implement-bisect]",
    ),
  );

  const reviewed = new Map(plans);
  reviewed.set(
    "answer-question",
    (plans.get("answer-question") ?? "").replace("    review: none\n", ""),
  );

  expect({
    shipped: planFaults(contract, plans),
    reviewed: planFaults(contract, reviewed),
    extra: planFaults(contract, extra),
    missing: planFaults(contract, missing),
    drifted: planFaults(contract, drifted),
  }).toEqual({
    shipped: [],
    reviewed: ["answer-question: the plan's plan is not what its route row states"],
    extra: ["triage-everything.yml: no route row of the catalog names it"],
    missing: ["fix-crash: the package ships no plan for this route row"],
    drifted: ["fix-crash: the plan's plan is not what its route row states"],
  });
});

const TRIAGE_STALE = (cited: string) =>
  `| BR-0015-9001 | Route \`triage-stale\` — family \`close\`. Plan: \`close[triage-close]\`. Default modifiers: none. Decision points: none. Branch points: none. Approved by ${cited}. | EX-0001-0220-01 |`;

// The lines with `added` inserted after the last line `matches` holds.
function insertedAfterLast(lines: string[], matches: (line: string) => boolean, added: string) {
  const last = lines.reduce((found, line, index) => (matches(line) ? index : found), -1);
  return [...lines.slice(0, last + 1), added, ...lines.slice(last + 1)].join("\n");
}

// The contract with a `triage-stale` row after the last route row.
function withTriageStale(cited: string): string {
  const isRoute = (line: string) => line.includes("| Route `");
  return insertedAfterLast(contract.split("\n"), isRoute, TRIAGE_STALE(cited));
}

// The decisions table with a new change request approving `triage-stale`.
function withNewRequest(): string {
  const row =
    `| DEC-9001 | Change request: ${CONTRACT} | - Date: 2026-10-01 - Change: add the route ` +
    "triage-stale, which closes a request whose premise no longer holds. - Approval: the user " +
    "approved it on 2026-10-01, because stale requests had no route of their own. | DONE |";
  return insertedAfterLast(decisions.split("\n"), (line) => line.startsWith("| DEC-"), row);
}

// QFAI:EX-0001-0217-03
it("A new route row citing the catalog's first approval, and one citing a new change request", () => {
  const base = { contract, decisions };
  const reused = { contract: withTriageStale(approvedBy("edit-text")), decisions };
  const approved = { contract: withTriageStale("DEC-9001"), decisions: withNewRequest() };

  expect({
    reusedCitation: citationFaults(reused.contract, reused.decisions),
    reusedChange: changeFaults(base, reused),
    approvedCitation: citationFaults(approved.contract, approved.decisions),
    approvedChange: changeFaults(base, approved),
  }).toEqual({
    reusedCitation: [
      `triage-stale: ${approvedBy("edit-text")} does not name the route and record who approved it, and when`,
    ],
    reusedChange: [
      "triage-stale: the route row changed, and cites no change request this change appended",
    ],
    approvedCitation: [],
    approvedChange: [],
  });
});

it("A route row removed with no change request naming it", () => {
  const removed = contract
    .split("\n")
    .filter((line) => !line.includes("| Route `verify-manually` —"))
    .join("\n");

  expect(changeFaults({ contract, decisions }, { contract: removed, decisions })).toEqual([
    "verify-manually: the route row was removed, and no appended change request names it",
  ]);
});
