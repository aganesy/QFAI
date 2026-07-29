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
