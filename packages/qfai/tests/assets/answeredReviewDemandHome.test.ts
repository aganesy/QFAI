import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = async (tree: string, relative: string): Promise<string> =>
  (await readFile(path.join(ROOT, tree, relative), "utf-8")).replace(/\s+/g, " ");

describe("answered review demands are carried into the next existing request", () => {
  for (const tree of TREES) {
    it(`${tree}: the common rule bounds demands, not reports`, async () => {
      const text = await read(tree, "assistant/rule/review-convergence.md");
      for (const clause of [
        "## Answered demands (MUST)",
        "MUST NOT be re-raised under another wording",
        "Close a repeat by citing its recorded answer",
        "what a reviewer may require, not what a reviewer may report",
        "they never start a second review in the same stage",
        "`review_request.md` carries those answers",
        "a new defect or evidence that an answer no longer applies",
      ]) {
        expect(text.includes(clause), clause).toBe(true);
      }
      expect(text).toContain("A critical decision in it still goes to the user");
    });

    it(`${tree}: the review step carries answers before reviewer dispatch`, async () => {
      const text = await read(tree, "assistant/step/common-review-cycle/STEP.md");
      expect(text).toContain("review-convergence.md#answered-demands-must");
      expect(text).toContain("Put the answers an earlier stage recorded on the same artifact");
      expect(text).toContain("`review_request.md` before dispatching reviewers");
    });
  }
});
