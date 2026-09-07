/**
 * E2E acceptance for spec-0015 CHG-005 user stories:
 *   - US-0015-0007: Reviewer-Gate emits R-CERTIFY-VERIFY-CIRCULAR on
 *     regressed certify path that reads /qfai-atdd or /qfai-implement
 *     validator output at the prototyping phase.
 *   - US-0015-0008: Reviewer-Gate emits R-PROMPT-SCANNER-DRIFT on
 *     SSOT-sync-pair drift, carrying a 3-part justification; empty
 *     justification is rejected downstream by qfai validate.
 *
 * E2E scope: invokes the composite `validateReviewerGate` validator
 * against a tmpdir fixture populated to mimic a real prototyping run,
 * then asserts that the resulting Issue list contains the expected
 * `R-CERTIFY-VERIFY-CIRCULAR` is `info` in `validate` — the enforcement is
 * `qfai prototyping certify`'s exit-2 refusal of a non-prototyping scope. At `error`
 * severity a repo-wide run made `/qfai-verify`'s Completion Contract unsatisfiable
 * outside Work Order H (#1097). The other codes here keep theirs.
 * severity code with a non-empty 3-part justification.
 */
// QFAI:SPEC-0015:US-0015-0007
// QFAI:SPEC-0015:US-0015-0008

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { validateReviewerGate } from "../../src/core/validators/reviewerGate.js";
import { validateReviewerJustification } from "../../src/core/validators/reviewerJustification.js";

const SCANNER_REL = "packages/qfai/src/core/prototyping/designMdViolations.ts";
const PROMPT_REL =
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/generator-prompt.md";

const SCANNER_CONTENT = `// Scanner stub.
export type DesignMdViolation = {
  readonly kind: "color" | "font" | "radius" | "shadow";
};
`;

const PROMPT_CONTENT = `# Generator Iteration Prompt

## Hard constraints

- No \`#hex\`, \`rgb(...)\` values outside DESIGN.md.
- No \`font-family:\` whose first token is outside DESIGN.md.typography.
- No \`border-radius:\` outside DESIGN.md.visual.radius.
- No \`box-shadow:\` outside DESIGN.md.visual.shadow.
`;

async function newRoot(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `qfai-${prefix}-`));
}

async function getConfig(root: string) {
  const r = await loadConfig(root);
  return r.config;
}

async function writeFileEnsure(filePath: string, body: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body, "utf-8");
}

let root: string;

beforeEach(async () => {
  root = await newRoot("revgate-e2e");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("US-0015-0007: Reviewer-Gate emits R-CERTIFY-VERIFY-CIRCULAR on regressed certify path", () => {
  it("end-to-end: prototyping fixture reading verify.json scope=atdd triggers R-CERTIFY-VERIFY-CIRCULAR at severity error with 3-part justification", async () => {
    // Seed verify.json with the offending scope and a prototyping
    // phase marker, mimicking a real /qfai-prototyping certify run.
    await writeFileEnsure(
      path.join(root, ".qfai/output/verify.json"),
      JSON.stringify({ status: "PASS", scope: "atdd" }, null, 2),
    );
    // Canonical prototyping state path (.qfai/evidence/prototyping/
    // prototyping.json). The legacy `phase` field is no longer emitted
    // by iterate — the wave-18 active-loop signal is
    // `stopReason === null` AND `acceptedIterationIndex === null`.
    await writeFileEnsure(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify(
        {
          runId: "run-e2e-1",
          iterations: [],
          stopReason: null,
          acceptedIterationIndex: null,
        },
        null,
        2,
      ),
    );

    const issues = await validateReviewerGate(root, await getConfig(root));
    const findings = issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR");
    expect(findings.length).toBe(1);
    const f = findings[0];
    // `info` in `validate`; the enforcement is `qfai prototyping certify`
    // refusing a non-prototyping scope with exit 2 (#1097).
    expect(f?.severity).toBe("info");
    // 3-part justification probe.
    expect(f?.message).toMatch(/certify=/);
    expect(f?.message).toMatch(/profile=atdd/);
    expect(f?.message).toMatch(/contract=option-?B/i);
  });

  it("end-to-end control: prototyping fixture reading verify.json scope=prototyping does NOT trigger the finding", async () => {
    await writeFileEnsure(
      path.join(root, ".qfai/output/verify.json"),
      JSON.stringify({ status: "PASS", scope: "prototyping" }, null, 2),
    );
    await writeFileEnsure(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      JSON.stringify(
        {
          runId: "run-e2e-2",
          iterations: [],
          stopReason: null,
          acceptedIterationIndex: null,
        },
        null,
        2,
      ),
    );

    const issues = await validateReviewerGate(root, await getConfig(root));
    expect(issues.filter((i) => i.code === "R-CERTIFY-VERIFY-CIRCULAR")).toEqual([]);
  });
});

describe("US-0015-0008: Reviewer-Gate emits R-PROMPT-SCANNER-DRIFT with 3-part justification", () => {
  it("end-to-end: scanner-only modification (prompt missing the paired clause) triggers R-PROMPT-SCANNER-DRIFT at severity error", async () => {
    // Scanner contains the contract clause tokens; prompt has been
    // mutated to drop them. The pair check must surface drift.
    await writeFileEnsure(path.join(root, SCANNER_REL), SCANNER_CONTENT);
    await writeFileEnsure(
      path.join(root, PROMPT_REL),
      `# Generator Iteration Prompt\n\n(prompt with constraint section removed)\n`,
    );

    const issues = await validateReviewerGate(root, await getConfig(root));
    const findings = issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const f = findings[0];
    expect(f?.severity).toBe("error");
    // 3-part justification probe: modified, un-paired, clause.
    expect(f?.message).toMatch(/modified=/);
    expect(f?.message).toMatch(/un-paired=/);
    expect(f?.message).toMatch(/clause=/);
  });

  it("end-to-end: control — both scanner and prompt aligned ⇒ no drift finding", async () => {
    await writeFileEnsure(path.join(root, SCANNER_REL), SCANNER_CONTENT);
    await writeFileEnsure(path.join(root, PROMPT_REL), PROMPT_CONTENT);

    const issues = await validateReviewerGate(root, await getConfig(root));
    expect(issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT")).toEqual([]);
  });

  it("end-to-end: empty-justification R-PROMPT-SCANNER-DRIFT recorded in .qfai/review/ is rejected by qfai validate", async () => {
    const reviewDir = path.join(root, ".qfai", "review", "review-2026-05-25");
    await mkdir(reviewDir, { recursive: true });
    await writeFile(
      path.join(reviewDir, "reviewer-completion.json"),
      JSON.stringify(
        {
          findings: [{ code: "R-PROMPT-SCANNER-DRIFT", justification: "   " }],
        },
        null,
        2,
      ),
      "utf-8",
    );

    const issues = await validateReviewerJustification(root, await getConfig(root));
    const drift = issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT");
    expect(drift.length).toBe(1);
    expect(drift[0]?.severity).toBe("error");
  });
});
