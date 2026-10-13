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
      const answered = text.split("## Answered demands (MUST)")[1]?.split("## ")[0];
      expect(answered, "the answered-demand section is missing").toBeDefined();
      expect(answered).toContain(
        "A critical decision in it still requires actual applicable user authority",
      );
      expect(answered).toContain("uncovered authority is never supplied by the review");
    });

    it(`${tree}: the review step carries answers before reviewer dispatch`, async () => {
      const text = await read(tree, "assistant/step/common-review-cycle/STEP.md");
      expect(text).toContain("review-convergence.md#answered-demands-must");
      expect(text).toContain("Put the answers an earlier stage recorded on the same artifact");
      expect(text).toContain("request before dispatching reviewers");
    });
  }
});
