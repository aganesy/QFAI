/**
 * Integration: Reviewer-Gate R-PROMPT-SCANNER-DRIFT structural
 * SSOT-sync invariant.
 *
 * Consolidation pointer: the canonical structural SSOT-sync assertion
 * lives at
 * `packages/qfai/tests/integration/reviewerGatePromptScannerDrift.test.ts`.
 * This file is a thin re-anchor that exercises the same
 * `validateReviewerGate` machinery so the traceability chain resolves
 * to an executable test surface without duplicating the canonical
 * fixture matrix. Any future widening of the SSOT-sync ruleset MUST
 * be exercised by both anchors so the cross-link remains tight.
 */
// QFAI:SPEC-0012:TC-0012-0458

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../../src/core/config.js";
import { validateReviewerGate } from "../../../src/core/validators/reviewerGate.js";

const SCANNER_REL = "packages/qfai/src/core/prototyping/designMdViolations.ts";
const PROMPT_REL =
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/generator-prompt.md";

const SCANNER_SCAFFOLD = `// Scanner stub.
export type DesignMdViolation = {
  readonly kind: "color" | "font" | "radius" | "shadow";
  readonly found: string;
};
`;

const PROMPT_SCAFFOLD = `# Generator Iteration Prompt

## Hard constraints

- No \`#hex\`, \`rgb(...)\`, \`rgba(...)\` value outside DESIGN.md.
`;

async function newRoot(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `qfai-${prefix}-`));
}

async function seedPair(
  root: string,
  options: { scanner?: string; prompt?: string } = {},
): Promise<void> {
  const scannerAbs = path.join(root, SCANNER_REL);
  const promptAbs = path.join(root, PROMPT_REL);
  await mkdir(path.dirname(scannerAbs), { recursive: true });
  await mkdir(path.dirname(promptAbs), { recursive: true });
  await writeFile(scannerAbs, options.scanner ?? SCANNER_SCAFFOLD, "utf-8");
  await writeFile(promptAbs, options.prompt ?? PROMPT_SCAFFOLD, "utf-8");
}

let root: string;

beforeEach(async () => {
  root = await newRoot("revgate-drift-spec0012");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0012-0458: Reviewer-Gate R-PROMPT-SCANNER-DRIFT (spec-0012 anchor)", () => {
  it("does NOT emit drift when the paired SSOT surfaces agree", async () => {
    await seedPair(root);
    const { config } = await loadConfig(root);
    const issues = await validateReviewerGate(root, config);
    expect(issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT")).toEqual([]);
  });

  it("emits R-PROMPT-SCANNER-DRIFT at error severity when prompt drops a clause the scanner still mentions", async () => {
    await seedPair(root, {
      prompt: `# Generator Iteration Prompt\n\n(no constraint enumeration here)\n`,
    });
    const { config } = await loadConfig(root);
    const issues = await validateReviewerGate(root, config);
    const findings = issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.severity).toBe("error");
  });
});
