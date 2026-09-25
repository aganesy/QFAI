// QFAI:BF-0001
/**
 * E2E: a clear new feature is delivered from one request.
 *
 * On a `qfai init` project, a feature run asks one `create` question at routing. The
 * story-authoring stage asks for its change once, and the attempt holding the answer writes the
 * new flow and story with the rows that cite both answers. Acceptance takes the seam round trip,
 * implement and verify follow, and `finish` completes the run `qfai_done` on the tree the run
 * left, which validates clean. Declining the question cancels the run with nothing tracked, and a
 * result for a work order the run never issued changes nothing.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  CRITERION_ID,
  DECISIONS,
  FEATURE_PROPOSAL,
  FLOW_ID,
  STORY_FILES,
  STORY_ID,
  approvedFeature,
  authorStory,
  implementGreen,
  throughAcceptance,
  verifyPass,
} from "./workflowFeatureRun.js";
import {
  REQUEST,
  answer,
  commitAll,
  field,
  filesUnder,
  initProject,
  list,
  orderOf,
  removeProjects,
  resultFor,
  routedRun,
  submit,
  treeDigest,
  validateOf,
  workflow,
} from "./workflowJourney.js";
import { discussedProject } from "./workflowProjectInputs.js";

afterEach(removeProjects);

const BOUND = { kind: "flow", flowId: FLOW_ID };

it("one create question, one change approval, every stage from its work order, and finish qfai_done", async () => {
  const root = await discussedProject();
  const clean = validateOf(root);
  const { runId, routed, create, waiting, approved, sdd } = await approvedFeature(root);
  const story = await authorStory(root, runId, sdd.json, field(create, "questionId"));
  const stages = await throughAcceptance(root, runId, story.next.json);
  const { next: verify } = await implementGreen(root, runId, stages.implement);
  const { next: done } = await verifyPass(root, runId, verify.json);
  commitAll(root);
  const summary = path.join(root, ".qfai", "evidence", "workflow", runId, "summary.json");
  const summaryBefore = await readFile(summary);
  const finished = workflow(root, ["finish", "--run", runId]);

  expect({
    clean,
    questions: list(routed.json, "questions").map((question) => field(question, "kind")),
    slot: field(create, "story.flowId"),
    waiting: [field(waiting.json, "run.state"), field(waiting.json, "workOrder")],
    approved: field(approved.json, "run.state"),
    sdd: orderOf(sdd.json),
    slotBound: field(sdd.json, "workOrder.target.slotId") === field(create, "story.slotId"),
    asked: [field(story.asked.json, "run.state"), field(story.change, "kind")],
    reissued: [
      field(story.again.json, "workOrder.stageInstanceId") ===
        field(sdd.json, "workOrder.stageInstanceId"),
      field(story.again.json, "workOrder.attempt"),
    ],
    records: [story.create, story.approval].map((record) => [
      field(record, "kind"),
      field(record, "operation"),
      field(record, "capture"),
    ]),
    later: [stages.acceptance, stages.seam, stages.again, stages.implement, verify.json].map(
      (document) => orderOf(document),
    ),
    seamParent:
      field(stages.seam, "workOrder.parentWorkOrderId") ===
      field(stages.acceptance, "workOrder.workOrderId"),
    attempts: [
      field(stages.acceptance, "workOrder.attempt"),
      field(stages.again, "workOrder.attempt"),
    ],
    lastNext: field(done.json, "workOrder"),
    finished: [finished.status, field(finished.json, "run.state"), field(finished.json, "target")],
    status: field(workflow(root, ["status", "--run", runId]).json, "run.state"),
    summaryKept: (await readFile(summary)).equals(summaryBefore),
    validates: validateOf(root),
  }).toEqual({
    clean: { exit: 0, errors: [] },
    questions: ["create"],
    slot: null,
    waiting: ["awaiting_input", null],
    approved: "ready",
    sdd: {
      stageKind: "sdd",
      skill: "qfai-sdd",
      operation: "new-story",
      target: { kind: "new_story", slotId: expect.any(String) },
    },
    slotBound: true,
    asked: ["awaiting_input", "decision"],
    reissued: [true, 2],
    records: [
      ["human_decision", "CREATE", "agent_captured"],
      ["human_decision", "CHANGE_REQUEST", "agent_captured"],
    ],
    later: [
      {
        stageKind: "acceptance",
        skill: "qfai-atdd",
        operation: "author-acceptance-tests",
        target: BOUND,
      },
      { stageKind: "implement", skill: "qfai-implement", operation: "seam-only", target: BOUND },
      {
        stageKind: "acceptance",
        skill: "qfai-atdd",
        operation: "author-acceptance-tests",
        target: BOUND,
      },
      { stageKind: "implement", skill: "qfai-implement", operation: "implement", target: BOUND },
      { stageKind: "verify", skill: "qfai-verify", operation: "verify-full" },
    ],
    seamParent: true,
    attempts: [1, 2],
    lastNext: null,
    finished: [0, "completed", "qfai_done"],
    status: "completed",
    summaryKept: true,
    validates: { exit: 0, errors: [] },
  });
}, 600_000);

it("the rows the story-authoring stage appended cite this run's answers, and the obligations name the new story", async () => {
  const root = await discussedProject();
  const { runId, create, sdd } = await approvedFeature(root);
  const story = await authorStory(root, runId, sdd.json, field(create, "questionId"));
  const cite = (record: unknown) => `${runId}/${String(field(record, "authorizationId"))}`;
  const rows = (await readFile(path.join(root, DECISIONS), "utf8"))
    .split("\n")
    .filter((line) => line.startsWith("| DEC-"));

  expect({
    rows: rows.map((row) => [
      row.includes(cite(story.create)),
      row.includes(cite(story.approval)),
      row.endsWith("| WIP |"),
    ]),
    changeNamesEveryFile: [...STORY_FILES, DECISIONS].every((rel) => rows[1]?.includes(rel)),
    accepted: field(story.accepted.json, "run.state"),
    next: orderOf(story.next.json).target,
    obligations: list(story.next.json, "workOrder.obligations.ids"),
  }).toEqual({
    rows: [
      [true, false, true],
      [false, true, true],
    ],
    changeNamesEveryFile: true,
    accepted: "ready",
    next: { kind: "flow", flowId: FLOW_ID },
    obligations: expect.arrayContaining([FLOW_ID, CRITERION_ID]),
  });
}, 300_000);

it("declining the create question cancels the run with nothing tracked and nothing outside the run's directory", async () => {
  const root = await initProject();
  const { runId, routed } = await routedRun(root, FEATURE_PROPOSAL);
  const own = `.qfai/run/${runId}/`;
  const before = await treeDigest(root, (rel) => rel.startsWith(own));
  const declined = await answer(root, runId, list(routed.json, "questions")[0], "stop");
  const next = workflow(root, ["next", "--run", runId]);

  expect({
    state: field(declined.json, "run.state"),
    tracked: existsSync(path.join(root, ".qfai", "evidence", "workflow")),
    outside: (await treeDigest(root, (rel) => rel.startsWith(own))) === before,
    story: existsSync(path.join(root, ".qfai", "spec", "02_business-flow", "business-flow-0001")),
    next: [next.status, field(next.json, "error.code")],
  }).toEqual({
    state: "cancelled",
    tracked: false,
    outside: true,
    story: false,
    next: [2, "run-terminal"],
  });
}, 300_000);

it("a result for a work order never issued is refused and changes nothing, and the stage skills pass free text to the installed qfai-run", async () => {
  const root = await initProject();
  const { runId, sdd } = await approvedFeature(root);
  const outsideJournal = (rel: string) => !rel.startsWith(`.qfai/run/${runId}/journal/`);
  const before = await treeDigest(root, outsideJournal);
  const forged = { ...resultFor(sdd.json, "forged-1"), workOrderId: "work-order-never-issued" };
  const refused = await submit(root, runId, "accept", forged);
  const skills = path.join(root, ".qfai", "assistant", "skill");
  const handover = await Promise.all(
    ["qfai-sdd", "qfai-atdd", "qfai-implement", "qfai-verify"].map(async (skill) =>
      (
        await readFile(path.join(skills, skill, "references", "orchestrated-mode.md"), "utf8")
      ).includes("qfai-run"),
    ),
  );
  const shipped = (await filesUnder(root)).filter(
    (rel) =>
      /(^|\/)(direct|bugfix|bounded-change|feature|discovery)\.yml$/.test(rel) ||
      rel.endsWith(".schema.json"),
  );

  expect({
    refused: [refused.status, field(refused.json, "error.code"), field(refused.json, "run.state")],
    reasons: list(refused.json, "error.reasons").map((reason) => field(reason, "reason")),
    journal: (await treeDigest(root, outsideJournal)) === before,
    handover,
    entry: existsSync(path.join(skills, "qfai-run", "SKILL.md")),
    shipped,
  }).toEqual({
    refused: [2, "invalid-input", "running"],
    reasons: ["work-order"],
    journal: true,
    handover: [true, true, true, true],
    entry: true,
    shipped: [],
  });
}, 300_000);

it("the tracked evidence holds no request text and no absolute path, and runtime state stays under .qfai/run/", async () => {
  const root = await discussedProject();
  const { runId, create, sdd } = await approvedFeature(root);
  await authorStory(root, runId, sdd.json, field(create, "questionId"));
  const tracked = path.join(root, ".qfai", "evidence", "workflow", runId);
  const texts = await Promise.all(
    (await filesUnder(tracked)).map((rel) => readFile(path.join(tracked, rel), "utf8")),
  );

  expect({
    files: texts.length > 0,
    request: texts.filter((text) => text.includes(REQUEST)),
    // Every absolute path into the project holds the temp directory's own name.
    absolute: texts.filter((text) => text.includes(path.basename(root))),
    state: existsSync(path.join(root, ".qfai", "state.json")),
    story: STORY_ID,
  }).toEqual({ files: true, request: [], absolute: [], state: false, story: STORY_ID });
}, 300_000);
