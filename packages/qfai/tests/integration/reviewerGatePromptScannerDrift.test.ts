/**
 * Integration: Reviewer-Gate R-PROMPT-SCANNER-DRIFT emission with
 * mandatory 3-part justification, plus downstream rejection of
 * empty-justification variants.
 *
 * The SSOT-sync pair: designMdViolations.ts (scanner) ↔
 * generator-prompt.md (prompt). When a contract clause is present in
 * one side but absent from the other, the validator emits
 * R-PROMPT-SCANNER-DRIFT (error) with justification naming:
 *   (1) the modified file, (2) the un-paired counterpart,
 *   (3) the Tailwind contract clause whose match cannot be confirmed.
 *
 * The downstream cross-spec assertion against BR-0004-0028 (empty
 * justification rejection on advisory-failing codes) is exercised
 * via the existing `validateReviewerJustification` validator.
 */
// QFAI:SPEC-0015:TC-0015-0019

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { PROMPT_SCANNER_PAIRS } from "../../src/core/validators/promptScannerPairs.js";
import { validateReviewerGate } from "../../src/core/validators/reviewerGate.js";
import { validateReviewerJustification } from "../../src/core/validators/reviewerJustification.js";

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

async function seedReviewerReport(root: string, body: unknown): Promise<void> {
  const dir = path.join(root, ".qfai", "review", "review-2026-05-25");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "reviewer-completion.json"),
    JSON.stringify(body, null, 2),
    "utf-8",
  );
}

let root: string;

beforeEach(async () => {
  root = await newRoot("revgate-drift");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0015-0019: Reviewer Gate emits R-PROMPT-SCANNER-DRIFT with 3-part justification", () => {
  it("does NOT emit drift when scanner and prompt both contain the contract clause tokens", async () => {
    await seedPair(root);
    const issues = await validateReviewerGate(root, await getConfig(root));
    expect(issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT")).toEqual([]);
  });

  it("emits R-PROMPT-SCANNER-DRIFT at severity error when scanner mentions a clause but prompt does not", async () => {
    // Scanner has the kind enum but prompt lost the `#hex` / `rgb(` mention.
    await seedPair(root, {
      prompt: `# Generator Iteration Prompt\n\n(no constraint enumeration here)\n`,
    });
    const issues = await validateReviewerGate(root, await getConfig(root));
    const findings = issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const f = findings[0];
    expect(f?.severity).toBe("error");
    // 3-part justification: modified file, un-paired counterpart, unmatched clause.
    expect(f?.message).toMatch(/designMdViolations\.ts/);
    expect(f?.message).toMatch(/generator-prompt\.md/);
    expect(f?.message).toMatch(/clause=/);
  });

  it("emits R-PROMPT-SCANNER-DRIFT when prompt mentions a clause but scanner does not", async () => {
    await seedPair(root, {
      scanner: `// Scanner stub minus the color kind enum.\nexport type X = { readonly kind: "font" };\n`,
    });
    const issues = await validateReviewerGate(root, await getConfig(root));
    const findings = issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toMatch(/un-paired=/);
  });

  it("PROMPT_SCANNER_PAIRS manifest enumerates all 4 prototyping compliance clauses (color/font/radius/shadow)", () => {
    // CHG-005 Phase 1 follow-up: the manifest must cover every
    // DesignMdViolation kind enumerated by the scanner (color / font /
    // radius / shadow) — not only the proof-of-concept color clause.
    const clauses = PROMPT_SCANNER_PAIRS.map((p) => p.clause).sort();
    expect(clauses).toEqual(
      ["color-literal-ban", "font-family-ban", "radius-literal-ban", "shadow-rgba-ban"].sort(),
    );
  });

  it("downstream qfai validate ingestion rejects empty justification variants (cross-spec assertion vs BR-0004-0028)", async () => {
    // Seed a reviewer-completion.json containing a R-PROMPT-SCANNER-DRIFT
    // finding with an empty justification. The reviewerJustification
    // validator must surface this as an error. (We piggy-back on the
    // advisory-failing-codes mechanism — adding R-PROMPT-SCANNER-DRIFT
    // to that set is the implementation tie-in.)
    await seedReviewerReport(root, {
      findings: [
        { code: "R-PROMPT-SCANNER-DRIFT", justification: "" },
        {
          code: "R-PROMPT-SCANNER-DRIFT",
          justification:
            "modified=packages/.../designMdViolations.ts, un-paired=.../generator-prompt.md, clause=color-literal-ban",
        },
      ],
    });
    const issues = await validateReviewerJustification(root, await getConfig(root));
    const drift = issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT");
    // Exactly one (the empty one) — the populated one must pass.
    expect(drift.length).toBe(1);
    expect(drift[0]?.severity).toBe("error");
  });
});

/**
 * Per-clause drift matrix: every clause in PROMPT_SCANNER_PAIRS must
 * be exercised by both a scanner-only-missing and a prompt-only-missing
 * fixture, with the resulting R-PROMPT-SCANNER-DRIFT message naming
 * the clause. This is the CHG-005 Phase 1 follow-up acceptance signal.
 */
type ClauseFixture = {
  readonly clause: string;
  readonly scannerKindLiteral: string;
  readonly promptLine: string;
};

const CLAUSE_FIXTURES: readonly ClauseFixture[] = [
  {
    clause: "color-literal-ban",
    scannerKindLiteral: '"color"',
    promptLine: "- No `#hex`, `rgb(...)` value outside DESIGN.md.",
  },
  {
    clause: "font-family-ban",
    scannerKindLiteral: '"font"',
    promptLine: "- No `font-family:` outside DESIGN.md.typography.",
  },
  {
    clause: "radius-literal-ban",
    scannerKindLiteral: '"radius"',
    promptLine: "- No `border-radius:` outside DESIGN.md.visual.radius.",
  },
  {
    clause: "shadow-rgba-ban",
    scannerKindLiteral: '"shadow"',
    promptLine: "- No `box-shadow:` outside DESIGN.md.visual.shadow.",
  },
];

function scannerWithout(missing: string): string {
  // Construct a scanner file containing every clause's kind literal
  // EXCEPT the one we want to omit, so drift fires only for `missing`.
  // NOTE: the comment must NOT echo the omitted literal verbatim — the
  // validator does a substring scan, and `// minus "radius"` would
  // accidentally satisfy the scanner-side token presence check.
  const kept = CLAUSE_FIXTURES.map((c) => c.scannerKindLiteral).filter((lit) => lit !== missing);
  const union = kept.length > 0 ? kept.join(" | ") : '"none"';
  return `// Scanner stub (omitted clause).\nexport type DesignMdViolation = { readonly kind: ${union}; };\n`;
}

function promptWithout(missingClause: string): string {
  const lines = CLAUSE_FIXTURES.filter((c) => c.clause !== missingClause).map((c) => c.promptLine);
  return `# Generator Iteration Prompt\n\n## Hard constraints\n\n${lines.join("\n")}\n`;
}

describe("TC-0015-0019: per-clause drift matrix covers all PROMPT_SCANNER_PAIRS entries", () => {
  it.each(CLAUSE_FIXTURES)(
    "emits R-PROMPT-SCANNER-DRIFT naming clause=$clause when scanner is missing the kind literal",
    async ({ clause, scannerKindLiteral }) => {
      await seedPair(root, { scanner: scannerWithout(scannerKindLiteral) });
      const issues = await validateReviewerGate(root, await getConfig(root));
      const findings = issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT");
      const named = findings.find((f) => f.message.includes(`clause=${clause}`));
      expect(named, `expected drift naming clause=${clause}`).toBeDefined();
      expect(named?.severity).toBe("error");
      // Scanner is the un-paired side here (prompt still mentions the clause).
      expect(named?.message).toMatch(/un-paired=.*designMdViolations\.ts/);
    },
  );

  it.each(CLAUSE_FIXTURES)(
    "emits R-PROMPT-SCANNER-DRIFT naming clause=$clause when prompt is missing the clause line",
    async ({ clause }) => {
      await seedPair(root, { prompt: promptWithout(clause) });
      const issues = await validateReviewerGate(root, await getConfig(root));
      const findings = issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT");
      const named = findings.find((f) => f.message.includes(`clause=${clause}`));
      expect(named, `expected drift naming clause=${clause}`).toBeDefined();
      expect(named?.severity).toBe("error");
      // Prompt is the un-paired side here (scanner still mentions the clause).
      expect(named?.message).toMatch(/un-paired=.*generator-prompt\.md/);
    },
  );
});
