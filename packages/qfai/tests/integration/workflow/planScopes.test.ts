// QFAI:AC-0001-0229-01
// QFAI:AC-0001-0229-03
// QFAI:AC-0001-0229-07

import { rm } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import type { WorkflowExtraction } from "../../../src/core/workflow/extraction.js";
import type { PlanStage, PlanStep } from "../../../src/core/workflow/planFormat.js";
import { scopesOf } from "../../../src/core/workflow/scopes.js";
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

// The plan `npx qfai workflow plan --in` prints for the extraction.
async function planFor(
  value: WorkflowExtraction,
): Promise<{ status: number | null; json: unknown }> {
  const root = await minimalProject();
  const file = await writeJson(root, "tmp/request.json", value);
  const planned = workflow(root, ["plan", "--in", file]);
  return { status: planned.status, json: planned.json };
}

function stageIds(json: unknown): unknown {
  const stages = field(json, "stages");
  return Array.isArray(stages) ? stages.map((stage) => field(stage, "id")) : stages;
}

const broadOnly = (json: unknown) => [
  { scope: "broad", stages: stageIds(json), recommended: true },
];

// QFAI:EX-0001-0229-01
it("A spec-and-prototype request offers the prototype stage as its narrowest scope", async () => {
  const planned = await planFor(
    extraction({ intent: "feature", qualifiers: ["visual-open"], artifacts: ["spec", "ui"] }),
  );

  expect({ status: planned.status, route: field(planned.json, "route") }).toEqual({
    status: 0,
    route: "prototype-feature",
  });
  expect(field(planned.json, "scopes")).toEqual([
    { scope: "narrow", stages: ["sdd", "prototype"], recommended: true },
    { scope: "medium", stages: ["sdd", "prototype", "note", "verify"], recommended: false },
    { scope: "broad", stages: stageIds(planned.json), recommended: false },
  ]);
});

// QFAI:EX-0001-0229-31
it("A restyle prototype offers only the scopes that carry its edits through implementation", async () => {
  const restyle = await planFor(
    extraction({
      intent: "feature",
      qualifiers: ["visual-open", "restyle"],
      artifacts: ["spec", "ui"],
    }),
  );
  expect(field(restyle.json, "route")).toBe("prototype-feature");
  expect(field(restyle.json, "scopes")).toEqual(broadOnly(restyle.json));

  const candidates = field(
    (
      await planFor(
        extraction({
          intent: "feature",
          qualifiers: ["visual-open", "restyle"],
          artifacts: ["spec", "ui"],
          confidence: "low",
          alternatives: [{ intent: "design", entryFlags: [], qualifiers: [], signals: [] }],
        }),
      )
    ).json,
    "candidates",
  );
  const prototype = (Array.isArray(candidates) ? candidates : []).find(
    (each) => field(each, "route") === "prototype-feature",
  );
  expect(field(prototype, "scopes")).toEqual([
    { scope: "broad", stages: stageIds(restyle.json), recommended: true },
  ]);

  const merged = field(
    (
      await planFor(
        extraction({
          intent: "feature",
          qualifiers: ["visual-open"],
          artifacts: ["spec", "ui"],
          confidence: "low",
          alternatives: [
            {
              intent: "feature",
              entryFlags: [],
              qualifiers: ["visual-open", "restyle"],
              signals: [],
            },
          ],
        }),
      )
    ).json,
    "candidates",
  );
  expect(
    (Array.isArray(merged) ? merged : []).map((each) => [
      field(each, "route"),
      field(each, "scopes"),
    ]),
  ).toEqual([
    ["prototype-feature", [{ scope: "broad", stages: stageIds(restyle.json), recommended: true }]],
  ]);

  const noPrototype = await planFor(
    extraction({ intent: "surface-contradiction", qualifiers: ["restyle"], artifacts: ["ui"] }),
  );
  expect(field(noPrototype.json, "route")).toBe("repair-consistency");
  expect(field(noPrototype.json, "scopes")).toEqual([
    { scope: "narrow", stages: ["diagnose", "sdd"], recommended: true },
    { scope: "medium", stages: ["diagnose", "sdd", "note", "verify"], recommended: false },
    {
      scope: "broad",
      stages: ["diagnose", "sdd", "implement", "note", "verify"],
      recommended: false,
    },
  ]);
});

// QFAI:EX-0001-0229-02
it("A scope that writes code holds the closing verification stages", async () => {
  const planned = await planFor(
    extraction({ intent: "behaviour-change", artifacts: ["spec", "contract", "code", "tests"] }),
  );

  expect(field(planned.json, "route")).toBe("change-compatibility");
  expect(field(planned.json, "scopes")).toEqual(broadOnly(planned.json));
});

// QFAI:EX-0001-0229-03
it("A request with no artifact has one scope, every stage", async () => {
  const planned = await planFor(extraction({ intent: "question-how", artifacts: [] }));

  expect(field(planned.json, "scopes")).toEqual(broadOnly(planned.json));
});

// QFAI:EX-0001-0229-04
it("An artifact no stage writes counts for nothing", async () => {
  const planned = await planFor(extraction({ intent: "feature", artifacts: ["spec", "release"] }));

  expect(field(planned.json, "route")).toBe("add-feature");
  expect(field(planned.json, "scopes")).toEqual([
    { scope: "narrow", stages: ["sdd"], recommended: true },
    { scope: "medium", stages: ["sdd", "note", "verify"], recommended: false },
    { scope: "broad", stages: stageIds(planned.json), recommended: false },
  ]);
});

// QFAI:EX-0001-0229-09
it("Each candidate carries its own scopes", async () => {
  const planned = await planFor(
    extraction({
      intent: "feature",
      artifacts: ["spec", "code", "tests"],
      confidence: "low",
      alternatives: [{ intent: "design", entryFlags: [], qualifiers: [], signals: [] }],
    }),
  );
  const candidates = field(planned.json, "candidates");
  const byRoute = Object.fromEntries(
    (Array.isArray(candidates) ? candidates : []).map((each) => [
      field(each, "route"),
      field(each, "scopes"),
    ]),
  );

  expect(byRoute).toEqual({
    "decide-design": [{ scope: "broad", stages: ["discussion", "close"], recommended: true }],
    "add-feature": [
      { scope: "broad", stages: ["sdd", "implement", "docs", "note", "verify"], recommended: true },
    ],
  });
});

// QFAI:EX-0001-0229-09
it("A scope is not offered when the next wider one adds only pass-through stages", () => {
  const stage = (id: string, kind: string, ...steps: PlanStep[]): PlanStage => ({
    id,
    kind,
    steps,
    after: [],
  });
  const passing = (name: string): PlanStep => ({ name, passThrough: true });
  const stages = [
    stage("sdd", "sdd", { name: "sdd-story" }),
    stage("implement", "implement", { name: "implement-tdd" }),
    stage("note", "verify", passing("verify-change-note")),
  ];

  expect(scopesOf(stages, ["spec"])).toEqual([
    { scope: "medium", stages: ["sdd", "note"], recommended: true },
    { scope: "broad", stages: ["sdd", "implement", "note"], recommended: false },
  ]);

  const reviewed = stages.map((each) =>
    each.id === "note" ? { ...each, review: "code" as const } : each,
  );
  expect(scopesOf(reviewed, ["spec"])).toEqual([
    { scope: "narrow", stages: ["sdd"], recommended: true },
    { scope: "medium", stages: ["sdd", "note"], recommended: false },
    { scope: "broad", stages: ["sdd", "implement", "note"], recommended: false },
  ]);

  const passingImplement = stages.map((each) =>
    each.id === "implement" ? { ...each, steps: [passing("implement-tdd")] } : each,
  );
  expect(scopesOf(passingImplement, ["spec"])).toEqual([
    { scope: "medium", stages: ["sdd", "note"], recommended: true },
    { scope: "broad", stages: ["sdd", "implement", "note"], recommended: false },
  ]);
});

// QFAI:EX-0001-0229-09
it("A spec-only settled request keeps the scope that stops before pass-through implementation", async () => {
  const planned = await planFor(extraction({ intent: "order", artifacts: ["spec"] }));

  expect(field(planned.json, "route")).toBe("apply-settled");
  expect(field(planned.json, "scopes")).toEqual([
    { scope: "narrow", stages: ["spec"], recommended: true },
    { scope: "medium", stages: ["spec", "note", "verify"], recommended: false },
    { scope: "broad", stages: ["spec", "implement", "note", "verify"], recommended: false },
  ]);
});

// QFAI:EX-0001-0229-13
it("The last stage writing code decides the scope, not a harness stage that opens the route", async () => {
  const planned = await planFor(
    extraction({ intent: "defect-conformance", artifacts: ["code", "tests"] }),
  );

  expect(field(planned.json, "route")).toBe("fix-conformance");
  expect(field(planned.json, "scopes")).toEqual(broadOnly(planned.json));
});

// QFAI:EX-0001-0229-14
it("A plan named by route, as a branch destination is, carries no scopes", async () => {
  const root = await minimalProject();
  const planned = workflow(root, ["plan", "--route", "add-feature"]);

  expect(Object.hasOwn(Object(planned.json), "scopes")).toBe(false);
});

// QFAI:EX-0001-0229-20
it("A quarantine is not lifted before any fix runs", async () => {
  const planned = await planFor(extraction({ intent: "flaky-test", artifacts: ["ci"] }));

  expect(field(planned.json, "route")).toBe("quarantine-flaky");
  expect(field(planned.json, "scopes")).toEqual([
    { scope: "narrow", stages: ["isolate", "note", "verify"], recommended: true },
    { scope: "broad", stages: stageIds(planned.json), recommended: false },
  ]);
});

// QFAI:EX-0001-0229-15
it("A security intake plan offers no scope that stops before the fix", async () => {
  const planned = await planFor(extraction({ intent: "security", artifacts: ["spec"] }));

  expect(field(planned.json, "route")).toBe("fix-vulnerability");
  expect(field(planned.json, "scopes")).toEqual(broadOnly(planned.json));
});

// QFAI:EX-0001-0229-19
it("An implement stage that writes nothing requested stays out of the narrower scopes", async () => {
  const planned = await planFor(extraction({ intent: "feature", artifacts: ["docs"] }));

  expect(field(planned.json, "route")).toBe("add-feature");
  expect(field(planned.json, "scopes")).toEqual([
    { scope: "narrow", stages: ["sdd", "docs"], recommended: true },
    { scope: "medium", stages: ["sdd", "docs", "note", "verify"], recommended: false },
    { scope: "broad", stages: stageIds(planned.json), recommended: false },
  ]);
});

// QFAI:EX-0001-0229-21
it("A later documentation stage does not pull unrequested implementation in", async () => {
  const planned = await planFor(
    extraction({
      intent: "feature",
      qualifiers: ["visual-open"],
      artifacts: ["spec", "ui", "docs"],
    }),
  );

  expect(field(planned.json, "scopes")).toEqual([
    { scope: "narrow", stages: ["sdd", "prototype", "docs"], recommended: true },
    { scope: "medium", stages: ["sdd", "prototype", "docs", "note", "verify"], recommended: false },
    { scope: "broad", stages: stageIds(planned.json), recommended: false },
  ]);
});

// QFAI:EX-0001-0229-22
it("No scope runs the fix without the checks that verify it", async () => {
  const planned = await planFor(
    extraction({
      intent: "defect-crash",
      entryFlags: ["intermittent"],
      artifacts: ["code", "tests"],
    }),
  );

  expect(field(planned.json, "route")).toBe("fix-intermittent");
  expect(field(planned.json, "scopes")).toEqual(broadOnly(planned.json));
});

const reasonsOf = (json: unknown) => field(json, "reasons");

// QFAI:EX-0001-0229-24
it("A request whose artifact no stage of the route writes is refused before any stage", async () => {
  const planned = await planFor(extraction({ intent: "feature", artifacts: ["release"] }));

  expect(planned.status).toBe(2);
  expect(field(planned.json, "ok")).toBe(false);
  expect(reasonsOf(planned.json)).toEqual([{ reason: "artifact-unserved", subject: "release" }]);
});

const lowConfidence = (intent: "design" | "refactor", artifacts: WorkflowExtraction["artifacts"]) =>
  extraction({
    intent: "feature",
    artifacts,
    confidence: "low",
    alternatives: [{ intent, entryFlags: [], qualifiers: [], signals: [] }],
  });

// QFAI:EX-0001-0229-25
it("A candidate that cannot serve the request is left out, and the next one is recommended", async () => {
  const planned = await planFor(lowConfidence("design", ["release"]));
  const candidates = field(planned.json, "candidates");

  expect(
    (Array.isArray(candidates) ? candidates : []).map((each) => [
      field(each, "route"),
      field(each, "recommended"),
    ]),
  ).toEqual([["decide-design", true]]);
});

// QFAI:EX-0001-0229-27
it("A request no candidate can serve is refused", async () => {
  const planned = await planFor(lowConfidence("refactor", ["release"]));

  expect(planned.status).toBe(2);
  expect(reasonsOf(planned.json)).toEqual([{ reason: "artifact-unserved", subject: "release" }]);
});

// QFAI:EX-0001-0229-26
it("A route that writes nothing is not refused for the artifacts the request names", async () => {
  const planned = await planFor(extraction({ intent: "design", artifacts: ["spec"] }));

  expect(field(planned.json, "route")).toBe("decide-design");
  expect(field(planned.json, "scopes")).toEqual(broadOnly(planned.json));
});

// QFAI:EX-0001-0229-28
it("A request that writes only documentation is never handed over unchecked", async () => {
  const planned = await planFor(extraction({ intent: "docs", artifacts: ["docs"] }));

  expect(field(planned.json, "route")).toBe("edit-text");
  expect(field(planned.json, "scopes")).toEqual(broadOnly(planned.json));
  expect(stageIds(planned.json)).toEqual(["edit", "note", "verify"]);
});

async function rawProcedurePlan(fields: Record<string, unknown> = {}) {
  const root = await minimalProject();
  const file = await writeJson(root, "tmp/procedure.json", {
    ...extraction({ artifacts: ["docs"] }),
    intent: "procedure",
    ...fields,
  });
  const before = await listTree(root);
  const result = workflow(root, ["plan", "--in", file]);
  expect(await listTree(root)).toEqual(before);
  expect(result.json).toBeDefined();
  return result;
}

// QFAI:AC-0001-0224-13
// QFAI:EX-0001-0224-43
// QFAI:EX-0001-0224-50
it("A docs-only procedure gets its dedicated writer and the full closing checks", async () => {
  const result = await rawProcedurePlan();
  expect(result.status).toBe(0);
  expect(field(result.json, "ok")).toBe(true);
  expect([
    field(result.json, "route"),
    field(result.json, "family"),
    field(result.json, "rule"),
  ]).toEqual(["write-procedure", "change", 29]);
  const step = (name: string, passThrough = false) => ({
    name,
    path: ".qfai/assistant/step/" + name + "/STEP.md",
    mode: null,
    passThrough,
  });
  expect(field(result.json, "stages")).toEqual([
    { id: "documentation", kind: "documentation", steps: [step("implement-procedure")] },
    { id: "note", kind: "verify", review: "code", steps: [step("verify-change-note", true)] },
    {
      id: "verify",
      kind: "verify",
      steps: [step("verify-qfai-gate"), step("verify-repo-gate"), step("verify-commit")],
    },
  ]);
  expect(field(result.json, "decisionPoints")).toEqual([]);
  expect(field(result.json, "branchPoints")).toEqual([]);
  expect(field(result.json, "releasePoint")).toBeNull();
  expect(field(result.json, "scopes")).toEqual([
    { scope: "broad", stages: ["documentation", "note", "verify"], recommended: true },
  ]);
});

// QFAI:AC-0001-0224-13
// QFAI:EX-0001-0224-54
it("A procedure that also edits the script it names stays on its writer with the full closing checks", async () => {
  const result = await rawProcedurePlan({ artifacts: ["docs", "ci"] });
  expect(result.status).toBe(0);
  expect([
    field(result.json, "route"),
    field(result.json, "family"),
    field(result.json, "rule"),
  ]).toEqual(["write-procedure", "change", 29]);
  expect(stageIds(result.json)).toEqual(["documentation", "note", "verify"]);
  expect(field(result.json, "scopes")).toEqual([
    { scope: "broad", stages: ["documentation", "note", "verify"], recommended: true },
  ]);
});

// QFAI:AC-0001-0224-13
// QFAI:EX-0001-0224-46
it("The public planner rejects procedure as a qualifier with schema exit 2", async () => {
  const result = await rawProcedurePlan({ qualifiers: ["procedure"] });
  expect(result.status).toBe(2);
  expect(field(result.json, "ok")).toBe(false);
  expect(field(result.json, "reasons")).toEqual([
    expect.objectContaining({ reason: "schema", subject: "qualifiers[0]" }),
  ]);
});

// QFAI:AC-0001-0224-13
// QFAI:EX-0001-0224-51
it("A procedure plan cannot serve a code-only request", async () => {
  const result = await rawProcedurePlan({ artifacts: ["code"] });
  expect(result.status).toBe(2);
  expect(field(result.json, "ok")).toBe(false);
  expect(field(result.json, "reasons")).toEqual([{ reason: "artifact-unserved", subject: "code" }]);
});

// QFAI:AC-0001-0224-13
// QFAI:EX-0001-0224-51
it("A missing installed procedure writer is refused with plan-invalid exit 1", async () => {
  const root = await minimalProject();
  await rm(path.join(root, ".qfai", "assistant", "step", "implement-procedure", "STEP.md"), {
    force: true,
  });
  const file = await writeJson(root, "tmp/procedure.json", {
    ...extraction({ artifacts: ["docs"] }),
    intent: "procedure",
  });
  const before = await listTree(root);
  const result = workflow(root, ["plan", "--in", file]);
  expect(result.status).toBe(1);
  expect(field(result.json, "reasons")).toEqual([
    {
      reason: "plan-invalid",
      subject: "implement-procedure",
      file: "write-procedure.yml",
      cause: "step-missing",
    },
  ]);
  expect(await listTree(root)).toEqual(before);
});

// QFAI:AC-0001-0224-13
// QFAI:EX-0001-0224-44
it("Actual mixed implementation and security readings retain their original checks", async () => {
  const mixed = await planFor(extraction({ intent: "feature", artifacts: ["code", "docs"] }));
  expect(mixed.status).toBe(0);
  expect(field(mixed.json, "route")).toBe("add-feature");
  expect(stageIds(mixed.json)).toEqual(["sdd", "implement", "docs", "note", "verify"]);
  expect(field(mixed.json, "scopes")).toEqual(broadOnly(mixed.json));
  const security = await planFor(extraction({ intent: "security", artifacts: ["docs"] }));
  expect(security.status).toBe(0);
  expect(field(security.json, "route")).toBe("fix-vulnerability");
  expect(field(security.json, "scopes")).toEqual(broadOnly(security.json));
});

// QFAI:AC-0001-0229-01
// QFAI:EX-0001-0229-29
it("A UI-only consistency repair reaches its actual design authoring step", async () => {
  const planned = await planFor(extraction({ intent: "surface-contradiction", artifacts: ["ui"] }));

  expect({
    status: planned.status,
    ok: field(planned.json, "ok"),
    route: field(planned.json, "route"),
  }).toEqual({ status: 0, ok: true, route: "repair-consistency" });
  const stages = field(planned.json, "stages");
  const sdd = (Array.isArray(stages) ? stages : []).find((stage) => field(stage, "id") === "sdd");
  const steps = field(sdd, "steps");
  expect(
    (Array.isArray(steps) ? steps : []).map((step) => [
      field(step, "name"),
      field(step, "passThrough"),
    ]),
  ).toEqual([
    ["sdd-triage", false],
    ["sdd-flow", true],
    ["sdd-story", true],
    ["sdd-contract", true],
    ["common-design-md", true],
    ["sdd-cycle", true],
  ]);
  expect(field(planned.json, "scopes")).toEqual([
    { scope: "narrow", stages: ["diagnose", "sdd"], recommended: true },
    { scope: "medium", stages: ["diagnose", "sdd", "note", "verify"], recommended: false },
    {
      scope: "broad",
      stages: ["diagnose", "sdd", "implement", "note", "verify"],
      recommended: false,
    },
  ]);
});

// QFAI:AC-0001-0229-07
// QFAI:EX-0001-0229-30
it("An SDD route without a design authoring step still refuses UI-only work", async () => {
  const planned = await planFor(extraction({ intent: "behaviour-change", artifacts: ["ui"] }));

  expect(planned.status).toBe(2);
  expect(field(planned.json, "ok")).toBe(false);
  expect(reasonsOf(planned.json)).toEqual([{ reason: "artifact-unserved", subject: "ui" }]);
});

// The facts the route evaluation seeds SEED-467 and SEED-468 carry: a merge whose conflicts lie in
// the decision register and a contract.
const conflictResolution = (
  intent: "order" | "stale-record",
  artifacts: WorkflowExtraction["artifacts"],
) => extraction({ intent, qualifiers: ["meaning-preserving"], artifacts });

// BR-0015-0303
// BR-0015-0322
// QFAI:EX-0001-0229-32
it("A conflict resolution in spec and contract files plans, and one in code is refused", async () => {
  const staleRecord = await planFor(conflictResolution("stale-record", ["spec", "contract"]));
  const order = await planFor(conflictResolution("order", ["spec", "contract"]));
  const code = await planFor(conflictResolution("order", ["code"]));

  expect([staleRecord, order].map((each) => [each.status, field(each.json, "route")])).toEqual([
    [0, "resolve-conflicts"],
    [0, "resolve-conflicts"],
  ]);
  expect(field(order.json, "scopes")).toEqual(broadOnly(order.json));
  expect(code.status).toBe(2);
  expect(reasonsOf(code.json)).toEqual([{ reason: "artifact-unserved", subject: "code" }]);
});
