import { expect, it } from "vitest";

import { decideRoute } from "../../../src/core/workflow/decisionRules.js";
import type { WorkflowExtraction } from "../../../src/core/workflow/extraction.js";
import { extractionFaults } from "../../../src/core/workflow/extractionShape.js";
import { extraction } from "../../helpers/workflowExtraction.js";

type Facts = Partial<WorkflowExtraction>;

// The route and rule the decision rules give an extraction.
async function decided(facts: Facts) {
  const choice = decideRoute(extraction(facts));
  return Promise.resolve([choice.route, choice.rule]);
}

async function routes(...each: Facts[]) {
  return Promise.all(each.map(async (facts) => (await decided(facts))[0]));
}

// QFAI:EX-0001-0211-04
it("A security claim routes to the vulnerability fix before every other rule", async () => {
  expect([
    await decided({ intent: "security", entryFlags: ["repro"], risks: ["security"] }),
    await decided({
      intent: "security",
      entryFlags: ["repro"],
      risks: ["security"],
      signals: ["approved-record-task"],
    }),
  ]).toEqual([
    ["fix-vulnerability", 1],
    ["fix-vulnerability", 1],
  ]);
});

// QFAI:EX-0001-0211-05
it("An approved record with a task applies the settled design, whatever its artifacts", async () => {
  const cited = {
    intent: "stale-record" as const,
    entryFlags: ["upstream" as const],
    signals: ["approved-record-task" as const],
  };
  expect(
    await routes(
      { ...cited, artifacts: ["spec", "contract"] },
      { ...cited, artifacts: ["spec", "code", "tests"] },
    ),
  ).toEqual(["apply-settled", "apply-settled"]);
});

// QFAI:EX-0001-0211-06
it("A stated need for grilling or a change request decides the design", async () => {
  expect(
    await routes(
      { intent: "feature", signals: ["grilling-required"] },
      { intent: "surface-contradiction", signals: ["decide-by-change-request"] },
    ),
  ).toEqual(["decide-design", "decide-design"]);
});

// QFAI:EX-0001-0211-07
it("A disabled test name or a flaky label quarantines the test", async () => {
  expect(
    await routes(
      { intent: "defect", entryFlags: ["bot"], signals: ["disabled-test"] },
      { intent: "ci", signals: ["flaky-label"] },
    ),
  ).toEqual(["quarantine-flaky", "quarantine-flaky"]);
});

// QFAI:EX-0001-0211-08
it("The release signals route to the backport, the release notes and the manual check", async () => {
  expect(
    await routes(
      { intent: "release", signals: ["backport"] },
      { intent: "release", signals: ["release-notes"] },
      { intent: "release", signals: ["test-plan"] },
    ),
  ).toEqual(["backport-fix", "draft-release-notes", "verify-manually"]);
});

// QFAI:EX-0001-0211-38
it("A release with no release signal is handed off, since the user runs a release", async () => {
  expect(await decided({ intent: "release" })).toEqual(["hand-off-operation", 14]);
});

// QFAI:EX-0001-0211-37
it("A request for the bodies of the empty acceptance tests writes them", async () => {
  expect(
    await decided({
      intent: "follow-up",
      signals: ["acceptance-bodies"],
      artifacts: ["tests"],
    }),
  ).toEqual(["write-acceptance-tests", 5]);
});

// QFAI:EX-0001-0211-09
it("No work, and a hosted-service problem, close with no change", async () => {
  expect(await routes({ intent: "no-work" }, { intent: "question-hosted" })).toEqual([
    "close-no-change",
    "close-no-change",
  ]);
});

// QFAI:EX-0001-0211-10
it("A stale premise and a known duplicate close as duplicates", async () => {
  expect(
    await routes(
      { intent: "defect", entryFlags: ["stale"] },
      { intent: "feature", qualifiers: ["known-duplicate"] },
    ),
  ).toEqual(["close-duplicate", "close-duplicate"]);
});

// QFAI:EX-0001-0211-11
// QFAI:EX-0001-0211-12
it("Every question is answered", async () => {
  expect(
    await routes(
      { intent: "question-how" },
      { intent: "question-help", qualifiers: ["docs-answerable"] },
      { intent: "question-why" },
      { intent: "question-help" },
    ),
  ).toEqual(["answer-question", "answer-question", "answer-question", "answer-question"]);
});

// QFAI:EX-0001-0211-13
// QFAI:EX-0001-0211-14
// QFAI:EX-0001-0211-15
// QFAI:EX-0001-0211-16
it("Too little to act on, an epic, leftovers of mixed kinds and a design", async () => {
  expect(
    await routes(
      { intent: "defect", entryFlags: ["vague"] },
      { intent: "epic" },
      { intent: "follow-up" },
      { intent: "defect", entryFlags: ["bundle"], qualifiers: ["mixed-bundle"] },
      { intent: "design", entryFlags: ["decision"] },
    ),
  ).toEqual([
    "request-info",
    "decompose-epic",
    "retriage-bundle",
    "retriage-bundle",
    "decide-design",
  ]);
});

// QFAI:EX-0001-0211-17
it("An operation only a person can run, and a distribution incident, are handed off", async () => {
  expect(
    await routes(
      { intent: "order", qualifiers: ["human-run"] },
      { intent: "release", qualifiers: ["distribution-incident"] },
    ),
  ).toEqual(["hand-off-operation", "hand-off-operation"]);
});

// QFAI:EX-0001-0211-38
it("A release no release signal routes is handed off by rule 14", async () => {
  expect(await decided({ intent: "release", artifacts: ["release"] })).toEqual([
    "hand-off-operation",
    14,
  ]);
});

// QFAI:EX-0001-0211-18
it("A settled design applies, whatever a later rule would give", async () => {
  expect([
    await decided({
      intent: "feature",
      entryFlags: ["upstream"],
      qualifiers: ["settled-design"],
      artifacts: ["code", "tests", "spec"],
    }),
    await decided({
      intent: "behaviour-change",
      entryFlags: ["upstream"],
      qualifiers: ["settled-design"],
    }),
    await decided({ intent: "order", artifacts: ["spec"] }),
  ]).toEqual([
    ["apply-settled", 15],
    ["apply-settled", 15],
    ["apply-settled", 15],
  ]);
});

// QFAI:EX-0001-0211-19
// QFAI:EX-0001-0211-20
it("Tests, CI and dependencies", async () => {
  expect(
    await routes(
      { intent: "flaky-test" },
      { intent: "test-defect" },
      { intent: "dependency", risks: ["security"] },
      { intent: "ci", qualifiers: ["red-since-change"] },
      { intent: "ci" },
    ),
  ).toEqual([
    "quarantine-flaky",
    "repair-test",
    "bump-dependency",
    "fix-red-main",
    "change-tooling",
  ]);
});

// QFAI:EX-0001-0211-21
// QFAI:EX-0001-0211-22
// QFAI:EX-0001-0211-23
// QFAI:EX-0001-0211-24
it("Consistency: a missing check, a removal, the other disagreements and stale records", async () => {
  expect(
    await routes(
      { intent: "unenforced", qualifiers: ["check-misses"] },
      { intent: "unenforced", qualifiers: ["mechanism-inert", "removal-requested"] },
      { intent: "surface-contradiction" },
      { intent: "model-gap" },
      { intent: "unenforced", qualifiers: ["mechanism-inert"] },
      { intent: "stale-record" },
    ),
  ).toEqual([
    "repair-consistency",
    "retire-mechanism",
    "repair-consistency",
    "repair-consistency",
    "repair-consistency",
    "restate-records",
  ]);
});

// QFAI:EX-0001-0211-25
// QFAI:EX-0001-0211-26
it("Regressions, conformance and performance", async () => {
  expect([
    await decided({ intent: "defect-regression", entryFlags: ["repro", "last-good"] }),
    await decided({ intent: "defect-regression", entryFlags: ["env"] }),
    await decided({ intent: "defect-conformance" }),
    await decided({ intent: "performance", entryFlags: ["measured"] }),
  ]).toEqual([
    ["fix-defect", 22],
    ["fix-env-bound", 25],
    ["fix-conformance", 23],
    ["improve-performance", 23],
  ]);
});

// QFAI:EX-0001-0211-27
it("Crashes cluster, minimize, fall through to the defect fix, or stress", async () => {
  expect([
    await decided({ intent: "defect-crash", entryFlags: ["bot"] }),
    await decided({ intent: "defect-crash", entryFlags: ["trace"] }),
    await decided({ intent: "defect-crash", entryFlags: ["trace", "cause"] }),
    await decided({ intent: "defect-crash", entryFlags: ["intermittent"] }),
  ]).toEqual([
    ["cluster-reports", 24],
    ["fix-defect", 24],
    ["fix-defect", 27],
    ["fix-intermittent", 24],
  ]);
});

// QFAI:EX-0001-0211-28
// QFAI:EX-0001-0211-29
// QFAI:EX-0001-0211-30
it("Defects bound to an environment, intermittent, and every other", async () => {
  expect([
    await decided({ intent: "defect", entryFlags: ["env"] }),
    await decided({ intent: "defect-silent", entryFlags: ["env", "repro"] }),
    await decided({ intent: "defect", entryFlags: ["intermittent"] }),
    await decided({ intent: "defect", entryFlags: ["cause"] }),
    await decided({ intent: "defect-silent", risks: ["data-loss"] }),
  ]).toEqual([
    ["fix-env-bound", 25],
    ["fix-defect", 27],
    ["fix-intermittent", 26],
    ["fix-defect", 27],
    ["fix-defect", 27],
  ]);
});

// QFAI:EX-0001-0211-31
it("Features and behaviour changes decide, change compatibility, prototype or add", async () => {
  expect(
    await routes(
      { intent: "feature", entryFlags: ["decision"] },
      { intent: "behaviour-change", entryFlags: ["decision"] },
      { intent: "deprecation" },
      { intent: "behaviour-change" },
      { intent: "feature", qualifiers: ["visual-open"] },
      { intent: "feature" },
    ),
  ).toEqual([
    "decide-design",
    "decide-design",
    "change-compatibility",
    "change-compatibility",
    "prototype-feature",
    "add-feature",
  ]);
});

// QFAI:EX-0001-0211-39
it("A behaviour change prototypes only when the request asks to change the prototype", async () => {
  expect(
    await routes(
      { intent: "behaviour-change", qualifiers: ["prototype-requested"] },
      { intent: "behaviour-change", entryFlags: ["decision"], qualifiers: ["prototype-requested"] },
      { intent: "behaviour-change" },
    ),
  ).toEqual(["prototype-feature", "decide-design", "change-compatibility"]);
});

// QFAI:EX-0001-0211-42
// QFAI:EX-0001-0211-43
it("A settled behaviour change that asks to change the prototype applies its record, then prototypes", async () => {
  expect([
    await decided({
      intent: "behaviour-change",
      qualifiers: ["prototype-requested"],
      signals: ["approved-record-task"],
    }),
    await decided({
      intent: "behaviour-change",
      entryFlags: ["upstream"],
      qualifiers: ["settled-design", "prototype-requested"],
    }),
    await decided({ intent: "behaviour-change", signals: ["approved-record-task"] }),
  ]).toEqual([
    ["apply-settled-prototype", 2],
    ["apply-settled-prototype", 15],
    ["apply-settled", 2],
  ]);
});

// QFAI:EX-0001-0211-32
it("A refactor and a documentation change", async () => {
  expect(await routes({ intent: "refactor" }, { intent: "docs" })).toEqual([
    "refactor-code",
    "edit-text",
  ]);
});

// The fields of an extraction that `plan` refuses.
function refused(fields: Record<string, unknown>) {
  return extractionFaults({ ...extraction(), ...fields }).map((subject) => `schema:${subject}`);
}

// QFAI:EX-0001-0211-03
it("An extraction value outside its vocabulary is refused as a shape, naming the field", () => {
  const reading = { intent: "feature", entryFlags: [], qualifiers: [], signals: [] };
  expect({
    intent: refused({ intent: "bug" }),
    flag: refused({ entryFlags: ["urgent"] }),
    confidence: refused({ confidence: 0.9 }),
    alternativesAtHigh: refused({ alternatives: [reading] }),
    lowWithout: refused({ confidence: "low" }),
    lowWith: refused({ confidence: "low", alternatives: [reading] }),
    unknownBeside: refused({ confidence: "low", route: "add-feature" }),
  }).toEqual({
    intent: ["schema:intent"],
    flag: ["schema:entryFlags[0]"],
    confidence: ["schema:confidence"],
    alternativesAtHigh: ["schema:alternatives"],
    lowWithout: ["schema:alternatives"],
    lowWith: [],
    unknownBeside: ["schema:alternatives", "schema:route"],
  });
});
