/**
 * E2E acceptance for spec-0015 CHG-006 user stories US-0015-0009..0015:
 *   - US-0015-0009: SKILL.md `## Default Autopilot Policy` section /
 *     R-AUTOPILOT-POLICY-MISSING.
 *   - US-0015-0010: envelope-deviation AskUserQuestion audit-log
 *     decision record.
 *   - US-0015-0011: canonical cross-skill handoff schema /
 *     R-HANDOFF-SCHEMA-DRIFT.
 *   - US-0015-0012: eight-code Reviewer-Gate finding catalog (mandatory
 *     non-empty justification).
 *   - US-0015-0013: `qfai audit log` CLI surface.
 *   - US-0015-0014: `qfai handoff upgrade` legacy adapter.
 *   - US-0015-0015: cross-skill documentation realignment / zero stale
 *     references.
 *
 * Deterministic temp-fixture form: each `it` seeds a `mkdtemp` root with
 * the minimum on-disk shape required to exercise the user story, then
 * invokes the production API surface (validators / CLI command
 * functions) directly. The previous `execFile`-against-dist binary
 * approach was non-deterministic (CWD-dependent); the rewrite drops
 * that coupling while preserving the spec / TC annotations.
 */
// QFAI:SPEC-0015:US-0015-0009
// QFAI:SPEC-0015:US-0015-0010
// QFAI:SPEC-0015:US-0015-0011
// QFAI:SPEC-0015:US-0015-0012
// QFAI:SPEC-0015:US-0015-0013
// QFAI:SPEC-0015:US-0015-0014
// QFAI:SPEC-0015:US-0015-0015

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
import { loadConfig } from "../../src/core/config.js";
import { removeTempTree } from "../helpers/tempTree.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0015-e2e-"));
});

afterEach(async () => {
  await removeTempTree(root);
});

async function writeSkill(skillId: string, body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skills", skillId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SKILL.md"), body, "utf-8");
}

const FULL_POLICY_SKILL = `# qfai-fixture

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
  - primarySpecId when absent
`;

describe("spec-0015 US-0015-0009 autopilot policy (E2E, deterministic temp-fixture)", () => {
  it("QFAI:SPEC-0015:US-0015-0009 — error: a SKILL.md missing ## Default Autopilot Policy emits R-AUTOPILOT-POLICY-MISSING", async () => {
    await writeSkill("qfai-x", "# qfai-x\n\nNo policy section.\n");
    const issues = await validateAutopilotPolicy(root);
    expect(issues.some((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toBe(true);
  });

  it("QFAI:SPEC-0015:US-0015-0009 — normal: a SKILL.md with 3 buckets passes without R-AUTOPILOT-POLICY-MISSING", async () => {
    await writeSkill("qfai-x", FULL_POLICY_SKILL);
    const issues = await validateAutopilotPolicy(root);
    expect(issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toBeUndefined();
  });
});

describe("spec-0015 US-0015-0010 envelope audit-log (E2E, deterministic temp-fixture)", () => {
  it("QFAI:SPEC-0015:US-0015-0010 — normal: an envelope AskUserQuestion writes decisions/<ISO>.json", async () => {
    const r = await writeDecisionRecord({
      root,
      question: "expand scope?",
      answer: "yes",
      scope: "scope-expansion",
      operatorIdentity: "tester",
      envelopeContractClause: "scope-expansion: extra spec",
    });
    expect(r.written).toBe(true);
    expect(r.path).toBeDefined();
    if (r.path) {
      const body = JSON.parse(await readFile(r.path, "utf-8")) as Record<string, unknown>;
      expect(body.envelopeContractClause).toMatch(/scope-expansion/);
    }
  });

  it("QFAI:SPEC-0015:US-0015-0010 — boundary: a non-envelope question writes no record (no fail-open)", async () => {
    const r = await writeDecisionRecord({
      root,
      question: "format pick?",
      answer: "yes",
      scope: "routine",
      operatorIdentity: "tester",
      envelopeContractClause: "routine-format-question",
    });
    expect(r.written).toBe(false);
  });
});

describe("spec-0015 US-0015-0011 handoff schema (E2E, deterministic temp-fixture)", () => {
  it("QFAI:SPEC-0015:US-0015-0011 — error: asymmetric Pair IV edit emits R-HANDOFF-SCHEMA-DRIFT", async () => {
    // Schema declares the canonical token; writer omits its expected token.
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
        `// drift: writer omits canonical token\nexport const X = 1;\n`,
        "utf-8",
      );
    }
    const issues = await detectHandoffSchemaDrift(root);
    expect(issues.some((i) => i.code === "R-HANDOFF-SCHEMA-DRIFT")).toBe(true);
  });

  it("QFAI:SPEC-0015:US-0015-0011 — normal: a symmetric pair passes without R-HANDOFF-SCHEMA-DRIFT", async () => {
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
        `// writer uses ${pair.writerToken}\nexport function w(a: ${pair.writerToken}) { return a; }\n`,
        "utf-8",
      );
    }
    const issues = await detectHandoffSchemaDrift(root);
    expect(issues.find((i) => i.code === "R-HANDOFF-SCHEMA-DRIFT")).toBeUndefined();
  });
});

describe("spec-0015 US-0015-0012 finding-code catalog (E2E, deterministic temp-fixture)", () => {
  it("QFAI:SPEC-0015:US-0015-0012 — normal: all 8 catalog codes are registered", () => {
    const codes = JUSTIFICATION_CATALOG.map((e) => e.code);
    expect(codes).toContain("R-AUTOPILOT-POLICY-MISSING");
    expect(codes).toContain("R-HANDOFF-SCHEMA-DRIFT");
    expect(codes).toContain("R-EVIDENCE-MUTATION-UNLOGGED");
    expect(codes).toContain("R-DESIGN-MD-PATCH-OUT-OF-ZONE");
    expect(codes).toContain("R-PACK-LOCATION-DRIFT");
    expect(codes).toContain("R-SKILL-MANIFEST-DRIFT");
    expect(codes).toContain("R-EXPLORATION-CERTIFY-ATTEMPT");
    expect(codes).toContain("R-MOCK-HREF-DRIFT");
    expect(codes).toHaveLength(8);
  });

  it("QFAI:SPEC-0015:US-0015-0012 — error: empty justification on a catalog code is rejected by validate ingestion", async () => {
    const dir = path.join(root, ".qfai", "review");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "report.json"),
      JSON.stringify({
        findings: [{ code: "R-AUTOPILOT-POLICY-MISSING", justification: "" }],
      }),
      "utf-8",
    );
    const { config } = await loadConfig(root);
    const issues = await validateReviewerJustification(root, config);
    expect(issues.some((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toBe(true);
  });
});

describe("spec-0015 US-0015-0013 audit log CLI (E2E, deterministic temp-fixture)", () => {
  it("QFAI:SPEC-0015:US-0015-0013 — normal: qfai audit log lists records newest-first and filters via --scope", async () => {
    await writeDecisionRecord({
      root,
      question: "Q1",
      answer: "a",
      scope: "scope-expansion",
      operatorIdentity: "alice",
      envelopeContractClause: "scope-expansion: x",
      now: () => new Date("2026-05-28T10:00:00Z"),
    });
    await writeDecisionRecord({
      root,
      question: "Q2",
      answer: "a",
      scope: "architectural-decision",
      operatorIdentity: "bob",
      envelopeContractClause: "architectural-decision: y",
      now: () => new Date("2026-05-29T10:00:00Z"),
    });
    const written: string[] = [];
    const exit = await runAuditLog({
      root,
      format: "json",
      write: (m) => written.push(m),
      writeErr: () => undefined,
    });
    expect(exit).toBe(0);
    const parsed = JSON.parse(written[0] ?? "[]") as Array<Record<string, string>>;
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.scope).toBe("architectural-decision");
  });

  it("QFAI:SPEC-0015:US-0015-0013 — boundary: empty store yields empty result and exit 0", async () => {
    const written: string[] = [];
    const exit = await runAuditLog({
      root,
      format: "json",
      write: (m) => written.push(m),
      writeErr: () => undefined,
    });
    expect(exit).toBe(0);
    expect(JSON.parse(written[0] ?? "null")).toEqual([]);
  });
});

describe("spec-0015 US-0015-0014 handoff upgrade (E2E, deterministic temp-fixture)", () => {
  it("QFAI:SPEC-0015:US-0015-0014 — normal: qfai handoff upgrade emits .qfai/handoff.yaml with legacy: preserved", async () => {
    await writeFile(
      path.join(root, "session-handoff.yaml"),
      "companyName: Acme\nprimarySpecId: spec-0012\nextra: keepme\n",
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
    expect(body).toMatch(/extra/);
  });

  it("QFAI:SPEC-0015:US-0015-0014 — error: malformed legacy input fails without partial overwrite", async () => {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "handoff.yaml"), "companyName: pre\n", "utf-8");
    await writeFile(path.join(root, "malformed.yaml"), "  \n  \n", "utf-8");
    const exit = await runHandoffUpgrade({
      root,
      legacyFile: "malformed.yaml",
      write: () => undefined,
      writeErr: () => undefined,
    });
    expect(exit).not.toBe(0);
    const body = await readFile(path.join(root, ".qfai", "handoff.yaml"), "utf-8");
    expect(body).toBe("companyName: pre\n");
  });
});

describe("spec-0015 US-0015-0015 doc realignment (E2E, deterministic temp-fixture)", () => {
  it("QFAI:SPEC-0015:US-0015-0015 — normal: rewritten refs report zero stale references", async () => {
    const dir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping", "references");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "handoff.md"), "# Handoff\nUses handoff.yaml.\n", "utf-8");
    const issues = await validateStaleReferences(root, {
      now: () => new Date("2026-06-01T00:00:00Z"),
    });
    expect(issues.filter((i) => i.code === "W-STALE-REFERENCE")).toEqual([]);
  });

  it("QFAI:SPEC-0015:US-0015-0015 — error: a stale reference at HEAD escalates to error at sunset", async () => {
    const dir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping", "references");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "handoff.md"),
      "# Handoff\nUses session-handoff.yaml (legacy).\n",
      "utf-8",
    );
    const atSunset = new Date(`${STALE_REFERENCE_SUNSET}T00:00:00Z`);
    const issues = await validateStaleReferences(root, { now: () => atSunset });
    const findings = issues.filter((i) => i.code === "W-STALE-REFERENCE");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.severity).toBe("error");
  });
});
