/**
 * Unit: add-only merge of shipped routing phases into a project's own
 * `assistant/manifest/agent-routing.yml`.
 *
 * The manifest layer is user configuration (`qfai-configure` edits it), so
 * `--force` must never overwrite it. The consequence was that a phase added to
 * the shipped routing — the ATDD `red` gate, say — reached new projects only:
 * an installed project kept a routing table the updated skills already assume
 * a phase of. The merge closes that gap in the one direction that cannot lose
 * a decision: it adds missing skills and missing phases, and it never edits or
 * removes anything the project already declared.
 */

import { describe, expect, it } from "vitest";

import {
  mergeRoutingPhases,
  readCatalogAgentIds,
  readProfileNames,
  type RoutingMergeResult,
} from "../../../../src/core/manifest/routingPhaseMerge.js";

const TEMPLATE = `schema_version: "1.0"

routing:
  - skill: qfai-atdd
    phases:
      - id: coverage
        mandatory_agents: [test-design-analyst]
        blocking_agents: [test-design-analyst]
        rerun_policy: failed-agents-only
      # Stage gate P1b — the RED must be confirmed before production code.
      - id: red
        iteration: per-ledger-item
        mandatory_agents: [delivery-planner, acceptance-test-engineer]
        conditional_agents: [qa-gatekeeper]
        blocking_agents: [delivery-planner, qa-gatekeeper]
        rerun_policy: changed-scope-dependents
      - id: implementation
        mandatory_agents: [acceptance-test-engineer]
        blocking_agents: []
        rerun_policy: changed-scope-dependents
    review_profile: runtime-heavy

  - skill: qfai-verify
    phases:
      - id: plan
        mandatory_agents: [delivery-planner]
        blocking_agents: [delivery-planner]
        rerun_policy: failed-agents-only
    review_profile: runtime-heavy
`;

/** A project on an older package: no `red` phase, no `qfai-verify` entry. */
const STALE_PROJECT = `schema_version: "1.0"

routing:
  - skill: qfai-atdd
    phases:
      - id: coverage
        mandatory_agents: [test-design-analyst]
        blocking_agents: [test-design-analyst]
        rerun_policy: failed-agents-only
      - id: implementation
        # Project decision: this house runs its own engineer here.
        mandatory_agents: [acceptance-test-engineer, house-engineer]
        blocking_agents: []
        rerun_policy: changed-scope-dependents
    review_profile: runtime-heavy
`;

/** Every agent the shipped table above routes to. */
const FULL_CATALOG = new Set([
  "test-design-analyst",
  "delivery-planner",
  "acceptance-test-engineer",
  "qa-gatekeeper",
  "house-engineer",
]);

function messages(result: RoutingMergeResult): string {
  return result.warnings.map((warning) => warning.message).join("\n");
}

describe("mergeRoutingPhases", () => {
  it("inserts a missing phase at its shipped position and keeps it there", () => {
    const result = mergeRoutingPhases(TEMPLATE, STALE_PROJECT);

    expect(result.addedPhases).toEqual([{ skill: "qfai-atdd", phase: "red" }]);
    expect(result.content).not.toBeNull();
    const merged = result.content ?? "";
    // `red` sits between `coverage` and `implementation`, as shipped — after
    // the surfaces are built there is nothing left to watch fail.
    expect(merged.indexOf("- id: coverage")).toBeLessThan(merged.indexOf("- id: red"));
    expect(merged.indexOf("- id: red")).toBeLessThan(merged.indexOf("- id: implementation"));
    // The rationale comment travels with the phase.
    expect(merged).toContain("Stage gate P1b");
    expect(merged).toContain("iteration: per-ledger-item");
  });

  // Anchoring on the last phase matched put `red` at the end of a reordered
  // list — after `implementation`, which is the one placement the gate exists
  // to prevent. The insertion point is clamped to the earliest shipped phase
  // that follows it, so the gate holds without disturbing the project's order.
  it("keeps a gate phase ahead of its successor when the project reordered its phases", () => {
    const reordered = `schema_version: "1.0"

routing:
  - skill: qfai-atdd
    phases:
      - id: implementation
        mandatory_agents: [acceptance-test-engineer]
        blocking_agents: []
        rerun_policy: changed-scope-dependents
      - id: coverage
        mandatory_agents: [test-design-analyst]
        blocking_agents: [test-design-analyst]
        rerun_policy: failed-agents-only
    review_profile: runtime-heavy
`;
    const merged = mergeRoutingPhases(TEMPLATE, reordered).content ?? "";

    expect(merged.indexOf("- id: red")).toBeGreaterThan(-1);
    expect(merged.indexOf("- id: red")).toBeLessThan(merged.indexOf("- id: implementation"));
    // The project's own ordering of the phases it already had is untouched.
    expect(merged.indexOf("- id: implementation")).toBeLessThan(merged.indexOf("- id: coverage"));
  });

  // Anchoring the cursor on the phase matched *last* let it retreat: matching
  // `coverage` at index 1 and then `red` at index 0 pulled the insertion point
  // back to 1, so `implementation` was spliced in ahead of the `coverage` the
  // shipped table puts before it. The cursor only ever moves forward now.
  it("keeps an added phase after every earlier shipped phase the project reordered", () => {
    const swapped = `schema_version: "1.0"

routing:
  - skill: qfai-atdd
    phases:
      - id: red
        mandatory_agents: [delivery-planner, acceptance-test-engineer]
        blocking_agents: [delivery-planner]
        rerun_policy: changed-scope-dependents
      - id: coverage
        mandatory_agents: [test-design-analyst]
        blocking_agents: [test-design-analyst]
        rerun_policy: failed-agents-only
    review_profile: runtime-heavy
`;
    const result = mergeRoutingPhases(TEMPLATE, swapped);

    expect(result.addedPhases).toEqual([{ skill: "qfai-atdd", phase: "implementation" }]);
    const merged = result.content ?? "";
    expect(merged.indexOf("- id: coverage")).toBeLessThan(merged.indexOf("- id: implementation"));
    // The project's own ordering of the phases it already had is untouched.
    expect(merged.indexOf("- id: red")).toBeLessThan(merged.indexOf("- id: coverage"));
  });

  it("never rewrites a phase the project already declares", () => {
    const merged = mergeRoutingPhases(TEMPLATE, STALE_PROJECT).content ?? "";

    // The project's own taxonomy for an existing phase survives verbatim.
    expect(merged).toContain("mandatory_agents: [acceptance-test-engineer, house-engineer]");
    expect(merged).toContain("# Project decision: this house runs its own engineer here.");
  });

  it("appends a whole skill entry the project does not have", () => {
    const result = mergeRoutingPhases(TEMPLATE, STALE_PROJECT);

    expect(result.addedSkills).toEqual(["qfai-verify"]);
    expect(result.content ?? "").toContain("- skill: qfai-verify");
  });

  it("warns about a required agent the project removed instead of re-adding it", () => {
    const edited = STALE_PROJECT.replace(
      "      - id: coverage\n        mandatory_agents: [test-design-analyst]\n        blocking_agents: [test-design-analyst]\n",
      "      - id: coverage\n        mandatory_agents: []\n        blocking_agents: []\n",
    );
    const result = mergeRoutingPhases(TEMPLATE, edited);

    expect(result.warnings.map((warning) => warning.kind)).toContain("agent-diverged");
    expect(messages(result)).toContain("qfai-atdd/coverage");
    expect(messages(result)).toContain("test-design-analyst");
    // Respected, not repaired: the phase body is untouched.
    expect(result.content ?? "").toContain("- id: coverage\n        mandatory_agents: []");
  });

  it("reports no change when the project is already current", () => {
    const result = mergeRoutingPhases(TEMPLATE, TEMPLATE);

    expect(result.addedPhases).toEqual([]);
    expect(result.addedSkills).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.content).toBeNull();
  });

  it("leaves an unparsable or unexpected project manifest alone and says so", () => {
    const broken = mergeRoutingPhases(TEMPLATE, "routing: [\n");
    expect(broken.content).toBeNull();
    expect(messages(broken)).toContain("agent-routing.yml");
    // A syntax error is a shape problem, never a taxonomy divergence: a
    // consumer classifying by code would otherwise be sent to repair agent
    // lists in a file that does not parse.
    expect(broken.warnings.map((warning) => warning.kind)).toEqual(["manifest-shape"]);

    const wrongShape = mergeRoutingPhases(TEMPLATE, "schema_version: '1.0'\nrouting: {}\n");
    expect(wrongShape.content).toBeNull();
    expect(wrongShape.warnings.map((warning) => warning.kind)).toEqual(["manifest-shape"]);
  });

  // `validateRouting` skips a non-array `phases` too, so staying silent here
  // left the phase missing with no diagnostic from any command.
  it("warns when a project's routing entry carries no phases sequence", () => {
    const shapeless = `schema_version: "1.0"

routing:
  - skill: qfai-atdd
    phases: {}
    review_profile: runtime-heavy
`;
    const result = mergeRoutingPhases(TEMPLATE, shapeless);

    expect(result.addedPhases).toEqual([]);
    const shape = result.warnings.filter((warning) => warning.kind === "manifest-shape");
    expect(shape).toHaveLength(1);
    expect(shape[0]?.message).toContain("qfai-atdd");
  });

  // `--force` regenerates skills and agents but never `agent-catalog.yml`, so
  // splicing a shipped node that routes to an agent the project removed would
  // leave a table that fails `qfai validate` (QFAI-AGENT-008) where a valid
  // one stood.
  it("skips a shipped node the project's catalog cannot satisfy", () => {
    const withoutGatekeeper = new Set(FULL_CATALOG);
    withoutGatekeeper.delete("qa-gatekeeper");

    const result = mergeRoutingPhases(TEMPLATE, STALE_PROJECT, {
      knownAgents: withoutGatekeeper,
    });

    expect(result.addedPhases).toEqual([]);
    expect(result.content ?? "").not.toContain("- id: red");
    const mismatch = result.warnings.filter((warning) => warning.kind === "catalog-mismatch");
    expect(mismatch).toHaveLength(1);
    expect(mismatch[0]?.message).toContain("qa-gatekeeper");
    // The entry whose agents the catalog does cover is still added.
    expect(result.addedSkills).toEqual(["qfai-verify"]);
  });

  it("skips a whole shipped skill entry whose agents the catalog omits", () => {
    const withoutPlanner = new Set(FULL_CATALOG);
    withoutPlanner.delete("delivery-planner");

    const result = mergeRoutingPhases(TEMPLATE, STALE_PROJECT, { knownAgents: withoutPlanner });

    expect(result.addedSkills).toEqual([]);
    expect(messages(result)).toContain("qfai-verify");
    expect(messages(result)).toContain("delivery-planner");
  });

  // A skill entry shipped together with a new review profile — `qfai-implement`
  // and `implementation-heavy` — reaches a project that has neither, and
  // `--force` does not regenerate `review-profiles.yml` either. Appending the
  // entry whole would leave `review_profile:` pointing at nothing when the
  // reviewers for that skill are selected.
  it("skips a shipped entry whose review profile the project does not declare", () => {
    const result = mergeRoutingPhases(TEMPLATE, STALE_PROJECT, {
      knownProfiles: new Set(["default"]),
    });

    expect(result.addedSkills).toEqual([]);
    expect(result.content ?? "").not.toContain("- skill: qfai-verify");
    const mismatch = result.warnings.filter((warning) => warning.kind === "profile-mismatch");
    expect(mismatch).toHaveLength(1);
    expect(mismatch[0]?.message).toContain("runtime-heavy");
    expect(mismatch[0]?.message).toContain("qfai-verify");
    // The phase merge into an entry the project already has is unaffected: its
    // profile is the project's own.
    expect(result.addedPhases).toEqual([{ skill: "qfai-atdd", phase: "red" }]);
  });

  it("adds the entry when the project declares the profile it names", () => {
    const result = mergeRoutingPhases(TEMPLATE, STALE_PROJECT, {
      knownProfiles: new Set(["default", "runtime-heavy"]),
    });

    expect(result.addedSkills).toEqual(["qfai-verify"]);
    expect(result.warnings.filter((warning) => warning.kind === "profile-mismatch")).toEqual([]);
  });

  it("adds everything when the catalog covers the shipped agents", () => {
    const result = mergeRoutingPhases(TEMPLATE, STALE_PROJECT, { knownAgents: FULL_CATALOG });

    expect(result.addedPhases).toEqual([{ skill: "qfai-atdd", phase: "red" }]);
    expect(result.addedSkills).toEqual(["qfai-verify"]);
    expect(result.warnings.filter((warning) => warning.kind === "catalog-mismatch")).toEqual([]);
  });
});

describe("readCatalogAgentIds", () => {
  it("collects the declared agent ids", () => {
    const ids = readCatalogAgentIds(
      `schema_version: "1.0"\nagents:\n  - id: delivery-planner\n    kind: worker\n  - id: qa-gatekeeper\n    kind: reviewer\n`,
    );

    expect([...(ids ?? [])]).toEqual(["delivery-planner", "qa-gatekeeper"]);
  });

  // `null` is "unknown", not "empty": an unreadable catalog must not withhold
  // every addition on a guess.
  it("answers null for a catalog it cannot read as one", () => {
    expect(readCatalogAgentIds("agents: [\n")).toBeNull();
    expect(readCatalogAgentIds("agents: {}\n")).toBeNull();
  });
});

describe("readProfileNames", () => {
  it("collects the declared profile names", () => {
    const names = readProfileNames(
      `schema_version: "1.0"\nprofiles:\n  default:\n    always_required: [completion-reviewer]\n  runtime-heavy:\n    always_required: [qa-gatekeeper]\n`,
    );

    expect([...(names ?? [])]).toEqual(["default", "runtime-heavy"]);
  });

  // Same rule as the catalog: `null` is "unknown", so an unreadable file
  // disables the check instead of withholding every addition.
  it("answers null for a file it cannot read as one", () => {
    expect(readProfileNames("profiles: [\n")).toBeNull();
    expect(readProfileNames("profiles: []\n")).toBeNull();
  });
});
