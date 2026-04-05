import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validatePrototypingEvidence } from "../../src/core/validators/prototypingEvidence.js";

describe("validatePrototypingEvidence", () => {
  async function withTempRoot(task: (root: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prot-evidence-"));
    try {
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  it("fails when prototyping evidence files are missing", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-101")).toBe(true);
    });
  });

  it("accepts non-ui standard evidence without ui-specific payloads", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "non-ui",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "system-default",
          rationale: "default standard mode",
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues).toEqual([]);
    });
  });

  it("flags contradictory UI-only evidence on non-ui surface", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "non-ui",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "system-default",
          rationale: "default standard mode",
        },
        runtimeGate: { ui: [{ route: "/orders", status: 200 }], api: [] },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-175")).toBe(true);
    });
  });

  it("requires uiFidelity for ui-bearing standard mode", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "web-ui",
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "system-default",
          rationale: "default standard mode",
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-176")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-PROT-172")).toBe(true);
    });
  });

  it("requires runtimeGate/render/browser/fullHarness for ui-bearing full-harness mode", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "web-ui",
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        mode: {
          effective: "full-harness",
          source: "explicit-request",
          rationale: "runtime proof requested",
        },
        uiFidelity: {
          mode: "interactive",
          screens: [],
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-173")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-PROT-174")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-PROT-177")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-PROT-281")).toBe(true);
    });
  });

  it("accepts ui-bearing full-harness evidence with required bundles", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "web-ui",
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        mode: {
          requested: "full-harness",
          effective: "full-harness",
          source: "explicit-request",
          rationale: "runtime proof requested",
        },
        fullHarness: {
          enabled: true,
          available: true,
          runId: "fh-1",
          iterationCount: 1,
          bestIteration: 1,
          terminationReason: "converged",
          reviewerSignoff: {
            status: "approved",
            reviewer: "qa",
            timestamp: "2026-04-04T00:00:00.000Z",
          },
          scoringTrace: [{ iteration: 1, weightedTotal: 0.8, decision: "done" }],
        },
        runtimeGate: {
          ui: [{ route: "/orders", status: 200 }],
          api: [{ method: "GET", path: "/api/orders", status: 200 }],
        },
        uiFidelity: {
          mode: "interactive",
          screens: [
            {
              route: "/orders",
              uiContractId: "CON-UI-0001",
              expected: { elements: 1, actions: 1 },
              observed: { elementsPlaced: 1, actionsWired: 1 },
              mockPaths: [{ id: "mp-1", status: "pass" }],
            },
          ],
        },
      });
      await seedUiContract(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues).toEqual([]);
    });
  });

  it("reports invalid surface with QFAI-PROT-171", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "cli-only",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-171")).toBe(true);
    });
  });

  // W3: QFAI-PROT-235 fires for no-discussion-pack case
  it("fires QFAI-PROT-235 when no discussion pack dir and mode.source=discussion-recommendation", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      // No discussion pack at all — just evidence claiming discussion-recommendation source
      await seedEvidence(root, {
        surface: "non-ui",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "discussion-recommendation",
          rationale: "from discussion",
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-235")).toBe(true);
    });
  });

  it("fires QFAI-PROT-235 when discussion pack exists but prototyping.yaml missing", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      // Create discussion pack dir without prototyping.yaml
      await mkdir(path.join(root, ".qfai", "discussion", "discussion-20260404000000000"), {
        recursive: true,
      });
      await seedEvidence(root, {
        surface: "non-ui",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "discussion-recommendation",
          rationale: "from discussion",
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-235")).toBe(true);
    });
  });

  it("fires QFAI-PROT-235 when prototyping.yaml has invalid schema", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      // Write invalid prototyping.yaml (missing required fields)
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        "prototyping:\n  recommended_mode: invalid\n",
        "utf-8",
      );
      await seedEvidence(root, {
        surface: "non-ui",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "discussion-recommendation",
          rationale: "from discussion",
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-235")).toBe(true);
    });
  });

  it("fires QFAI-PROT-235 when prototyping.yaml has non-object namespaced block", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      // Non-object namespaced block — scalar value
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "recommended_mode: standard",
          "rationale: valid legacy",
          "allowed_modes:",
          "  - standard",
          "surface: non-ui",
          "prototyping: invalid",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedEvidence(root, {
        surface: "non-ui",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "discussion-recommendation",
          rationale: "from discussion",
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-235")).toBe(true);
    });
  });

  it("does NOT fire QFAI-PROT-235 when valid recommendation exists and source matches", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: validated recommendation",
          "  allowed_modes:",
          "    - standard",
          "  surface: non-ui",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedEvidence(root, {
        surface: "non-ui",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "discussion-recommendation",
          rationale: "from discussion",
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-235")).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Artifact-first regression tests (v1.7.13 correction)
  // --------------------------------------------------------------------------

  // Case A: invalid artifact + embedded web-ui surface — embedded must not influence obligations
  it("does not use embedded recommendation surface for obligations when artifact is invalid", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      // Create invalid prototyping.yaml (missing required fields)
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        "prototyping:\n  recommended_mode: bogus\n",
        "utf-8",
      );

      // Evidence has no explicit surface but embedded recommendation has web-ui
      await seedEvidence(root, {
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "discussion-recommendation",
          rationale: "from discussion",
          discussionRecommendation: {
            recommendedMode: "standard",
            rationale: "stale embedded",
            allowedModes: ["standard"],
            surface: "web-ui",
          },
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      // QFAI-PROT-235 must fire because artifact is invalid
      expect(issues.some((item) => item.code === "QFAI-PROT-235")).toBe(true);
      // QFAI-PROT-176 (uiFidelity required for ui-bearing standard) must NOT fire
      // because embedded web-ui surface must not be used for obligation derivation
      expect(issues.some((item) => item.code === "QFAI-PROT-176")).toBe(false);
    });
  });

  // Case B: valid artifact (non-ui) + embedded conflicting surface (web-ui) — artifact surface wins
  it("uses artifact surface over embedded conflicting surface", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      // Create valid artifact with non-ui surface
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: artifact says non-ui",
          "  allowed_modes:",
          "    - standard",
          "  surface: non-ui",
          "",
        ].join("\n"),
        "utf-8",
      );

      // Evidence has no explicit surface but embedded says web-ui
      await seedEvidence(root, {
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "discussion-recommendation",
          rationale: "from discussion",
          discussionRecommendation: {
            recommendedMode: "standard",
            rationale: "stale embedded",
            allowedModes: ["standard"],
            surface: "web-ui",
          },
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      // No QFAI-PROT-235 because artifact is valid
      expect(issues.some((item) => item.code === "QFAI-PROT-235")).toBe(false);
      // No uiFidelity requirement because artifact surface is non-ui (not embedded web-ui)
      expect(issues.some((item) => item.code === "QFAI-PROT-176")).toBe(false);
    });
  });

  // Case C: explicit evidence.surface takes priority over artifact surface
  it("prefers explicit evidence.surface over artifact surface", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      // Create valid artifact with web-ui surface
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: artifact says web-ui",
          "  allowed_modes:",
          "    - standard",
          "  surface: web-ui",
          "",
        ].join("\n"),
        "utf-8",
      );

      // Evidence has explicit non-ui surface
      await seedEvidence(root, {
        surface: "non-ui",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "discussion-recommendation",
          rationale: "from discussion",
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      // evidence.surface=non-ui should take priority — no uiFidelity requirement
      expect(issues.some((item) => item.code === "QFAI-PROT-176")).toBe(false);
    });
  });
});

async function seedSpecs(root: string, specNumbers: string[]): Promise<void> {
  for (const specNumber of specNumbers) {
    await mkdir(path.join(root, ".qfai", "specs", `spec-${specNumber}`), { recursive: true });
  }
}

async function seedUiContract(root: string): Promise<void> {
  const uiRoot = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiRoot, { recursive: true });
  await writeFile(
    path.join(uiRoot, "orders.yaml"),
    [
      "# QFAI-CONTRACT-ID: CON-UI-0001",
      "screens:",
      "  - id: orders_screen",
      "    route: /orders",
      "    elements:",
      "      - id: orders_table",
      "        label: orders_table",
      "    actions:",
      "      - id: go_to_create",
      "",
    ].join("\n"),
    "utf-8",
  );
}

async function seedRenderBundle(root: string): Promise<void> {
  const renderDir = path.join(root, ".qfai", "evidence", "render");
  await mkdir(renderDir, { recursive: true });
  await writeFile(path.join(renderDir, "orders.desktop.png"), "png", "utf-8");
  await writeFile(path.join(renderDir, "orders.desktop.html"), "<html></html>", "utf-8");
  await writeFile(
    path.join(root, ".qfai", "evidence", "render.json"),
    JSON.stringify(
      {
        renderEvidence: {
          status: "captured",
          requested: true,
          viewports: ["desktop"],
          outputPath: ".qfai/evidence/render.json",
        },
        screens: [
          {
            route: "/orders",
            viewport: "desktop",
            status: "captured",
            width: 1440,
            height: 900,
            imagePath: "render/orders.desktop.png",
            htmlPath: "render/orders.desktop.html",
          },
        ],
      },
      null,
      2,
    ),
    "utf-8",
  );
}

async function seedBrowserQaBundle(root: string): Promise<void> {
  await writeFile(
    path.join(root, ".qfai", "evidence", "browser-qa.json"),
    JSON.stringify(
      {
        browserQa: {
          executed: true,
          status: "completed",
          mode: "full-harness",
          summary: {
            smoke: { passed: 1, failed: 0 },
            interaction: { passed: 1, failed: 0 },
            visual: { passed: 1, failed: 0 },
            accessibility: { passed: 1, failed: 0 },
          },
        },
        findings: [],
      },
      null,
      2,
    ),
    "utf-8",
  );
}

type EvidenceSpecRow = {
  specId: string;
  declared: { uiRoutes: number; apiEndpoints: number; dbObjects: number };
  checked: { uiOk: number; apiNon404: number; dbPresent: number };
  missing: { uiRoutes: string[]; apiEndpoints: string[]; dbObjects: string[] };
};

type EvidencePayload = {
  surface?: string;
  specs: EvidenceSpecRow[];
  mode?: Record<string, unknown>;
  fullHarness?: Record<string, unknown>;
  runtimeGate?: {
    ui: Array<{ route: string; status: number }>;
    api: Array<{ method: string; path: string; status: number }>;
  };
  uiFidelity?: Record<string, unknown>;
};

async function seedEvidence(root: string, payload: EvidencePayload): Promise<void> {
  const evidenceRoot = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(path.join(evidenceRoot, "prototyping.md"), "# Prototyping Evidence\n", "utf-8");
  await writeFile(
    path.join(evidenceRoot, "prototyping.json"),
    JSON.stringify(
      {
        ...(payload.surface ? { surface: payload.surface } : {}),
        specs: payload.specs,
        mode: payload.mode ?? {
          effective: "standard",
          source: "system-default",
          rationale: "default standard mode",
        },
        ...(payload.fullHarness ? { fullHarness: payload.fullHarness } : {}),
        ...(payload.runtimeGate ? { runtimeGate: payload.runtimeGate } : {}),
        ...(payload.uiFidelity ? { uiFidelity: payload.uiFidelity } : {}),
        meta: {
          generatedAt: "2026-04-04T00:00:00.000Z",
          toolVersion: "1.7.13",
          commands: ["qfai validate --fail-on error"],
        },
      },
      null,
      2,
    ),
    "utf-8",
  );
}

function buildSpecRow(
  specId: string,
  counts: { ui: number; api: number; db: number },
): EvidenceSpecRow {
  return {
    specId,
    declared: {
      uiRoutes: counts.ui,
      apiEndpoints: counts.api,
      dbObjects: counts.db,
    },
    checked: {
      uiOk: counts.ui,
      apiNon404: counts.api,
      dbPresent: counts.db,
    },
    missing: {
      uiRoutes: [],
      apiEndpoints: [],
      dbObjects: [],
    },
  };
}
