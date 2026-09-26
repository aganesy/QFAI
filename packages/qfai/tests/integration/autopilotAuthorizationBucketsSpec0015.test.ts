/**
 * Integration: inside a run, each Default Autopilot bucket is satisfied by one authorization kind.
 *
 * An `ask-user` item needs a `human_decision` answering it, a `hard-required` input `request_scope`
 * or the run's binding, and an `auto-decide` item none. `--auto` satisfies nothing. The policy
 * validator is unchanged and keeps its own cases.
 */
// QFAI:SPEC-0015:TC-0015-0039
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../helpers/shippedAssistant.js";

const BASELINE = "constitution/shared-skill-operating-baseline.md";
const PASSAGE = "## Default Autopilot Policy inside a run";

describe("TC-0015-0039: the operating baseline maps each bucket to its authorization kind", () => {
  it("TC-0015-0039: ask-user by a human_decision, hard-required by request_scope or the binding, auto-decide by none, --auto by nothing", async () => {
    const passage = flat(sectionOf(await readShipped(BASELINE), PASSAGE));
    expect(passage, `${BASELINE} has ${PASSAGE}`).not.toBe("");
    expect(passage).toMatch(
      /an `ask-user` item is satisfied only by a `human_decision` that answers it/i,
    );
    expect(passage).toMatch(
      /a `hard-required` input is satisfied by `request_scope` or by the run's binding/i,
    );
    expect(passage).toMatch(/an `auto-decide` item needs no authorization/i);
    expect(passage).toMatch(/`--auto` satisfies nothing/i);
  });
});
