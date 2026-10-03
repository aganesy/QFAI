// QFAI:AC-0001-0222-01
// QFAI:AC-0001-0222-02
// QFAI:AC-0001-0222-03
// QFAI:AC-0001-0222-04
// QFAI:AC-0001-0222-05
// QFAI:AC-0001-0210-05

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { extraction } from "../../helpers/workflowExtraction.js";
import {
  field,
  listTree,
  minimalProject,
  removeProjects,
  workflow,
  writeJson,
} from "./workflowProject.js";

afterEach(removeProjects);

const FEATURE = extraction({ intent: "feature", artifacts: ["code", "spec"] });

// A project holding the extraction of EX-0001-0222-01 in `tmp/request.json`.
async function withRequest(value: unknown = FEATURE) {
  const root = await minimalProject();
  const file = await writeJson(root, "tmp/request.json", value);
  return { root, file };
}

function reasonsOf(json: unknown): unknown {
  return field(json, "reasons");
}

// QFAI:EX-0001-0222-01
it("An extraction file returns the route plan with its stages, steps and points", async () => {
  const { root, file } = await withRequest();
  const planned = workflow(root, ["plan", "--in", file]);
  const stages = field(planned.json, "stages");
  const [first] = Array.isArray(stages) ? stages : [];
  const steps = field(first, "steps");
  const [step] = Array.isArray(steps) ? steps : [];

  expect({
    status: planned.status,
    head: [
      field(planned.json, "ok"),
      field(planned.json, "route"),
      field(planned.json, "family"),
      field(planned.json, "rule"),
    ],
    stage: [field(first, "id"), field(first, "kind")],
    step,
    points: [
      field(planned.json, "decisionPoints"),
      field(planned.json, "releasePoint"),
      field(planned.json, "branchPoints"),
    ],
  }).toEqual({
    status: 0,
    head: [true, "add-feature", "change", 28],
    stage: ["sdd", "sdd"],
    step: {
      name: "sdd-triage",
      path: ".qfai/assistant/step/sdd-triage/STEP.md",
      mode: null,
      passThrough: false,
    },
    points: [["sdd-triage"], null, []],
  });
});

// QFAI:EX-0001-0222-02
it("Planning creates, changes and removes no file, and no run directory exists", async () => {
  const { root, file } = await withRequest();
  const before = await listTree(root);
  const planned = workflow(root, ["plan", "--in", file]);
  const after = await listTree(root);

  expect({
    status: planned.status,
    same: JSON.stringify(after) === JSON.stringify(before),
    run: after.some((entry) => entry.startsWith(".qfai/run")),
  }).toEqual({ status: 0, same: true, run: false });
});

// QFAI:EX-0001-0222-03
it("The extraction on standard input prints the document the file gives", async () => {
  const { root, file } = await withRequest();
  const fromFile = workflow(root, ["plan", "--in", file]);
  const fromStdin = workflow(root, ["plan", "--in", "-"], JSON.stringify(FEATURE));

  expect([fromStdin.status, fromStdin.stdout]).toEqual([0, fromFile.stdout]);
});

// QFAI:EX-0001-0222-04
it("A route named directly returns its plan with no rule", async () => {
  const root = await minimalProject();
  const planned = workflow(root, ["plan", "--route", "fix-red-main"]);

  expect({
    status: planned.status,
    route: field(planned.json, "route"),
    hasRule: Object.hasOwn(Object(planned.json), "rule"),
  }).toEqual({ status: 0, route: "fix-red-main", hasRule: false });
});

// QFAI:EX-0001-0222-05
it("An extraction carrying a key it does not declare is refused, naming the key", async () => {
  const { root, file } = await withRequest({ ...FEATURE, candidateRoute: "add-feature" });
  const before = await listTree(root);
  const planned = workflow(root, ["plan", "--in", file]);

  expect({
    status: planned.status,
    ok: field(planned.json, "ok"),
    reasons: reasonsOf(planned.json),
    unchanged: JSON.stringify(await listTree(root)) === JSON.stringify(before),
  }).toEqual({
    status: 2,
    ok: false,
    reasons: [{ reason: "schema", subject: "candidateRoute" }],
    unchanged: true,
  });
});

// QFAI:EX-0001-0222-06
it("A route the catalog does not name is refused as an unknown route", async () => {
  const root = await minimalProject();
  const planned = workflow(root, ["plan", "--route", "no-such-route"]);

  expect([planned.status, field(planned.json, "ok"), reasonsOf(planned.json)]).toEqual([
    2,
    false,
    [{ reason: "unknown-route", subject: "no-such-route" }],
  ]);
});

// QFAI:EX-0001-0222-07
it("An operation other than plan is refused, naming it", async () => {
  const { root, file } = await withRequest();
  const refused = workflow(root, ["go", "--in", file]);

  expect([refused.status, field(refused.json, "ok"), reasonsOf(refused.json)]).toEqual([
    2,
    false,
    [{ reason: "invalid-input", subject: "go" }],
  ]);
});

// QFAI:EX-0001-0222-08
it("Both inputs, or neither, are refused", async () => {
  const { root, file } = await withRequest();
  const both = workflow(root, ["plan", "--in", file, "--route", "add-feature"]);
  const neither = workflow(root, ["plan"]);

  expect(
    [both, neither].map((run) => [
      run.status,
      field(run.json, "ok"),
      field(run.json, "reasons.0.reason"),
    ]),
  ).toEqual([
    [2, false, "invalid-input"],
    [2, false, "invalid-input"],
  ]);
});

// QFAI:EX-0001-0222-09
it("A low-confidence extraction returns its candidates in rule order, with no stages", async () => {
  const { root, file } = await withRequest({
    ...FEATURE,
    confidence: "low",
    alternatives: [{ intent: "design", entryFlags: [], qualifiers: [], signals: [] }],
  });
  const planned = workflow(root, ["plan", "--in", file]);
  const candidates = field(planned.json, "candidates");

  expect({
    status: planned.status,
    candidates: Array.isArray(candidates)
      ? candidates.map((each) => [
          field(each, "route"),
          field(each, "recommended"),
          typeof field(each, "summary"),
        ])
      : candidates,
    stages: field(planned.json, "stages"),
  }).toEqual({
    status: 0,
    candidates: [
      ["decide-design", false, "string"],
      ["add-feature", true, "string"],
    ],
    stages: undefined,
  });
});

// QFAI:EX-0001-0222-10
it("An extraction with no intent plans the route that answers and changes nothing", async () => {
  const { root, file } = await withRequest(extraction({ intent: null }));
  const planned = workflow(root, ["plan", "--in", file]);

  expect([planned.status, field(planned.json, "route"), field(planned.json, "rule")]).toEqual([
    0,
    "answer-question",
    null,
  ]);
});

// QFAI:EX-0001-0210-08
it("A project whose sdd-gate step is not installed is refused with the step named", async () => {
  const root = await minimalProject();
  await rm(path.join(root, ".qfai", "assistant", "step", "sdd-gate"), { recursive: true });
  const before = await listTree(root);
  const planned = workflow(root, ["plan", "--route", "add-feature"]);

  expect({
    status: planned.status,
    ok: field(planned.json, "ok"),
    reason: [field(planned.json, "reasons.0.reason"), field(planned.json, "reasons.0.subject")],
    unchanged: JSON.stringify(await listTree(root)) === JSON.stringify(before),
  }).toEqual({ status: 1, ok: false, reason: ["plan-invalid", "sdd-gate"], unchanged: true });
});

// QFAI:EX-0001-0222-08
it("An option given without its value is refused, naming the option", async () => {
  const root = await minimalProject();
  const refused = workflow(root, ["plan", "--in"]);

  expect([refused.status, field(refused.json, "reasons")]).toEqual([
    2,
    [{ reason: "invalid-input", subject: "--in" }],
  ]);
});

// QFAI:EX-0001-0222-08
it("A stray token after plan is refused, naming it", async () => {
  const root = await minimalProject();
  const refused = workflow(root, ["plan", "typo", "--route", "add-feature"]);

  expect([refused.status, field(refused.json, "reasons")]).toEqual([
    2,
    [{ reason: "invalid-input", subject: "typo" }],
  ]);
});

it("Help prints the operation as text", async () => {
  const root = await minimalProject();
  const help = workflow(root, ["--help"]);

  expect([help.status, help.json, help.stdout.includes("plan")]).toEqual([0, undefined, true]);
});

// QFAI:EX-0001-0222-07
it("An --in file that cannot be read is an io-error, JSON that does not parse and an unknown flag are invalid input", async () => {
  const root = await minimalProject();
  await writeFile(path.join(root, "broken.json"), "{ not json");
  const missing = workflow(root, ["plan", "--in", "absent.json"]);
  const broken = workflow(root, ["plan", "--in", "broken.json"]);
  const flagged = workflow(root, ["plan", "--route", "add-feature", "--sideways"]);

  expect(
    [missing, broken, flagged].map((run) => [
      run.status,
      field(run.json, "ok"),
      field(run.json, "reasons.0.reason"),
      field(run.json, "reasons.0.subject"),
    ]),
  ).toEqual([
    [1, false, "io-error", "absent.json"],
    [2, false, "invalid-input", "broken.json"],
    [2, false, "invalid-input", "--sideways"],
  ]);
});

// QFAI:EX-0001-0222-13
it("An --in path that is a directory is an io-error, and nothing is written", async () => {
  const root = await minimalProject();
  await mkdir(path.join(root, "tmp", "request.json"), { recursive: true });
  const before = await listTree(root);
  const planned = workflow(root, ["plan", "--in", "tmp/request.json"]);

  expect({
    status: planned.status,
    ok: field(planned.json, "ok"),
    reasons: reasonsOf(planned.json),
    unchanged: JSON.stringify(await listTree(root)) === JSON.stringify(before),
  }).toEqual({
    status: 1,
    ok: false,
    reasons: [{ reason: "io-error", subject: "tmp/request.json" }],
    unchanged: true,
  });
});

// QFAI:EX-0001-0222-14
it("A low-confidence extraction whose readings reach one route returns that route as the one candidate", async () => {
  const { root, file } = await withRequest(
    extraction({
      intent: "question-how",
      confidence: "low",
      alternatives: [
        { intent: "question-help", entryFlags: [], qualifiers: ["docs-answerable"], signals: [] },
      ],
    }),
  );
  const planned = workflow(root, ["plan", "--in", file]);
  const candidates = field(planned.json, "candidates");

  expect({
    status: planned.status,
    candidates: Array.isArray(candidates)
      ? candidates.map((each) => [field(each, "route"), field(each, "recommended")])
      : candidates,
    stages: field(planned.json, "stages"),
  }).toEqual({ status: 0, candidates: [["answer-question", true]], stages: undefined });
});
