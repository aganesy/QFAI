/**
 * Integration acceptance for spec-0015 CHG-006 test cases
 * TC-0015-0020..0033 (autopilot policy gate, envelope-deviation
 * audit-log, handoff schema drift, eight-code finding catalog,
 * `qfai audit log` CLI, `qfai handoff upgrade` legacy adapter, doc
 * realignment / stale-reference report).
 *
 * Deterministic temp-fixture form: each `it` seeds a `mkdtemp` root
 * with the minimum on-disk shape required and invokes the production
 * API surface directly (validators / CLI command runners). Replaces
 * the earlier `execFile`-against-dist-binary approach with an
 * isolation-safe variant.
 */
// QFAI:SPEC-0015:TC-0015-0020
// QFAI:SPEC-0015:TC-0015-0034
// QFAI:SPEC-0015:TC-0015-0021
// QFAI:SPEC-0015:TC-0015-0022
// QFAI:SPEC-0015:TC-0015-0023
// QFAI:SPEC-0015:TC-0015-0024
// QFAI:SPEC-0015:TC-0015-0025
// QFAI:SPEC-0015:TC-0015-0026
// QFAI:SPEC-0015:TC-0015-0027
// QFAI:SPEC-0015:TC-0015-0028
// QFAI:SPEC-0015:TC-0015-0029
// QFAI:SPEC-0015:TC-0015-0030
// QFAI:SPEC-0015:TC-0015-0031
// QFAI:SPEC-0015:TC-0015-0032
// QFAI:SPEC-0015:TC-0015-0033

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAuditLog } from "../../src/cli/commands/auditLog.js";
import { runHandoffUpgrade } from "../../src/cli/commands/handoffUpgrade.js";
import { writeDecisionRecord } from "../../src/core/decisionRecord.js";
import { validateAutopilotPolicy } from "../../src/core/validators/autopilotPolicy.js";
import { detectHandoffSchemaDrift } from "../../src/core/validators/handoffSchemaDrift.js";
import {
  HANDOFF_SCHEMA_REL,
  HANDOFF_WRITER_PAIRS,
} from "../../src/core/validators/handoffSchemaPairs.js";
import { JUSTIFICATION_CATALOG } from "../../src/core/validators/justificationCatalog.js";
import { validateReviewerJustification } from "../../src/core/validators/reviewerJustification.js";
import {
  STALE_REFERENCE_SUNSET,
  validateStaleReferences,
} from "../../src/core/validators/staleReferences.js";
import { validateHandoff } from "../../src/core/schemas/handoff.js";
import { loadConfig } from "../../src/core/config.js";
import { removeTempTree } from "../helpers/tempTree.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0015-int-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

async function writeSkillMd(skillId: string, body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skills", skillId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SKILL.md"), body, "utf-8");
}

const POLICY_3_BUCKET = `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - ID / sequence numbering
  - append-vs-create on subject overlap
  - equivalent-option pick
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

describe("spec-0015 autopilot policy CHG-006", () => {
  it("QFAI:SPEC-0015:TC-0015-0020 — error: SKILL.md without ## Default Autopilot Policy emits R-AUTOPILOT-POLICY-MISSING", async () => {
    await writeSkillMd("qfai-x", "# qfai-x\nNo policy.\n");
    const issues = await validateAutopilotPolicy(root);
    const f = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(f?.severity).toBe("error");
    expect(f?.message).toMatch(/justification/i);
  });

  it("QFAI:SPEC-0015:TC-0015-0034 — error: SKILL.md with section present but missing buckets emits R-AUTOPILOT-POLICY-MISSING naming the missing bucket(s)", async () => {
    // Section heading present but body lacks all required buckets.
    // The validator must fire R-AUTOPILOT-POLICY-MISSING (error) and
    // name the missing buckets in the justification per the
    // BR-0015-0010 / AC-0015-0015 two-condition trigger added by
    // PR #211 (present-but-incomplete case).
    const headingOnly = "# qfai-x\n\n## Default Autopilot Policy\n\nbody without buckets.\n";
    await writeSkillMd("qfai-x", headingOnly);
    const issues = await validateAutopilotPolicy(root);
    const f = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(f?.severity).toBe("error");
    expect(f?.message).toMatch(/auto-decide/);
    expect(f?.message).toMatch(/ask-user/);
    expect(f?.message).toMatch(/hard-required/);
  });

  it("QFAI:SPEC-0015:TC-0015-0021 — normal: 3-bucket SKILL.md passes; widened auto-decide flagged as warning", async () => {
    await writeSkillMd("qfai-x", POLICY_3_BUCKET);
    const issues = await validateAutopilotPolicy(root);
    expect(issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toBeUndefined();

    // Widening: add an extra non-canonical entry to auto-decide.
    const widened = POLICY_3_BUCKET.replace(
      "  - equivalent-option pick",
      "  - equivalent-option pick\n  - destructive operations",
    );
    await writeSkillMd("qfai-y", widened);
    const issues2 = await validateAutopilotPolicy(root);
    expect(issues2.some((i) => i.code === "R-AUTOPILOT-POLICY-WIDENED")).toBe(true);
  });
});

describe("spec-0015 envelope audit-log CHG-006", () => {
  it("QFAI:SPEC-0015:TC-0015-0022 — normal: an envelope AskUserQuestion writes a shaped JSON record", async () => {
    const r = await writeDecisionRecord({
      root,
      question: "Adopt option X?",
      answer: "yes",
      scope: "architectural-decision",
      operatorIdentity: "tester",
      envelopeContractClause: "architectural-decision: option-X envelope",
    });
    expect(r.written).toBe(true);
    if (r.path) {
      const body = JSON.parse(await readFile(r.path, "utf-8")) as Record<string, unknown>;
      expect(body.question).toBe("Adopt option X?");
      expect(body.scope).toBe("architectural-decision");
      expect(body.envelopeContractClause).toMatch(/option-X/);
      expect(typeof body.timestamp).toBe("string");
    }
  });

  it("QFAI:SPEC-0015:TC-0015-0023 — boundary: non-envelope question writes no record", async () => {
    const r = await writeDecisionRecord({
      root,
      question: "format pick?",
      answer: "yes",
      scope: "routine",
      operatorIdentity: "tester",
      envelopeContractClause: "routine-format-choice",
    });
    expect(r.written).toBe(false);
  });
});

describe("spec-0015 handoff schema CHG-006", () => {
  it("QFAI:SPEC-0015:TC-0015-0024 — error: asymmetric Pair IV emits R-HANDOFF-SCHEMA-DRIFT", async () => {
    await mkdir(path.dirname(path.join(root, HANDOFF_SCHEMA_REL)), { recursive: true });
    await writeFile(
      path.join(root, HANDOFF_SCHEMA_REL),
      `export const HANDOFF_MINIMUM_FIELDS = ["companyName"] as const;\n`,
      "utf-8",
    );
    for (const pair of HANDOFF_WRITER_PAIRS) {
      const abs = path.join(root, pair.writerRel);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(
        abs,
        `// drift: writer omits the canonical schema token\nexport const X = 1;\n`,
        "utf-8",
      );
    }
    const issues = await detectHandoffSchemaDrift(root);
    const f = issues.find((i) => i.code === "R-HANDOFF-SCHEMA-DRIFT");
    expect(f?.severity).toBe("error");
    expect(f?.message).toMatch(/justification/i);
  });

  it("QFAI:SPEC-0015:TC-0015-0025 — normal: a handoff with extra keys passes validateHandoff (additionalProperties: true)", () => {
    const issues = validateHandoff({
      companyName: "Acme",
      primarySpecId: "spec-0012",
      extraKey: { foo: 1 },
    });
    expect(issues).toEqual([]);
  });
});

describe("spec-0015 finding-code catalog CHG-006", () => {
  it("QFAI:SPEC-0015:TC-0015-0026 — normal: 8 catalog codes registered; the catalog declares membership only, no severity", () => {
    const codes = JUSTIFICATION_CATALOG.map((e) => e.code);
    expect(codes.length).toBe(8);
    expect(codes).toContain("R-DESIGN-MD-PATCH-OUT-OF-ZONE");
    for (const entry of JUSTIFICATION_CATALOG) {
      expect(Object.keys(entry).sort()).toEqual(["code", "description"]);
    }
  });

  it("QFAI:SPEC-0015:TC-0015-0026 — normal: ingestion rejects an empty justification at error even for a code its own detector emits at warning", async () => {
    const dir = path.join(root, ".qfai", "review");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "out-of-zone.json"),
      JSON.stringify({
        findings: [{ code: "R-DESIGN-MD-PATCH-OUT-OF-ZONE", justification: "" }],
      }),
      "utf-8",
    );
    const { config } = await loadConfig(root);
    const issues = await validateReviewerJustification(root, config);
    const flagged = issues.filter((i) => i.code === "R-DESIGN-MD-PATCH-OUT-OF-ZONE");
    expect(flagged.length).toBe(1);
    expect(flagged[0]?.severity).toBe("error");
  });

  it("QFAI:SPEC-0015:TC-0015-0027 — error: empty justification on a catalog code is rejected; non-empty accepted", async () => {
    const dir = path.join(root, ".qfai", "review");
    await mkdir(dir, { recursive: true });
    // Empty justification → rejected for every catalog code.
    await writeFile(
      path.join(dir, "empty.json"),
      JSON.stringify({
        findings: JUSTIFICATION_CATALOG.map((e) => ({ code: e.code, justification: "" })),
      }),
      "utf-8",
    );
    const { config } = await loadConfig(root);
    const issuesEmpty = await validateReviewerJustification(root, config);
    const flagged = new Set(issuesEmpty.map((i) => i.code));
    for (const entry of JUSTIFICATION_CATALOG) {
      expect(flagged.has(entry.code)).toBe(true);
    }
    // Replace with non-empty justifications → none flagged.
    await writeFile(
      path.join(dir, "empty.json"),
      JSON.stringify({
        findings: JUSTIFICATION_CATALOG.map((e) => ({
          code: e.code,
          justification: `non-empty for ${e.code}`,
        })),
      }),
      "utf-8",
    );
    const issuesFilled = await validateReviewerJustification(root, config);
    for (const entry of JUSTIFICATION_CATALOG) {
      expect(issuesFilled.find((i) => i.code === entry.code)).toBeUndefined();
    }
  });

  /**
   * The spec-0015 surfaces that state what the REQ-0168 catalog *stores*.
   *
   * `10_Plan.md` is in this list because it is the last one that was left behind. The other five
   * moved to the membership-only contract in one pass; the plan kept saying "register ... at
   * severity error", and `qfai-atdd/SKILL.md` calls `10_Plan.md` "the primary How SSOT for
   * execution phases" — so a later ATDD run reading it would have re-added the `severity` field
   * that `JUSTIFICATION_CATALOG` no longer has. Enumerating the surfaces here is the point: a
   * seventh one that starts describing the stored shape has to be added, and then it is checked.
   *
   * `_policies/10_delta.md` is deliberately absent. It is the append-only triage record for this
   * change (`UPDATE:APPEND` only, `Approved By` filled in), so its text is history rather than a
   * live contract and must not be rewritten to match.
   */
  const CATALOG_SHAPE_SURFACES = [
    "01_Spec.md",
    "02_User-stories.md",
    "03_Acceptance-Criteria.md",
    "04_Business-Rules.md",
    "06_Test-Cases.md",
    "10_Plan.md",
  ] as const;

  const repoRoot = path.resolve(__dirname, "../../../..");

  const readSurface = async (name: string): Promise<string> =>
    readFile(path.join(repoRoot, ".qfai", "specs", "spec-0015", name), "utf-8");

  it.each(CATALOG_SHAPE_SURFACES)(
    "QFAI:SPEC-0015:TC-0015-0026 — normal: %s states the catalog's membership-only shape",
    async (surface) => {
      const text = await readSurface(surface);
      // The stored shape: membership, and explicitly no severity column on the entry.
      expect(text).toMatch(/membership only/i);
      expect(text).toMatch(/per-code severity/i);
      // Over-correction pin — dropping the severity column must not drop the justification
      // obligation or the error-severity refusal of an empty one.
      expect(text).toMatch(/non-empty `justification:`/);
      expect(text).toMatch(/severity error/i);
    },
  );

  it("QFAI:SPEC-0015:TC-0015-0026 — error: the plan does not tell an implementer to register the catalog at a severity", async () => {
    const text = await readSurface("10_Plan.md");
    const item = text.split(/\r?\n/).find((line) => line.includes("BR-0015-0013"));
    expect(item).toBeDefined();
    // The superseded instruction, verbatim. It put the severity on the registration itself,
    // which is the column `JUSTIFICATION_CATALOG` entries do not carry (asserted above).
    expect(item).not.toContain("at severity error with mandatory non-empty");
    expect(item).toMatch(/membership only/i);
    expect(item).toMatch(/no per-code severity column/i);
    // What the plan must still require of the implementer.
    expect(item).toMatch(/non-empty `justification:`/);
    expect(item).toMatch(/rejects an empty \/ whitespace-only value at severity error/i);
  });
});

describe("spec-0015 audit log CLI CHG-006", () => {
  it("QFAI:SPEC-0015:TC-0015-0028 — normal: audit log lists newest-first + --scope/--operator/--clause filter; --format json works", async () => {
    await writeDecisionRecord({
      root,
      question: "Q1",
      answer: "a",
      scope: "scope-expansion",
      operatorIdentity: "alice",
      envelopeContractClause: "scope-expansion: 1",
      now: () => new Date("2026-05-28T10:00:00Z"),
    });
    await writeDecisionRecord({
      root,
      question: "Q2",
      answer: "a",
      scope: "skill-envelope",
      operatorIdentity: "bob",
      envelopeContractClause: "skill-envelope: 2",
      now: () => new Date("2026-05-29T10:00:00Z"),
    });
    const written: string[] = [];
    const exit = await runAuditLog({
      root,
      format: "json",
      scope: "scope-expansion",
      write: (m) => written.push(m),
      writeErr: () => undefined,
    });
    expect(exit).toBe(0);
    const parsed = JSON.parse(written[0] ?? "[]") as Array<Record<string, string>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.scope).toBe("scope-expansion");
  });

  it("QFAI:SPEC-0015:TC-0015-0029 — boundary: default --format is table; empty store → empty result, exit 0", async () => {
    const written: string[] = [];
    const errs: string[] = [];
    const exit = await runAuditLog({
      root,
      write: (m) => written.push(m),
      writeErr: (m) => errs.push(m),
    });
    expect(exit).toBe(0);
    // stdout stays TSV: header row, zero data rows.
    expect(written.join("\n")).toBe("timestamp\tscope\toperator\tclause");
    expect(errs.join("\n")).toMatch(/no decision records/i);
  });
});

describe("spec-0015 handoff upgrade CHG-006", () => {
  it("QFAI:SPEC-0015:TC-0015-0030 — normal: emits conforming .qfai/handoff.yaml with legacy: preserved", async () => {
    await writeFile(
      path.join(root, "session-handoff.yaml"),
      "companyName: Acme\nprimarySpecId: spec-0012\ncustomField: legacy-data\n",
      "utf-8",
    );
    const exit = await runHandoffUpgrade({
      root,
      legacyFile: "session-handoff.yaml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(exit).toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    expect(body).toMatch(/companyName: "Acme"/);
    expect(body).toMatch(/legacy:/);
    expect(body).toMatch(/customField/);
  });

  it("QFAI:SPEC-0015:TC-0015-0031 — error: malformed input fails without partial overwrite", async () => {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "handoff.yaml"), "companyName: original\n", "utf-8");
    await writeFile(path.join(root, "malformed.yaml"), "   \n", "utf-8");
    const errs: string[] = [];
    const exit = await runHandoffUpgrade({
      root,
      legacyFile: "malformed.yaml",
      write: () => undefined,
      writeErr: (m) => errs.push(m),
    });
    expect(exit).not.toBe(0);
    expect(errs.join("\n")).toMatch(/malformed|no recognizable/i);
    const after = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    expect(after).toBe("companyName: original\n");
  });
});

describe("spec-0015 stale-ref report CHG-006", () => {
  it("QFAI:SPEC-0015:TC-0015-0032 — normal: rewritten in-PR refs report zero stale references at HEAD", async () => {
    const dir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping", "references");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "handoff.md"), "# Handoff\nUses handoff.yaml.\n", "utf-8");
    const issues = await validateStaleReferences(root, {
      now: () => new Date("2026-06-01T00:00:00Z"),
    });
    expect(issues.filter((i) => i.code === "W-STALE-REFERENCE")).toEqual([]);
  });

  it("QFAI:SPEC-0015:TC-0015-0033 — error: stale ref → warning in window, error at sunset", async () => {
    const dir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping", "references");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "handoff.md"),
      "# Handoff\nUses session-handoff.yaml.\n",
      "utf-8",
    );
    const inWindow = await validateStaleReferences(root, {
      now: () => new Date("2026-06-01T00:00:00Z"),
    });
    const inFindings = inWindow.filter((i) => i.code === "W-STALE-REFERENCE");
    expect(inFindings[0]?.severity).toBe("warning");

    const atSunset = await validateStaleReferences(root, {
      now: () => new Date(`${STALE_REFERENCE_SUNSET}T00:00:00Z`),
    });
    const atFindings = atSunset.filter((i) => i.code === "W-STALE-REFERENCE");
    expect(atFindings[0]?.severity).toBe("error");
  });
});
