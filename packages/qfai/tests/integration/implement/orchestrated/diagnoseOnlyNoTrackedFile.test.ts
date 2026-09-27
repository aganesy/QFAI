/**
 * Integration: a diagnose-only operation changes no file git tracks.
 *
 * Reads the shipped `qfai-implement/references/orchestrated-mode.md`, where the skill keeps what
 * it does under a `qfai workflow` work order. The workflow core's own checks are not this module's.
 */
// QFAI:SPEC-0011:TC-0011-0019
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

describe("qfai-implement in a workflow run", () => {
  it("TC-0011-0019 (TDD-0027): A Diagnose-Only Operation Changes No File", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-implement/references/orchestrated-mode.md"),
        "## `diagnose-only`",
      ),
    );
    expect(text, "the ## `diagnose-only` section exists").not.toBe("");
    expect(text).toMatch(/the operation changes no file git tracks/i);
    expect(text).toMatch(
      /no product code, test or spec file changes, and the result names no changed file/i,
    );
    expect(text).toMatch(
      /a file it writes that git ignores, such as its reproduction record, is named in `artifactRefs`, not in `changedFiles`/i,
    );
  });
});
