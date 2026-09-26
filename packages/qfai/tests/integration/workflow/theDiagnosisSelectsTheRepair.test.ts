// QFAI:AC-0001-0193-02
// QFAI:AC-0001-0193-04
// QFAI:AC-0001-0194-01
// QFAI:AC-0001-0194-02
// QFAI:AC-0001-0194-03
// QFAI:EX-0001-0194-06

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { UNIT_TEST } from "../../e2e/workflowFeatureRun.js";
import {
  field,
  fileRef,
  list,
  orderOf,
  removeProjects,
  resultFor,
  submit,
  workflow,
  write,
} from "../../e2e/workflowJourney.js";
import { EXAMPLE_IDS, FLOW_ID, REPORT, diagnosed, flowProject } from "./acceptanceRuns.js";

afterEach(removeProjects);

const CRITERION = "AC-0001-0001-01";
const EXAMPLE = EXAMPLE_IDS[0] ?? "";
const PRODUCTION = "src/notification-addresses.ts";

const reasons = (document: unknown) =>
  list(document, "error.reasons").map((each) => field(each, "reason"));

it("A regression on an annotated example is fixed by regression_fix, which needs its re-run and review", async () => {
  const root = await flowProject();
  const testBefore = await readFile(path.join(root, UNIT_TEST));
  const { runId, next: fix } = await diagnosed(root, {
    verdict: "regression",
    matchedIds: [EXAMPLE],
  });
  await write(root, PRODUCTION, "export const add = (known: string[]) => known.length < 5;\n");
  const changedFiles = [await fileRef(root, PRODUCTION)];
  const bare = await submit(
    root,
    runId,
    "accept",
    resultFor(fix.json, "fix-1", { testObservation: "pass", changedFiles }),
  );
  const receipted = await submit(
    root,
    runId,
    "accept",
    resultFor(fix.json, "fix-2", {
      testObservation: "pass",
      changedFiles,
      regressionFix: { testId: EXAMPLE, rerunRef: REPORT, reviewRef: REPORT },
    }),
  );
  const verify = workflow(root, ["next", "--run", runId]);

  expect({
    fix: orderOf(fix.json),
    bare: [field(bare.json, "error.code"), reasons(bare.json)],
    receipted: field(receipted.json, "run.state"),
    verify: [orderOf(verify.json).stageKind, orderOf(verify.json).operation],
    annotated: (await readFile(path.join(root, UNIT_TEST))).equals(testBefore),
  }).toEqual({
    fix: {
      stageKind: "regression_fix",
      skill: "qfai-implement",
      operation: "regression-fix",
      target: { kind: "flow", flowId: FLOW_ID },
    },
    bare: ["invalid-input", ["regression-fix-receipt"]],
    receipted: "ready",
    verify: ["verify", "verify-full"],
    annotated: true,
  });
}, 300_000);

it("An expectation that differs from the story sends the run back to routing before any edit", async () => {
  const root = await flowProject();
  const { runId, accepted, next } = await diagnosed(root, {
    verdict: "expectation-differs",
    matchedIds: [CRITERION],
  });
  const dir = path.join(root, ".qfai", "run", runId, "work-orders");
  const kinds = await Promise.all(
    (await readdir(dir)).map(async (name) =>
      field(JSON.parse(await readFile(path.join(dir, name), "utf8")), "stageKind"),
    ),
  );

  expect({
    state: field(accepted.json, "run.state"),
    next: [orderOf(next.json).stageKind, orderOf(next.json).skill],
    implement: kinds.includes("implement"),
  }).toEqual({ state: "routing", next: ["route", "qfai-run"], implement: false });
}, 300_000);

it("A defective test goes to the owner of its layer: qfai-atdd for a criterion, qfai-implement for an example", async () => {
  const byCriterion = await diagnosed(await flowProject(), {
    verdict: "defective-test",
    matchedIds: [CRITERION],
  });
  const exampleRoot = await flowProject();
  const byExample = await diagnosed(exampleRoot, {
    verdict: "defective-test",
    matchedIds: [EXAMPLE],
  });
  const cited = { ids: [EXAMPLE], digest: "c".repeat(64) };
  const fixed = await submit(
    exampleRoot,
    byExample.runId,
    "accept",
    resultFor(byExample.next.json, "fix-1", {
      testObservation: "pass",
      testFix: { citedBefore: cited, citedAfter: cited, reviewRef: REPORT, rerunRef: REPORT },
    }),
  );
  const afterFix = workflow(exampleRoot, ["next", "--run", byExample.runId]);

  expect([field(fixed.json, "run.state"), orderOf(afterFix.json).operation]).toEqual([
    "ready",
    "verify-full",
  ]);
  expect([orderOf(byCriterion.next.json), orderOf(byExample.next.json)]).toEqual([
    {
      stageKind: "test_fix",
      skill: "qfai-atdd",
      operation: "test-fix",
      target: { kind: "flow", flowId: FLOW_ID },
    },
    {
      stageKind: "test_fix",
      skill: "qfai-implement",
      operation: "test-fix",
      target: { kind: "flow", flowId: FLOW_ID },
    },
  ]);
}, 600_000);

const CITED = { ids: [FLOW_ID, CRITERION], digest: "a".repeat(64) };

it("A test fix keeping what its test cites, with its review and re-run, is accepted and verify follows", async () => {
  const root = await flowProject();
  const { runId, next: fix } = await diagnosed(root, {
    verdict: "defective-test",
    matchedIds: [CRITERION],
  });
  const accepted = await submit(
    root,
    runId,
    "accept",
    resultFor(fix.json, "fix-1", {
      testObservation: "pass",
      testFix: { citedBefore: CITED, citedAfter: CITED, reviewRef: REPORT, rerunRef: REPORT },
    }),
  );
  const verify = workflow(root, ["next", "--run", runId]);

  expect([field(accepted.json, "run.state"), orderOf(verify.json).operation]).toEqual([
    "ready",
    "verify-full",
  ]);
}, 300_000);

it("A test fix that changes what its test checks is refused, and reaches story authoring as a repair", async () => {
  const root = await flowProject();
  const { runId, next: fix } = await diagnosed(root, {
    verdict: "defective-test",
    matchedIds: [CRITERION],
  });
  const changed = { ...CITED, digest: "b".repeat(64) };
  const refused = await submit(
    root,
    runId,
    "accept",
    resultFor(fix.json, "fix-1", {
      testObservation: "pass",
      testFix: { citedBefore: CITED, citedAfter: changed, reviewRef: REPORT, rerunRef: REPORT },
    }),
  );
  const unchanged = field(workflow(root, ["status", "--run", runId]).json, "run.state");
  const drift = {
    findingCode: "expectation-changed",
    path: ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/02_Acceptance-Criteria.md",
    cause: "The fix would check a different status than the criterion states.",
    owningFlow: FLOW_ID,
    detectingCommand: "independent review",
    resolvingOwner: "qfai-sdd",
    blockingExtent: "stage",
  };
  await submit(
    root,
    runId,
    "accept",
    resultFor(fix.json, "fix-2", { outcome: "needs_repair", debts: [drift] }),
  );
  const repair = workflow(root, ["next", "--run", runId]);

  expect({
    refused: [field(refused.json, "error.code"), reasons(refused.json)],
    unchanged,
    repair: orderOf(repair.json).skill,
  }).toEqual({
    refused: ["invalid-input", ["test-fix-meaning"]],
    unchanged: "running",
    repair: "qfai-sdd",
  });
}, 300_000);

it("A test fix without its review receipt, or without its re-run receipt, is refused", async () => {
  const root = await flowProject();
  const { runId, next: fix } = await diagnosed(root, {
    verdict: "defective-test",
    matchedIds: [CRITERION],
  });
  const without = async (resultId: string, testFix: object) =>
    reasons(
      (
        await submit(
          root,
          runId,
          "accept",
          resultFor(fix.json, resultId, { testObservation: "pass", testFix }),
        )
      ).json,
    );

  expect({
    review: await without("fix-1", { citedBefore: CITED, citedAfter: CITED, rerunRef: REPORT }),
    rerun: await without("fix-2", { citedBefore: CITED, citedAfter: CITED, reviewRef: REPORT }),
    state: field(workflow(root, ["status", "--run", runId]).json, "run.state"),
  }).toEqual({ review: ["test-fix-receipt"], rerun: ["test-fix-receipt"], state: "running" });
}, 300_000);
