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

  it("rejects cli standard evidence because prototyping is UI-only", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "cli",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "system-default",
          rationale: "default standard mode",
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-172")).toBe(true);
    });
  });

  it("flags contradictory UI-only evidence on cli surface", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "cli",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "system-default",
          rationale: "default standard mode",
        },
        runtimeGate: { ui: [{ route: "/orders", status: 200 }], api: [] },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-172")).toBe(true);
    });
  });

  it("requires uiFidelity for ui-bearing standard mode", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "web",
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
        surface: "web",
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
        surface: "web",
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        mode: {
          requested: "full-harness",
          effective: "full-harness",
          source: "explicit-request",
          rationale: "runtime proof requested",
        },
        fullHarness: buildV2FullHarness({
          runId: "fh-1",
          iterationCount: 5,
          bestIteration: 5,
          terminationReason: "converged",
          scores: [0.5, 0.6, 0.7, 0.75, 0.85],
          lastDecision: "accept",
        }),
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
              mockPaths: [{ id: "mp-1", status: "finding" }],
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

  it("errors when full-harness has iterationCount=1 and converged (QFAI-PROT-290)", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "web",
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        mode: {
          requested: "full-harness",
          effective: "full-harness",
          source: "explicit-request",
          rationale: "runtime proof requested",
        },
        fullHarness: buildV2FullHarness({
          runId: "fh-290",
          iterationCount: 1,
          bestIteration: 1,
          terminationReason: "converged",
          scores: [0.85],
          lastDecision: "accept",
        }),
        runtimeGate: { ui: [{ route: "/", status: 200 }], api: [] },
        uiFidelity: {
          mode: "interactive",
          screens: [
            {
              route: "/",
              uiContractId: "CON-UI-0001",
              expected: { elements: 1, actions: 1 },
              observed: { elementsPlaced: 1, actionsWired: 1 },
              mockPaths: [],
            },
          ],
        },
      });
      await seedUiContract(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-290")).toBe(true);
      expect(issues.find((i) => i.code === "QFAI-PROT-290")?.severity).toBe("error");
    });
  });

  it("errors when scoringTrace count mismatches iterationCount (QFAI-PROT-291)", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      // Build 3-iteration harness but only provide 2 scoringTrace/iterations entries
      const fh = buildV2FullHarness({
        runId: "fh-291",
        iterationCount: 3,
        bestIteration: 3,
        terminationReason: "plateau",
        scores: [0.5, 0.6],
        lastDecision: "refine",
      });
      // Override iterationCount to be 3 while arrays only have 2 entries
      fh.iterationCount = 3;
      await seedEvidence(root, {
        surface: "web",
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        mode: {
          requested: "full-harness",
          effective: "full-harness",
          source: "explicit-request",
          rationale: "test",
        },
        fullHarness: fh,
        runtimeGate: { ui: [{ route: "/", status: 200 }], api: [] },
        uiFidelity: {
          mode: "interactive",
          screens: [
            {
              route: "/",
              uiContractId: "CON-UI-0001",
              expected: { elements: 1, actions: 1 },
              observed: { elementsPlaced: 1, actionsWired: 1 },
              mockPaths: [],
            },
          ],
        },
      });
      await seedUiContract(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-291")).toBe(true);
    });
  });

  it("warns when terminationReason=max-iterations but count < maxIterations (QFAI-PROT-292)", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "web",
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        mode: {
          requested: "full-harness",
          effective: "full-harness",
          source: "explicit-request",
          rationale: "test",
        },
        fullHarness: buildV2FullHarness({
          runId: "fh-292",
          iterationCount: 3,
          bestIteration: 3,
          terminationReason: "max-iterations",
          scores: [0.5, 0.6, 0.65],
          lastDecision: "refine",
        }),
        runtimeGate: { ui: [{ route: "/", status: 200 }], api: [] },
        uiFidelity: {
          mode: "interactive",
          screens: [
            {
              route: "/",
              uiContractId: "CON-UI-0001",
              expected: { elements: 1, actions: 1 },
              observed: { elementsPlaced: 1, actionsWired: 1 },
              mockPaths: [],
            },
          ],
        },
      });
      await seedUiContract(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-292")).toBe(true);
    });
  });

  it("warns when iterationCount exceeds maxIterations (QFAI-PROT-293)", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "web",
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        mode: {
          requested: "full-harness",
          effective: "full-harness",
          source: "explicit-request",
          rationale: "test",
        },
        fullHarness: buildV2FullHarness({
          runId: "fh-293",
          iterationCount: 20,
          bestIteration: 20,
          terminationReason: "manual-stop",
          scores: Array.from({ length: 20 }, (_, i) => 0.4 + i * 0.02),
          lastDecision: "refine",
        }),
        runtimeGate: { ui: [{ route: "/", status: 200 }], api: [] },
        uiFidelity: {
          mode: "interactive",
          screens: [
            {
              route: "/",
              uiContractId: "CON-UI-0001",
              expected: { elements: 1, actions: 1 },
              observed: { elementsPlaced: 1, actionsWired: 1 },
              mockPaths: [],
            },
          ],
        },
      });
      await seedUiContract(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-293")).toBe(true);
    });
  });

  it("reports info when scoringTrace shows no progression (QFAI-PROT-294)", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      await seedEvidence(root, {
        surface: "web",
        specs: [buildSpecRow("spec-0001", { ui: 1, api: 1, db: 1 })],
        mode: {
          requested: "full-harness",
          effective: "full-harness",
          source: "explicit-request",
          rationale: "test",
        },
        fullHarness: buildV2FullHarness({
          runId: "fh-294",
          iterationCount: 3,
          bestIteration: 1,
          terminationReason: "plateau",
          scores: [0.6, 0.6, 0.59],
          lastDecision: "refine",
        }),
        runtimeGate: { ui: [{ route: "/", status: 200 }], api: [] },
        uiFidelity: {
          mode: "interactive",
          screens: [
            {
              route: "/",
              uiContractId: "CON-UI-0001",
              expected: { elements: 1, actions: 1 },
              observed: { elementsPlaced: 1, actionsWired: 1 },
              mockPaths: [],
            },
          ],
        },
      });
      await seedUiContract(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-294")).toBe(true);
      expect(issues.find((i) => i.code === "QFAI-PROT-294")?.severity).toBe("info");
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
        surface: "cli",
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
        surface: "cli",
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
        surface: "cli",
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
          "surface: cli",
          "prototyping: invalid",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedEvidence(root, {
        surface: "cli",
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
          "  surface: cli",
          "",
        ].join("\n"),
        "utf-8",
      );
      await seedEvidence(root, {
        surface: "cli",
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

  // Case A: invalid artifact + embedded web surface — embedded must not influence obligations
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

      // Evidence has no explicit surface but embedded recommendation has web
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
            surface: "web",
          },
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      // QFAI-PROT-235 must fire because artifact is invalid
      expect(issues.some((item) => item.code === "QFAI-PROT-235")).toBe(true);
      // QFAI-PROT-176 (uiFidelity required for ui-bearing standard) must NOT fire
      // because embedded web surface must not be used for obligation derivation
      expect(issues.some((item) => item.code === "QFAI-PROT-176")).toBe(false);
    });
  });

  // Case B: valid artifact (cli) + embedded conflicting surface (web) — artifact surface wins
  it("uses artifact surface over embedded conflicting surface", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      // Create valid artifact with cli surface
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: artifact says cli",
          "  allowed_modes:",
          "    - standard",
          "  surface: cli",
          "",
        ].join("\n"),
        "utf-8",
      );

      // Evidence has no explicit surface but embedded says web
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
            surface: "web",
          },
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      // No QFAI-PROT-235 because artifact is valid
      expect(issues.some((item) => item.code === "QFAI-PROT-235")).toBe(false);
      // No uiFidelity requirement because artifact surface is cli (not embedded web)
      expect(issues.some((item) => item.code === "QFAI-PROT-176")).toBe(false);
    });
  });

  // Case C: explicit evidence.surface takes priority over artifact surface
  it("prefers explicit evidence.surface over artifact surface", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root, ["0001"]);
      // Create valid artifact with web surface
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
      await mkdir(packDir, { recursive: true });
      await writeFile(
        path.join(packDir, "prototyping.yaml"),
        [
          "prototyping:",
          "  recommended_mode: standard",
          "  rationale: artifact says web",
          "  allowed_modes:",
          "    - standard",
          "  surface: web",
          "",
        ].join("\n"),
        "utf-8",
      );

      // Evidence has explicit cli surface
      await seedEvidence(root, {
        surface: "cli",
        specs: [buildSpecRow("spec-0001", { ui: 0, api: 1, db: 1 })],
        mode: {
          effective: "standard",
          source: "discussion-recommendation",
          rationale: "from discussion",
        },
      });

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      // evidence.surface=cli should take priority — no uiFidelity requirement
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
            smoke: { status: "passed", findingsCount: 0, checksCount: 1 },
            interaction: { status: "passed", findingsCount: 0, checksCount: 1 },
            visual: { status: "passed", findingsCount: 0, checksCount: 1 },
            accessibility: { status: "passed", findingsCount: 0, checksCount: 1 },
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
  if (payload.fullHarness) {
    await writeFile(
      path.join(evidenceRoot, "calibration.yaml"),
      [
        "version: 1.7.15",
        "thresholds:",
        "  accept: 0.8",
        "  refine: 0.5",
        "maxIterations: 15",
        "plateauDelta: 0.02",
        "plateauLookback: 3",
        "examples: []",
        "",
      ].join("\n"),
      "utf-8",
    );
  }
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
        ...(payload.runtimeGate
          ? {
              runtimeGate: {
                ui: payload.runtimeGate.ui.map((entry) => ({
                  screenId: entry.route.replace(/[^a-z0-9]+/gi, "-") || "root",
                  route: entry.route,
                  rendered: entry.status >= 200 && entry.status < 400,
                  browserVisited: entry.status >= 200 && entry.status < 400,
                  ...(entry.status > 0 ? { httpStatus: entry.status } : {}),
                  renderEvidenceRefs: [".qfai/evidence/render.json#/screens/0"],
                  browserQaEvidenceRefs: [".qfai/evidence/browser-qa.json#/findings"],
                })),
              },
            }
          : {}),
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
      apiEndpoints: 0,
      dbObjects: 0,
    },
    checked: {
      uiOk: counts.ui,
      apiNon404: 0,
      dbPresent: 0,
    },
    missing: {
      uiRoutes: [],
      apiEndpoints: [],
      dbObjects: [],
    },
  };
}

/** Build a schema v2 compliant fullHarness block for tests. */
function buildV2FullHarness(opts: {
  runId: string;
  iterationCount: number;
  bestIteration: number;
  terminationReason: string;
  scores: number[];
  lastDecision: string;
}): Record<string, unknown> {
  const iterations = opts.scores.map((score, i) => ({
    iteration: i + 1,
    commitSha: `abc${String(i + 1).padStart(4, "0")}`,
    reviewerId: "qa-reviewer",
    timestamp: `2026-04-0${i + 1}T00:00:00Z`,
    changeSummary: [`Iteration ${i + 1} changes`],
    limitations: ["Known limitation"],
    l1: {
      panel: "L1",
      total: score,
      axes: [
        {
          axisId: "coverage",
          score,
          rationale: "test fixture",
          evidenceRefs: ["evidence/prototyping.json"],
        },
      ],
    },
    l2: {
      panel: "L2",
      total: score,
      axes: [
        {
          axisId: "coverage",
          score,
          rationale: "test fixture",
          evidenceRefs: ["evidence/prototyping.json"],
        },
      ],
    },
    evidenceRefs: {
      render: [".qfai/evidence/render.json#/screens/0"],
      browserQa: [".qfai/evidence/browser-qa.json#/browserQa"],
      runtimeGate: [".qfai/evidence/prototyping.json#/runtimeGate"],
      uiObservation: [".qfai/evidence/prototyping.json#/uiFidelity/screens/0"],
      specCoverage: [".qfai/evidence/prototyping.json#/specs/0"],
      discussion: [
        ".qfai/discussion/discussion-20260404000000000/uiux/20_design_eval_invariant.md",
      ],
      screenContract: [
        ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#screen:/orders",
      ],
      trend: [".qfai/discussion/discussion-20260404000000000/04_Sources.md"],
    },
    weightedTotal: score,
    deltaFromPrevious: i === 0 ? null : +(score - opts.scores[i - 1]).toFixed(4),
    decision: i === opts.scores.length - 1 ? opts.lastDecision : "refine",
  }));
  const scoringTrace = opts.scores.map((score, i) => ({
    iteration: i + 1,
    l1Total: score,
    l2Total: score,
    weightedTotal: score,
    deltaFromPrevious: i === 0 ? null : +(score - opts.scores[i - 1]).toFixed(4),
    decision: i === opts.scores.length - 1 ? opts.lastDecision : "refine",
    commitSha: `abc${String(i + 1).padStart(4, "0")}`,
  }));
  return {
    enabled: true,
    runId: opts.runId,
    calibrationRef: {
      configPath: "qfai.config.yaml",
      packPath: ".qfai/evidence/calibration.yaml",
      packVersion: "1.7.15",
    },
    iterationCount: opts.scores.length,
    bestIteration: opts.bestIteration,
    status: "completed",
    terminationReason: opts.terminationReason,
    reviewerSignoff: {
      reviewerId: "qa-reviewer",
      status: "approved",
      timestamp: "2026-04-04T00:00:00Z",
      source: "cli",
    },
    reviewerLogs: opts.scores.map((_, i) => ({
      iteration: i + 1,
      reviewerId: "qa-reviewer",
      verdict: i === opts.scores.length - 1 ? "approve" : "revise",
      summary: `Iteration ${i + 1} review: checks passed and evaluated`,
      evidenceRefs: ["evidence/prototyping.json"],
    })),
    iterations,
    scoringTrace,
    limitations: ["Known limitation"],
  };
}
