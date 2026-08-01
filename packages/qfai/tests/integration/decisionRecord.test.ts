/**
 * Integration: writeDecisionRecord persists `.qfai/evidence/decisions/<ts>.json`
 * (TC-0015-0022, AC-0015-0016).
 *
 * The writer triggers only when `envelopeContractClause` names one of
 * the four envelope-deviation contexts (DR-0270). The record shape is
 * `{question, answer, scope, operatorIdentity, timestamp, envelopeContractClause}`.
 * `.qfai/evidence/decisions/` — not `.qfai/decisions/`, which holds Change
 * Request records — is tracked in version control: the managed .gitignore block
 * negates it after `.qfai/evidence/*`.
 */
// QFAI:SPEC-0015:TC-0015-0022

import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeDecisionRecord } from "../../src/core/decisionRecord.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-decision-record-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0015-0022: writeDecisionRecord writes .qfai/evidence/decisions/<ts>.json for envelope contexts", () => {
  it("writes a record when the envelope context is 'architectural-decision'", async () => {
    const result = await writeDecisionRecord({
      root,
      question: "Adopt option X over option Y?",
      answer: "yes — accept X",
      scope: "architectural-decision",
      operatorIdentity: "tester@example.com",
      envelopeContractClause: "architectural-decision: option-X envelope",
    });
    expect(result.written).toBe(true);
    expect(result.path).toBeDefined();
    if (result.path) {
      const raw = await readFile(result.path, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.question).toBe("Adopt option X over option Y?");
      expect(parsed.answer).toBe("yes — accept X");
      expect(parsed.scope).toBe("architectural-decision");
      expect(parsed.operatorIdentity).toBe("tester@example.com");
      expect(parsed.envelopeContractClause).toBe("architectural-decision: option-X envelope");
      expect(typeof parsed.timestamp).toBe("string");
      // ISO-8601 (file-safe timestamp uses `-` for `:`)
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}/);
    }
    const decisionsDir = path.join(root, ".qfai", "evidence", "decisions");
    const entries = await readdir(decisionsDir);
    expect(entries.length).toBe(1);
    const entry = entries[0] ?? "";
    expect(entry.endsWith(".json")).toBe(true);
    expect(entry).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}/);
  });

  it("does NOT write a record when the envelope context is routine (no fail-open)", async () => {
    const result = await writeDecisionRecord({
      root,
      question: "format with prettier?",
      answer: "yes",
      scope: "routine",
      operatorIdentity: "tester@example.com",
      envelopeContractClause: "routine-formatting-decision",
    });
    expect(result.written).toBe(false);
    expect(result.path).toBeUndefined();
    const decisionsDir = path.join(root, ".qfai", "evidence", "decisions");
    let exists = true;
    try {
      await readdir(decisionsDir);
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });

  it("recognizes all four envelope contexts (skill-envelope / rejected-option / scope-expansion / architectural-decision)", async () => {
    const contexts = [
      "skill-envelope",
      "rejected-option",
      "scope-expansion",
      "architectural-decision",
    ];
    for (const ctx of contexts) {
      const sub = await mkdtemp(path.join(os.tmpdir(), `qfai-dec-${ctx}-`));
      try {
        const r = await writeDecisionRecord({
          root: sub,
          question: `Q-${ctx}`,
          answer: "yes",
          scope: ctx,
          operatorIdentity: "tester",
          envelopeContractClause: `${ctx}: clause body`,
        });
        expect(r.written).toBe(true);
      } finally {
        await rm(sub, { recursive: true, force: true });
      }
    }
  });
});
