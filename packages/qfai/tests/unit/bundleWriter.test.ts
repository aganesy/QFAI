/**
 * Unit tests for bundleWriter.ts type definitions — static type enforcement.
 * TC-0012-0236, TC-0012-0237, TC-0012-0247 (v1.7.15 rev9 WS-2)
 *
 * Backfill TDD: impl landed in v1.7.15 rev9 before unit tests were bound to TC-IDs.
 * Exception pattern sanctioned by DR-0012-0051.
 */
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const BUNDLE_WRITER_SRC = new URL("../../src/core/evidence/bundleWriter.ts", import.meta.url);

describe("bundleWriter.ts leaf-field type enforcement (v1.7.15 rev9)", () => {
  // QFAI:SPEC-0012:TC-0012-0236
  it("TC-0012-0236: declaredRef is required non-optional in the type definition", async () => {
    const src = await readFile(BUNDLE_WRITER_SRC, "utf-8");
    expect(src).toMatch(/declaredRef:\s*string/);
    expect(src).not.toMatch(/declaredRef\?:/);
  });

  // QFAI:SPEC-0012:TC-0012-0237
  it("TC-0012-0237: renderEvidenceRefs and browserQaEvidenceRefs are required non-nullable", async () => {
    const src = await readFile(BUNDLE_WRITER_SRC, "utf-8");
    expect(src).toMatch(/renderEvidenceRefs:\s*string\[\]/);
    expect(src).toMatch(/browserQaEvidenceRefs:\s*string\[\]/);
    expect(src).not.toMatch(/renderEvidenceRefs\?:/);
    expect(src).not.toMatch(/browserQaEvidenceRefs\?:/);
  });

  // QFAI:SPEC-0012:TC-0012-0247
  it("TC-0012-0247: all leaf arrays required non-nullable — no optional evidenceRefs", async () => {
    const src = await readFile(BUNDLE_WRITER_SRC, "utf-8");
    const requiredPattern = /evidenceRefs:\s*string\[\]/g;
    const optionalPattern = /evidenceRefs\?:/g;
    const requiredMatches = src.match(requiredPattern) ?? [];
    const optionalMatches = src.match(optionalPattern) ?? [];
    expect(requiredMatches.length).toBeGreaterThan(0);
    expect(optionalMatches).toHaveLength(0);
  });
});
