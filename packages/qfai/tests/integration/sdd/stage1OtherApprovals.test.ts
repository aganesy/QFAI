/**
 * Integration: the approval-required operations other than `CREATE` keep their question in a run.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's and the
 * validator's own checks are not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0040
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0040: The other approval-required operations keep the question", async () => {
    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/sdd-triage.md"),
        "## Inside a workflow run",
      ),
    );
    expect(text, "the ## Inside a workflow run section exists").not.toBe("");
    expect(text).toMatch(/keep the approval question, inside and outside a run/i);
    expect(text).toMatch(/a routing-time authorization approves none of them/i);
    expect(text).toMatch(/inside a run, Stage 1 asks the operator nothing itself/i);
    expect(text).toMatch(
      /its stage result opens the question as a `decision` question with outcome `awaiting_input`/i,
    );
    expect(text).toMatch(/the answer arrives through the work order's `authorizationRefs`/i);
    expect(text).toMatch(
      /the row copies the answerer into `Approved By` as `answeredBy@YYYY-MM-DD` and carries no `Authorization-Ref`/i,
    );
    const lead = /- \*\*([^*]+)\*\* keep the approval question/.exec(text)?.[1] ?? "";
    const ops = [...lead.matchAll(/`([A-Z:]+)`/g)].map((match) => match[1]).sort();
    expect(ops).toEqual(["DELETE", "MERGE", "SPLIT", "SUPERSEDE", "UPDATE:REMOVE"]);
  });
});
