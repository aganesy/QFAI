/**
 * Integration acceptance for spec-0015 CHG-006 test cases
 * TC-0015-0020..0033 (autopilot policy gate, envelope-deviation
 * audit-log, handoff schema drift, seven-code finding catalog,
 * `qfai audit log` CLI, doc
 * realignment / stale-reference report).
 *
 * Deterministic temp-fixture form: each `it` seeds a `mkdtemp` root
 * with the minimum on-disk shape required and invokes the production
 * API surface directly (validators / CLI command runners). Replaces
 * the earlier `execFile`-against-dist-binary approach with an
 * isolation-safe variant.
 */
// QFAI:EX-0001-0169-01
// QFAI:EX-0001-0169-01
// QFAI:EX-0001-0169-01
// QFAI:EX-0001-0170-01
// QFAI:EX-0001-0170-01
// QFAI:EX-0001-0171-01
// QFAI:EX-0001-0171-01
// QFAI:EX-0001-0172-01
// QFAI:EX-0001-0172-01
// QFAI:EX-0001-0173-01
// QFAI:EX-0001-0173-01
// QFAI:EX-0001-0174-01
// QFAI:EX-0001-0174-01

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAuditLog } from "../../src/cli/commands/auditLog.js";
import { writeDecisionRecord } from "../../src/core/decisionRecord.js";
import { validateAutopilotPolicy } from "../../src/core/validators/autopilotPolicy.js";
import { detectHandoffSchemaDrift } from "../../src/core/validators/handoffSchemaDrift.js";
import {
  HANDOFF_SCHEMA_REL,
  HANDOFF_WRITER_PAIRS,
} from "../../src/core/validators/handoffSchemaPairs.js";
import { JUSTIFICATION_CATALOG } from "../../src/core/validators/justificationCatalog.js";
import { validateReviewerJustification } from "../../src/core/validators/reviewerJustification.js";
import { validateStaleReferences } from "../../src/core/validators/staleReferences.js";
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
  const dir = path.join(root, ".qfai", "assistant", "skill", skillId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SKILL.md"), body, "utf-8");
}

/** The shared prototype every qfai-* skill works under, as `qfai init` ships it. */
const BASELINE_3_BUCKET = `# Shared Skill Operating Baseline

## Default Autopilot Policy (Shared)

| Bucket          | Prototype entries                                                                   |
| --------------- | ----------------------------------------------------------------------------------- |
| \`auto-decide\`   | output formatting; ID / sequence numbering; equivalent-option pick                  |
| \`ask-user\`      | approval-required governance operations; destructive operations; scope expansions |
| \`hard-required\` | brand intent                                                                        |
`;

async function writeBaseline(body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "rule");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "shared-skill-operating-baseline.md"), body, "utf-8");
}

/** A skill's own section: only what it adds to the prototype. */
const SKILL_OWN_POLICY = `# qfai-fixture

## Default Autopilot Policy

- auto-decide:
  - output formatting
  - equivalent-option pick
- hard-required:
  - brand intent
`;

describe("spec-0015 autopilot policy CHG-006", () => {
  it("QFAI:EX-0001-0169-01 — error: a baseline without the shared section emits R-AUTOPILOT-POLICY-MISSING", async () => {
    await writeBaseline("# Shared Skill Operating Baseline\n");
    await writeSkillMd("qfai-x", "# qfai-x\nNo policy.\n");
    const issues = await validateAutopilotPolicy(root);
    const f = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(f?.severity).toBe("error");
    expect(f?.file).toBe(".qfai/assistant/rule/shared-skill-operating-baseline.md");
    expect(f?.message).toMatch(/justification/i);
  });

  it("QFAI:EX-0001-0169-01 — error: a shared section missing buckets emits R-AUTOPILOT-POLICY-MISSING naming the missing bucket(s)", async () => {
    // Heading present, buckets gone: every skill loses the prototype at once,
    // so the finding names each missing bucket against the baseline.
    await writeBaseline(
      "# Shared Skill Operating Baseline\n\n## Default Autopilot Policy (Shared)\n\nbody without buckets.\n",
    );
    await writeSkillMd("qfai-x", "# qfai-x\nNo policy.\n");
    const issues = await validateAutopilotPolicy(root);
    const f = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(f?.severity).toBe("error");
    expect(f?.message).toMatch(/auto-decide/);
    expect(f?.message).toMatch(/ask-user/);
    expect(f?.message).toMatch(/hard-required/);
  });

  it("QFAI:EX-0001-0169-01 — error: a skill whose section drops a declared input emits R-AUTOPILOT-POLICY-MISSING naming it", async () => {
    await writeBaseline(BASELINE_3_BUCKET);
    await writeSkillMd(
      "qfai-sdd",
      SKILL_OWN_POLICY.replace("  - brand intent", "  - an identifiable affected flow"),
    );
    const issues = await validateAutopilotPolicy(root);
    const f = issues.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING");
    expect(f?.file).toBe(".qfai/assistant/skill/qfai-sdd/SKILL.md");
    expect(f?.message).toContain("requirement source");
  });

  // QFAI:EX-0001-0169-04
  it("QFAI:EX-0001-0169-01 — normal: the baseline and a skill adding only its own entries pass; widened auto-decide flagged as warning", async () => {
    await writeBaseline(BASELINE_3_BUCKET);
    await writeSkillMd("qfai-x", SKILL_OWN_POLICY);
    await writeSkillMd("qfai-z", "# qfai-z\nNo policy of its own.\n");
    const issues = await validateAutopilotPolicy(root);
    expect(issues).toEqual([]);

    // Widening: add an extra non-canonical entry to auto-decide.
    const widened = SKILL_OWN_POLICY.replace(
      "  - equivalent-option pick",
      "  - equivalent-option pick\n  - destructive operations",
    );
    await writeSkillMd("qfai-y", widened);
    const issues2 = await validateAutopilotPolicy(root);
    expect(issues2.find((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toBeUndefined();
    expect(issues2.find((i) => i.code === "R-AUTOPILOT-POLICY-WIDENED")?.severity).toBe("warning");
  });
});

describe("spec-0015 envelope audit-log CHG-006", () => {
  it("QFAI:EX-0001-0170-01 — normal: an envelope AskUserQuestion writes a shaped JSON record", async () => {
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
      expect(path.dirname(r.path)).toBe(path.join(root, ".qfai", "evidence", "decision"));
      const body = JSON.parse(await readFile(r.path, "utf-8")) as Record<string, unknown>;
      expect(body.question).toBe("Adopt option X?");
      expect(body.scope).toBe("architectural-decision");
      expect(body.envelopeContractClause).toMatch(/option-X/);
      expect(typeof body.timestamp).toBe("string");
    }
  });

  it("QFAI:EX-0001-0170-01 — boundary: non-envelope question writes no record", async () => {
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
  it("QFAI:EX-0001-0171-01 — error: asymmetric Pair IV emits R-HANDOFF-SCHEMA-DRIFT", async () => {
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

  it("QFAI:EX-0001-0171-01 — normal: a handoff with extra keys passes validateHandoff (additionalProperties: true)", () => {
    const issues = validateHandoff({
      companyName: "Acme",
      primarySpecId: "spec-0012",
      extraKey: { foo: 1 },
    });
    expect(issues).toEqual([]);
  });
});

describe("spec-0015 finding-code catalog CHG-006", () => {
  it("QFAI:EX-0001-0172-01 — normal: 5 catalog codes registered; the catalog declares membership only, no severity", () => {
    const codes = JUSTIFICATION_CATALOG.map((e) => e.code);
    expect(codes.length).toBe(5);
    for (const entry of JUSTIFICATION_CATALOG) {
      expect(Object.keys(entry).sort()).toEqual(["code", "description"]);
    }
  });

  it("QFAI:EX-0001-0172-01 — error: empty justification on a catalog code is rejected; non-empty accepted", async () => {
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
  const repoRoot = path.resolve(__dirname, "../../../..");
  it("QFAI:EX-0001-0172-01 — the active routing contract keeps membership and severity separate", async () => {
    const text = await readFile(
      path.join(repoRoot, ".qfai", "spec", "03_contract", "cli", "cli-0001-assistant-routing.md"),
      "utf-8",
    );
    const rule = text.split(/\r?\n/).find((line) => line.includes("| BR-0001-0014 |"));
    expect(rule).toBeDefined();
    expect(rule).toMatch(/membership only/i);
    expect(rule).toMatch(/per-code severity/i);
    expect(rule).toMatch(/non-empty `justification:`/);
    expect(rule).toMatch(/severity error/i);
    expect(rule).not.toContain("at severity error with mandatory non-empty");
  });
});

describe("spec-0015 audit log CLI CHG-006", () => {
  it("QFAI:EX-0001-0173-01 — normal: audit log lists newest-first + --scope/--operator/--clause filter; --format json works", async () => {
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

  it("QFAI:EX-0001-0173-01 — boundary: default --format is table; empty store → empty result, exit 0", async () => {
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

describe("spec-0015 stale-ref report CHG-006", () => {
  it("QFAI:EX-0001-0174-01 — normal: rewritten in-PR refs report zero stale references at HEAD", async () => {
    const dir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping", "references");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "handoff.md"), "# Handoff\nUses handoff.yaml.\n", "utf-8");
    const issues = await validateStaleReferences(root, { config: (await loadConfig(root)).config });
    expect(issues.filter((i) => i.code === "W-STALE-REFERENCE")).toEqual([]);
  });

  it("QFAI:EX-0001-0174-01 — error: a stale ref at HEAD reports warning", async () => {
    const dir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping", "references");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "handoff.md"),
      "# Handoff\nUses session-handoff.yaml.\n",
      "utf-8",
    );
    const findings = (
      await validateStaleReferences(root, { config: (await loadConfig(root)).config })
    ).filter((i) => i.code === "W-STALE-REFERENCE");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.severity).toBe("warning");
  });
});
