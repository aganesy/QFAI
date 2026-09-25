/**
 * E2E: a clear new feature is delivered from one request (spec-0018).
 *
 * On a `qfai init` project, a feature run asks the one `create` question at routing, then runs
 * SDD, the prototype stage, acceptance with a seam round trip, implement and verify, each from a
 * work order the run issues, and finishes `qfai_done` on a clean validate. Declining the question
 * cancels the run with nothing tracked. A result for a work order the run never issued is refused
 * and changes nothing. After the run, `validate` resolves a triage row that cites the run's create
 * decision.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { triageTable, writeTriagePack } from "../helpers/triageFixture.js";
import {
  CLI,
  FEATURE_PROPOSAL,
  field,
  initProject,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  treeDigest,
  workflow,
} from "../integration/workflow/workflowProject.js";
import { acceptThenNext, orderOf, validateOf, verifyAndFinish } from "./workflowJourney.js";

afterEach(removeProjects);

const SEAM_TEST = "TC-0001-0001";

// Routing with the one create question, answered `create`; returns the SDD work order.
async function approvedFeature(root: string) {
  const { runId, routed } = await routedRun(root, FEATURE_PROPOSAL);
  const approved = await submit(root, runId, "decision", {
    questionId: field(routed.json, "questions.0.questionId"),
    answer: { optionIds: ["create"] },
    answeredBy: "operator",
    expectedSequence: field(routed.json, "run.sequence"),
  });
  return { runId, routed, approved, sdd: workflow(root, ["next", "--run", runId]) };
}

// Drives SDD, the prototype stage and acceptance with its seam round trip, up to implement.
async function throughAcceptance(root: string, runId: string, sdd: unknown) {
  const slotId = field(sdd, "workOrder.target.slotId");
  const bindings = [{ slotId, capabilityId: "CAP-0001", specId: "spec-0001" }];
  const { next: prototype } = await acceptThenNext(root, runId, sdd, "sdd-1", { bindings });
  const { next: acceptance } = await acceptThenNext(root, runId, prototype.json, "prototype-1");
  const seamRequest = { targetTestId: SEAM_TEST };
  const { next: seam } = await acceptThenNext(root, runId, acceptance.json, "acceptance-1", {
    outcome: "needs_repair",
    seamRequest,
  });
  const seamResult = { seam: { targetTestId: SEAM_TEST, observation: "fail" } };
  const { next: again } = await acceptThenNext(root, runId, seam.json, "seam-1", seamResult);
  const { next: implement } = await acceptThenNext(root, runId, again.json, "acceptance-2");
  return { prototype, acceptance, seam, again, implement };
}

// QFAI:SPEC-0018:US-0018-0001
// QFAI:SPEC-0008:US-0008-0009
// QFAI:SPEC-0011:US-0011-0009
// QFAI:SPEC-0013:US-0013-0015
// QFAI:SPEC-0013:US-0013-0017
// QFAI:SPEC-0003:US-0003-0029
it("US-0018-0001 (TDD-0455): one create question, then every stage from its work order, and finish qfai_done", async () => {
  const root = await initProject();
  const clean = validateOf(root);
  const { runId, routed, approved, sdd } = await approvedFeature(root);
  const stages = await throughAcceptance(root, runId, sdd.json);
  const { next: verify } = await acceptThenNext(root, runId, stages.implement.json, "implement-1");
  const finished = await verifyAndFinish(root, runId, verify.json);
  const bound = { kind: "spec", specId: "spec-0001" };

  expect({
    clean,
    questions: Array.isArray(field(routed.json, "questions"))
      ? [field(routed.json, "questions.0.kind")]
      : [],
    approved: field(approved.json, "run.state"),
    sdd: orderOf(sdd.json),
    later: [
      stages.prototype,
      stages.acceptance,
      stages.seam,
      stages.again,
      stages.implement,
      verify,
    ].map((each) => orderOf(each.json)),
    seamParent:
      field(stages.seam.json, "workOrder.parentWorkOrderId") ===
      field(stages.acceptance.json, "workOrder.workOrderId"),
    attempts: [
      field(stages.acceptance.json, "workOrder.attempt"),
      field(stages.again.json, "workOrder.attempt"),
    ],
    finished: [finished.status, field(finished.json, "run.state"), field(finished.json, "target")],
  }).toEqual({
    clean: { exit: 0, errors: [] },
    questions: ["create"],
    approved: "ready",
    sdd: {
      stageKind: "sdd",
      skill: "qfai-sdd",
      operation: "new-capability",
      target: { kind: "new_capability", slotId: expect.any(String) },
    },
    later: [
      {
        stageKind: "prototype",
        skill: "qfai-prototyping",
        operation: "existing-runtime-contract",
        target: bound,
      },
      {
        stageKind: "acceptance",
        skill: "qfai-atdd",
        operation: "author-acceptance-tests",
        target: bound,
      },
      { stageKind: "implement", skill: "qfai-implement", operation: "seam-only", target: bound },
      {
        stageKind: "acceptance",
        skill: "qfai-atdd",
        operation: "author-acceptance-tests",
        target: bound,
      },
      { stageKind: "implement", skill: "qfai-implement", operation: "implement", target: bound },
      { stageKind: "verify", skill: "qfai-verify", operation: "verify-full", target: undefined },
    ],
    seamParent: true,
    attempts: [1, 2],
    finished: [0, "completed", "qfai_done"],
  });
}, 300_000);

// QFAI:SPEC-0018:US-0018-0001
// QFAI:SPEC-0003:US-0003-0029
it("US-0018-0001 (TDD-0455), declined: declining the create question cancels the run with nothing tracked", async () => {
  const root = await initProject();
  const { runId, routed } = await routedRun(root, FEATURE_PROPOSAL);
  const own = `.qfai/runs/${runId}/`;
  const before = await treeDigest(root, (rel) => rel.startsWith(own));
  const declined = await submit(root, runId, "decision", {
    questionId: field(routed.json, "questions.0.questionId"),
    answer: { optionIds: ["decline"] },
    answeredBy: "operator",
    expectedSequence: field(routed.json, "run.sequence"),
  });

  expect({
    state: field(declined.json, "run.state"),
    tracked: existsSync(path.join(root, ".qfai", "evidence", "workflow")),
    outside: (await treeDigest(root, (rel) => rel.startsWith(own))) === before,
  }).toEqual({ state: "cancelled", tracked: false, outside: true });
}, 180_000);

// QFAI:SPEC-0018:US-0018-0001
// QFAI:SPEC-0012:US-0012-0144
// QFAI:SPEC-0003:US-0003-0029
it("US-0018-0001, prototype variant (spec-0012 TDD-0582): the prototype stage runs between SDD and acceptance for the bound spec", async () => {
  const root = await initProject();
  const { runId, sdd } = await approvedFeature(root);
  const { prototype, acceptance } = await throughAcceptance(root, runId, sdd.json);
  const table = await readFile(
    path.join(
      root,
      ".qfai",
      "assistant",
      "skills",
      "qfai-prototyping",
      "references",
      "orchestrated-mode.md",
    ),
    "utf8",
  );

  expect({
    order: [
      orderOf(sdd.json).stageKind,
      orderOf(prototype.json),
      orderOf(acceptance.json).stageKind,
    ],
    declared: table.includes("`existing-runtime-contract`"),
  }).toEqual({
    order: [
      "sdd",
      {
        stageKind: "prototype",
        skill: "qfai-prototyping",
        operation: "existing-runtime-contract",
        target: { kind: "spec", specId: "spec-0001" },
      },
      "acceptance",
    ],
    declared: true,
  });
}, 300_000);

// QFAI:SPEC-0018:US-0018-0001
// QFAI:SPEC-0001:US-0001-0010
// QFAI:SPEC-0003:US-0003-0029
it("US-0018-0001, handover variant (spec-0001 TDD-0042; spec-0003 TDD-0125): a result for a work order never issued is refused, and the stage skills' entry check points at the installed qfai-run", async () => {
  const root = await initProject();
  const { runId, sdd } = await approvedFeature(root);
  const own = `.qfai/runs/${runId}/`;
  const before = await treeDigest(root, (rel) => rel.startsWith(`${own}inbox/`));
  const forged = { ...resultFor(sdd.json, "forged-1"), workOrderId: "work-order-never-issued" };
  const refused = await submit(root, runId, "accept", forged);
  const skills = path.join(root, ".qfai", "assistant", "skills");
  const entryChecks = await Promise.all(
    ["qfai-sdd", "qfai-atdd", "qfai-implement", "qfai-verify"].map(async (skill) =>
      (
        await readFile(path.join(skills, skill, "references", "orchestrated-mode.md"), "utf8")
      ).includes("qfai-run"),
    ),
  );
  const installed = [
    path.join(skills, "qfai-run", "SKILL.md"),
    path.join(root, ".qfai", "assistant", "process", "workflows", "feature.yml"),
  ].map((file) => existsSync(file));

  expect({
    refused: [field(refused.json, "ok"), field(refused.json, "run.state")],
    unchanged: (await treeDigest(root, (rel) => rel.startsWith(`${own}inbox/`))) === before,
    entryChecks,
    installed,
  }).toEqual({
    refused: [false, "running"],
    unchanged: true,
    entryChecks: [true, true, true, true],
    installed: [true, true],
  });
}, 180_000);

const TRIAGE_HEADERS = ["Source", "Operation", "Approved By", "Rationale", "Authorization-Ref"];

// The `QFAI-TRIAGE-011` findings the built CLI's `validate` prints over `root`, one line each.
function authorizationRefFindings(root: string): string[] {
  const run = spawnSync(process.execPath, [CLI, "validate", "--format", "text"], {
    cwd: root,
    encoding: "utf8",
  });
  return `${run.stdout}${run.stderr}`
    .split("\n")
    .filter((line) => line.startsWith("[error] QFAI-TRIAGE-011 "));
}

// QFAI:SPEC-0018:US-0018-0001
// QFAI:SPEC-0004:US-0004-0040
// QFAI:SPEC-0003:US-0003-0029
it("US-0018-0001, authorization variant (spec-0004 TDD-0081): after the run finishes, validate resolves a CREATE row citing the run's create decision", async () => {
  const root = await initProject();
  const { runId, sdd } = await approvedFeature(root);
  const stages = await throughAcceptance(root, runId, sdd.json);
  const { next: verify } = await acceptThenNext(root, runId, stages.implement.json, "implement-1");
  const finished = await verifyAndFinish(root, runId, verify.json);
  const tracked = path.join(root, ".qfai", "evidence", "workflow", runId, "authorizations");
  const [record = ""] = await readdir(tracked);
  const reference = `${runId}/${path.basename(record, ".json")}`;
  await writeTriagePack(
    root,
    triageTable(TRIAGE_HEADERS, [
      ["R-CITED", "CREATE", "operator@2026-09-25", "new CAP-0001", reference],
      ["R-UNBOUND", "CREATE", "operator@2026-09-25", "new CAP-0002", reference],
    ]),
  );
  const findings = authorizationRefFindings(root);

  expect({
    finished: field(finished.json, "target"),
    cited: findings.filter((line) => line.includes("R-CITED")),
    unbound: findings.map((line) => line.includes("R-UNBOUND") && line.includes("Binding check")),
  }).toEqual({ finished: "qfai_done", cited: [], unbound: [true] });
}, 300_000);
