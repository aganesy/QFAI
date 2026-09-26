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

  it("triggers the rerun cycle on REVISE in both playbooks", async () => {
    for (const relative of [
      "skill/qfai-sdd/references/review-cycle-playbook.md",
      "skill/qfai-discussion/references/review-cycle-playbook.md",
    ]) {
      for (const content of await readShipped(relative)) {
        expect(content).toMatch(/(?:blocking |On `)REVISE/);
        expect(content).not.toMatch(/(?:blocking |On `)FAIL/);
        expect(content).toMatch(/rerun (?:only )?that reviewer/);
        expect(content).toMatch(/REVISE[^\n]*(?:FAIL|`status: "FAIL"`)/);
      }
    }
  });

  it("states the same two verdicts in the footers and the sdd skill body", async () => {
    for (const relative of [
      "skill/qfai-sdd/references/rcp_footer.md",
      "skill/qfai-discussion/references/rcp_footer.md",
    ]) {
      for (const content of await readShipped(relative)) {
        expect(content).toMatch(/`?PASS`?\s*(?:\/|or)\s*`?REVISE`?/);
        expect(content).toMatch(/REVISE[^\n]*(?:FAIL|`status: "FAIL"`)/);
      }
    }

    for (const content of await readShipped("skill/qfai-sdd/SKILL.md")) {
      expect(content).toContain("PASS or REVISE for the reviewed revision");
    }
  });

  // The review REQUEST is what tells a reviewer which verdicts are legal. Leaving
  // `FAIL` there let a reviewer return a verdict the response template and both
  // playbooks no longer accept, so the fix cycle never started.
  it("offers only the in-flight verdicts in both review-request templates", async () => {
    for (const relative of [
      "skill/qfai-discussion/templates/14_Review-Request.md",
      "skill/qfai-discussion/templates/review/review_request.md",
    ]) {
      for (const content of await readShipped(relative)) {
        expect(content).toContain("Allowed in-flight verdicts: `PASS`, `REVISE`");
        expect(content).not.toContain("Allowed verdicts: `PASS`, `FAIL`");
        // The serialized status stays documented, not deleted.
        expect(content).toContain('status: "FAIL"');
      }
    }
  });

  // qfai-implement consumes independent reviewer verdicts and records the
  // completed round. Its gate must require PASS on the current revision.
  it("matches qfai-implement's evidence fields and blocking branch to the verdict", async () => {
    for (const content of await readShipped("skill/qfai-implement/SKILL.md")) {
      expect(content).toContain("Record explicit PASS or REVISE for the current revision");
      expect(content).toContain("required independent PASS reviews");
      expect(content).not.toMatch(/return(?:s|ed)? PASS or FAIL/i);
    }
  });

  it("names the same serialized status in the implement skill and its reference", async () => {
    for (const content of await readShipped(
      "skill/qfai-implement/references/review-artifact-layout.md",
    )) {
      expect(content).toContain("A blocking REVISE is status FAIL in the summary");
      expect(content).not.toContain('status: "REVISE"');
    }

    for (const content of await readShipped("rule/shared-skill-delegation-baseline.md")) {
      expect(content).toContain("Result: PASS | REVISE");
      expect(content).not.toContain("Result: PASS | FAIL");
      expect(content).toContain('maps to `status: "FAIL"`');
      expect(content).toContain(
        "Every reviewer returning `REVISE` must include a concrete fix proposal",
      );
      expect(content).not.toContain("Every reviewer returning `FAIL` or `REVISE`");
    }
  });

  it("keeps the review response template on PASS | REVISE", async () => {
    for (const content of await readShipped(
      "skill/qfai-discussion/templates/review/Rxx_reviewer.md",
    )) {
      expect(content).toContain("PASS | REVISE");
      expect(content).toContain("PASS / REVISE");
      expect(content).not.toMatch(/PASS \| FAIL|PASS \/ FAIL/);
    }
  });
});
