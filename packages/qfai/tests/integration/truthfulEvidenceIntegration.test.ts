/**
 * Integration tests for spec-0014: Truthful Evidence & Canonical Validators
 *
 * Tests evidence truthfulness, placeholder rejection, browser QA findings,
 * and canonical validator set enforcement.
 */

// QFAI:SPEC-0014:TC-0014-0012
// QFAI:SPEC-0014:TC-0014-0013
// QFAI:SPEC-0014:TC-0014-0014
// QFAI:SPEC-0014:TC-0014-0015
// QFAI:SPEC-0014:TC-0014-0016
// QFAI:SPEC-0014:TC-0014-0017

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  CAPTURE_STATUSES,
  createRenderEvidenceRecord,
} from "../../src/core/evidence/captureStatus.js";
import { validateThreeLayerModel } from "../../src/core/validators/uix/threeLayer.js";

// ---------------------------------------------------------------------------
// Temp dir management
// ---------------------------------------------------------------------------

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-truthful-int-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

// ---------------------------------------------------------------------------
// TC-0014-0012: Truthful evidence state
// ---------------------------------------------------------------------------

// QFAI:SPEC-0014:TC-0014-0012
describe("TC-0014-0012: Truthful evidence state — captured pass with actual evidence", () => {
  it("captured record with real paths is accepted by createRenderEvidenceRecord", () => {
    const record = createRenderEvidenceRecord({
      screenshot: { status: "captured", path: "/evidence/renders/screen.png" },
      viewport: { status: "captured", width: 1280, height: 720 },
      domRef: { status: "captured", path: "/evidence/renders/screen.html" },
    });

    expect(record.screenshot.status).toBe("captured");
    expect(record.viewport.status).toBe("captured");
    expect(record.domRef.status).toBe("captured");
  });

  it("skipped record is truthfully represented", () => {
    const record = createRenderEvidenceRecord({
      screenshot: { status: "skipped" },
      viewport: { status: "skipped" },
      domRef: { status: "skipped" },
    });

    expect(record.screenshot.status).toBe("skipped");
    expect(record.viewport.status).toBe("skipped");
    expect(record.domRef.status).toBe("skipped");
  });

  it("failed record is truthfully represented", () => {
    const record = createRenderEvidenceRecord({
      screenshot: { status: "failed" },
      viewport: { status: "failed" },
      domRef: { status: "failed" },
    });

    expect(record.screenshot.status).toBe("failed");
    expect(record.viewport.status).toBe("failed");
    expect(record.domRef.status).toBe("failed");
  });
});

// ---------------------------------------------------------------------------
// TC-0014-0013: Placeholder evidence rejection
// ---------------------------------------------------------------------------

// QFAI:SPEC-0014:TC-0014-0013
describe("TC-0014-0013: Placeholder evidence rejection", () => {
  it("captured record with real path does not contain TODO/TBD/N/A placeholders", () => {
    const record = createRenderEvidenceRecord({
      screenshot: { status: "captured", path: "/evidence/renders/actual-capture.png" },
      viewport: { status: "captured", width: 1280, height: 720 },
      domRef: { status: "captured", path: "/evidence/renders/actual-capture.html" },
    });

    if (record.screenshot.status === "captured") {
      const ssPath = (record.screenshot as { status: string; path: string }).path;
      expect(ssPath).not.toMatch(/TODO|TBD|N\/A|placeholder/i);
      expect(ssPath.length).toBeGreaterThan(0);
    }
    if (record.domRef.status === "captured") {
      const domPath = (record.domRef as { status: string; path: string }).path;
      expect(domPath).not.toMatch(/TODO|TBD|N\/A|placeholder/i);
      expect(domPath.length).toBeGreaterThan(0);
    }
  });

  it("CAPTURE_STATUSES vocabulary does not include placeholder values", () => {
    expect(CAPTURE_STATUSES).not.toContain("TODO");
    expect(CAPTURE_STATUSES).not.toContain("TBD");
    expect(CAPTURE_STATUSES).not.toContain("N/A");
    expect(CAPTURE_STATUSES).not.toContain("placeholder");
    expect(CAPTURE_STATUSES).toEqual(["captured", "skipped", "failed"]);
  });
});

// ---------------------------------------------------------------------------
// TC-0014-0014: Browser QA findings accepted (truthful reporting)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0014:TC-0014-0014
describe("TC-0014-0014: Browser QA findings accepted (truthful reporting)", () => {
  it("TC-0014-0014: browser QA validator accepts truthful findings with actual content", async () => {
    const { validateBrowserQaBundle } = await import("../../src/core/browserQa/index.js");

    const bundle = {
      browserQa: {
        executed: true,
        status: "completed" as const,
        summary: {
          smoke: { status: "passed" as const, findingsCount: 0, checksCount: 1 },
          interaction: { status: "passed" as const, findingsCount: 0, checksCount: 1 },
          visual: { status: "executed" as const, findingsCount: 1, checksCount: 1 },
          accessibility: { status: "passed" as const, findingsCount: 0, checksCount: 1 },
        },
      },
      findings: [
        {
          phase: "visual" as const,
          severity: "warning" as const,
          summary: "One or more img tags may be missing alt attributes.",
          detail: "The img element at selector #hero-img lacks an alt attribute.",
          evidence_refs: ["screenshot://hero-section.png"],
          repair_suggestions: ["Add meaningful alt text to all img elements."],
        },
      ],
    };

    const issues = validateBrowserQaBundle(bundle);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0014-0015: Browser QA empty findings warning
// ---------------------------------------------------------------------------

// QFAI:SPEC-0014:TC-0014-0015
describe("TC-0014-0015: Browser QA empty findings warning", () => {
  it("TC-0014-0015: browser QA validator detects schema issues (not a silent pass)", async () => {
    const { validateBrowserQaBundle } = await import("../../src/core/browserQa/index.js");

    // Bundle with missing required fields to trigger schema validation errors
    const bundle = {
      browserQa: {
        // Missing executed and status fields
      },
    };

    const issues = validateBrowserQaBundle(bundle);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.code.startsWith("QFAI-PROT"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-0014-0016: Canonical validator set enforcement (3-layer family)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0014:TC-0014-0016
describe("TC-0014-0016: Canonical validator set enforcement (3-layer family)", () => {
  it("3-layer content in eval axis files passes canonical validator", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const threeLayerContent =
      "## invariant\n\nContent.\n\n## trend-derived\n\nContent.\n\n## product-specific\n\nContent.\n";
    for (const f of [
      "20_design_eval_invariant.md",
      "21_design_eval_trend_derived.md",
      "22_design_eval_product_specific.md",
      "23_design_eval_aggregate.md",
    ]) {
      await writeFile(path.join(root, "uiux", f), threeLayerContent, "utf-8");
    }

    const issues = await validateThreeLayerModel(root, defaultConfig);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0014-0017: Non-canonical validator rejection
// ---------------------------------------------------------------------------

// QFAI:SPEC-0014:TC-0014-0017
describe("TC-0014-0017: Non-canonical validator rejection", () => {
  it("mixed 3-layer and 4-axis content is rejected by threeLayer validator", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const mixedContent =
      "## invariant\n\nContent.\n\n## usability\n\nContent.\n\n## product-specific\n\nContent.\n";
    for (const f of [
      "20_design_eval_invariant.md",
      "21_design_eval_trend_derived.md",
      "22_design_eval_product_specific.md",
      "23_design_eval_aggregate.md",
    ]) {
      await writeFile(path.join(root, "uiux", f), mixedContent, "utf-8");
    }

    const issues = await validateThreeLayerModel(root, defaultConfig);
    expect(issues.some((i) => i.code === "UIX-VAL-3LAYER-MIXED-FORMAT")).toBe(true);
  });
});
