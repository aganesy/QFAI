import { access, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type {
  BrowserQaInput,
  BrowserQaPhase,
  BrowserQaPhaseResult,
} from "../../src/core/browserQa/types.js";
import type { RenderCaptureAdapter, RenderCaptureTarget } from "../../src/core/evidence/types.js";
import { runPrototypingExecution } from "../../src/core/prototyping/execution.js";
import { ProviderRegistry } from "../../src/core/providers/registry.js";

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
        evidence_refs: [`.qfai/evidence/browser-qa.json#/${phase}`],
        repair_suggestions: [],
      },
    ],
    repair_suggestions: [],
    evidence_refs: [`.qfai/evidence/browser-qa.json#/${phase}`],
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
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prototyping-run-"));
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
        "- classification_rationale: default web execution fixture",
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
    await writeFile(
      path.join(root, "01_Context.md"),
      [
        "# Context",
        "",
        "- ui_bearing: true",
        "- primary_surface: web",
        "- secondary_surfaces:",
        "  - cli",
        "- classification_rationale: root fallback fixture",
        "",
      ].join("\n"),
      "utf-8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("runPrototypingExecution", () => {
  it("rejects unsupported legacy requested modes", async () => {
    await withRoot(async (root) => {
      await expect(runPrototypingExecution({ root, requestedMode: "standard" })).rejects.toThrow(
        "full-harness",
      );
    });
  });

  it("rejects unsupported cli surface recommendations", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260406000000000");
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: full-harness",
          "  rationale: invalid cli recommendation",
          "  allowed_modes:",
          "    - full-harness",
          "  surface: cli",
          "",
        ].join("\n"),
        "utf-8",
      );

      await expect(runPrototypingExecution({ root, reviewer: "qa-reviewer" })).rejects.toThrow(
        "UI-bearing surfaces",
      );
    });
  });

  it("requires reviewer in full-harness mode", async () => {
    await withRoot(async (root) => {
      await expect(runPrototypingExecution({ root })).rejects.toThrow(/requires --reviewer/i);
    });
  });

  it("writes evidence bundles in full-harness mode", async () => {
    await withRoot(async (root) => {
      const result = await runPrototypingExecution({
        root,
        requestedMode: "full-harness",
        reviewer: "qa-reviewer",
        renderAdapter: createFakeRenderAdapter(),
        providerRegistry: createFakeProviderRegistry(),
        browserQaProviderId: "test-browser-qa",
      });

      expect(result.mode).toBe("full-harness");
      expect(result.surface).toBe("web");
      await expect(access(result.evidencePaths.prototyping)).resolves.toBeUndefined();
      await expect(access(result.evidencePaths.render)).resolves.toBeUndefined();
      await expect(access(result.evidencePaths.browserQa)).resolves.toBeUndefined();
    });
  });

  it("rejects stale coexist recommendation artifact", async () => {
    await withRoot(async (root) => {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260406000000000");
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "recommended_mode: standard",
          "rationale: stale top-level",
          "allowed_modes:",
          "  - standard",
          "surface: web",
          "prototyping:",
          "  recommended_mode: full-harness",
          "  rationale: current",
          "  allowed_modes:",
          "    - full-harness",
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      await expect(
        runPrototypingExecution({ root, requestedMode: "full-harness", reviewer: "qa-reviewer" }),
      ).rejects.toThrow(/recommendation artifact is invalid/i);
    });
  });
});
