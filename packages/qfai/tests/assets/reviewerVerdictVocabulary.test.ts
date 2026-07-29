import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped assistant tree plus its root mirror. */
const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant"),
  path.join(repoRoot, ".qfai/assistant"),
];

async function readShipped(relative: string): Promise<string[]> {
  return Promise.all(ASSISTANT_ROOTS.map((root) => readFile(path.join(root, relative), "utf-8")));
}

/**
 * `PASS | REVISE` is the in-flight reviewer vocabulary
 * (`constitution/shared-skill-delegation-baseline.md#reviewer-response-template`);
 * `status: "PASS" | "FAIL"` is what a review pack's `summary.json` serializes.
 * The two must not be mixed: a producer told to return `FAIL` while the footer
 * bans it emits a verdict its own playbook rejects, and a playbook that reruns
 * only on `FAIL` never starts the fix cycle after a `REVISE`.
 */
describe("reviewer verdict vocabulary", () => {
  it("has every verdict producer return REVISE, not FAIL", async () => {
    for (const relative of ["agents/qa-gatekeeper.md", "agents/completion-reviewer.md"]) {
      for (const content of await readShipped(relative)) {
        expect(content, `${relative} must not instruct a FAIL verdict`).not.toMatch(/\bFAIL\b/);
        expect(content).toMatch(/\bREVISE\b/);
      }
    }
  });

  it("triggers the rerun cycle on REVISE in both playbooks", async () => {
    for (const relative of [
      "skills/qfai-sdd/references/review-cycle-playbook.md",
      "skills/qfai-discussion/references/review-cycle-playbook.md",
    ]) {
      for (const content of await readShipped(relative)) {
        expect(content).toMatch(/(?:returns|On) `REVISE`/);
        expect(content).not.toMatch(/(?:returns|On) `FAIL`/);
        // The serialization mapping must stay documented, not deleted.
        expect(content).toContain('status: "FAIL"');
      }
    }
  });

  it("states the same two verdicts in the footers and the sdd skill body", async () => {
    for (const relative of [
      "skills/qfai-sdd/references/rcp_footer.md",
      "skills/qfai-discussion/references/rcp_footer.md",
    ]) {
      for (const content of await readShipped(relative)) {
        expect(content).toContain("`PASS` / `REVISE`");
      }
    }

    for (const content of await readShipped("skills/qfai-sdd/SKILL.md")) {
      expect(content).toContain("Allowed in-flight reviewer verdicts: `PASS` and `REVISE`");
    }
  });

  it("keeps the review response template on PASS | REVISE", async () => {
    for (const content of await readShipped(
      "skills/qfai-discussion/templates/review/Rxx_reviewer.md",
    )) {
      expect(content).toContain("PASS | REVISE");
      expect(content).toContain("PASS / REVISE");
      expect(content).not.toMatch(/PASS \| FAIL|PASS \/ FAIL/);
    }
  });
});
