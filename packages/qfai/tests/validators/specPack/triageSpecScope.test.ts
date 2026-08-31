import { describe, expect, it } from "vitest";

import { validateTriageSection } from "../../../src/core/validators/specPack.js";

const DELTA_PATH = "_policies/10_delta.md";

/**
 * A version inside every promotion window, so `QFAI-TRIAGE-008` reports at its
 * pre-promotion severity. Written as a literal rather than read from the
 * package so this file keeps testing `QFAI-TRIAGE-007` — whose severity is not
 * version-dependent — after the promotion release lands.
 */
const TOOL_VERSION = "0.0.0";

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
  validateTriageSection(text, DELTA_PATH, TOOL_VERSION).map((entry) => entry.code);

describe("QFAI-TRIAGE-007: what counts as the operation's object", () => {
  it("rejects DELETE whose Subject names an item", () => {
    const issues = validateTriageSection(
      delta("| REQ-0001 | delete BR-0006-0004 | spec-0006 | DELETE | - | user@host | obsolete |"),
      DELTA_PATH,
      TOOL_VERSION,
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

  // `specPackIds.ts` accepts `BR-1` and `TC-12345` as valid IDs, so a
  // 4-digit-only matcher would let these rows past the gate. The Operation is
  // parameterized with the Subject: pinning it to `SPLIT` while the subject
  // said "merge" / "supersede" left `MERGE` and `SUPERSEDE` unexercised.
  for (const { verb, operation } of [
    { verb: "split", operation: "SPLIT" },
    { verb: "merge", operation: "MERGE" },
    { verb: "supersede", operation: "SUPERSEDE" },
    { verb: "delete", operation: "DELETE" },
  ]) {
    for (const id of ["BR-1", "TC-12345", "AC-12-345"]) {
      it(`matches ${id} under ${operation} with the shared variable-digit semantics`, () => {
        const issues = validateTriageSection(
          delta(`| REQ-0001 | ${verb} ${id} | spec-0006 | ${operation} | - | u@h | - |`),
          DELTA_PATH,
          TOOL_VERSION,
        );
        expect(issues.map((entry) => entry.code)).toContain("QFAI-TRIAGE-007");
      });
    }
  }

  // One ID written twice unbracketed is one offending ID.
  it("reports a repeated item ID once", () => {
    const issues = validateTriageSection(
      delta("| REQ-0001 | split BR-0006-0004 and BR-0006-0004 | spec-0006 | SPLIT | - | u@h | - |"),
      DELTA_PATH,
      TOOL_VERSION,
    );
    const finding = issues.find((entry) => entry.code === "QFAI-TRIAGE-007");
    expect(finding?.refs).toEqual(["BR-0006-0004"]);
    expect(finding?.message.match(/BR-0006-0004/g)).toHaveLength(1);
  });

  it("still fires when the item is the object and the spec is only its location", () => {
    // Co-occurrence is not exemption: `delete BR-... from spec-...` names the
    // item as the object and the spec merely as where it lives.
    for (const subject of [
      "delete BR-0006-0004 from spec-0006",
      "split BR-0006-0004 in spec-0006",
      "BR-0006-0004 を spec-0006 から削除",
    ]) {
      expect(
        codes(delta(`| REQ-0001 | ${subject} | spec-0006 | DELETE | - | u@h | - |`)),
      ).toContain("QFAI-TRIAGE-007");
    }
  });

  it("still fires when a spec-level ID merely qualifies the item's scope", () => {
    // Word order cannot decide the object: these all name the spec or the
    // capability FIRST, yet the operation's object is the bare item.
    for (const subject of [
      "CAP-0003 では BR-0006-0004 を削除",
      "spec-0006 にある BR-0006-0004 を削除",
      "spec-0006 の BR-0006-0004 を分割",
      "in spec-0006, delete BR-0006-0004",
    ]) {
      expect(
        codes(delta(`| REQ-0001 | ${subject} | spec-0006 | DELETE | - | u@h | - |`)),
      ).toContain("QFAI-TRIAGE-007");
    }
  });

  it("treats every bracket flavour as a citation, and only inside it", () => {
    for (const subject of [
      "split spec-0006 (BR-0006-0004 起点)",
      "split spec-0006 （BR-0006-0004 起点）",
      "split spec-0006 [BR-0006-0004 起点]",
      "split spec-0006 【BR-0006-0004 起点】",
      "split spec-0006 (起点: BR-0006-0004 と AC-0006-0001)",
    ]) {
      expect(
        codes(delta(`| REQ-0001 | ${subject} | spec-0006 | SPLIT | - | u@h | - |`)),
      ).not.toContain("QFAI-TRIAGE-007");
    }
    // One bracketed citation does not shelter a second, bare item ID.
    expect(
      codes(
        delta(
          "| REQ-0001 | split spec-0006 (BR-0006-0004 起点) then drop AC-0006-0001 | spec-0006 | SPLIT | - | u@h | - |",
        ),
      ),
    ).toContain("QFAI-TRIAGE-007");
  });

  it("stays silent when the motivating item is bracketed", () => {
    // A motivating item is cited in brackets; anything outside them is the
    // object of the operation.
    expect(
      codes(
        delta(
          "| REQ-0001 | spec-0004 と spec-0009 を統合 (AC-0002-0007 の重複解消) | spec-0004+spec-0009 | MERGE | - | u@h | - |",
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

  it("fires when a spec-level row states the motivating item unbracketed", () => {
    // Deliberately not exempt: an unbracketed item is indistinguishable from an
    // item-scoped misuse, and the remediation is to bracket the citation.
    expect(
      codes(
        delta(
          "| REQ-0001 | AC-0002-0007 の重複解消のため spec-0004 と spec-0009 を統合 | spec-0004+spec-0009 | MERGE | - | u@h | - |",
        ),
      ),
    ).toContain("QFAI-TRIAGE-007");
  });
});

describe("QFAI-TRIAGE-007: which Operations are spec-scoped", () => {
  it("rejects SPLIT whose Subject names a business rule", () => {
    const issues = validateTriageSection(
      delta("| REQ-0001 | split BR-0006-0004 | spec-0006 | SPLIT | - | user@host | too coarse |"),
      DELTA_PATH,
      TOOL_VERSION,
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
      TOOL_VERSION,
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
    const findings = validateTriageSection(text, DELTA_PATH, TOOL_VERSION).filter(
      (entry) => entry.code === "QFAI-TRIAGE-007",
    );
    expect(findings).toHaveLength(2);
  });
});
