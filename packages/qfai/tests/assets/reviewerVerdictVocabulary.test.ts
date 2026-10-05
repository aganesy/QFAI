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
 * (`rule/shared-skill-delegation-baseline.md#reviewer-response-template`);
 * `status: "PASS" | "FAIL"` is what a review pack's `summary.json` serializes.
 * The two must not be mixed: a producer told to return `FAIL` while the footer
 * bans it emits a verdict its own playbook rejects, and a playbook that reruns
 * only on `FAIL` never starts the fix cycle after a `REVISE`.
 */
describe("reviewer verdict vocabulary", () => {
  it("has every verdict producer return REVISE, not FAIL", async () => {
    for (const relative of ["agent/qa-gatekeeper.md", "agent/completion-reviewer.md"]) {
      for (const content of await readShipped(relative)) {
        expect(content, `${relative} must not instruct a FAIL verdict`).not.toMatch(/\bFAIL\b/);
        // Case-insensitive on purpose. The `\bFAIL\b` check above is
        // case-sensitive, so lowercase `Return pass/fail only` survived the
        // first sweep and went on telling the agent to emit a verdict the
        // playbook does not route.
        expect(content, `${relative} must not instruct a pass/fail verdict`).not.toMatch(
          /\bpass\s*\/\s*fail\b/i,
        );
        expect(content).toMatch(/\bREVISE\b/);
      }
    }
  });

  // The Codex agent is generated from the shipped card. Both must tell a
  // reviewer which in-flight verdict to return.
  it("carries the card's verdict vocabulary into the codex agent", async () => {
    for (const content of await readShipped("agent/completion-reviewer.md")) {
      expect(content).toContain("Return PASS or REVISE with actionable rework");
    }
    const codex = await readFile(
      path.join(repoRoot, ".codex/agents/completion-reviewer.toml"),
      "utf-8",
    );
    expect(codex).toContain("Return PASS or REVISE with actionable rework");
    expect(codex).not.toContain("Return pass/fail only");
  });

  it("states the same two verdicts in the review step and the reviewer gate baseline", async () => {
    for (const relative of ["step/common-review-cycle/STEP.md"]) {
      for (const content of await readShipped(relative)) {
        expect(content).toMatch(/`?PASS`?\s*(?:\/|or)\s*`?REVISE`?/);
      }
    }

    for (const content of await readShipped("rule/shared-skill-delegation-baseline.md")) {
      expect(content).toContain("PASS or REVISE for the reviewed revision");
    }
  });

  it("keeps the reviewer response template on PASS | REVISE", async () => {
    for (const content of await readShipped("rule/shared-skill-delegation-baseline.md")) {
      expect(content).toContain("Result: PASS | REVISE");
      expect(content).not.toContain("Result: PASS | FAIL");
      expect(content).toContain(
        "Every reviewer returning `REVISE` must include a concrete fix proposal",
      );
      expect(content).not.toContain("Every reviewer returning `FAIL` or `REVISE`");
    }
  });
});
