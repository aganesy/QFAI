/**
 * Integration: a test fix leaves the ledger row's status alone.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0024
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0024 (TDD-0032): A Test Fix Leaves the Ledger Row's Status Alone", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## `test-fix`",
      ),
    );
    expect(text, "the ## `test-fix` section exists").not.toBe("");
    expect(text).toMatch(/names the AC or BR cited before and after the fix/i);
    expect(text).toMatch(/with an independent review \(`reviewRef`\) and a re-run \(`rerunRef`\)/i);
    expect(text).toMatch(/the fix does not edit `Status`, `TC-Refs`, `Layer` or `Boundary`/i);
    expect(text).toMatch(/it may change `Test file` and `Selector`/i);
    expect(text).toMatch(
      /the re-run is appended to the row's evidence section as a new round carrying its own `Revision`/i,
    );
    const mayChange = /it may change ([^.]*)\./i.exec(text)?.[1] ?? "";
    expect(mayChange).not.toBe("");
    expect(mayChange).not.toMatch(/Status/);
  });
});
