import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped assistant tree plus its root mirror. */
const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant"),
  path.join(repoRoot, ".qfai/assistant"),
];

const BASELINE = "rule/shared-skill-delegation-baseline.md";
const WORK_ORDER = "rule/references/worker-edit-boundary.md";

async function readShipped(relative: string): Promise<string[]> {
  return Promise.all(ASSISTANT_ROOTS.map((root) => readFile(path.join(root, relative), "utf-8")));
}

/** The first fenced block under a `## <heading>` section. */
function fencedBlockUnder(content: string, heading: string): string {
  const sectionStart = content.indexOf(`## ${heading}\n`);
  expect(sectionStart, `section "## ${heading}" must exist`).toBeGreaterThanOrEqual(0);
  const rest = content.slice(sectionStart).split("\n## ")[0] ?? "";
  const match = /```text\n([\s\S]*?)```/.exec(rest);
  expect(match, `section "## ${heading}" must carry a text block`).not.toBeNull();
  return match?.[1] ?? "";
}

/**
 * The completion gate of every skill is a substring match over an agent's free
 * text. While the reviewer response carried a bare `Result: PASS | REVISE` and
 * the work order handed the agent *being reviewed* the same vocabulary
 * (`Quality bar: PASS if ... / REVISE if ...`), a doer's self-assessment was
 * character-for-character what the gate accepts as a reviewer's verdict, and an
 * orchestrator integrating two returned texts had no field to tell them apart.
 * The work order no longer speaks the verdict vocabulary at all.
 */
describe("reviewer response provenance", () => {
  it("holds the reviewer response to a verdict and its findings", async () => {
    for (const content of await readShipped(BASELINE)) {
      const template = fencedBlockUnder(content, "Reviewer response template");
      expect(template.trim().split("\n")[0]).toBe("Result: PASS | REVISE");
      expect(template).toContain("Findings:");
      expect(template).not.toContain("Reviewer role:");
    }
  });

  it("keeps the verdict vocabulary out of the work order handed to a doer", async () => {
    for (const baseline of await readShipped(BASELINE)) {
      const pointer = baseline.split("\n## Work order template\n")[1]?.split("\n## ")[0];
      expect(pointer).toBeDefined();
      expect(pointer?.replace(/\s*\n\s*/g, " ")).toContain("When preparing a delegation");
      expect(pointer).toContain(
        ".qfai/assistant/rule/references/worker-edit-boundary.md#work-order-template",
      );
    }
    for (const content of await readShipped(WORK_ORDER)) {
      const template = fencedBlockUnder(content, "Work order template");

      expect(template).toContain("Acceptance bar:");
      expect(template, "the doer-facing bar must not be labelled `Quality bar:`").not.toContain(
        "Quality bar:",
      );
      // The exact strings the observed agents echoed back as a verdict.
      expect(template).not.toMatch(/\bPASS if\b/);
      expect(template).not.toMatch(/\bREVISE if\b/);
      // …and the bar says outright that the verdict words are not the doer's.
      expect(template).toMatch(/never `PASS`\/`REVISE`/);
    }
  });

  it("requires the provenance lines at every skill-level reviewer gate", async () => {
    for (const content of await readShipped("step/implement-tdd/STEP.md")) {
      expect(content).toContain("rule/shared-skill-delegation-baseline.md");
      expect(content).toContain("references/finding-classification.md");
    }
  });
});
