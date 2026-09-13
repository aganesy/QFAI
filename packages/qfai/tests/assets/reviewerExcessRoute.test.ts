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
  it.each(TREES)(
    "%s keeps an invoked conditional reviewer's blocking findings at the gate",
    async (tree) => {
      const text = await readFile(
        path.join(ROOT, tree, "assistant/constitution/shared-skill-delegation-baseline.md"),
        "utf-8",
      );
      expect(text.replace(/\s+/g, " ")).toContain(
        "Any in-scope blocking finding from an invoked reviewer prevents DONE until resolved; " +
          "`blocking_agents` names the verdicts the phase always requires.",
      );
    },
  );

  it.each(TREES.flatMap((tree) => REVIEWERS.map((role) => ({ tree, role }))))(
    "$tree/$role files excess against Article VII with its admission rule",
    async ({ tree, role }) => {
      const text = await readFile(path.join(ROOT, tree, "assistant/agents", `${role}.md`), "utf-8");
      const excessLines = text.match(/^- File excess as.*(?:\r?\n {2}.+)*/m)?.[0];
      expect(excessLines).toBeDefined();
      for (const line of excessLines?.split(/\r?\n/) ?? []) {
        expect(
          line.length,
          "the reminder must fit every generated Markdown surface",
        ).toBeLessThanOrEqual(200);
      }
      const excess = excessLines?.replace(/\s+/g, " ");
      expect(excess).toContain("`defect:code-quality` against constitution Article VII");
      for (const tag of ["delete", "stdlib", "native", "yagni", "shrink"]) {
        expect(excess).toContain("`" + tag + "`");
      }
      expect(excess).toContain("Admit it only when it names what to cut and what replaces it.");
      expect(excess).toContain(
        "Refuse it when the cut removes or weakens an obligation in the safety floor",
      );
      expect(excess).not.toContain("cut touches the safety floor");
      expect(excess).toContain("`.agents/rules/minimal-implementation.md` § 2.");
      expect(text).not.toMatch(/Apply `\.agents\/rules\/minimal-implementation\.md`: tag excess/);
    },
  );
});
