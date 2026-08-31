import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ISSUE_EXPECTED_BY_CODE,
  ISSUE_FIX_BY_CODE,
  UNCATALOGUED_EXPECTED,
  UNCATALOGUED_FIX,
  resolveIssueExpected,
  resolveIssueFix,
} from "../../src/cli/commands/validate.js";
import { type IssueCodeUsage, collectIssueCodeUsage } from "../helpers/issueCodes.js";

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

function extractCodesWithRules(content: string): Map<string, Set<string>> {
  const lines = content.split("\n");
  const codeRuleMap = new Map<string, Set<string>>();

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/"(QFAI-PROT-\d+)"/);
    if (!match) continue;
    const code = match[1];

    let rule = "unknown";
    for (let j = Math.max(0, i - 5); j < Math.min(lines.length, i + 10); j++) {
      const ruleMatch = lines[j].match(
        /"(prototypingEvidence\.\w+|prototypingRecommendation\.\w+|renderEvidence\.\w+)"/,
      );
      if (ruleMatch) {
        rule = ruleMatch[1];
        break;
      }
    }

    if (!codeRuleMap.has(code)) {
      codeRuleMap.set(code, new Set());
    }
    const ruleSet = codeRuleMap.get(code);
    if (ruleSet) ruleSet.add(rule);
  }

  return codeRuleMap;
}

const TAXONOMY_RANGE_MIN = 150;
const TAXONOMY_RANGE_MAX = 299;

// Some codes intentionally serve the same semantic purpose from multiple validation call sites.
// These are allowed to map to more than one rule name as long as the rules share the same category.
const KNOWN_MULTI_RULE_CODES = new Set([
  "QFAI-PROT-244", // render artifact validation (bundle-level + screen-level checks)
  // V1 lifecycle uses `prototypingEvidence.iterations`; V2 lifecycle (round
  // workflow) uses `prototypingEvidence.rounds`. Both branches gate on the
  // same "at least one primary lifecycle entry" rule.
  "QFAI-PROT-280",
]);

// Some codes are newly added and pending description registration in validate.ts.
// Once descriptions are added, these codes will automatically pass the description check.
const PENDING_DESCRIPTION_CODES = new Set<string>(["QFAI-PROT-280"]);

describe("issue code uniqueness", () => {
  it("every QFAI-PROT-2xx code in validators, uiux, and browserQa maps to exactly one rule", async () => {
    const validatorDir = path.resolve(__dirname, "../../src/core/validators");
    const uiuxDir = path.resolve(__dirname, "../../src/core/uiux");
    const browserQaDir = path.resolve(__dirname, "../../src/core/browserQa");

    const validatorFiles = await collectTsFiles(validatorDir);
    const uiuxFiles = await collectTsFiles(uiuxDir);
    const browserQaFiles = await collectTsFiles(browserQaDir);
    const allFiles = [...validatorFiles, ...uiuxFiles, ...browserQaFiles];

    const globalCodeRuleMap = new Map<string, Set<string>>();

    for (const filePath of allFiles) {
      const content = await readFile(filePath, "utf-8");
      const fileMap = extractCodesWithRules(content);
      for (const [code, rules] of fileMap) {
        if (!globalCodeRuleMap.has(code)) {
          globalCodeRuleMap.set(code, new Set());
        }
        const globalRuleSet = globalCodeRuleMap.get(code);
        for (const rule of rules) {
          if (globalRuleSet) globalRuleSet.add(rule);
        }
      }
    }

    const violations: string[] = [];
    for (const [code, rules] of globalCodeRuleMap) {
      const num = parseInt(code.replace("QFAI-PROT-", ""), 10);
      if (num < TAXONOMY_RANGE_MIN || num > TAXONOMY_RANGE_MAX) {
        continue;
      }
      if (KNOWN_MULTI_RULE_CODES.has(code)) {
        continue;
      }
      if (rules.size > 1) {
        violations.push(
          `${code} used for ${rules.size} distinct rules: ${[...rules].sort().join(", ")}`,
        );
      }
    }

    expect(violations).toEqual([]);
  });

  it("every QFAI-PROT-2xx code used in validators/uiux/browserQa has a description in validate.ts", async () => {
    const validatePath = path.resolve(__dirname, "../../src/cli/commands/validate.ts");
    const validateContent = await readFile(validatePath, "utf-8");

    const descriptionCodes = new Set<string>();
    for (const match of validateContent.matchAll(/"(QFAI-PROT-\d+)":/g)) {
      descriptionCodes.add(match[1]);
    }

    const validatorDir = path.resolve(__dirname, "../../src/core/validators");
    const uiuxDir = path.resolve(__dirname, "../../src/core/uiux");
    const browserQaDir = path.resolve(__dirname, "../../src/core/browserQa");
    const validatorFiles = await collectTsFiles(validatorDir);
    const uiuxFiles = await collectTsFiles(uiuxDir);
    const browserQaFiles = await collectTsFiles(browserQaDir);

    const usedCodes = new Set<string>();
    for (const filePath of [...validatorFiles, ...uiuxFiles, ...browserQaFiles]) {
      const content = await readFile(filePath, "utf-8");
      for (const match of content.matchAll(/"(QFAI-PROT-\d+)"/g)) {
        usedCodes.add(match[1]);
      }
    }

    // Check that all QFAI-PROT-2xx codes (taxonomy range) have descriptions
    const missingDescriptions = [...usedCodes]
      .filter((c) => {
        const num = parseInt(c.replace("QFAI-PROT-", ""), 10);
        return num >= 100 && !descriptionCodes.has(c) && !PENDING_DESCRIPTION_CODES.has(c);
      })
      .sort();
    expect(missingDescriptions).toEqual([]);
  });

  it("validate.ts may describe additional reserved prototyping codes beyond current active usage", async () => {
    const validatePath = path.resolve(__dirname, "../../src/cli/commands/validate.ts");
    const validateContent = await readFile(validatePath, "utf-8");
    expect(validateContent).toContain("QFAI-PROT-150");
  });
});

// Report-metadata ratchet.
//
// `qfai validate` prints an `expected:` and a `fix:` line for every error
// finding. Both resolve from a per-code catalog in validate.ts, and a code with
// no entry degrades to a generic string that tells the reader nothing. The two
// sets below record the codes that are still generic today. They may only
// shrink: the tests keep a newly added code from shipping without a decision,
// and fail when an entry is written but the code stays listed here.
//
// The census behind them counts every emission site, including `Issue` object
// literals, codes named by a module-level constant rather than a string
// literal, codes forwarded through a validator's own `Issue` factory or handed
// to `issue(...)` from a caller's config object, and codes whose
// `suggested_action` is passed on only some of their call sites — every one of
// those was invisible to an earlier cut of the helper, so the lists were
// re-baselined each time to name the codes that hole had been hiding.
//
// Two kinds of entry leave the lists without an entry being written. The
// `QFAI-GR-*` codes left because they never belonged: `guardrails check` builds
// them, `qfai validate` does not return them, and only a census that read
// `severity` without `category` mistook `GuardrailIssue` for `Issue`.
// `R-PACK-LOCATION-DRIFT` left the same way — it is a
// `JustificationCatalogEntry` descriptor, not an emission. It does reach
// `validate`, but only through `validateReviewerJustification` re-emitting a
// code it read out of a reviewer report, a data-driven path no static census
// can see; `R-WORKLOG-DRIFT` and `R-REJECTED-READOPT` reach it the same way and
// have never been listed here either.
const PENDING_EXPECTED_CATALOG_CODES = new Set<string>([
  "D-DEPRECATED-PATH",
  "D-SCAFFOLD-PLACEHOLDER",
  "D-SURFACE-TYPE-MISSING",
  "QFAI-AC-001",
  "QFAI-AGENT-004",
  "QFAI-AGENT-005",
  "QFAI-AGENT-006",
  "QFAI-AGENT-007",
  "QFAI-AGENT-008",
  "QFAI-AGENT-009",
  "QFAI-AGENT-010",
  "QFAI-AGENT-011",
  "QFAI-AGENT-012",
  "QFAI-AGENT-013",
  "QFAI-ASSETS-001",
  "QFAI-ASSETS-002",
  "QFAI-ATDD-104",
  "QFAI-ATDD-115",
  "QFAI-CONTRACT-010",
  "QFAI-CONTRACT-011",
  "QFAI-CONTRACT-012",
  "QFAI-CONTRACT-013",
  "QFAI-CONTRACT-014",
  "QFAI-CONTRACT-020",
  "QFAI-CONTRACT-021",
  "QFAI-COV-101",
  "QFAI-COV-102",
  "QFAI-COV-103",
  "QFAI-COV-104",
  "QFAI-CRIT-001",
  "QFAI-CRIT-002",
  "QFAI-CRIT-003",
  "QFAI-CRIT-004",
  "QFAI-CRIT-005",
  "QFAI-CRIT-006",
  "QFAI-CRIT-008",
  "QFAI-CRIT-009",
  "QFAI-CRIT-010",
  "QFAI-DB-002",
  "QFAI-DT-001",
  "QFAI-DT-002",
  "QFAI-DT-004",
  "QFAI-DT-007",
  "QFAI-DT-008",
  "QFAI-DT-009",
  "QFAI-DT-010",
  "QFAI-EX-001",
  "QFAI-EX-002",
  "QFAI-EX-003",
  "QFAI-EX-004",
  "QFAI-EX-005",
  "QFAI-EX-007",
  "QFAI-FID-001",
  "QFAI-FID-002",
  "QFAI-FID-003",
  "QFAI-FID-004",
  "QFAI-FID-005",
  "QFAI-FID-006",
  "QFAI-FID-007",
  "QFAI-FID-008",
  "QFAI-FID-009",
  "QFAI-ID-001",
  "QFAI-LAYER-100",
  "QFAI-LAYER-101",
  "QFAI-LAYER-102",
  "QFAI-LAYER-103",
  "QFAI-LAYER-104",
  "QFAI-LAYER-105",
  "QFAI-LAYER-106",
  "QFAI-LEDGER-001",
  "QFAI-MMD-001",
  "QFAI-MMD-002",
  "QFAI-MMD-003",
  "QFAI-MMD-004",
  "QFAI-MOCK-001",
  "QFAI-MOCK-002",
  "QFAI-MOCK-003",
  "QFAI-MOCK-004",
  "QFAI-MOCK-009",
  "QFAI-MOCK-010",
  "QFAI-MOCK-011",
  "QFAI-MOCK-012",
  "QFAI-NAV-001",
  "QFAI-NAV-004",
  "QFAI-NAV-005",
  "QFAI-PLAN-001",
  "QFAI-PLAN-005",
  "QFAI-PROT-001",
  "QFAI-PROT-002",
  "QFAI-PROT-003",
  "QFAI-PROT-004",
  "QFAI-PROT-005",
  "QFAI-PROT-006",
  "QFAI-PROT-007",
  "QFAI-PROT-008",
  "QFAI-PROT-009",
  "QFAI-RESEARCH-001",
  "QFAI-RESEARCH-003",
  "QFAI-RESEARCH-004",
  "QFAI-RESEARCH-005",
  "QFAI-RESEARCH-006",
  "QFAI-RESEARCH-007",
  "QFAI-RESEARCH-008",
  "QFAI-RESEARCH-009",
  "QFAI-RESEARCH-010",
  "QFAI-RESEARCH-011",
  "QFAI-SKILLS-010",
  "QFAI-SKILLS-011",
  "QFAI-SPACK-090",
  "QFAI-SPACK-101",
  "QFAI-SPLIT-100",
  "QFAI-SPLIT-101",
  "QFAI-SPLIT-102",
  "QFAI-SPLIT-103",
  "QFAI-SPLIT-104",
  "QFAI-SPLIT-105",
  "QFAI-STATUS-001",
  "QFAI-STATUS-002",
  "QFAI-STATUS-003",
  "QFAI-STATUS-004",
  "QFAI-STATUS-005",
  "QFAI-STATUS-006",
  "QFAI-TC-001",
  "QFAI-TRACE-001",
  "QFAI-TRACE-100",
  "QFAI-TRACE-101",
  "QFAI-TRACE-102",
  "QFAI-TRACE-103",
  "QFAI-TRACE-104",
  "QFAI-TRACE-105",
  "QFAI-TRACE-106",
  "QFAI-TRACE-107",
  "QFAI-TRACE-108",
  "QFAI-TRACE-109",
  "QFAI-TRACE-110",
  "QFAI-TRACE-111",
  "QFAI-TRACE-112",
  "QFAI-TRACE-113",
  "QFAI-TRACE-114",
  "QFAI-TRACE-118",
  "QFAI-TRACE-119",
  "QFAI-TRACE-120",
  "QFAI-TRACE-121",
  "QFAI-TRACE-122",
  "QFAI-TRACE-123",
  "QFAI-TRACE-124",
  "QFAI-TRIAGE-002",
  "QFAI-TRIAGE-003",
  "QFAI-TRIAGE-004",
  "QFAI-TRIAGE-005",
  "QFAI-TRIAGE-006",
  "QFAI-WAIVER-001",
  "QFAI-WAIVER-002",
  "QFAI_CONFIG_INVALID",
  "R-AUTOPILOT-POLICY-MISSING",
  "R-CERTIFY-VERIFY-CIRCULAR",
  "R-EVIDENCE-MUTATION-UNLOGGED",
  "R-EXPLORATION-CERTIFY-ATTEMPT",
  "R-HANDOFF-INCOMPLETE",
  "R-HANDOFF-SCHEMA-DRIFT",
  "R-MOCK-HREF-DRIFT",
  "R-PROMPT-SCANNER-DRIFT",
  "R-SKILL-MANIFEST-DRIFT",
  "TDDLIST_BLOCKED_MISSING_REF",
  "TDDLIST_COVERAGE_LAYER_MISMATCH",
  "TDDLIST_DUPLICATE_ID",
  "TDDLIST_EVIDENCE_EMPTY",
  "TDDLIST_EVIDENCE_STATUS_ONLY",
  "TDDLIST_EXCEPTION_MISSING_DR",
  "TDDLIST_INVALID_ID",
  "TDDLIST_INVALID_OBLIGATION_REF",
  "TDDLIST_INVALID_STATUS",
  "TDDLIST_OBLIGATION_LAYER_MISMATCH",
  "TDDLIST_OWNING_MODULE_NOT_SINGULAR",
  "TDDLIST_REQUIRED_COLUMN_MISSING",
  "TDDLIST_SPLIT_BOUNDARY_DUPLICATE",
  "TDDLIST_SPLIT_BOUNDARY_MISSING",
  "TDDLIST_TABLE_MISSING",
  "TDDLIST_TC_NOT_COVERED",
  "TDDLIST_TEST_FILE_MISSING",
  "TRACE_DOWNSTREAM_REF",
  "TRACE_SHARED_SCOPE_VIOLATION",
  // The `core/uiux/**` validators route every finding through a file-local
  // `Issue` factory rather than calling `issue(...)` directly, so none of these
  // codes reached the census until factory call sites were counted. They are
  // recorded as pending rather than catalogued in bulk: each still needs an
  // expected-state sentence written by someone who knows the rule.
  "UIX-VAL-3LAYER-FORBIDDEN-FILE",
  "UIX-VAL-3LAYER-INCOMPLETE-FAMILY",
  "UIX-VAL-3LAYER-LEGACY-FORMAT",
  "UIX-VAL-3LAYER-MIXED-FORMAT",
  "UIX-VAL-CLASSIFICATION-CONTRADICTION",
  "UIX-VAL-CLASSIFICATION-DUPLICATE-SECONDARY-SURFACE",
  "UIX-VAL-CLASSIFICATION-INVALID-BOOLEAN",
  "UIX-VAL-CLASSIFICATION-INVALID-SECONDARY-SURFACE",
  "UIX-VAL-CLASSIFICATION-INVALID-SURFACE",
  "UIX-VAL-CLASSIFICATION-MISSING",
  "UIX-VAL-CLASSIFICATION-RATIONALE-PLACEHOLDER",
  "UIX-VAL-CLASSIFICATION-REQUIRED-FIELD",
  "UIX-VAL-CLASSIFICATION-SECONDARY-ARRAY",
  "UIX-VAL-CLASSIFICATION-SECONDARY-DUPLICATE",
  "UIX-VAL-DS-READ-ERROR",
  "UIX-VAL-DS01",
  "UIX-VAL-DS02",
  "UIX-VAL-OQ-OPEN-CRITICAL",
  "UIX-VAL-SCREEN-CONTRACT-DUPLICATE-ID",
  "UIX-VAL-SCREEN-CONTRACT-LEGACY-FORMAT",
  "UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE",
  "UIX-VAL-SCREEN-CONTRACT-STATE-COVERAGE",
  "UIX-VAL-SIDECAR-MISSING",
  "UIX-VAL-SKILL-ASPIRATIONAL",
  "UIX-VAL-SKILL-BANNED-PHRASE",
  "UIX-VAL-SKILL-CANONICAL-SURFACE",
  "UIX-VAL-SKILL-CLI-SURFACE",
  "UIX-VAL-SKILL-DELEGATION",
  "UIX-VAL-SKILL-ENV-PRECONDITIONS",
  "UIX-VAL-SKILL-EVIDENCE-PATHS",
  "UIX-VAL-SKILL-PLAYWRIGHT-FALLBACK",
  "UIX-VAL-SKILL-PREFLIGHT",
  "UIX-VAL-SKILL-SECTION-MISSING",
  "UIX-VAL-SKILL-STATIC-FIRST",
  "UIX-VAL-SKILL-UI-BEARING-FALSE",
  "UIX-VAL-TREND-CATEGORY-MISSING",
  "UIX-VAL-TREND-ENTRY-MISSING",
  "UIX-VAL-TREND-FIELD-MISSING",
  "UIX-VAL-TREND-SCAN-MISSING",
  "W-SKILL-DOC-BROKEN-REF",
  "W-STALE-REFERENCE",
]);

const PENDING_FIX_CATALOG_CODES = new Set<string>([
  "D-DEPRECATED-PATH",
  "QFAI-AC-001",
  "QFAI-AGENT-004",
  "QFAI-AGENT-005",
  "QFAI-AGENT-006",
  "QFAI-AGENT-007",
  "QFAI-AGENT-008",
  "QFAI-AGENT-009",
  "QFAI-AGENT-010",
  "QFAI-AGENT-011",
  "QFAI-AGENT-012",
  "QFAI-AGENT-013",
  "QFAI-ASSETS-001",
  "QFAI-ASSETS-002",
  "QFAI-CONTRACT-010",
  "QFAI-CONTRACT-011",
  "QFAI-CONTRACT-012",
  "QFAI-CONTRACT-013",
  "QFAI-CONTRACT-020",
  "QFAI-CONTRACT-021",
  "QFAI-DCON-009",
  "QFAI-DCON-012",
  "QFAI-DCON-013",
  "QFAI-DT-001",
  "QFAI-DT-002",
  "QFAI-DT-004",
  "QFAI-DT-007",
  "QFAI-DT-008",
  "QFAI-DT-009",
  "QFAI-DT-010",
  "QFAI-EX-001",
  "QFAI-EX-002",
  "QFAI-EX-003",
  "QFAI-EX-004",
  "QFAI-EX-005",
  "QFAI-EX-007",
  "QFAI-FID-001",
  "QFAI-FID-002",
  "QFAI-FID-003",
  "QFAI-FID-004",
  "QFAI-FID-005",
  "QFAI-FID-006",
  "QFAI-FID-007",
  "QFAI-FID-008",
  "QFAI-FID-009",
  "QFAI-ID-001",
  "QFAI-LAYER-100",
  "QFAI-LAYER-101",
  "QFAI-LAYER-102",
  "QFAI-LAYER-103",
  "QFAI-LAYER-104",
  "QFAI-LAYER-105",
  "QFAI-LAYER-106",
  "QFAI-LEDGER-001",
  "QFAI-MOCK-001",
  "QFAI-MOCK-002",
  "QFAI-MOCK-003",
  "QFAI-MOCK-004",
  "QFAI-MOCK-009",
  "QFAI-MOCK-010",
  "QFAI-MOCK-011",
  "QFAI-MOCK-012",
  "QFAI-NAV-001",
  "QFAI-NAV-004",
  "QFAI-NAV-005",
  "QFAI-PROT-001",
  "QFAI-PROT-002",
  "QFAI-PROT-003",
  "QFAI-PROT-004",
  "QFAI-PROT-005",
  "QFAI-PROT-006",
  "QFAI-PROT-007",
  "QFAI-PROT-008",
  "QFAI-PROT-009",
  "QFAI-PROT-251",
  "QFAI-PROT-252",
  "QFAI-PROT-253",
  "QFAI-RESEARCH-001",
  "QFAI-RESEARCH-003",
  "QFAI-RESEARCH-004",
  "QFAI-RESEARCH-005",
  "QFAI-RESEARCH-006",
  "QFAI-RESEARCH-007",
  "QFAI-RESEARCH-008",
  "QFAI-RESEARCH-009",
  "QFAI-RESEARCH-010",
  "QFAI-RESEARCH-011",
  "QFAI-REVIEW-003",
  "QFAI-REVIEW-004",
  "QFAI-REVIEW-005",
  "QFAI-REVIEW-006",
  "QFAI-REVIEW-007",
  "QFAI-SKILLS-010",
  "QFAI-SKILLS-011",
  "QFAI-SPLIT-100",
  "QFAI-SPLIT-101",
  "QFAI-SPLIT-102",
  "QFAI-SPLIT-103",
  "QFAI-SPLIT-104",
  "QFAI-SPLIT-105",
  "QFAI-TC-001",
  "QFAI-TRACE-001",
  "QFAI-TRACE-100",
  "QFAI-TRACE-101",
  "QFAI-TRACE-102",
  "QFAI-TRACE-103",
  "QFAI-TRACE-104",
  "QFAI-TRACE-105",
  "QFAI-TRACE-106",
  "QFAI-TRACE-107",
  "QFAI-TRACE-108",
  "QFAI-TRACE-109",
  "QFAI-TRACE-110",
  "QFAI-TRACE-111",
  "QFAI-TRACE-112",
  "QFAI-TRACE-113",
  "QFAI-TRACE-114",
  "QFAI-TRACE-118",
  "QFAI-TRACE-119",
  "QFAI-TRACE-120",
  "QFAI-TRACE-121",
  "QFAI-TRACE-122",
  "QFAI-TRACE-123",
  "QFAI-WAIVER-001",
  "QFAI-WAIVER-002",
  "QFAI_CONFIG_INVALID",
  "R-AUTOPILOT-POLICY-MISSING",
  "R-CERTIFY-VERIFY-CIRCULAR",
  "R-EVIDENCE-MUTATION-UNLOGGED",
  "R-EXPLORATION-CERTIFY-ATTEMPT",
  "R-HANDOFF-INCOMPLETE",
  "R-HANDOFF-SCHEMA-DRIFT",
  "R-MOCK-HREF-DRIFT",
  "R-PROMPT-SCANNER-DRIFT",
  "R-SKILL-MANIFEST-DRIFT",
  "TDDLIST_DUPLICATE_ID",
  "TDDLIST_INVALID_ID",
  "TDDLIST_INVALID_OBLIGATION_REF",
  "TDDLIST_INVALID_STATUS",
  "TDDLIST_REQUIRED_COLUMN_MISSING",
  "TDDLIST_TABLE_MISSING",
  "TDDLIST_TC_NOT_COVERED",
  "TDDLIST_TEST_FILE_MISSING",
  "TRACE_DOWNSTREAM_REF",
  "TRACE_SHARED_SCOPE_VIOLATION",
  "W-SKILL-DOC-BROKEN-REF",
  "W-STALE-REFERENCE",
]);

async function collectErrorCapableUsage(): Promise<Map<string, IssueCodeUsage>> {
  const usage = await collectIssueCodeUsage(path.resolve(__dirname, "../../src"));
  return new Map([...usage].filter(([, entry]) => entry.errorCapable));
}

describe("issue report metadata", () => {
  it("counts codes named by a constant, not only codes written as a string literal", async () => {
    const usage = await collectErrorCapableUsage();
    // `core/saasPackage/profile.ts` passes a `const CODE = "..."` binding, and
    // `core/browserQa/index.ts` passes a member of a `const` code table. Neither
    // is a literal at the call site, so both used to slip past the ratchet.
    expect(usage.has("D-SAAS-PACKAGE-ATTESTATION-MISSING")).toBe(true);
    expect(usage.has("D-SAAS-PACKAGE-HANDOFF-SCHEMA")).toBe(true);
    expect(usage.has("QFAI-PROT-273")).toBe(true);
    // A code emitted only below `error` stays out of the error census even when
    // its constant now resolves. `VERIFY_SKIPPED_CODE` is the exemplar because it
    // sits in the same file, behind the same kind of `const` binding, as the two
    // error-capable codes asserted above — so the contrast is the severity and
    // nothing else. (`QFAI-TABLE-001` held this role until it was raised to error.)
    expect(usage.has("D-SAAS-PACKAGE-VERIFY-SKIPPED")).toBe(false);
  });

  it("counts codes forwarded through a validator's own Issue factory", async () => {
    const usage = await collectErrorCapableUsage();
    // `validators/skill/prototypingSkill.ts` never calls `issue(...)`: every
    // finding goes through its local `skillIssue(code, message, severity, fix)`.
    expect(usage.get("UIX-VAL-SKILL-BANNED-PHRASE")).toEqual({
      errorCapable: true,
      // The factory forwards its 4th argument as `suggested_action`, and every
      // call site fills it in.
      everyErrorSiteHasSuggestedAction: true,
    });
  });

  it("counts codes a caller hands to a validator's own emission helper", async () => {
    const usage = await collectErrorCapableUsage();
    // `validators/orphanProhibition.ts` raises eight codes through one
    // `validateParentExists({ …, missingCode, unknownCode })` helper. The code
    // is a literal at every call site, one frame above the `issue(...)` the
    // helper writes, so dropping the unresolvable argument hid the whole ladder
    // behind a helper that only looks dynamic.
    for (const code of [100, 101, 102, 103, 104, 105, 108, 109]) {
      expect(usage.has(`QFAI-ORPHAN-${code}`)).toBe(true);
    }
    // The pin: a helper whose code really is runtime data stays out.
    // `designAudit.findingToIssue` forwards `finding.ruleId`, and its call
    // sites pass a value rather than an object literal.
    expect(usage.has("QFAI-AUD-001")).toBe(false);
  });

  it("counts only object literals that build an Issue, not look-alike records", async () => {
    const usage = await collectErrorCapableUsage();
    // `core/decisionGuardrails.ts` builds `GuardrailIssue` records with a
    // `severity` but no `category`. They are consumed by `guardrails check`
    // alone, so letting them into the census made the ratchet answer to a CLI
    // that never prints an `expected:` line.
    for (const code of ["QFAI-GR-001", "QFAI-GR-003", "QFAI-GR-004", "QFAI-GR-005"]) {
      expect(usage.has(code)).toBe(false);
    }
    // The pin: a real `Issue` object literal is still counted.
    expect(usage.has("QFAI-SKILLS-001")).toBe(true);
  });

  it("every error-capable issue code has an expected-state catalog entry or is pending", async () => {
    const usage = await collectErrorCapableUsage();
    const missing = [...usage.keys()]
      .filter((code) => !(code in ISSUE_EXPECTED_BY_CODE))
      .filter((code) => !PENDING_EXPECTED_CATALOG_CODES.has(code))
      .sort();
    expect(missing).toEqual([]);
  });

  it("every error-capable issue code has a remediation source at every call site or is pending", async () => {
    const usage = await collectErrorCapableUsage();
    const missing = [...usage]
      .filter(
        ([code, entry]) => !entry.everyErrorSiteHasSuggestedAction && !(code in ISSUE_FIX_BY_CODE),
      )
      .map(([code]) => code)
      .filter((code) => !PENDING_FIX_CATALOG_CODES.has(code))
      .sort();
    expect(missing).toEqual([]);
  });

  it("keeps no stale entries on either pending list", async () => {
    const usage = await collectErrorCapableUsage();
    const staleExpected = [...PENDING_EXPECTED_CATALOG_CODES]
      .filter((code) => !usage.has(code) || code in ISSUE_EXPECTED_BY_CODE)
      .sort();
    const staleFix = [...PENDING_FIX_CATALOG_CODES]
      .filter(
        (code) =>
          !usage.has(code) ||
          code in ISSUE_FIX_BY_CODE ||
          (usage.get(code)?.everyErrorSiteHasSuggestedAction ?? false),
      )
      .sort();
    expect({ staleExpected, staleFix }).toEqual({ staleExpected: [], staleFix: [] });
  });

  it("reports an uncatalogued code honestly instead of printing its internal rule token", () => {
    const expected = resolveIssueExpected({
      code: "QFAI-NOT-A-CATALOGUED-CODE",
      severity: "error",
      category: "canonical",
      message: "Duplicate BP ID: BP-0001",
      rule: "bpApDb.duplicateId",
    });
    expect(expected).toBe(UNCATALOGUED_EXPECTED);
    expect(expected).not.toContain("bpApDb");
  });

  it("states the skills-integrity expected state without naming a configured path", () => {
    // `paths.skillsDir` is settable, so an expected state that spelled the
    // default tree would contradict the finding's own `target:` line on any
    // project that moved it.
    const expected = resolveIssueExpected({
      code: "QFAI-SKILLS-001",
      severity: "error",
      category: "change",
      message: "標準資産 'tools/skills/**' が改変されています（変更: 1）。",
      rule: "skills.integrity",
    });
    expect(expected).not.toBe(UNCATALOGUED_EXPECTED);
    expect(expected).not.toContain(".qfai/");
  });

  it("remediates a BP/AP required field that is present but invalid, not only one that is absent", () => {
    // `toSafeString(value).trim() === ""` fires on `description: []` as well as
    // on an absent key, and "add the missing field" cannot repair that entry:
    // a second key of the same name is a YAML duplicate.
    const base = { severity: "error", category: "canonical" } as const;
    for (const code of ["QFAI-BPAP-006", "QFAI-BPAP-009"]) {
      const fix = resolveIssueFix({
        ...base,
        code,
        message: `Missing required field "description" in entry`,
      });
      expect(fix).not.toBe(UNCATALOGUED_FIX);
      expect(fix).toMatch(/add the key/i);
      expect(fix).toMatch(/overwrite the value/i);
    }
  });

  it("resolves remediation from the emitter first, then the catalog, then the generic", () => {
    const base = { severity: "error", category: "canonical", message: "Duplicate BP ID" } as const;
    expect(
      resolveIssueFix({
        ...base,
        code: "QFAI-BPAP-005",
        suggested_action: "Do the specific thing.",
      }),
    ).toBe("Do the specific thing.");
    const catalogued = resolveIssueFix({ ...base, code: "QFAI-BPAP-005" });
    expect(catalogued).not.toBe(UNCATALOGUED_FIX);
    expect(catalogued).toContain("BP ID");
    expect(resolveIssueFix({ ...base, code: "QFAI-NOT-A-CATALOGUED-CODE" })).toBe(UNCATALOGUED_FIX);
  });
});
