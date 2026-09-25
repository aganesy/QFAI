/**
 * Integration: inside a run, Stage 1 checks a routing-time `CREATE` approval instead of asking.
 *
 * Reads the shipped `qfai-sdd` text a workflow run relies on. The workflow core's and the
 * validator's own checks are not this module's.
 */
// QFAI:SPEC-0013:TC-0013-0052
import { describe, expect, it } from "vitest";

import { flat, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

describe("qfai-sdd in a workflow run", () => {
  it("TC-0013-0052: Stage 1 checks a matching routing-time approval", async () => {
    const pointer = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/orchestrated-mode.md"),
        "## Stage 1 approvals",
      ),
    );
    expect(pointer, "the ## Stage 1 approvals section exists").not.toBe("");
    expect(pointer).toMatch(/`references\/sdd-triage\.md#inside-a-workflow-run`/);

    const text = flat(
      sectionOf(
        await readShipped("skills/qfai-sdd/references/sdd-triage.md"),
        "## Inside a workflow run",
      ),
    );
    expect(text, "the ## Inside a workflow run section exists").not.toBe("");
    expect(text).toMatch(
      /Stage 1 checks the `human_decision` the work order cites instead of asking/i,
    );
    expect(text).toMatch(
      /the check passes only when the record exists, matches the row's operation and capability, and is not stale/i,
    );
    expect(text).toMatch(
      /a passing row is persisted with `Authorization-Ref` and with `Approved By` copied as `answeredBy@YYYY-MM-DD`/i,
    );
  });
});
