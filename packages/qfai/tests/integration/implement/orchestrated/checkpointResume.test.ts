/**
 * Integration: a long stage resumes at a ledger-row boundary.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0016
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0016 (TDD-0024): A Long Stage Resumes at a Ledger-Row Boundary", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## Resuming a long stage",
      ),
    );
    expect(text, "the ## Resuming a long stage section exists").not.toBe("");
    expect(text).toMatch(
      /resumes at the ledger row its work order's `checkpointRef` names, through the work order's own operation/i,
    );
    expect(text).toMatch(/names row IDs and copies no row's status/i);
    expect(text).toMatch(/phase order of `SKILL\.md` is unchanged on resume/i);
  });
});
