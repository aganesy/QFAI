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

import { mergeRoutingPhases } from "../../../../src/core/manifest/routingPhaseMerge.js";

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

    expect(result.warnings.join("\n")).toContain("qfai-atdd/coverage");
    expect(result.warnings.join("\n")).toContain("test-design-analyst");
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
    expect(broken.warnings.join("\n")).toContain("agent-routing.yml");

    const wrongShape = mergeRoutingPhases(TEMPLATE, "schema_version: '1.0'\nrouting: {}\n");
    expect(wrongShape.content).toBeNull();
    expect(wrongShape.warnings.length).toBeGreaterThan(0);
  });
});
