// QFAI:AC-0001-0217-01
// QFAI:AC-0001-0217-02
// QFAI:AC-0001-0217-03
/**
 * The route catalog lane: the contract's route rows, the change requests they cite and the plans
 * the package ships, held together on the tree and against the base of a change.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { readDecisionFilesAtRevision } from "../../../src/core/gitChanges.js";
import { buildStoryTreeModel, readStoryTreeModel } from "../../../src/core/storyTree/tree.js";

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
const decisionModel = await readStoryTreeModel(REPO_ROOT, defaultConfig);
if (!decisionModel.decisionRegisterComplete)
  throw new Error(`Cannot read the complete ${DECISIONS} register`);
const decisions = decisionModel.decisionOccurrences.map(({ raw }) => raw).join("");

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
    row.replace(`Approved by ${approvedBy("edit-text")}`, "Approved by DEC-9999"),
  );
  const notARequest = withRow("fix-intermittent", (row) =>
    row.replace(`Approved by ${approvedBy("fix-intermittent")}`, "Approved by DEC-0003"),
  );

  expect({
    shipped: citationFaults(contract, decisions),
    unknown: citationFaults(unknown, decisions),
    notARequest: citationFaults(notARequest, decisions),
  }).toEqual({
    shipped: [],
    unknown: ["edit-text: the row cites DEC-9999, which decisions.md does not hold"],
    notARequest: [
      `fix-intermittent: DEC-0003 is not an in-force change request naming ${CONTRACT}`,
    ],
  });
});

// QFAI:EX-0001-0217-02
it("The shipped plans, an extra plan, a missing plan, and a plan its row no longer states", () => {
  const plans = readPlans(REPO_ROOT);
  const extra = new Map([...plans, ["triage-everything", plans.get("close-no-change") ?? ""]]);
  const missing = new Map([...plans].filter(([route]) => route !== "fix-intermittent"));
  const drifted = new Map(plans);
  drifted.set(
    "fix-intermittent",
    (plans.get("fix-intermittent") ?? "").replace(
      "steps: [implement-stress-harness]",
      "steps: [implement-oracle-parity]",
    ),
  );

  expect({
    shipped: planFaults(contract, plans),
    extra: planFaults(contract, extra),
    missing: planFaults(contract, missing),
    drifted: planFaults(contract, drifted),
  }).toEqual({
    shipped: [],
    extra: ["triage-everything.yml: no route row of the catalog names it"],
    missing: ["fix-intermittent: the package ships no plan for this route row"],
    drifted: ["fix-intermittent: the plan's plan is not what its route row states"],
  });
});

// QFAI:EX-0001-0217-04
it("A plan whose stage drops what it serves while its row keeps it", () => {
  const plans = readPlans(REPO_ROOT);
  const unserved = new Map(plans);
  unserved.set(
    "resolve-conflicts",
    (plans.get("resolve-conflicts") ?? "").replace("    serves: [spec, contract]\n", ""),
  );

  expect(planFaults(contract, unserved)).toEqual([
    "resolve-conflicts: the plan's plan is not what its route row states",
  ]);
});

const TRIAGE_STALE = (cited: string) =>
  `| BR-0015-9001 | Route \`triage-stale\` — family \`close\`. Plan: \`close[triage-close]\`. Decision points: none. Release point: none. Branch points: none. Approved by ${cited}. | EX-0001-0220-01 |`;

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
function withNewRequest(status = "DONE"): string {
  const row =
    `| DEC-9001 | Change request: ${CONTRACT} | - Date: 2026-10-01 - Change: add the route ` +
    "triage-stale, which closes a request whose premise no longer holds. - Approval: the user " +
    "approved it on 2026-10-01, because stale requests had no route of their own. | " +
    `${status} |`;
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

it("A route row approved by a change request a later row partly supersedes, and by one it fully supersedes", () => {
  const cited = withTriageStale("DEC-9001");

  expect({
    partly: citationFaults(cited, withNewRequest("PARTLY SUPERSEDED (by DEC-9002)")),
    fully: citationFaults(cited, withNewRequest("SUPERSEDED (by DEC-9002)")),
  }).toEqual({
    partly: [],
    fully: [`triage-stale: DEC-9001 is not an in-force change request naming ${CONTRACT}`],
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

async function checksHistoricalCatalogRegister(fault: string): Promise<void> {
  const root = mkdtempSync(path.join(os.tmpdir(), "qfai-route-register-"));
  const git = (...args: string[]): void => {
    execFileSync("git", args, { cwd: root, stdio: "ignore" });
  };
  const put = (file: string, text: string): void => {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  };
  const header =
    "# Decisions\n\n## Decisions\n\n| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
  const page = ".qfai/spec/decisions/page-0001.md";
  const historical = "| DEC-0001 | Historical choice | Keep | DONE |\n";
  const request = `| DEC-0002 | Change request: ${CONTRACT} | - Date: 2026-10-12 - Approval: user approved triage-stale | DONE |\n`;
  const tail =
    header.replace(
      "## Decisions",
      "## Decision pages\n\n- decisions/page-0001.md\n\n## Decisions",
    ) + request;
  const valid = header + historical;
  const invalid = fault.startsWith("duplicate")
    ? valid + request
    : valid.replace("| DONE |", "| DONE | extra |");
  try {
    git("init", "-b", "main");
    git("config", "user.email", "test@example.test");
    git("config", "user.name", "Test");
    git("config", "commit.gpgsign", "false");
    git("config", "core.autocrlf", "false");
    put(
      CONTRACT,
      "# CLI-0015: Workflow\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n" +
        "| BR-0015-0001 | Route `triage-stale` — family `close`. Plan: `close[triage-close]`. Decision points: none. Release point: none. Branch points: none. Approved by DEC-0002. | EX-0001-0217-01 |\n",
    );
    put(
      "packages/qfai/assets/defaults/workflows/triage-stale.yml",
      "family: close\nstages:\n  - id: close\n    steps: [triage-close]\n",
    );
    put(DECISIONS, tail);
    put(page, fault.endsWith("base") ? invalid : valid);
    git("add", ".");
    git("commit", "-m", "base register");
    git("checkout", "-b", "topic");
    put(page, fault.endsWith("head") ? invalid : fault.endsWith("base") ? valid : valid.trimEnd());
    git("add", ".");
    git("commit", "-m", "head register");
    const headModel = await readStoryTreeModel(root, defaultConfig);
    const baseModel = buildStoryTreeModel(readDecisionFilesAtRevision(root, "main", ".qfai/spec"), {
      specsDir: ".qfai/spec",
    });
    expect(headModel.decisionRegisterComplete).toBe(true);
    expect(baseModel.decisionRegisterComplete).toBe(true);
    if (fault !== "EOF without newline") {
      const invalidModel = fault.endsWith("base") ? baseModel : headModel;
      expect(invalidModel.decisions?.errors.length).toBeGreaterThan(0);
      expect(invalidModel.decisionOccurrences[0]?.origin.path).toBe(page);
    }
    const result = spawnSync(
      process.execPath,
      [path.join(REPO_ROOT, "scripts", "check-route-catalog.mjs")],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, BASE_REF: "main", GITHUB_EVENT_NAME: "pull_request" },
      },
    );
    if (fault === "EOF without newline") {
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("1 routes, each approved");
    } else {
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/decision register.*safely/i);
      expect(result.stderr).toMatch(
        fault.startsWith("duplicate") ? /decisions\.md/ : /decisions\/page-0001\.md/,
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/**
 * The script loads the package's TypeScript sources, which only a Node.js that strips types can
 * run. The cases below are skipped on a runtime without it, such as the engines floor;
 * lift when the engines floor reaches Node.js 22.18.
 */
const runsTypeScript = Boolean(process.features.typescript);

// QFAI:EX-0001-0053-26
it.skipIf(!runsTypeScript).each(["duplicate head", "duplicate base"])(
  "checks the actual route-catalog CLI with %s page/root occurrences",
  checksHistoricalCatalogRegister,
);

// QFAI:EX-0001-0053-31
it.skipIf(!runsTypeScript).each(["malformed head", "malformed base"])(
  "checks the actual route-catalog CLI with a %s historical page",
  checksHistoricalCatalogRegister,
);

// Supplementary EOF regression: no existing EX specifically names this evaluation separator.
it.skipIf(!runsTypeScript)(
  "reads a page EOF without newline followed by a valid root route approval",
  () => checksHistoricalCatalogRegister("EOF without newline"),
);
