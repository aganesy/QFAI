/**
 * Integration: what `/qfai-prototyping` does when a route plans it.
 *
 * Reads the shipped parent skill and its steps.
 */
import { describe, expect, it } from "vitest";

import { loadBuiltInPlans } from "../../../src/core/workflow/plans.js";
import { routingOutcome } from "../../../src/core/workflow/routeDecision.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

const PROTOTYPING_SCOPE_STEP = "step/prototyping-grill/STEP.md";
const UI_RESEARCH = "## UI research for uncovered screens";
const ENTRY_CHECK =
  "`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check`";

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("qfai-prototyping in a workflow run", () => {
  it("follows the entry check and cites it on one SKILL.md line", async () => {
    const body = await readShipped("skill/qfai-prototyping/SKILL.md");
    const citing = body
      .split("\n")
      .filter((line) =>
        line.includes("shared-skill-operating-baseline.md#workflow-run-entry-check"),
      );
    expect(citing).toHaveLength(1);
    expect(flat(body)).toContain(`Run the entry check of ${ENTRY_CHECK} first.`);
  });

  // QFAI:AC-0001-0204-03
  // QFAI:EX-0001-0204-03
  it("works only on the UI contracts that serve the bound flow and creates none", async () => {
    const text = await section(PROTOTYPING_SCOPE_STEP, "## Scope");
    expect(text).toMatch(
      /works only on the UI-bearing UI contracts that serve the business flow the work order's `target` binds/i,
    );
    expect(text).toMatch(
      /a contract serves a flow when one of its rules cites an example of one of that flow's stories/i,
    );
    expect(text).toMatch(
      /changes no UI contract that serves only another flow, and creates no contract/i,
    );
    expect(text).toMatch(/a standalone invocation still resolves every UI-bearing UI contract/i);
  });

  // QFAI:AC-0001-0204-04
  // QFAI:EX-0001-0204-04
  it("writes nothing and returns blocked when no UI contract serves the bound flow", async () => {
    const text = await section(PROTOTYPING_SCOPE_STEP, "## Scope");
    expect(text).toMatch(/writes no `DESIGN\.md`, no UI contract and no surface declaration/i);
    expect(text).toMatch(/\b(?:stop|stops|stopped)\b/iu);
    expect(text).toMatch(/missing UI (?:surface|contract)/iu);
    expect(text).toMatch(/bound (?:business )?flow/iu);
    expect(text).toMatch(/\b(?:session|stage) report\b|handoff/iu);
    expect(text).toMatch(/\boperator\b/iu);
    expect(text).toMatch(/resume.*contract.*serves.*bound flow/iu);
  });

  // QFAI:AC-0001-0204-05
  // QFAI:EX-0001-0204-05
  it("researches, before implementation, only the screen types and regions the catalogues do not cover", async () => {
    // Both readings of a change that adds screens reach a plan that runs the grill before it
    // implements anything.
    const addsScreens = [
      extraction({ intent: "feature", qualifiers: ["visual-open"] }),
      extraction({
        intent: "order",
        entryFlags: ["upstream"],
        qualifiers: ["settled-design", "new-screens"],
        signals: ["approved-record-task"],
        artifacts: ["spec", "contract", "ui", "code", "tests"],
      }),
    ];
    const plans = await loadBuiltInPlans();
    for (const reading of addsScreens) {
      const outcome = routingOutcome(reading);
      const route = "taken" in outcome ? outcome.taken.route : undefined;
      const steps = (plans.find((plan) => plan.route === route)?.stages ?? []).flatMap((stage) =>
        stage.steps.map((step) => `${stage.kind}:${step.name}`),
      );
      const grill = steps.indexOf("prototype:prototyping-grill");
      expect(grill, `${String(route)} runs the grill`).toBeGreaterThanOrEqual(0);
      expect(grill).toBeLessThan(steps.findIndex((step) => step.startsWith("implement:")));
    }

    const text = await section(PROTOTYPING_SCOPE_STEP, UI_RESEARCH);
    expect(text).toContain(
      "A screen the run adds is one in scope that has no route in `.qfai/prototype/final/index.html`.",
    );
    for (const catalogue of [
      "`.qfai/assistant/skill/qfai-sdd/references/business-ui-patterns.md`",
      "`.qfai/assistant/skill/qfai-sdd/references/marketing-ui-patterns.md`",
      "`Component catalogue` row of `<paths.contractsDir>/tech.md`",
      "`.qfai/catalog/components.yaml`",
      "root `DESIGN.md`",
    ]) {
      expect(text, catalogue).toContain(catalogue);
    }
    expect(text).toContain(
      "With one gap or more, run `.qfai/assistant/rule/research-first-protocol.md` before the session, scoped to UI and to the gaps alone: it researches no screen type and no region the project already covers.",
    );
    const procedure = await section(PROTOTYPING_SCOPE_STEP, "## Procedure");
    expect(procedure.indexOf("Run the gap check")).toBeLessThan(
      procedure.indexOf("Run the session."),
    );
    const trigger = await section("rule/research-first-protocol.md", "## Trigger");
    expect(trigger).toContain(
      "`prototyping-grill` also triggers it, scoped to UI, when a run adds a screen type or a region",
    );
  });

  // QFAI:AC-0001-0204-05
  // QFAI:EX-0001-0204-06
  it("runs no research when the catalogues cover every screen the run adds", async () => {
    const text = await section(PROTOTYPING_SCOPE_STEP, UI_RESEARCH);
    expect(text).toContain(
      "With no gap, run no research, and name in the stage report the entry that covers each screen the run adds.",
    );
    expect(text).toContain("A `restyle` loop adds no screen and skips this section.");
    const trigger = await section("rule/research-first-protocol.md", "## Trigger");
    expect(trigger).toContain("A run whose screens they all cover runs no research.");
  });
});
