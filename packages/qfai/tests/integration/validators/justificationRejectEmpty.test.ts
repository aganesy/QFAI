/**
 * Integration: `qfai validate` ingestion rejects catalog-code findings
 * with empty / whitespace-only `justification:` (TC-0015-0027,
 * AC-0015-0018).
 *
 * The advisory-failing posture mirrors the R-WORKLOG-DRIFT family
 * pattern enforced by `validateReviewerJustification`. The catalog
 * SSOT (`justificationCatalog.ts`) supplies the 8 codes; this test
 * fixtures a reviewer-report JSON under `.qfai/review/` with each
 * catalog code in two variants (empty + filled justification) and
 * asserts the validator flags only the empty variants.
 */
// QFAI:SPEC-0015:TC-0015-0027

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validateReviewerJustification } from "../../../src/core/validators/reviewerJustification.js";
import {
  CATALOG_ADVISORY_FAILING_CODES,
  JUSTIFICATION_CATALOG,
} from "../../../src/core/validators/justificationCatalog.js";
import { loadConfig } from "../../../src/core/config.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-justify-catalog-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeReport(name: string, body: unknown): Promise<void> {
  const dir = path.join(root, ".qfai", "review");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), JSON.stringify(body, null, 2), "utf-8");
}

describe("TC-0015-0027: validateReviewerJustification rejects empty justification on catalog codes", () => {
  it("flags a finding with empty justification for every catalog code", async () => {
    const findings = JUSTIFICATION_CATALOG.map((entry) => ({
      code: entry.code,
      justification: "",
    }));
    await writeReport("report.json", { findings });
    const { config } = await loadConfig(root);
    const issues = await validateReviewerJustification(root, config);
    const flaggedCodes = new Set(issues.map((i) => i.code));
    for (const entry of JUSTIFICATION_CATALOG) {
      expect(flaggedCodes.has(entry.code)).toBe(true);
    }
    // All flagged issues carry severity error (advisory-failing).
    for (const i of issues) expect(i.severity).toBe("error");
  });

  it("flags whitespace-only justification (trim-based check)", async () => {
    await writeReport("report.json", {
      findings: [{ code: "R-AUTOPILOT-POLICY-MISSING", justification: "   \t\n  " }],
    });
    const { config } = await loadConfig(root);
    const issues = await validateReviewerJustification(root, config);
    expect(issues.some((i) => i.code === "R-AUTOPILOT-POLICY-MISSING")).toBe(true);
  });

  it("accepts a finding with non-empty justification on every catalog code", async () => {
    const findings = JUSTIFICATION_CATALOG.map((entry) => ({
      code: entry.code,
      justification: `non-empty justification for ${entry.code}`,
    }));
    await writeReport("report.json", { findings });
    const { config } = await loadConfig(root);
    const issues = await validateReviewerJustification(root, config);
    for (const entry of JUSTIFICATION_CATALOG) {
      expect(issues.find((i) => i.code === entry.code)).toBeUndefined();
    }
  });

  it("ignores codes outside the advisory-failing set", async () => {
    await writeReport("report.json", {
      findings: [{ code: "QFAI-CRIT-008", justification: "" }],
    });
    const { config } = await loadConfig(root);
    const issues = await validateReviewerJustification(root, config);
    expect(issues.find((i) => i.code === "QFAI-CRIT-008")).toBeUndefined();
  });

  it("exposes exactly 8 catalog codes in the SSOT set", () => {
    expect(CATALOG_ADVISORY_FAILING_CODES.size).toBe(8);
  });
});
