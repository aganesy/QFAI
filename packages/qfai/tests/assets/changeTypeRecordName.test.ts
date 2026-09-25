import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const WORKFLOW = "assistant/rule/workflow.md";
const CLASSIFICATION = "assistant/rule/change-classification.md";

describe("change classification record", () => {
  it.each(["packages/qfai/assets/init/.qfai", ".qfai"])(
    "%s routes a durable change decision to the four-column decision table",
    async (tree) => {
      const workflow = await readFile(path.join(repoRoot, tree, WORKFLOW), "utf-8");
      const classification = await readFile(path.join(repoRoot, tree, CLASSIFICATION), "utf-8");
      expect(workflow).toContain("`<paths.specsDir>/decisions.md`");
      expect(workflow).toContain("`Content` and `Approach`");
      expect(workflow).not.toContain("`09_delta.md` `## Change Summary`");
      expect(classification).toContain("Keep the table's four-column shape");
      expect(classification).toContain("Primary: `Initial | Behavior | Structural | Ops`");
    },
  );
});
