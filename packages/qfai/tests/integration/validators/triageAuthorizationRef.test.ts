/**
 * Integration: a `CREATE` row may cite the `human_decision` a workflow run recorded for it in
 * `Authorization-Ref`. A cited record must pass every check of the closed set, or the row raises
 * `QFAI-TRIAGE-011` naming the row and the check it breaks. Staleness is not one of them.
 *
 * One case per boundary of the matrix: each changes one thing from the passing row.
 */
// QFAI:SPEC-0004:TC-0004-0075
// QFAI:SPEC-0004:TC-0004-0076
// QFAI:SPEC-0004:TC-0004-0077
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { Issue } from "../../../src/core/types.js";
import { removeTempTree } from "../../helpers/tempTree.js";
import { seedTriageProject, triageFindings, triageTable } from "../../helpers/triageFixture.js";

const RUN = "run-20260924045712999";
const REF = `${RUN}/create-0001`;
const APPROVED_BY = "yusuke_senaga@2026-09-24";
const BEFORE = [
  "Source",
  "Subject",
  "Existing Spec",
  "Operation",
  "Sub-op",
  "Approved By",
  "Rationale",
  "Authorization-Ref",
  "Depends-On",
];
const AFTER = [...BEFORE.filter((header) => header !== "Authorization-Ref"), "Authorization-Ref"];

type Row = Record<string, string>;

const CREATE_ROW: Row = {
  Source: "R-CREATE",
  Subject: "record the export format",
  "Existing Spec": "-",
  Operation: "CREATE",
  "Sub-op": "-",
  "Approved By": APPROVED_BY,
  Rationale: "new CAP-0018 and CAP-0019",
  "Authorization-Ref": REF,
  "Depends-On": "-",
};

const RECORD = {
  authorizationId: "create-0001",
  runId: RUN,
  kind: "human_decision",
  capture: "agent_captured",
  scopeDigest: "a".repeat(64),
  recordedAt: "2026-09-24T04:57:12.999Z",
  questionId: "question-0001",
  question: { text: "Create a new capability?", options: [], selection: "single" },
  answer: { optionIds: ["create"] },
  effect: "proceed",
  answeredBy: "yusuke_senaga",
  operation: "CREATE",
  target: {
    kind: "new_capability",
    slotId: "slot-1",
    capability: { goal: "Export the format a customer asked for", covers: [], excludes: [] },
  },
};

const BINDING = { slotId: "slot-1", capabilityId: "CAP-0019", specId: "spec-0002" };

type Setup = {
  headers?: string[];
  row?: Row;
  record?: Record<string, unknown>;
  bindings?: Record<string, unknown>[];
  after?: (root: string) => Promise<void>;
};

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

function workflowDir(root: string): string {
  return path.join(root, ".qfai", "evidence", "workflow");
}

function recordFile(runDir: string): string {
  return path.join(runDir, "authorizations", "create-0001.json");
}

async function writeRun(runDir: string, record: unknown, bindings: unknown[]): Promise<void> {
  await mkdir(path.join(runDir, "authorizations"), { recursive: true });
  await writeFile(recordFile(runDir), `${JSON.stringify(record, null, 2)}\n`);
  await writeFile(
    path.join(runDir, "summary.json"),
    `${JSON.stringify({ runId: RUN, targetBindings: bindings }, null, 2)}\n`,
  );
}

/** The triage findings over the passing row with one thing changed. */
async function findingsFor(setup: Setup = {}): Promise<Issue[]> {
  const headers = setup.headers ?? BEFORE;
  const row = setup.row ?? CREATE_ROW;
  const root = await seedTriageProject(
    triageTable(headers, [headers.map((header) => row[header] ?? "-")]),
  );
  roots.push(root);
  const capabilities = ["# 03 Capabilities", "", "- CAP-0018", "- CAP-0019", "- CAP-0020", ""];
  await writeFile(
    path.join(root, ".qfai", "specs", "_policies", "03_Capabilities.md"),
    capabilities.join("\n"),
  );
  await writeRun(
    path.join(workflowDir(root), RUN),
    setup.record ?? RECORD,
    setup.bindings ?? [BINDING],
  );
  await setup.after?.(root);
  return triageFindings(root);
}

function codes(findings: Issue[]): string[] {
  return findings.map((finding) => finding.code);
}

/** The one `QFAI-TRIAGE-011` finding, as the row and check it names. */
function refusal(findings: Issue[]): { severity: string; row: boolean; check: string }[] {
  return findings
    .filter((finding) => finding.code === "QFAI-TRIAGE-011")
    .map((finding) => ({
      severity: finding.severity,
      row: finding.message.includes(`(${CREATE_ROW.Source})`),
      check: /the (\w+) check/.exec(finding.message)?.[1] ?? "",
    }));
}

function refusedBy(check: string) {
  return [{ severity: "error", row: true, check }];
}

describe("TC-0004-0075: a cited authorization that passes every check", () => {
  it("TC-0004-0075 create-row: two CAPs cited and one bound raise no QFAI-TRIAGE-011 or QFAI-TRIAGE-005", async () => {
    const found = codes(await findingsFor());
    expect(found).not.toContain("QFAI-TRIAGE-011");
    expect(found).not.toContain("QFAI-TRIAGE-005");
  });

  it("TC-0004-0075 column-position: the column after Depends-On raises no QFAI-TRIAGE-011 or QFAI-TRIAGE-005", async () => {
    const found = codes(await findingsFor({ headers: AFTER }));
    expect(found).not.toContain("QFAI-TRIAGE-011");
    expect(found).not.toContain("QFAI-TRIAGE-005");
  });
});

describe("TC-0004-0076: a cited authorization that breaks one check", () => {
  it("TC-0004-0076 resolves-malformed: a value outside the two-segment grammar names the Resolves check", async () => {
    const values = [
      "run-2026092404571299/create-0001",
      `${RUN}/create.0001`,
      `${RUN}/../../x`,
      `${RUN}/a/b`,
    ];
    for (const value of values) {
      const row = { ...CREATE_ROW, "Authorization-Ref": value };
      expect(refusal(await findingsFor({ row })), value).toEqual(refusedBy("Resolves"));
    }
  });

  it("TC-0004-0076 resolves-outside: a run directory linked outside the workflow directory names the Resolves check", async () => {
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-outside-"));
    roots.push(outside);
    await writeRun(outside, RECORD, [BINDING]);
    const findings = await findingsFor({
      after: async (root) => {
        const runDir = path.join(workflowDir(root), RUN);
        await rm(runDir, { recursive: true, force: true });
        await symlink(outside, runDir, "junction");
      },
    });
    expect(refusal(findings)).toEqual(refusedBy("Resolves"));
  });

  it("TC-0004-0076 resolves-missing: a well-formed value with no record file names the Resolves check", async () => {
    const findings = await findingsFor({
      after: (root) => rm(recordFile(path.join(workflowDir(root), RUN))),
    });
    expect(refusal(findings)).toEqual(refusedBy("Resolves"));
  });

  it("TC-0004-0076 resolves-unparsable: a record that is not JSON names the Resolves check", async () => {
    const findings = await findingsFor({
      after: (root) => writeFile(recordFile(path.join(workflowDir(root), RUN)), "{ not json"),
    });
    expect(refusal(findings)).toEqual(refusedBy("Resolves"));
  });

  it("TC-0004-0076 kind: a request_scope record names the Kind check", async () => {
    const record = { ...RECORD, kind: "request_scope" };
    expect(refusal(await findingsFor({ record }))).toEqual(refusedBy("Kind"));
  });

  it("TC-0004-0076 operation: a record whose operation is null names the Operation check", async () => {
    const record = { ...RECORD, operation: null };
    expect(refusal(await findingsFor({ record }))).toEqual(refusedBy("Operation"));
  });

  it("TC-0004-0076 operation-non-create: a DELETE row carrying a reference names the Operation check", async () => {
    const row = { ...CREATE_ROW, Operation: "DELETE", "Existing Spec": "spec-0001" };
    expect(refusal(await findingsFor({ row }))).toEqual(refusedBy("Operation"));
  });

  it("TC-0004-0076 binding-create: a slot bound to a CAP the Rationale does not cite names the Binding check", async () => {
    const bindings = [{ ...BINDING, capabilityId: "CAP-0020" }];
    expect(refusal(await findingsFor({ bindings }))).toEqual(refusedBy("Binding"));
  });

  it("TC-0004-0076 answerer: an answeredBy differing only in case names the Answerer check", async () => {
    const record = { ...RECORD, answeredBy: "Yusuke_Senaga" };
    expect(refusal(await findingsFor({ record }))).toEqual(refusedBy("Answerer"));
  });
});

describe("TC-0004-0077: staleness is not judged by the validator", () => {
  it("TC-0004-0077: a year-old record whose capability text differs from today's raises no QFAI-TRIAGE-011", async () => {
    const record = {
      ...RECORD,
      recordedAt: "2025-09-24T04:57:12.999Z",
      target: {
        ...RECORD.target,
        capability: { goal: "A goal the catalog no longer states", covers: [], excludes: [] },
      },
    };
    expect(codes(await findingsFor({ record }))).not.toContain("QFAI-TRIAGE-011");
  });
});
