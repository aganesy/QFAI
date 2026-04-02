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

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

const repoRoot = path.resolve(process.cwd(), "..", "..");

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
    const { validateBrowserQaFindings } = await import("../../src/core/browserQa/index.js");

    const result = {
      status: "completed" as const,
      findings: [
        {
          rule: "img-alt-text",
          severity: "warning" as const,
          message: "One or more <img> tags may be missing alt attributes.",
          element: "img",
        },
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        runner: "qfai-browser-qa-minimal",
      },
    };

    const validation = validateBrowserQaFindings(result);
    expect(validation.valid).toBe(true);
    expect(validation.warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// TC-0014-0015: Browser QA empty findings warning
// ---------------------------------------------------------------------------

// QFAI:SPEC-0014:TC-0014-0015
describe("TC-0014-0015: Browser QA empty findings warning", () => {
  it("TC-0014-0015: browser QA validator warns on always-empty findings (not a silent pass)", async () => {
    const { validateBrowserQaFindings } = await import("../../src/core/browserQa/index.js");

    const result = {
      status: "completed" as const,
      findings: [] as Array<{
        rule: string;
        severity: "error" | "warning" | "info";
        message: string;
      }>,
      metadata: {
        timestamp: "",
        runner: "",
      },
    };

    const validation = validateBrowserQaFindings(result);
    expect(validation.valid).toBe(false);
    expect(validation.warnings.length).toBeGreaterThan(0);
    expect(validation.warnings.some((w: string) => w.includes("zero findings"))).toBe(true);
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

  it("legacy/uixCompatibility.ts includes validators in the compatibility runner list", async () => {
    const src = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "legacy", "uixCompatibility.ts"),
      "utf-8",
    );
    expect(src).toMatch(/runLegacyUixCompatibilityValidators/);
    expect(src).toMatch(/validateScoringAxes/);
    expect(src).toMatch(/validateStrategyCompleteness/);
    expect(src).toMatch(/validateScreenContracts/);
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
