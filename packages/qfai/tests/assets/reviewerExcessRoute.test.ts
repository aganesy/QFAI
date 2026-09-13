import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const REVIEWERS = [
  "architecture-reviewer",
  "completion-reviewer",
  "implementation-reviewer",
  "product-surface-reviewer",
  "qa-gatekeeper",
  "requirements-reviewer",
];

describe("reviewer cards give excess a blocking route bounded by the safety floor", () => {
  it.each(TREES.flatMap((tree) => REVIEWERS.map((role) => ({ tree, role }))))(
    "$tree/$role files excess against Article VII with its admission rule",
    async ({ tree, role }) => {
      const text = await readFile(path.join(ROOT, tree, "assistant/agents", `${role}.md`), "utf-8");
      const excess = text.split(/\r?\n/).find((line) => line.startsWith("- File excess as"));
      expect(excess).toBeDefined();
      expect(excess).toContain("`defect:code-quality` against constitution Article VII");
      for (const tag of ["delete", "stdlib", "native", "yagni", "shrink"]) {
        expect(excess).toContain("`" + tag + "`");
      }
      expect(excess).toContain("Admit it only when it names what to cut and what replaces it.");
      expect(excess).toContain("Refuse it when the cut touches the safety floor");
      expect(excess).toContain("`.agents/rules/minimal-implementation.md` § 2.");
      expect(text).not.toMatch(/Apply `\.agents\/rules\/minimal-implementation\.md`: tag excess/);
    },
  );
});
