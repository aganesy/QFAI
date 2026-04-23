/**
 * Unit tests for bundleWriter.ts type definitions and evidence writes.
 * TC-0012-0236, TC-0012-0237, TC-0012-0247 (v1.7.15 rev9 WS-2)
 *
 * Backfill TDD: impl landed in v1.7.15 rev9 before unit tests were bound to TC-IDs.
 * Exception pattern sanctioned by DR-0012-0051.
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { writeEvidenceBundles } from "../../src/core/evidence/bundleWriter.js";

const BUNDLE_WRITER_SRC = new URL("../../src/core/evidence/bundleWriter.ts", import.meta.url);
const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function newTempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-bundle-writer-"));
  tempDirs.push(dir);
  return dir;
}

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

  it("breakthrough evidence is required in the bundle type definition", async () => {
    const src = await readFile(BUNDLE_WRITER_SRC, "utf-8");
    expect(src).toMatch(/breakthrough:\s*\{/);
    expect(src).not.toMatch(/breakthrough\?:/);
  });

  it("writes breakthrough.json whenever evidence bundles are emitted", async () => {
    const root = await newTempRoot();
    const breakthrough = {
      latestIteration: 2,
      triggerResult: false,
      triggerReasons: ["score-still-improving"],
      scoreDeltaWindow: 2,
      avgScoreDeltas: [0.03, 0.01],
      minScoreDeltas: [0.02, 0.01],
      diffLines: 5,
      branchCount: 2,
    };

    await writeEvidenceBundles({
      root,
      prototyping: {
        surface: "web",
        specs: [],
        mode: {
          effective: "standard",
          source: "system-default",
          rationale: "defaulted for test",
        },
        meta: {
          generatedAt: "2026-04-23T00:00:00.000Z",
          toolVersion: "1.8.2",
          commands: ["qfai prototyping"],
          generatedBy: "unit-test",
          providerIds: [],
        },
        breakthrough,
      },
    });

    const raw = await readFile(path.join(root, ".qfai", "evidence", "breakthrough.json"), "utf-8");
    expect(JSON.parse(raw)).toEqual(breakthrough);
  });
});
