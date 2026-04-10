/**
 * WS-E: uiFidelity validator tests
 *
 * Verifies that the prototyping evidence validator enforces the
 * full-harness-only uiFidelity contract.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { defaultConfig } from "../../src/core/config.js";
import { validatePrototypingEvidence } from "../../src/core/validators/prototypingEvidence.js";

function makeEvidence(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    surface: "web",
    specs: [
      {
        specId: "spec-0001",
        declared: { uiRoutes: 1, apiEndpoints: 0, dbObjects: 0 },
        checked: { uiOk: 1, apiNon404: 0, dbPresent: 0 },
        missing: { uiRoutes: [], apiEndpoints: [], dbObjects: [] },
        coverageRefs: [
          {
            route: "/dashboard",
            declaredRef:
              ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#dashboard",
            observedRefs: [
              ".qfai/evidence/render.json#/screens/0",
              ".qfai/evidence/browser-qa.json#/phases/0",
            ],
          },
        ],
      },
    ],
    mode: {
      effective: "full-harness",
      source: "explicit-request",
      rationale: "test",
    },
    meta: {
      generatedAt: new Date().toISOString(),
      toolVersion: "1.7.15",
      commands: ["qfai prototyping run --mode full-harness"],
    },
    ...overrides,
  };
}

async function setupRoot(): Promise<string> {
  const root = path.join(
    tmpdir(),
    `qfai-uf-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await mkdir(path.join(root, ".qfai", "evidence"), { recursive: true });
  await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    ["prototyping:", "  calibration:", "    packPath: .qfai/evidence/calibration.yaml", ""].join(
      "\n",
    ),
  );
  await writeFile(
    path.join(root, ".qfai", "evidence", "calibration.yaml"),
    [
      "version: 1.7.15",
      "thresholds:",
      "  accept: 0.8",
      "  refine: 0.5",
      "maxIterations: 5",
      "plateauDelta: 0.02",
      "plateauLookback: 3",
      "examples: []",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(root, ".qfai", "specs", "spec-0001", "01_Requirements.md"),
    "# Requirements\n\n- REQ-0001: Test requirement\n",
  );
  return root;
}

async function runValidation(
  root: string,
  evidence: Record<string, unknown>,
): Promise<Array<{ code: string; severity: string; message: string }>> {
  const evidencePath = path.join(root, ".qfai", "evidence", "prototyping.json");
  const markdownPath = path.join(root, ".qfai", "evidence", "prototyping.md");
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
  await writeFile(markdownPath, "# Prototyping Evidence\n\nAuto-generated for test.\n");
  const issues = await validatePrototypingEvidence(root, defaultConfig);
  return issues.map((issue) => ({
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
  }));
}

describe("uiFidelity validator", () => {
  let root: string;

  beforeEach(async () => {
    root = await setupRoot();
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("rejects skeleton uiFidelity in full-harness", async () => {
    const issues = await runValidation(
      root,
      makeEvidence({
        uiFidelity: { mode: "skeleton", screens: [] },
      }),
    );

    expect(issues.some((issue) => issue.code === "QFAI-PROT-271")).toBe(true);
  });

  it("rejects non-full-harness mode metadata", async () => {
    const issues = await runValidation(
      root,
      makeEvidence({
        mode: {
          effective: "standard",
          source: "explicit-request",
          rationale: "legacy",
        },
      }),
    );

    expect(
      issues.some(
        (issue) =>
          issue.code === "QFAI-PROT-101" ||
          issue.code === "QFAI-PROT-150" ||
          issue.code === "QFAI-PROT-151" ||
          issue.message.includes("full-harness"),
      ),
    ).toBe(true);
  });

  it("requires uiFidelity for full-harness ui-bearing evidence", async () => {
    const issues = await runValidation(root, makeEvidence());
    expect(issues.some((issue) => issue.code === "QFAI-PROT-270")).toBe(true);
  });

  it("accepts missing uiFidelity on non-ui surface only as part of contradiction handling", async () => {
    const issues = await runValidation(
      root,
      makeEvidence({
        surface: "cli",
      }),
    );
    expect(issues.some((issue) => issue.code === "QFAI-PROT-270")).toBe(false);
    expect(issues.some((issue) => issue.code === "QFAI-PROT-172")).toBe(true);
  });
});
