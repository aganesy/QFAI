import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as AtddTraceabilityModule from "../../src/core/atddTraceability.js";
import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";

type AtddTraceability = typeof AtddTraceabilityModule;

const { scans } = vi.hoisted(() => ({ scans: { count: 0 } }));

vi.mock("../../src/core/atddTraceability.js", async (importOriginal) => {
  const actual = await importOriginal<AtddTraceability>();
  return {
    ...actual,
    collectTestCaseAnnotationHomes: (
      ...args: Parameters<AtddTraceability["collectTestCaseAnnotationHomes"]>
    ) => {
      scans.count += 1;
      return actual.collectTestCaseAnnotationHomes(...args);
    },
  };
});

const {
  COMPLETED_ROW_CARRIER_ONLY_CODE,
  TDD_LIST_SEED_SHAPE_CODES,
  validateTddList,
  validateTddListSeedShape,
} = await import("../../src/core/validators/tddList.js");

const CARRIER = "tests/integration/qfai-traceability.md";

/** Reaches `tests/unit/`, which the acceptance scan leaves out. */
const config: QfaiConfig = {
  ...defaultConfig,
  validation: {
    ...defaultConfig.validation,
    traceability: {
      ...defaultConfig.validation.traceability,
      testFileGlobs: ["tests/**/*.test.ts"],
    },
  },
};

/** A seeded spec whose one `done` row names a case only a carrier annotates. */
async function writeProject(root: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(path.join(specDir, "tdd"), { recursive: true });
  await mkdir(path.join(root, "tests", "integration"), { recursive: true });
  await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
  await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
  await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
  await writeFile(path.join(specDir, "06_Test-Cases.md"), "# TC\n", "utf-8");
  await writeFile(
    path.join(specDir, "tdd", "test-list.md"),
    [
      "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence |",
      "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- |",
      "| TDD-0001 | TC-0001-0001 | Unit | tests/unit/a.test.ts | case a | done | - | - |",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(root, CARRIER),
    ["# Traceability", "", "- QFAI:SPEC-0001:TC-0001-0001", ""].join("\n"),
    "utf-8",
  );
}

describe("the seed-shape gate does not scan the test tree", () => {
  let root = "";

  beforeEach(async () => {
    scans.count = 0;
    root = await mkdtemp(path.join(os.tmpdir(), "qfai-seed-scan-"));
    await writeProject(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("keeps no code the done-row annotation check reports", () => {
    expect(TDD_LIST_SEED_SHAPE_CODES.has(COMPLETED_ROW_CARRIER_ONLY_CODE)).toBe(false);
  });

  it("scans once for the full validator, which reports the carrier-only row", async () => {
    const issues = await validateTddList(root, config);
    expect(scans.count).toBe(1);
    expect(issues.map((entry) => entry.code)).toContain(COMPLETED_ROW_CARRIER_ONLY_CODE);
  });

  it("skips the scan on the seed-shape path", async () => {
    const issues = await validateTddListSeedShape(root, config, {
      specScope: new Set(["0001"]),
    });
    expect(scans.count).toBe(0);
    expect(issues.map((entry) => entry.code)).not.toContain(COMPLETED_ROW_CARRIER_ONLY_CODE);
  });
});
