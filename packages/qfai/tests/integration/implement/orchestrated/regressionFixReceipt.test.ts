/**
 * Integration: the same test turning GREEN confirms a regression fix.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0023
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0023 (TDD-0031): The Same Test Turning GREEN Confirms a Regression Fix", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## `regression-fix`",
      ),
    );
    expect(text, "the ## `regression-fix` section exists").not.toBe("");
    expect(text).toMatch(/the same test turning GREEN again confirms the fix/i);
    expect(text).toMatch(
      /the stage result carries the `regressionFix` receipt: `testId` names that test, `rerunRef` its GREEN re-run, `reviewRef` its independent review/i,
    );
    expect(text).toMatch(/the fix and the re-run are also recorded in the run evidence/i);
    expect(text).toMatch(
      /the re-run is appended to the row's evidence section as a new round carrying its own `Revision`, with no ledger cell edited/i,
    );
  });
});
