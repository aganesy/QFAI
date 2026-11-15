import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { isExtraction } from "../../src/core/workflow/extractionShape.js";
import { routingOutcome } from "../../src/core/workflow/routeDecision.js";
import { flat, readShipped, sectionOf } from "../helpers/shippedAssistant.js";
import { extraction } from "../helpers/workflowExtraction.js";

const EXTRACTION = "skill/qfai-run/references/extraction.md";
const REQUEST = '- "Fix these six review leftovers", ';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("a bundle of settled fixes is extracted as one implementing request", () => {
  // QFAI:EX-0001-0211-62
  it("says so beside mixed-bundle and routes its example to one implementing route", async () => {
    const reference = await readShipped(EXTRACTION);
    expect(flat(sectionOf(reference, "## Qualifiers"))).toContain(
      "A request to fix several named items, such as review leftovers, whose causes and fixes are each already settled is not a bundle to sort again: extract it as one request, neither `follow-up` nor `mixed-bundle`. Take the intent the items share, or the implementing intent that fits them, such as `defect`; set the entry flags `cause` and `fix`, and list the union of the items' artifacts. The plan then routes it to one implementing route.",
    );
    expect(flat(sectionOf(reference, "## Intent"))).toContain(
      "Leftovers whose causes and fixes are all settled are one implementing request, as `mixed-bundle` says.",
    );
    const line = sectionOf(reference, "## Examples")
      .split("\n")
      .find((each) => each.startsWith(REQUEST));
    const parsed: unknown = parse(/→ `(\{.*\})`$/.exec(line ?? "")?.[1] ?? "null");
    expect(parsed).toEqual({
      intent: "defect",
      entryFlags: ["bundle", "cause", "fix"],
      artifacts: ["code", "tests", "docs"],
      confidence: "high",
    });
    const pinned: unknown = { ...extraction(), ...(isRecord(parsed) ? parsed : {}) };
    if (!isExtraction(pinned)) throw new Error("the pinned example is not an extraction");
    const routeOf = (outcome: ReturnType<typeof routingOutcome>) =>
      "taken" in outcome ? outcome.taken.route : undefined;
    expect([
      routeOf(routingOutcome(pinned)),
      routeOf(routingOutcome({ ...pinned, qualifiers: ["mixed-bundle"] })),
    ]).toEqual(["fix-defect", "retriage-bundle"]);
  });
});
