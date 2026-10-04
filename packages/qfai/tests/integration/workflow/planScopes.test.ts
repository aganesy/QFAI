// QFAI:AC-0001-0229-01
// QFAI:AC-0001-0229-03

import { afterEach, expect, it } from "vitest";

import type { WorkflowExtraction } from "../../../src/core/workflow/extraction.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import { field, minimalProject, removeProjects, workflow, writeJson } from "./workflowProject.js";

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
      { scope: "narrow", stages: ["sdd", "implement", "note", "verify"], recommended: true },
      {
        scope: "broad",
        stages: ["sdd", "implement", "docs", "note", "verify"],
        recommended: false,
      },
    ],
  });
});

// QFAI:EX-0001-0229-13
it("The last stage writing code decides the scope, not a harness stage that opens the route", async () => {
  const planned = await planFor(
    extraction({ intent: "defect-conformance", artifacts: ["code", "tests"] }),
  );

  expect(field(planned.json, "route")).toBe("fix-conformance");
  expect(field(planned.json, "scopes")).toEqual(broadOnly(planned.json));
});

// QFAI:EX-0001-0229-15
it("A spec-only security request offers a scope that stops before the release point", async () => {
  const planned = await planFor(extraction({ intent: "security", artifacts: ["spec"] }));
  const scopes = field(planned.json, "scopes");
  const [narrow, medium] = Array.isArray(scopes) ? scopes : [];

  expect([field(planned.json, "route"), field(planned.json, "releasePoint")]).toEqual([
    "fix-vulnerability",
    "end",
  ]);
  expect([narrow, medium]).toEqual([
    { scope: "narrow", stages: ["intake", "diagnose", "spec"], recommended: true },
    {
      scope: "medium",
      stages: ["intake", "diagnose", "spec", "note", "verify"],
      recommended: false,
    },
  ]);
});

// QFAI:EX-0001-0229-14
it("A plan named by route, as a branch destination is, carries no scopes", async () => {
  const root = await minimalProject();
  const planned = workflow(root, ["plan", "--route", "add-feature"]);

  expect(Object.hasOwn(Object(planned.json), "scopes")).toBe(false);
});

// QFAI:EX-0001-0229-19
it("A harness stage takes the gates, but not the checks that need the fix", async () => {
  const planned = await planFor(
    extraction({ intent: "defect-crash", entryFlags: ["intermittent"], artifacts: ["spec"] }),
  );

  expect(field(planned.json, "route")).toBe("fix-intermittent");
  expect(field(planned.json, "scopes")).toEqual([
    {
      scope: "narrow",
      stages: ["harness", "diagnose", "spec", "note", "verify"],
      recommended: true,
    },
    { scope: "broad", stages: stageIds(planned.json), recommended: false },
  ]);
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
