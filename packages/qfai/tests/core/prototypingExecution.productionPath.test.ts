import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import type {
  BrowserQaInput,
  BrowserQaPhase,
  BrowserQaPhaseResult,
} from "../../src/core/browserQa/types.js";
import type { RenderCaptureAdapter, RenderCaptureTarget } from "../../src/core/evidence/types.js";
import { isConcreteArtifactRef } from "../../src/core/prototyping/pathUtils.js";
import { runPrototypingExecution } from "../../src/core/prototyping/execution.js";
import { ProviderRegistry } from "../../src/core/providers/registry.js";
import { validatePrototypingEvidence } from "../../src/core/validators/prototypingEvidence.js";

function createFakeRenderAdapter(): RenderCaptureAdapter {
  return {
    async captureScreenshot(target: RenderCaptureTarget, outputDir: string): Promise<string> {
      await mkdir(outputDir, { recursive: true });
      const filePath = path.join(outputDir, `${target.targetId}.png`);
      await writeFile(filePath, "png", "utf-8");
      return filePath;
    },
    async captureHtml(target: RenderCaptureTarget, outputDir: string): Promise<string> {
      await mkdir(outputDir, { recursive: true });
      const filePath = path.join(outputDir, `${target.targetId}.html`);
      await writeFile(
        filePath,
        '<html><body><h1>Dashboard</h1><button id="open_details">Open details</button></body></html>',
        "utf-8",
      );
      return filePath;
    },
  };
}

function createFakeProviderRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();
  const createPhase = (phase: BrowserQaPhase, input: BrowserQaInput): BrowserQaPhaseResult => ({
    phase,
    status: "executed",
    findings: [
      {
        phase,
        severity: "warn",
        summary: `${phase} ok`,
        detail: `${phase} executed`,
        route: input.routes?.[0] ?? "/dashboard",
        screen_id: input.screenContracts?.[0]?.screen_id ?? "dashboard",
        evidence_refs: [`.qfai/evidence/browser-qa.json#/phases/${phase}`],
        repair_suggestions: [],
      },
    ],
    repair_suggestions: [],
    evidence_refs: [`.qfai/evidence/browser-qa.json#/phases/${phase}`],
    checks_performed: [`${phase} executed`],
  });
  registry.registerQaProvider({
    providerId: "test-browser-qa",
    canRun: () => true,
    async runSmoke(input) {
      return createPhase("smoke", input);
    },
    async runInteraction(input) {
      return createPhase("interaction", input);
    },
    async runVisual(input) {
      return createPhase("visual", input);
    },
    async runAccessibility(input) {
      return createPhase("accessibility", input);
    },
  });
  return registry;
}

async function withRoot(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-closure-"));
  try {
    await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
    await mkdir(path.join(root, ".qfai", "contracts", "ui"), { recursive: true });
    await mkdir(path.join(root, ".qfai", "evidence"), { recursive: true });
    await mkdir(path.join(root, ".git", "refs", "heads"), { recursive: true });
    await writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/main\n", "utf-8");
    await writeFile(
      path.join(root, ".git", "refs", "heads", "main"),
      "abc1234567890abcdef1234567890abcdef123456\n",
      "utf-8",
    );
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      [
        "paths:",
        "  discussionDir: .qfai/discussion",
        "prototyping:",
        "  calibration:",
        "    packPath: .qfai/evidence/calibration.yaml",
        "",
      ].join("\n"),
      "utf-8",
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
      "utf-8",
    );
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20260406000000000");
    await mkdir(path.join(packDir, "uiux"), { recursive: true });
    await writeFile(
      path.join(packDir, "01_Context.md"),
      [
        "# Context",
        "",
        "- ui_bearing: true",
        "- primary_surface: web",
        "- secondary_surfaces:",
        "  - cli",
        "- classification_rationale: production path fixture",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(packDir, "prototyping.yaml"),
      [
        "prototyping:",
        "  recommended_mode: full-harness",
        "  rationale: runtime proof required",
        "  allowed_modes:",
        "    - full-harness",
        "  surface: web",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(root, ".qfai", "specs", "spec-0001", "01_Spec.md"),
      ["# Spec", "", "- ui_route: /dashboard", ""].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(packDir, "uiux", "40_screen_contracts.md"),
      [
        "# Screen Contracts",
        "",
        "### Screen: Dashboard",
        "- screen_id: dashboard",
        "- route: /dashboard",
        "- primary_tasks:",
        "  - Review summary",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(root, ".qfai", "contracts", "ui", "dashboard.yaml"),
      [
        "# QFAI-CONTRACT-ID: CON-UI-0001",
        "screens:",
        "  - id: dashboard",
        "    route: /dashboard",
        "    elements:",
        "      - id: summary_title",
        "        label: Dashboard",
        "      - id: open_details_button",
        "        label: Open details",
        "    actions:",
        "      - id: open_details",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(packDir, "uiux", "20_design_eval_invariant.md"),
      ["# invariant", "", "### Axis: consistency", "- rationale: stable", ""].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(packDir, "uiux", "21_design_eval_trend_derived.md"),
      ["# trend", "", "### Axis: trend-fit", "- rationale: aligned", ""].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(packDir, "uiux", "22_design_eval_product_specific.md"),
      ["# product", "", "### Axis: product-fit", "- rationale: aligned", ""].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(packDir, "uiux", "23_design_eval_aggregate.md"),
      ["# aggregate", "", "- aggregate_score: 0.9", ""].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(packDir, "04_Sources.md"),
      [
        "# Sources",
        "",
        "## Trend Scan",
        "- trend item",
        "",
        "## Competitive Reference Registry",
        "- competitor item",
        "",
        "- translation: consistent",
        "- local_implication: relevant",
        "- decision_connection: linked",
        "- evaluation_connection: linked",
        "",
      ].join("\n"),
      "utf-8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("prototyping execution production path", () => {
  it("passes the execution -> validate closure with validator success", async () => {
    await withRoot(async (root) => {
      const result = await runPrototypingExecution({
        root,
        requestedMode: "full-harness",
        reviewer: "qa-reviewer",
        renderAdapter: createFakeRenderAdapter(),
        providerRegistry: createFakeProviderRegistry(),
        browserQaProviderId: "test-browser-qa",
      });

      await expect(access(result.evidencePaths.prototyping)).resolves.toBeUndefined();
      const prototyping = JSON.parse(
        await readFile(result.evidencePaths.prototyping, "utf-8"),
      ) as Record<string, unknown>;
      const runtimeGate = prototyping.runtimeGate as {
        ui: Array<{
          declaredRef: string;
          renderEvidenceRefs: string[];
          browserQaEvidenceRefs: string[];
        }>;
      };
      const fullHarness = prototyping.fullHarness as {
        reviewerLogs: Array<{ evidenceRefs: string[] }>;
        iterations: Array<{
          l1: { axes: Array<{ evidenceRefs: string[] }> };
          l2: { axes: Array<{ evidenceRefs: string[] }> };
        }>;
      };
      expect(runtimeGate.ui.every((entry) => isConcreteArtifactRef(entry.declaredRef))).toBe(true);
      expect(
        runtimeGate.ui.every((entry) =>
          entry.renderEvidenceRefs.every((ref) => isConcreteArtifactRef(ref)),
        ),
      ).toBe(true);
      expect(
        runtimeGate.ui.every((entry) =>
          entry.browserQaEvidenceRefs.every((ref) => isConcreteArtifactRef(ref)),
        ),
      ).toBe(true);
      expect(
        fullHarness.reviewerLogs.every((log) =>
          log.evidenceRefs.every((ref) => isConcreteArtifactRef(ref)),
        ),
      ).toBe(true);
      expect(
        fullHarness.iterations.every((iteration) =>
          iteration.l1.axes.every((axis) =>
            axis.evidenceRefs.every((ref) => isConcreteArtifactRef(ref)),
          ),
        ),
      ).toBe(true);
      expect(
        fullHarness.iterations.every((iteration) =>
          iteration.l2.axes.every((axis) =>
            axis.evidenceRefs.every((ref) => isConcreteArtifactRef(ref)),
          ),
        ),
      ).toBe(true);
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues).toEqual([]);
    });
  });

  it("rejects an injected malformed leaf ref after execution", async () => {
    await withRoot(async (root) => {
      await runPrototypingExecution({
        root,
        requestedMode: "full-harness",
        reviewer: "qa-reviewer",
        renderAdapter: createFakeRenderAdapter(),
        providerRegistry: createFakeProviderRegistry(),
        browserQaProviderId: "test-browser-qa",
      });

      const prototypingPath = path.join(root, ".qfai", "evidence", "prototyping.json");
      const raw = JSON.parse(await readFile(prototypingPath, "utf-8")) as Record<string, unknown>;
      const runtimeGate = raw.runtimeGate as { ui: Array<Record<string, unknown>> };
      (runtimeGate.ui[0]?.renderEvidenceRefs as string[])[0] = "render/dashboard.png";
      await writeFile(prototypingPath, JSON.stringify(raw, null, 2), "utf-8");

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});
