/**
 * Integration: a diagnosis returns one verdict from the closed set.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0020
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0020 (TDD-0028): A Diagnosis Returns One Verdict From the Closed Set", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## `diagnose-only`",
      ),
    );
    expect(text, "the ## `diagnose-only` section exists").not.toBe("");
    expect(text).toMatch(/a diagnosis returns exactly one verdict/i);
    expect(text).toMatch(
      /`matchedRowIds` names the ledger rows of the matching existing obligations, which the next work order binds/i,
    );
    expect(text).toMatch(
      /`reproductionRef` names the record that holds the reproduction, the cause candidates and the impact/i,
    );
    const verdicts = /exactly one verdict.*?one of: ([^.]*)\./i.exec(text)?.[1] ?? "";
    const named = [...verdicts.matchAll(/`([a-z-]+)`/g)].map((match) => match[1]).sort();
    expect(named).toEqual(["defective-test", "expectation-differs", "missing-test", "regression"]);
  });
});
