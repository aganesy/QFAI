/**
 * Unit: autopilot policy bucket parser.
 *
 * - TC-0015-0021: a SKILL.md whose `## Default Autopilot Policy` lists
 *   all three named buckets (auto-decide / ask-user / hard-required)
 *   passes without `R-AUTOPILOT-POLICY-MISSING`; widening the
 *   auto-decide bucket beyond the DR-0269 set is flagged.
 *
 * The pure-function bucket parser is the unit-level surface; the
 * integration-level Reviewer-Gate emission is tested separately.
 */
// QFAI:SPEC-0015:TC-0015-0021

import { describe, expect, it } from "vitest";

import {
  AUTO_DECIDE_ALLOWED_TOKENS,
  parseAutopilotPolicy,
  type AutopilotPolicyParseResult,
} from "../../../../src/core/validators/autopilotPolicy.js";

const SKILL_FULL_POLICY = `# Skill

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - ID / sequence numbering
  - append-vs-create on subject overlap
  - equivalent-option pick
- ask-user:
  - CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage ops (with prompt template)
  - destructive operations
  - version-pin changes
  - scope expansions
- hard-required:
  - companyName
  - brand intent
  - primarySpecId when absent
`;

const SKILL_NO_SECTION = `# Skill

## Some Other Section

- bullet
`;

const SKILL_NARROWED_AUTODECIDE = `# Skill

## Default Autopilot Policy

- auto-decide:
  - output formatting
- ask-user:
  - CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage ops
  - destructive operations
  - version-pin changes
  - scope expansions
- hard-required:
  - companyName
  - brand intent
  - primarySpecId
`;

const SKILL_WIDENED_AUTODECIDE = `# Skill

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - ID / sequence numbering
  - append-vs-create on subject overlap
  - equivalent-option pick
  - destructive operations
- ask-user:
  - CREATE / DELETE triage ops
- hard-required:
  - companyName
`;

describe("TC-0015-0021: parseAutopilotPolicy bucket detection", () => {
  it("returns hasSection=true and all three buckets present for the canonical 3-bucket policy", () => {
    const result: AutopilotPolicyParseResult = parseAutopilotPolicy(SKILL_FULL_POLICY);
    expect(result.hasSection).toBe(true);
    expect(result.buckets.autoDecide).toBe(true);
    expect(result.buckets.askUser).toBe(true);
    expect(result.buckets.hardRequired).toBe(true);
    expect(result.widenedTokens).toEqual([]);
  });

  it("returns hasSection=false when the ## Default Autopilot Policy section is absent", () => {
    const result = parseAutopilotPolicy(SKILL_NO_SECTION);
    expect(result.hasSection).toBe(false);
    expect(result.buckets.autoDecide).toBe(false);
    expect(result.buckets.askUser).toBe(false);
    expect(result.buckets.hardRequired).toBe(false);
  });

  it("accepts a narrowed auto-decide bucket (subset of DR-0269) without flagging", () => {
    const result = parseAutopilotPolicy(SKILL_NARROWED_AUTODECIDE);
    expect(result.hasSection).toBe(true);
    expect(result.buckets.autoDecide).toBe(true);
    expect(result.widenedTokens).toEqual([]);
  });

  it("flags widened auto-decide tokens that are NOT in the DR-0269 allowed set", () => {
    const result = parseAutopilotPolicy(SKILL_WIDENED_AUTODECIDE);
    expect(result.hasSection).toBe(true);
    expect(result.widenedTokens.length).toBeGreaterThanOrEqual(1);
    expect(result.widenedTokens.some((t) => /destructive/i.test(t))).toBe(true);
  });

  it("exports the DR-0269 allowed auto-decide token list", () => {
    expect(AUTO_DECIDE_ALLOWED_TOKENS.length).toBe(4);
    expect(AUTO_DECIDE_ALLOWED_TOKENS).toContain("output formatting");
    expect(AUTO_DECIDE_ALLOWED_TOKENS).toContain("ID / sequence numbering");
    expect(AUTO_DECIDE_ALLOWED_TOKENS).toContain("append-vs-create on subject overlap");
    expect(AUTO_DECIDE_ALLOWED_TOKENS).toContain("equivalent-option pick");
  });
});
