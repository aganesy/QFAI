/**
 * Integration: verify sends each finding to its owner.
 *
 * Reads the shipped `qfai-verify/references/orchestrated-mode.md`. The workflow core's own checks are not
 * this module's.
 */
// QFAI:SPEC-0014:TC-0014-0041
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../../helpers/shippedAssistant.js";

const OWNERS = {
  "spec gap": "qfai-sdd",
  "acceptance-test defect": "qfai-atdd",
  "implementation defect": "qfai-implement",
};

describe("qfai-verify in a workflow run", () => {
  it("TC-0014-0041 (TDD-0046): Verify sends each finding to its owner", async () => {
    const raw = sectionOf(
      await readShipped("skills/qfai-verify/references/orchestrated-mode.md"),
      "## Findings verify did not cause",
    );
    const text = flat(raw);
    expect(text, "the ## Findings verify did not cause section exists").not.toBe("");
    expect(text).toMatch(/verify edits no artifact another owner holds/i);
    expect(text).toMatch(
      /returns `needs_repair`, with the finding listed in `debts` under its `resolvingOwner`/i,
    );
    const rows = raw
      .split("\n")
      .filter((line) => line.startsWith("|"))
      .slice(2)
      .map((line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((cell) => /^`([^`]+)`$/.exec(cell.trim())?.[1] ?? `<${cell.trim()}>`),
      );
    expect(rows).toEqual(Object.entries(OWNERS));
  });
});
