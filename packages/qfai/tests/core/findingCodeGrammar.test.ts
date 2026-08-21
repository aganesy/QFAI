import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GATE_GROUP_FAMILIES } from "../../src/cli/commands/validate.js";
import { SAAS_PACKAGE_SKIPPED_GATE_FAMILIES } from "../../src/core/saasPackage/skippedGates.js";

const SRC_ROOT = path.resolve(__dirname, "../../src");
const DOC_PATH = path.resolve(__dirname, "../../docs/finding-codes.md");
const TEST_STUB_VALIDATOR = path.resolve(__dirname, "../../src/core/validators/testTodoStubs.ts");

/** The one grammar a new finding code may use — see `docs/finding-codes.md`. */
const CANONICAL_CODE_RE = /^QFAI-[A-Z]+-\d{3}$/;

/**
 * Every code literal shape the package emits. `\s` spans newlines, so an
 * `issue(\n  "CODE",` call wrapped by the formatter is still seen.
 */
const CODE_LITERAL_PATTERNS = [
  /\bissue\(\s*"([A-Z][A-Z0-9_-]*)"/g,
  /\bcode:\s*"([A-Z][A-Z0-9_-]*)"/g,
  /\b[A-Z0-9_]*(?:_RULE_ID|_CODE|_RULE)\s*(?::[^=]*)?=\s*"([A-Z][A-Z0-9_-]*)"/g,
];

/**
 * Codes that predate the grammar. Frozen: the guards below fail both when a
 * new non-conforming code appears and when a registered one stops existing, so
 * this list can only shrink.
 */
const LEGACY_FINDING_CODES: readonly string[] = [
  "D-DEPRECATED-PATH",
  "D-DEPRECATED-SCHEMA",
  "D-HANDOFF-LEGACY-FORMAT",
  "D-SAAS-PACKAGE-ATTESTATION-MISSING",
  "D-SAAS-PACKAGE-HANDOFF-SCHEMA",
  "D-SAAS-PACKAGE-VERIFY-SKIPPED",
  "D-SCAFFOLD-FOREIGN-HOME",
  "D-SCAFFOLD-PLACEHOLDER",
  "D-SURFACE-TYPE-MISSING",
  "E_AC_NOT_VERIFIED",
  "E_DELTA_MISSING_REQUIRED",
  "E_ID_INVALID_FORMAT",
  "E_LEDGER_EMPTY_CELL",
  "E_LEDGER_MISSING_COLUMN",
  "E_OQ_OPEN_RELEASE_BLOCK",
  "E_OQ_STATUS_UNPARSEABLE",
  "E_REF_NOT_FOUND",
  "E_SPEC_MISSING_FILESET",
  "E_TC_ORPHAN",
  "E_UPWARD_REF_FORBIDDEN",
  "HANDOFF-SCHEMA-FIELD-TYPE",
  "HANDOFF-SCHEMA-NOT-OBJECT",
  "I-ASSISTANT-LAYER-UNSEEDED",
  "QFAI-CFG-LINK-001",
  "QFAI-CFG-LINK-002",
  "QFAI-CFG-LINK-003",
  "QFAI-DOC-CONVERGENCE-INCOMPLETE",
  "QFAI-DOC-CONVERGENCE-MISSING",
  "QFAI-DOC-VOCABULARY-CONTRADICTION",
  "QFAI-DOC-VOCABULARY-PROHIBITED",
  "QFAI-UIUX-PERF",
  "QFAI_CONFIG_INVALID",
  "R-AUTOPILOT-POLICY-MISSING",
  "R-AUTOPILOT-POLICY-WIDENED",
  "R-CERTIFY-VERIFY-CIRCULAR",
  "R-DESIGN-MD-PATCH-OUT-OF-ZONE",
  "R-EVIDENCE-MUTATION-UNLOGGED",
  "R-EXPLORATION-CERTIFY-ATTEMPT",
  "R-HANDOFF-INCOMPLETE",
  "R-HANDOFF-SCHEMA-DRIFT",
  "R-MOCK-HREF-DRIFT",
  "R-PACK-LOCATION-DRIFT",
  "R-PROMPT-SCANNER-DRIFT",
  "R-SKILL-MANIFEST-DRIFT",
  "TDDLIST-001",
  "TDDLIST-002",
  "TDDLIST-003",
  "TDDLIST-004",
  "TDDLIST-005",
  "TDDLIST-006",
  "TDDLIST_BLOCKED_MISSING_REF",
  "TDDLIST_COVERAGE_LAYER_MISMATCH",
  "TDDLIST_DUPLICATE_ID",
  "TDDLIST_EVIDENCE_EMPTY",
  "TDDLIST_EVIDENCE_STATUS_ONLY",
  "TDDLIST_EXCEPTION_INVALID_DR",
  "TDDLIST_EXCEPTION_MISSING_DR",
  "TDDLIST_EXCEPTION_PARKED",
  "TDDLIST_EXCEPTION_UNRESOLVED_DR",
  "TDDLIST_INFO",
  "TDDLIST_INVALID_ID",
  "TDDLIST_INVALID_OBLIGATION_REF",
  "TDDLIST_INVALID_STATUS",
  "TDDLIST_LAYER_PATH_MISMATCH",
  "TDDLIST_MISSING",
  "TDDLIST_OBLIGATION_LAYER_MISMATCH",
  "TDDLIST_OWNING_MODULE_NOT_SINGULAR",
  "TDDLIST_REQUIRED_COLUMN_MISSING",
  "TDDLIST_SELECTOR_UNRESOLVED",
  "TDDLIST_STALE_STATUS",
  "TDDLIST_TABLE_MISSING",
  "TDDLIST_TC_NOT_COVERED",
  "TDDLIST_TC_TABLE_UNRESOLVED",
  "TDDLIST_TEST_FILE_MISSING",
  "TDDLIST_UNKNOWN_LAYER",
  "TDDLIST_UNKNOWN_LEVEL",
  "TDDLIST_UNKNOWN_REF",
  "TRACE_DOWNSTREAM_REF",
  "TRACE_SHARED_SCOPE_VIOLATION",
  "UIX-VAL-DS-READ-ERROR",
  "UIX-VAL-DS01",
  "UIX-VAL-DS02",
  "W-ASSISTANT-LAYOUT",
  "W-PENDING-PROMOTION",
  "W-SKILL-DOC-BROKEN-REF",
  "W-SKILL-PROJECT-MEMORY",
  "W-STALE-REFERENCE",
  "W-WORKLOG-BROKEN-LINK",
  "W-WORKLOG-SCHEMA",
  "W-WORKLOG-STALE",
];

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

function codesIn(content: string): string[] {
  const found = new Set<string>();
  for (const pattern of CODE_LITERAL_PATTERNS) {
    for (const match of content.matchAll(pattern)) found.add(match[1]);
  }
  return [...found];
}

/** Every code literal reachable in `src/`, deduped and sorted. */
async function emittedCodes(): Promise<string[]> {
  const codes = new Set<string>();
  for (const file of await collectTsFiles(SRC_ROOT)) {
    for (const code of codesIn(await readFile(file, "utf-8"))) codes.add(code);
  }
  return [...codes].sort();
}

/** `QFAI-TEST-*` matches `QFAI-TEST-002`; a bare `QFAI-TEST-001` does not. */
function familyMatches(family: string, code: string): boolean {
  return family.endsWith("*") ? code.startsWith(family.slice(0, -1)) : family === code;
}

describe("finding code grammar", () => {
  it("emits no code outside the canonical grammar or the frozen legacy registry", async () => {
    const registered = new Set(LEGACY_FINDING_CODES);
    const unknown = (await emittedCodes()).filter(
      (code) => !CANONICAL_CODE_RE.test(code) && !registered.has(code),
    );
    // A new code must be `QFAI-<AREA>-<NNN>` — see docs/finding-codes.md.
    // Widening the registry to admit one is not the fix.
    expect(unknown).toEqual([]);
  });

  it("keeps no stale entry in the legacy registry", async () => {
    const emitted = new Set(await emittedCodes());
    const stale = LEGACY_FINDING_CODES.filter((code) => !emitted.has(code));
    // A registry that outlives its codes stops being evidence of anything.
    expect(stale).toEqual([]);
  });

  it("registers the legacy codes in sorted order and without duplicates", () => {
    expect(LEGACY_FINDING_CODES).toEqual([...new Set(LEGACY_FINDING_CODES)].sort());
  });

  it("documents every frozen family in docs/finding-codes.md", async () => {
    const doc = await readFile(DOC_PATH, "utf-8");
    const prefixes = new Set(
      LEGACY_FINDING_CODES.map((code) => code.match(/^[A-Z]+[-_]/)?.[0] ?? code),
    );
    const undocumented = [...prefixes].sort().filter((prefix) => !doc.includes(`\`${prefix}\``));
    expect(undocumented).toEqual([]);
  });

  it("covers every code a gate emits with a family entry, not a bare code", async () => {
    // Both family tables listed `QFAI-TEST-001` alone while the gate also
    // emits `QFAI-TEST-002`, so the partial-profile notice under-stated what
    // `--profile saas-package` and `--profile tdd` had skipped.
    const stubCodes = codesIn(await readFile(TEST_STUB_VALIDATOR, "utf-8"));
    expect(stubCodes).toContain("QFAI-TEST-002");

    const tables = {
      "skippedGates.validateTestTodoStubs":
        SAAS_PACKAGE_SKIPPED_GATE_FAMILIES.validateTestTodoStubs,
      "GATE_GROUP_FAMILIES.tdd": GATE_GROUP_FAMILIES.tdd,
    };
    const uncovered: string[] = [];
    for (const [table, families] of Object.entries(tables)) {
      for (const code of stubCodes) {
        if (!families.some((family) => familyMatches(family, code))) {
          uncovered.push(`${table} does not cover ${code}`);
        }
      }
    }
    expect(uncovered).toEqual([]);
  });
});
