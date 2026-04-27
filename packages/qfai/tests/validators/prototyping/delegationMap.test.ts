/**
 * Tests for delegationMap role validator.
 *
 * v1.8.4: validateDelegationMapIssues is the standard `Issue[]` adapter.
 *
 * spec-0012 TC-0012-0286 / AC-0012-0171
 */
import { describe, expect, it } from "vitest";

import { validateDelegationMapIssues } from "../../../src/core/validators/prototyping/delegationMap.js";

describe("validateDelegationMapIssues (v1.8.4 standard adapter)", () => {
  const path = ".qfai/evidence/prototyping.json";

  it("returns empty when delegationMap is undefined", () => {
    expect(validateDelegationMapIssues(undefined, path)).toEqual([]);
  });

  it("returns empty when all categories are mapped to allowed roles", () => {
    const map = {
      UI実装: "frontend-engineer",
      スクリーンショット: "devops-ci-engineer",
      評価スコアリング: "product-surface-reviewer",
      ビルド: "backend-engineer",
    };
    expect(validateDelegationMapIssues(map, path)).toEqual([]);
  });

  it("emits QFAI-PROT-311 (error, canonical) for an invalid role", () => {
    const map = { UI実装: "qa-gatekeeper" }; // qa-gatekeeper is not allowed for UI実装
    const issues = validateDelegationMapIssues(map, path);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-311");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.category).toBe("canonical");
    expect(issues[0]?.file).toBe(path);
    expect(issues[0]?.message).toMatch(/UI実装/);
    expect(issues[0]?.message).toMatch(/qa-gatekeeper/);
    expect(issues[0]?.suggested_action).toMatch(/frontend-engineer/);
  });

  it("ignores unknown categories (out of scope of this validator)", () => {
    const map = { 未知カテゴリ: "frontend-engineer" };
    expect(validateDelegationMapIssues(map, path)).toEqual([]);
  });

  it("emits one issue per invalid mapping", () => {
    const map = {
      UI実装: "qa-gatekeeper",
      ビルド: "frontend-engineer",
    };
    const issues = validateDelegationMapIssues(map, path);
    expect(issues).toHaveLength(2);
    expect(new Set(issues.map((i) => i.code))).toEqual(new Set(["QFAI-PROT-311"]));
  });

  // ─── Non-string value rejection (Codex review on PR #201) ────────────────
  // Previously stateGate.extractDelegationMap silently filtered out non-string
  // entries before validation, so { UI実装: 123 } was indistinguishable from
  // { UI実装: <missing> } and never raised QFAI-PROT-311.

  it("emits QFAI-PROT-311 for a non-string role (number)", () => {
    const map = { UI実装: 123 };
    const issues = validateDelegationMapIssues(map, path);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-311");
    expect(issues[0]?.message).toMatch(/non-string/);
    expect(issues[0]?.message).toMatch(/got: number/);
  });

  it("emits QFAI-PROT-311 for a non-string role (array)", () => {
    const map = { UI実装: ["frontend-engineer"] };
    const issues = validateDelegationMapIssues(map, path);
    expect(issues).toHaveLength(1);
    // typeof [] is "object", but we report "array" for clarity.
    expect(issues[0]?.message).toMatch(/got: array/);
  });

  it("emits QFAI-PROT-311 for a non-string role (null)", () => {
    const map = { UI実装: null };
    const issues = validateDelegationMapIssues(map, path);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/got: null/);
  });
});
