import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped assistant tree plus its root mirror. */
const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant"),
  path.join(repoRoot, ".qfai/assistant"),
];

const SCHEMA_REL = "skill/qfai-prototyping/references/review-payload-schema.md";
const PROMPT_REL = "skill/qfai-prototyping/references/reviewer-prompt.md";
const LOOP_STEP_REL = "step/prototyping-loop/STEP.md";

/** The 11 required top-level fields of the closed reviewer payload. */
const REQUIRED_TOP_LEVEL_FIELDS = [
  "uiContractId",
  "screenId",
  "cycle",
  "sessionStatus",
  "retryCount",
  "blockingFindings",
  "impressions",
  "layoutAntiPatternsDetected",
  "designMdViolations",
  "wallTimeSec",
  "softWarnings",
];

/** The six bounded impressions of the per-screen payload. */
const FEEL_FIELDS = [
  "operability",
  "transitionFeel",
  "crossScreenContinuity",
  "userStoryFeel",
  "acceptanceCriteriaFeel",
  "menuReachabilityFeel",
];

async function readShipped(relative: string): Promise<string[]> {
  return Promise.all(ASSISTANT_ROOTS.map((root) => readFile(path.join(root, relative), "utf-8")));
}

describe("shipped reviewer payload schema", () => {
  it("documents all 11 required fields and the path they live at", async () => {
    for (const schema of await readShipped(SCHEMA_REL)) {
      for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
        expect(schema, `missing field ${field}`).toContain(field);
      }
      for (const feel of FEEL_FIELDS) {
        expect(schema, `missing impressions field ${feel}`).toContain(feel);
      }
      expect(schema).toContain("iter-NN/<ui-contract-id>/<screen>.review.json");
      expect(schema).toContain("closed");
    }
  });

  // The prompt carries two output shapes, so it has to say which of its
  // two outputs each schema belongs to.
  it("keeps the reviewer prompt from pointing the per-screen payload at the summary shape", async () => {
    for (const prompt of await readShipped(PROMPT_REL)) {
      expect(prompt).toContain("<screen>.review.json");
      expect(prompt).toContain("Per-iteration summary (`iter-NN/review.json`)");
      expect(prompt).not.toContain("## Output (`iter-NN/review.json`)");
    }
  });

  it("has the reviewer write the per-screen payloads and the summary every iteration", async () => {
    for (const step of await readShipped(LOOP_STEP_REL)) {
      const procedure = /^## Procedure\b([\s\S]*?)^## /m.exec(step)?.[1];
      expect(procedure, "the loop step has no Procedure section").toBeDefined();
      expect(procedure).toContain("iter-NN/<ui-contract-id>/<screen>.review.json");
      expect(procedure).toContain("iter-NN/review.json");
      expect(step).toContain(`.qfai/assistant/${SCHEMA_REL}`);
    }
  });
});

/** The prompt's text with line wraps folded, so a rule is matched as one sentence. */
async function readPromptFlat(): Promise<string[]> {
  return (await readShipped(PROMPT_REL)).map((prompt) => prompt.replace(/\s*\n\s*/g, " "));
}

describe("the pivotDirective rule the shipped reviewer prompt states", () => {
  const OPEN_COUNT =
    "Let `open(r)` be the total length of `r.blockingFindings` plus `r.layoutAntiPatternsDetected`.";

  // QFAI:EX-0001-0105-02
  it("pivots when the open count is above zero and did not fall across three reviews", async () => {
    for (const prompt of await readPromptFlat()) {
      expect(prompt).toContain(OPEN_COUNT);
      expect(prompt).toContain(
        "`open(latest) > 0` AND `open(latest) >= open(prior)` AND `open(prior) >= open(prior2)` → `pivot`.",
      );
    }
  });

  // QFAI:EX-0001-0105-04
  it("continues when the open count fell from the prior review", async () => {
    for (const prompt of await readPromptFlat()) {
      expect(prompt).toContain(
        "Else if a prior review exists AND `open(latest) < open(prior)` → `continue`.",
      );
    }
  });

  // QFAI:EX-0001-0105-03
  it("refines in every other case", async () => {
    for (const prompt of await readPromptFlat()) {
      expect(prompt).toContain("- Else → `refine`.");
    }
  });
});
