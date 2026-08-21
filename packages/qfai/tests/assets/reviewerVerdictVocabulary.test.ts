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

  // The agent definitions are one of three faces of the same instructions
  // (`agents/<id>.md` <-> `manifest/agent-catalog.yml#developer_instructions`
  // <-> `.codex/agents/<id>.toml`). A sweep that touched only the markdown
  // would leave the runtime the catalog and the toml serve unchanged.
  it("carries the same verdict vocabulary into the catalog and the codex agent", async () => {
    for (const content of await readShipped("manifest/agent-catalog.yml")) {
      expect(content).toContain("Return only PASS or REVISE");
      // The exact sentence that survived the first sweep. A blanket pass/fail
      // ban would also hit `orchestrator`, whose "decide pass/fail" is its own
      // integration decision, not a verdict returned to a rework cycle.
      expect(content).not.toContain("Return pass/fail only");
    }

    const codex = await readFile(
      path.join(repoRoot, ".codex/agents/completion-reviewer.toml"),
      "utf-8",
    );
    expect(codex).toContain("Return only PASS or REVISE");
    expect(codex).not.toContain("Return pass/fail only");
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

  // The review REQUEST is what tells a reviewer which verdicts are legal. Leaving
  // `FAIL` there let a reviewer return a verdict the response template and both
  // playbooks no longer accept, so the fix cycle never started.
  it("offers only the in-flight verdicts in both review-request templates", async () => {
    for (const relative of [
      "skills/qfai-discussion/templates/14_Review-Request.md",
      "skills/qfai-discussion/templates/review/review_request.md",
    ]) {
      for (const content of await readShipped(relative)) {
        expect(content).toContain("Allowed in-flight verdicts: `PASS`, `REVISE`");
        expect(content).not.toContain("Allowed verdicts: `PASS`, `FAIL`");
        // The serialized status stays documented, not deleted.
        expect(content).toContain('status: "FAIL"');
      }
    }
  });

  // qfai-implement is the direct consumer of completion-reviewer /
  // implementation-reviewer, so its evidence fields and its completion-blocking
  // branch have to name the verdict those reviewers now return.
  it("matches qfai-implement's evidence fields and blocking branch to the verdict", async () => {
    for (const content of await readShipped("skills/qfai-implement/SKILL.md")) {
      expect(content).toContain("completion-reviewer result (PASS or REVISE)");
      expect(content).toContain("implementation-reviewer result (PASS or REVISE)");
      expect(content).toContain("has not been run or returned REVISE");
      expect(content).not.toContain("(PASS or FAIL)");
    }
  });

  // The pointer to the authoritative schema and the claim about what that schema
  // says sit on the same line of qfai-implement/SKILL.md. Stating the mapping as
  // `status: "REVISE"` there sends an author to write a third verdict that
  // `ALLOWED_ROSTER_STATUS` in `core/validators/reviewArtifacts.ts` rejects, so a
  // correctly recorded rework round fails `QFAI-REVIEW-*` on the full scan.
  it("names the same serialized status in the implement skill and its reference", async () => {
    for (const content of await readShipped("skills/qfai-implement/SKILL.md")) {
      expect(content).toContain('the `REVISE` -> `status: "FAIL"` mapping');
      expect(content).not.toContain('`status: "REVISE"`');
    }

    for (const content of await readShipped(
      "skills/qfai-implement/references/review-artifact-layout.md",
    )) {
      expect(content).toContain(
        'A `REVISE` verdict during iteration is written as `status: "FAIL"`',
      );
    }

    for (const content of await readShipped("constitution/shared-skill-delegation-baseline.md")) {
      expect(content).toContain('maps to `status: "FAIL"`');
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
