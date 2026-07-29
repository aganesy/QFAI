import { describe, expect, it } from "vitest";

import { validateTriageSection } from "../../../src/core/validators/specPack.js";

const DELTA_PATH = "_policies/10_delta.md";

const HEADER = [
  "| Source   | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale |",
  "| -------- | ------- | ------------- | --------- | ------ | ----------- | --------- |",
];

const delta = (...rows: string[]): string =>
  [
    "# 10 Delta",
    "",
    "## Change Summary",
    "",
    "- change",
    "",
    "## Triage",
    "",
    ...HEADER,
    ...rows,
    "",
  ].join("\n");

const codes = (text: string): string[] =>
  validateTriageSection(text, DELTA_PATH).map((entry) => entry.code);

describe("QFAI-TRIAGE-007 keeps SPLIT/MERGE/SUPERSEDE/DELETE spec-scoped", () => {
  it("rejects DELETE whose Subject names an item", () => {
    const issues = validateTriageSection(
      delta("| REQ-0001 | delete BR-0006-0004 | spec-0006 | DELETE | - | user@host | obsolete |"),
      DELTA_PATH,
    );
    const finding = issues.find((entry) => entry.code === "QFAI-TRIAGE-007");
    expect(finding?.severity).toBe("error");
    expect(finding?.refs).toEqual(["BR-0006-0004"]);
    // Recording an approver must not buy a way around the scope rule.
    expect(
      codes(delta("| REQ-0001 | delete AC-0002-0001 | spec-0002 | DELETE | - | u@h | - |")),
    ).toContain("QFAI-TRIAGE-007");
  });

  it("accepts a spec-scoped DELETE", () => {
    expect(
      codes(delta("| REQ-0001 | delete spec-0006 | spec-0006 | DELETE | - | u@h | dropped |")),
    ).not.toContain("QFAI-TRIAGE-007");
  });

  it("matches item IDs with the shared variable-digit semantics", () => {
    // `specPackIds.ts` accepts `BR-1` and `TC-12345` as valid IDs, so a
    // 4-digit-only matcher would let these rows past the gate.
    for (const subject of ["split BR-1", "merge TC-12345", "supersede AC-12-345"]) {
      const issues = validateTriageSection(
        delta(`| REQ-0001 | ${subject} | spec-0006 | SPLIT | - | u@h | - |`),
        DELTA_PATH,
      );
      expect(issues.map((entry) => entry.code)).toContain("QFAI-TRIAGE-007");
    }
  });

  it("stays silent when the Subject also names the spec-level target", () => {
    // `classifyTriage` copies the REQ subject verbatim onto the MERGE/SPLIT
    // rows it proposes, so an item ID alone must not condemn a spec-level row.
    expect(
      codes(
        delta(
          "| REQ-0001 | AC-0002-0007 の重複解消のため spec-0004 と spec-0009 を統合 | spec-0004+spec-0009 | MERGE | - | u@h | - |",
        ),
      ),
    ).not.toContain("QFAI-TRIAGE-007");
    expect(
      codes(
        delta(
          "| REQ-0001 | split spec-0006 (BR-0006-0004 起点) | spec-0006 | SPLIT | - | u@h | - |",
        ),
      ),
    ).not.toContain("QFAI-TRIAGE-007");
    expect(
      codes(
        delta("| REQ-0001 | CAP-0003 を分離 (BR-0006-0004) | spec-0006 | SPLIT | - | u@h | - |"),
      ),
    ).not.toContain("QFAI-TRIAGE-007");
  });
});

describe("QFAI-TRIAGE-007 keeps SPLIT/MERGE/SUPERSEDE spec-scoped", () => {
  it("rejects SPLIT whose Subject names a business rule", () => {
    const issues = validateTriageSection(
      delta("| REQ-0001 | split BR-0006-0004 | spec-0006 | SPLIT | - | user@host | too coarse |"),
      DELTA_PATH,
    );
    const finding = issues.find((entry) => entry.code === "QFAI-TRIAGE-007");
    expect(finding?.severity).toBe("error");
    expect(finding?.refs).toEqual(["BR-0006-0004"]);
    expect(finding?.message).toContain("SPLIT");
  });

  it("rejects MERGE and SUPERSEDE on item IDs too", () => {
    expect(
      codes(delta("| REQ-0001 | merge AC-0002-0001 | spec-0002 | MERGE | - | user@host | - |")),
    ).toContain("QFAI-TRIAGE-007");
    expect(
      codes(delta("| REQ-0001 | supersede TC-0003 | spec-0003 | SUPERSEDE | - | user@host | - |")),
    ).toContain("QFAI-TRIAGE-007");
  });

  it("accepts a spec-scoped SPLIT", () => {
    expect(
      codes(delta("| REQ-0001 | split spec-0006 | spec-0006 | SPLIT | - | user@host | 2 caps |")),
    ).not.toContain("QFAI-TRIAGE-007");
  });

  it("does not fire on the UPDATE rows that encode an item decomposition", () => {
    const text = delta(
      "| REQ-0001 | narrow BR-0006-0004 | spec-0006 | UPDATE | MODIFY | - | conserved: 1 rule -> 4 |",
      "| REQ-0001 | add BR-0006-0021 | spec-0006 | UPDATE | APPEND | - | sibling 2 of 4 |",
    );
    expect(codes(text)).not.toContain("QFAI-TRIAGE-007");
  });

  it("reports every item ID named in the Subject", () => {
    const issues = validateTriageSection(
      delta("| REQ-0001 | merge AC-0002-0001 and AC-0002-0002 | spec-0002 | MERGE | - | u@h | - |"),
      DELTA_PATH,
    );
    expect(issues.find((entry) => entry.code === "QFAI-TRIAGE-007")?.refs).toEqual([
      "AC-0002-0001",
      "AC-0002-0002",
    ]);
  });

  it("does not leak regex state between rows", () => {
    const text = delta(
      "| REQ-0001 | split BR-0006-0004 | spec-0006 | SPLIT | - | u@h | - |",
      "| REQ-0002 | split BR-0007-0004 | spec-0007 | SPLIT | - | u@h | - |",
    );
    const findings = validateTriageSection(text, DELTA_PATH).filter(
      (entry) => entry.code === "QFAI-TRIAGE-007",
    );
    expect(findings).toHaveLength(2);
  });
});
