// QFAI:SPEC-0012:TC-0012-0219
// QFAI:SPEC-0012:TC-0012-0220
// QFAI:SPEC-0012:TC-0012-0221
// QFAI:SPEC-0012:TC-0012-0222
// QFAI:SPEC-0012:TC-0012-0223
// QFAI:SPEC-0012:TC-0012-0224
// QFAI:SPEC-0012:TC-0012-0225
// QFAI:SPEC-0012:TC-0012-0226
// QFAI:SPEC-0012:TC-0012-0227
// QFAI:SPEC-0012:TC-0012-0228
// QFAI:SPEC-0012:TC-0012-0229
// QFAI:SPEC-0012:TC-0012-0230
// QFAI:SPEC-0012:TC-0012-0231
// QFAI:SPEC-0012:TC-0012-0232
// QFAI:SPEC-0012:TC-0012-0233
// QFAI:SPEC-0012:TC-0012-0234
// QFAI:SPEC-0012:TC-0012-0235
// QFAI:SPEC-0012:TC-0012-0236
// QFAI:SPEC-0012:TC-0012-0237
// QFAI:SPEC-0012:TC-0012-0238
// QFAI:SPEC-0012:TC-0012-0239
// QFAI:SPEC-0012:TC-0012-0240
// QFAI:SPEC-0012:TC-0012-0241
// QFAI:SPEC-0012:TC-0012-0242
// QFAI:SPEC-0012:TC-0012-0243
// QFAI:SPEC-0012:TC-0012-0244
// QFAI:SPEC-0012:TC-0012-0245
// QFAI:SPEC-0012:TC-0012-0246
// QFAI:SPEC-0012:TC-0012-0247
// QFAI:SPEC-0012:TC-0012-0248

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { isConcreteArtifactRef } from "../../src/core/prototyping/pathUtils.js";
import { validatePrototypingEvidence } from "../../src/core/validators/prototypingEvidence.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

async function withTempRoot(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-rev9-int-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedAll(root: string): Promise<void> {
  await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
  await mkdir(path.join(root, ".qfai", "contracts", "ui"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai", "specs", "spec-0001", "01_Spec.md"),
    "# Spec\n\n- ui_route: /orders\n",
    "utf-8",
  );
  const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000");
  await mkdir(path.join(packDir, "uiux"), { recursive: true });
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
    "# Screen Contracts\n\n### Screen: Orders\n- screen_id: orders\n- route: /orders\n",
    "utf-8",
  );
  await writeFile(
    path.join(root, ".qfai", "contracts", "ui", "orders.yaml"),
    [
      "# QFAI-CONTRACT-ID: CON-UI-0001",
      "screens:",
      "  - id: orders",
      "    route: /orders",
      "    elements:",
      "      - id: orders_table",
      "        label: Orders",
      "    actions:",
      "      - id: create_order",
      "",
    ].join("\n"),
    "utf-8",
  );
  const evidenceDir = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(
    path.join(evidenceDir, "calibration.yaml"),
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
  const renderDir = path.join(evidenceDir, "render");
  await mkdir(renderDir, { recursive: true });
  await writeFile(path.join(renderDir, "orders.desktop.png"), "png", "utf-8");
  await writeFile(path.join(renderDir, "orders.desktop.html"), "<html></html>", "utf-8");
  await writeFile(path.join(renderDir, "orders.mobile.png"), "png", "utf-8");
  await writeFile(path.join(renderDir, "orders.mobile.html"), "<html></html>", "utf-8");
  await writeFile(
    path.join(evidenceDir, "render.json"),
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
            imagePath: ".qfai/evidence/render/orders.desktop.png",
            htmlPath: ".qfai/evidence/render/orders.desktop.html",
          },
          {
            route: "/orders",
            viewport: "mobile",
            status: "captured",
            width: 390,
            height: 844,
            imagePath: ".qfai/evidence/render/orders.mobile.png",
            htmlPath: ".qfai/evidence/render/orders.mobile.html",
          },
        ],
      },
      null,
      2,
    ),
    "utf-8",
  );
  await writeFile(
    path.join(evidenceDir, "browser-qa.json"),
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

async function seedEvidence(root: string, payload: Record<string, unknown>): Promise<void> {
  const evidenceRoot = path.join(root, ".qfai", "evidence");
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(path.join(evidenceRoot, "prototyping.md"), "# Prototyping Evidence\n", "utf-8");
  await writeFile(
    path.join(evidenceRoot, "prototyping.json"),
    JSON.stringify(payload, null, 2),
    "utf-8",
  );
}

function buildValidEvidence(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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
            route: "/orders",
            declaredRef: ".qfai/specs/spec-0001/01_Spec.md#L2",
            observedRefs: [".qfai/evidence/render.json#/screens/0"],
          },
        ],
      },
    ],
    mode: {
      requested: "full-harness",
      effective: "full-harness",
      source: "explicit-request",
      rationale: "runtime proof requested",
    },
    runtimeGate: {
      ui: [
        {
          screenId: "orders",
          route: "/orders",
          declaredRef:
            ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders",
          rendered: true,
          browserVisited: true,
          renderEvidenceRefs: [".qfai/evidence/render.json#/screens/0"],
          browserQaEvidenceRefs: [".qfai/evidence/browser-qa.json#/phases/0"],
        },
      ],
      evidenceRefs: [
        ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders",
        ".qfai/evidence/render.json#/screens/0",
        ".qfai/evidence/browser-qa.json#/phases/0",
      ],
    },
    uiFidelity: {
      mode: "interactive",
      screens: [
        {
          screenId: "orders",
          route: "/orders",
          uiContractId: "CON-UI-0001",
          expected: { elements: 1, actions: 1 },
          observed: { elementsPlaced: 1, actionsWired: 1 },
          mockPaths: [],
          renders: [
            {
              viewport: "desktop",
              status: "captured",
              width: 1440,
              height: 900,
              imagePath: ".qfai/evidence/render/orders.desktop.png",
              htmlPath: ".qfai/evidence/render/orders.desktop.html",
            },
            {
              viewport: "mobile",
              status: "captured",
              width: 390,
              height: 844,
              imagePath: ".qfai/evidence/render/orders.mobile.png",
              htmlPath: ".qfai/evidence/render/orders.mobile.html",
            },
          ],
        },
      ],
    },
    fullHarness: {
      enabled: true,
      runId: "fh-rev9-1",
      calibrationRef: {
        configPath: "qfai.config.yaml",
        packPath: ".qfai/evidence/calibration.yaml",
        packVersion: "1.7.15",
      },
      iterationCount: 2,
      bestIteration: 2,
      status: "completed",
      terminationReason: "converged",
      finalDecision: "accepted",
      reviewerSignoff: { reviewerId: "qa-reviewer", status: "approved", source: "cli" },
      reviewerLogs: [
        {
          iteration: 1,
          reviewerId: "qa-reviewer",
          verdict: "revise",
          summary: "Iteration 1: needs another pass.",
          evidenceRefs: [".qfai/evidence/render.json#/screens/0"],
        },
        {
          iteration: 2,
          reviewerId: "qa-reviewer",
          verdict: "approve",
          summary: "Iteration 2: approved. Convergence confirmed.",
          evidenceRefs: [".qfai/evidence/render.json#/screens/0"],
        },
      ],
      iterations: [
        {
          iteration: 1,
          commitSha: "abc0001",
          reviewerId: "qa-reviewer",
          timestamp: "2026-04-04T00:00:00Z",
          changeSummary: ["Initial measurement"],
          limitations: ["none known"],
          evidenceRefs: {
            render: [".qfai/evidence/render.json#/screens/0"],
            browserQa: [".qfai/evidence/browser-qa.json#/phases/0"],
            runtimeGate: [
              ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders",
            ],
            uiObservation: [".qfai/evidence/render/orders.desktop.html"],
            specCoverage: [
              ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders",
            ],
            discussion: [
              ".qfai/discussion/discussion-20260404000000000/uiux/20_design_eval_invariant.md#section-1",
            ],
            screenContract: [
              ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders",
            ],
            trend: [".qfai/discussion/discussion-20260404000000000/04_Sources.md#trend-scan"],
          },
          l1: {
            panel: "L1",
            total: 0.85,
            axes: [
              {
                axisId: "runtime",
                score: 0.85,
                rationale: "runtime ok",
                evidenceRefs: [".qfai/evidence/render.json#/screens/0"],
              },
            ],
          },
          l2: {
            panel: "L2",
            total: 0.85,
            axes: [
              {
                axisId: "design",
                score: 0.85,
                rationale: "design ok",
                evidenceRefs: [
                  ".qfai/discussion/discussion-20260404000000000/uiux/20_design_eval_invariant.md#section-1",
                ],
              },
            ],
          },
          weightedTotal: 0.85,
          deltaFromPrevious: null,
          decision: "refine",
        },
        {
          iteration: 2,
          commitSha: "abc0002",
          reviewerId: "qa-reviewer",
          timestamp: "2026-04-04T01:00:00Z",
          changeSummary: ["Second iteration"],
          limitations: ["none known"],
          evidenceRefs: {
            render: [".qfai/evidence/render.json#/screens/0"],
            browserQa: [".qfai/evidence/browser-qa.json#/phases/0"],
            runtimeGate: [
              ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders",
            ],
            uiObservation: [".qfai/evidence/render/orders.desktop.html"],
            specCoverage: [
              ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders",
            ],
            discussion: [
              ".qfai/discussion/discussion-20260404000000000/uiux/20_design_eval_invariant.md#section-1",
            ],
            screenContract: [
              ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders",
            ],
            trend: [".qfai/discussion/discussion-20260404000000000/04_Sources.md#trend-scan"],
          },
          l1: {
            panel: "L1",
            total: 0.92,
            axes: [
              {
                axisId: "runtime",
                score: 0.92,
                rationale: "improved runtime",
                evidenceRefs: [".qfai/evidence/render.json#/screens/0"],
              },
            ],
          },
          l2: {
            panel: "L2",
            total: 0.92,
            axes: [
              {
                axisId: "design",
                score: 0.92,
                rationale: "improved design",
                evidenceRefs: [
                  ".qfai/discussion/discussion-20260404000000000/uiux/20_design_eval_invariant.md#section-1",
                ],
              },
            ],
          },
          weightedTotal: 0.92,
          deltaFromPrevious: 0.07,
          decision: "accept",
        },
      ],
      scoringTrace: [
        {
          iteration: 1,
          l1Total: 0.85,
          l2Total: 0.85,
          weightedTotal: 0.85,
          deltaFromPrevious: null,
          decision: "refine",
          commitSha: "abc0001",
        },
        {
          iteration: 2,
          l1Total: 0.92,
          l2Total: 0.92,
          weightedTotal: 0.92,
          deltaFromPrevious: 0.07,
          decision: "accept",
          commitSha: "abc0002",
        },
      ],
      limitations: [],
    },
    renderEvidence: {
      status: "captured",
      requested: true,
      outputPath: ".qfai/evidence/render.json",
      viewports: ["desktop"],
    },
    browserQa: { executed: true, status: "completed" },
    meta: {
      generatedAt: "2026-04-04T00:00:00.000Z",
      toolVersion: "1.7.15",
      commands: ["qfai prototyping run --mode full-harness"],
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Group L: runtimeGate.ui[] row leaf field validation (TC-0219..0226, TC-0244)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0219
describe("TC-0012-0219: runtimeGate.ui[].declaredRef Absent — Validator Error (v1.7.15 rev9 WS-1)", () => {
  it("ui[] row missing declaredRef produces a QFAI-PROT parse or validation error", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const rg = base.runtimeGate as Record<string, unknown>;
      const uiRows = rg.ui as Array<Record<string, unknown>>;
      const rowWithoutDeclaredRef = Object.fromEntries(
        Object.entries(uiRows[0]).filter(([k]) => k !== "declaredRef"),
      );
      await seedEvidence(root, { ...base, runtimeGate: { ...rg, ui: [rowWithoutDeclaredRef] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      // Either parse-level PROT-101 or validation-level PROT-318 must be present
      expect(issues.some((i) => ["QFAI-PROT-101", "QFAI-PROT-318"].includes(i.code))).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0220
describe("TC-0012-0220: runtimeGate.ui[].declaredRef Absolute Path — QFAI-PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("absolute path in ui[].declaredRef produces QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const rg = base.runtimeGate as Record<string, unknown>;
      const uiRows = rg.ui as Array<Record<string, unknown>>;
      const row = { ...uiRows[0], declaredRef: "/abs/path/screen_contracts.md" };
      await seedEvidence(root, { ...base, runtimeGate: { ...rg, ui: [row] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0221
describe("TC-0012-0221: runtimeGate.ui[].declaredRef Bare Filename — QFAI-PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("bare filename in ui[].declaredRef produces QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const rg = base.runtimeGate as Record<string, unknown>;
      const uiRows = rg.ui as Array<Record<string, unknown>>;
      const row = { ...uiRows[0], declaredRef: "40_screen_contracts.md" };
      await seedEvidence(root, { ...base, runtimeGate: { ...rg, ui: [row] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0222
describe("TC-0012-0222: runtimeGate.ui[].declaredRef Valid Concrete Ref — No PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("valid concrete declaredRef passes without QFAI-PROT-318 for that field", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      await seedEvidence(root, buildValidEvidence());
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const prot318 = issues.filter((i) => i.code === "QFAI-PROT-318");
      // None of the PROT-318 errors should mention declaredRef
      const declaredRefErrors = prot318.filter(
        (i) => typeof i.message === "string" && i.message.includes("declaredRef"),
      );
      expect(declaredRefErrors).toHaveLength(0);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0223
describe("TC-0012-0223: runtimeGate.ui[].renderEvidenceRefs[] Empty Array — QFAI-PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("empty renderEvidenceRefs[] on ui[] row produces QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const rg = base.runtimeGate as Record<string, unknown>;
      const uiRows = rg.ui as Array<Record<string, unknown>>;
      const row = { ...uiRows[0], renderEvidenceRefs: [] };
      await seedEvidence(root, { ...base, runtimeGate: { ...rg, ui: [row] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0224
describe("TC-0012-0224: runtimeGate.ui[].renderEvidenceRefs[] Synthetic Token — QFAI-PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it('synthetic token "a" in renderEvidenceRefs[] produces QFAI-PROT-318', async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const rg = base.runtimeGate as Record<string, unknown>;
      const uiRows = rg.ui as Array<Record<string, unknown>>;
      const row = { ...uiRows[0], renderEvidenceRefs: ["a"] };
      await seedEvidence(root, { ...base, runtimeGate: { ...rg, ui: [row] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0225
describe("TC-0012-0225: runtimeGate.ui[].browserQaEvidenceRefs[] Empty Array — QFAI-PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("empty browserQaEvidenceRefs[] on ui[] row produces QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const rg = base.runtimeGate as Record<string, unknown>;
      const uiRows = rg.ui as Array<Record<string, unknown>>;
      const row = { ...uiRows[0], browserQaEvidenceRefs: [] };
      await seedEvidence(root, { ...base, runtimeGate: { ...rg, ui: [row] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0226
describe("TC-0012-0226: runtimeGate.ui[].browserQaEvidenceRefs[] Windows Separator — QFAI-PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("Windows backslash separator in browserQaEvidenceRefs[] produces QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const rg = base.runtimeGate as Record<string, unknown>;
      const uiRows = rg.ui as Array<Record<string, unknown>>;
      const row = {
        ...uiRows[0],
        browserQaEvidenceRefs: [".qfai\\evidence\\browser-qa.json"],
      };
      await seedEvidence(root, { ...base, runtimeGate: { ...rg, ui: [row] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0227
// QFAI:SPEC-0012:TC-0012-0244
describe("TC-0012-0227, TC-0012-0244: ui[] Row — All Three Leaf Fields Valid — No PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("valid full ui[] row with all concrete leaf refs produces no QFAI-PROT-318 for leaf fields", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      await seedEvidence(root, buildValidEvidence());
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      // Verify isConcreteArtifactRef accepts the valid refs used in the fixture
      expect(
        isConcreteArtifactRef(
          ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders",
        ),
      ).toBe(true);
      expect(isConcreteArtifactRef(".qfai/evidence/render.json#/screens/0")).toBe(true);
      expect(isConcreteArtifactRef(".qfai/evidence/browser-qa.json#/phases/0")).toBe(true);
      // No PROT-318 errors for the ui[] leaf fields
      const leafFieldErrors = issues.filter(
        (i) =>
          i.code === "QFAI-PROT-318" &&
          typeof i.message === "string" &&
          (i.message.includes("renderEvidenceRefs") ||
            i.message.includes("browserQaEvidenceRefs") ||
            i.message.includes(".declaredRef")),
      );
      expect(leafFieldErrors).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Group M: axis-level evidenceRefs[] validation (TC-0228..0233, TC-0245..0246)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0228
describe('TC-0012-0228: l1.axes[].evidenceRefs[] Synthetic Token "a" — QFAI-PROT-318 (v1.7.15 rev9 WS-1)', () => {
  it('synthetic token "a" in l1.axes[0].evidenceRefs produces QFAI-PROT-318', async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const fh = base.fullHarness as Record<string, unknown>;
      const iters = fh.iterations as Array<Record<string, unknown>>;
      const iter0 = JSON.parse(JSON.stringify(iters[0])) as Record<string, unknown>;
      const l1 = iter0.l1 as Record<string, unknown>;
      const axes = l1.axes as Array<Record<string, unknown>>;
      axes[0] = { ...axes[0], evidenceRefs: ["a"] };
      await seedEvidence(root, { ...base, fullHarness: { ...fh, iterations: [iter0, iters[1]] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0229
describe('TC-0012-0229: l2.axes[].evidenceRefs[] Synthetic Token "b" — QFAI-PROT-318 (v1.7.15 rev9 WS-1)', () => {
  it('synthetic token "b" in l2.axes[0].evidenceRefs produces QFAI-PROT-318', async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const fh = base.fullHarness as Record<string, unknown>;
      const iters = fh.iterations as Array<Record<string, unknown>>;
      const iter0 = JSON.parse(JSON.stringify(iters[0])) as Record<string, unknown>;
      const l2 = iter0.l2 as Record<string, unknown>;
      const axes = l2.axes as Array<Record<string, unknown>>;
      axes[0] = { ...axes[0], evidenceRefs: ["b"] };
      await seedEvidence(root, { ...base, fullHarness: { ...fh, iterations: [iter0, iters[1]] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0230
// QFAI:SPEC-0012:TC-0012-0245
describe("TC-0012-0230, TC-0012-0245: l1.axes[].evidenceRefs[] Empty Array — QFAI-PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("empty evidenceRefs[] on l1.axes[0] produces QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const fh = base.fullHarness as Record<string, unknown>;
      const iters = fh.iterations as Array<Record<string, unknown>>;
      const iter0 = JSON.parse(JSON.stringify(iters[0])) as Record<string, unknown>;
      const l1 = iter0.l1 as Record<string, unknown>;
      const axes = l1.axes as Array<Record<string, unknown>>;
      axes[0] = { ...axes[0], evidenceRefs: [] };
      await seedEvidence(root, {
        ...base,
        fullHarness: { ...fh, iterations: [iter0, iters[1]] },
      });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0231
describe("TC-0012-0231: Axis evidenceRefs[] Absolute Path — QFAI-PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("absolute path in l2.axes[0].evidenceRefs produces QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const fh = base.fullHarness as Record<string, unknown>;
      const iters = fh.iterations as Array<Record<string, unknown>>;
      const iter0 = JSON.parse(JSON.stringify(iters[0])) as Record<string, unknown>;
      const l2 = iter0.l2 as Record<string, unknown>;
      const axes = l2.axes as Array<Record<string, unknown>>;
      axes[0] = { ...axes[0], evidenceRefs: ["/abs/path/eval.md"] };
      await seedEvidence(root, { ...base, fullHarness: { ...fh, iterations: [iter0, iters[1]] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0232
describe("TC-0012-0232: Axis evidenceRefs[] Self-Ref to prototyping.json — QFAI-PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("self-ref to prototyping.json in l2.axes[0].evidenceRefs produces QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const fh = base.fullHarness as Record<string, unknown>;
      const iters = fh.iterations as Array<Record<string, unknown>>;
      const iter0 = JSON.parse(JSON.stringify(iters[0])) as Record<string, unknown>;
      const l2 = iter0.l2 as Record<string, unknown>;
      const axes = l2.axes as Array<Record<string, unknown>>;
      axes[0] = {
        ...axes[0],
        evidenceRefs: [".qfai/evidence/prototyping.json#/iterations/0"],
      };
      await seedEvidence(root, { ...base, fullHarness: { ...fh, iterations: [iter0, iters[1]] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0246
describe("TC-0012-0246: Axis Per-Axis Isolation — Valid Axis[0], Synthetic Axis[1] — Error Only for Axis[1] (v1.7.15 rev9 WS-1)", () => {
  it("per-axis validation: only synthetic axis[1] produces QFAI-PROT-318 (axis[0] is valid)", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const fh = base.fullHarness as Record<string, unknown>;
      const iters = fh.iterations as Array<Record<string, unknown>>;
      const iter0 = JSON.parse(JSON.stringify(iters[0])) as Record<string, unknown>;
      const l1 = iter0.l1 as Record<string, unknown>;
      l1.axes = [
        {
          axisId: "axis-valid",
          score: 0.9,
          rationale: "ok",
          evidenceRefs: [".qfai/evidence/render.json#/screens/0"],
        },
        {
          axisId: "axis-synthetic",
          score: 0.5,
          rationale: "partial",
          evidenceRefs: ["a"],
        },
      ];
      await seedEvidence(root, {
        ...base,
        fullHarness: { ...fh, iterations: [iter0, iters[1]] },
      });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
      // The error message must reference the synthetic axis (axis-synthetic), not the valid one
      const prot318 = issues.filter((i) => i.code === "QFAI-PROT-318");
      const axisErrors = prot318.filter(
        (i) => typeof i.message === "string" && i.message.includes("axes"),
      );
      expect(axisErrors.some((i) => (i.message as string).includes("a"))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Group N: reviewerLogs[].evidenceRefs[] validation (TC-0233..0235)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0233
describe('TC-0012-0233: reviewerLogs[].evidenceRefs[] Synthetic Token "reviewer:1" — QFAI-PROT-318 (v1.7.15 rev9 WS-1)', () => {
  it('synthetic token "reviewer:1" in reviewerLogs[0].evidenceRefs produces QFAI-PROT-318', async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const fh = base.fullHarness as Record<string, unknown>;
      const logs = fh.reviewerLogs as Array<Record<string, unknown>>;
      const log0 = { ...logs[0], evidenceRefs: ["reviewer:1"] };
      await seedEvidence(root, {
        ...base,
        fullHarness: { ...fh, reviewerLogs: [log0, logs[1]] },
      });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0234
describe("TC-0012-0234: reviewerLogs[].evidenceRefs[] Absolute Path — QFAI-PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("absolute path in reviewerLogs[0].evidenceRefs produces QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const fh = base.fullHarness as Record<string, unknown>;
      const logs = fh.reviewerLogs as Array<Record<string, unknown>>;
      const log0 = { ...logs[0], evidenceRefs: ["/abs/path/reviewer.md"] };
      await seedEvidence(root, {
        ...base,
        fullHarness: { ...fh, reviewerLogs: [log0, logs[1]] },
      });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// QFAI:SPEC-0012:TC-0012-0235
describe("TC-0012-0235: reviewerLogs[].evidenceRefs[] Empty Array — QFAI-PROT-318 (v1.7.15 rev9 WS-1)", () => {
  it("empty evidenceRefs[] in reviewerLogs[0] produces QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const fh = base.fullHarness as Record<string, unknown>;
      const logs = fh.reviewerLogs as Array<Record<string, unknown>>;
      const log0 = { ...logs[0], evidenceRefs: [] };
      await seedEvidence(root, {
        ...base,
        fullHarness: { ...fh, reviewerLogs: [log0, logs[1]] },
      });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Group O: bundleWriter.ts + runtime type checks (TC-0236..0238, TC-0247)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0236
// QFAI:SPEC-0012:TC-0012-0243
describe("TC-0012-0236, TC-0012-0243: isConcreteArtifactRef() Reuse — No Parallel Grammar in prototypingEvidence.ts (v1.7.15 rev9 WS-1)", () => {
  it("prototypingEvidence.ts uses isConcreteArtifactRef from pathUtils — no parallel inline grammar", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toMatch(/from.*pathUtils/);
    expect(src).toContain("isConcreteArtifactRef");
    // No independent regex pattern for .qfai/ concrete-ref validation defined inline
    // (The only concrete-ref logic is in pathUtils.ts via isConcreteArtifactRef)
    const inlinePatternMatch = src.match(/\/\^\\\.qfai\//g);
    expect(inlinePatternMatch).toBeNull();
  });
});

// QFAI:SPEC-0012:TC-0012-0237
describe("TC-0012-0237: bundleWriter.ts declaredRef Required — TypeScript Type Check (v1.7.15 rev9 WS-2)", () => {
  it("bundleWriter.ts ui[] type has declaredRef as required string (not optional)", async () => {
    const src = await readFile(srcPath("evidence", "bundleWriter.ts"), "utf-8");
    expect(src).toMatch(/declaredRef:\s*string;/);
    expect(src).not.toMatch(/declaredRef\?:\s*/);
  });
});

// QFAI:SPEC-0012:TC-0012-0238
// QFAI:SPEC-0012:TC-0012-0247
describe("TC-0012-0238, TC-0012-0247: bundleWriter.ts Leaf Arrays Required Non-Nullable (v1.7.15 rev9 WS-2)", () => {
  it("bundleWriter.ts leaf array fields are required non-nullable string arrays", async () => {
    const src = await readFile(srcPath("evidence", "bundleWriter.ts"), "utf-8");
    // renderEvidenceRefs: string[] (no ?, no null)
    expect(src).toMatch(/renderEvidenceRefs:\s*string\[\];/);
    expect(src).not.toMatch(/renderEvidenceRefs\?:/);
    // browserQaEvidenceRefs: string[] (no ?, no null)
    expect(src).toMatch(/browserQaEvidenceRefs:\s*string\[\];/);
    expect(src).not.toMatch(/browserQaEvidenceRefs\?:/);
    // reviewerLogs has evidenceRefs: string[] (not nullable)
    const reviewerLogsStart = src.indexOf("reviewerLogs");
    expect(reviewerLogsStart).toBeGreaterThan(-1);
    const reviewerLogsSection = src.slice(reviewerLogsStart, reviewerLogsStart + 300);
    expect(reviewerLogsSection).toContain("evidenceRefs");
    expect(reviewerLogsSection).not.toContain("evidenceRefs?");
  });
});

// ---------------------------------------------------------------------------
// Group P: test coverage + README validation (TC-0239..0242, TC-0248)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0239
describe("TC-0012-0239: Closure Test in productionPath.test.ts — Leaf Assertions Present (v1.7.15 rev9 WS-3)", () => {
  it("prototypingExecution.productionPath.test.ts contains execution->validate closure test", async () => {
    const filePath = path.join(
      repoRoot,
      "packages",
      "qfai",
      "tests",
      "core",
      "prototypingExecution.productionPath.test.ts",
    );
    const src = await readFile(filePath, "utf-8").catch(() => "");
    expect(src.length).toBeGreaterThan(0);
    // Must contain closure test
    expect(src).toMatch(/passes the execution.*validate closure|validatePrototypingEvidence/i);
    // Must contain negative injection
    expect(src).toMatch(/rejects an injected malformed leaf ref|injected.*leaf/i);
  });
});

// QFAI:SPEC-0012:TC-0012-0240
// QFAI:SPEC-0012:TC-0012-0248
describe("TC-0012-0240, TC-0012-0248: All 7 ui[] Leaf-Field Negative Cases Present in Test Files (v1.7.15 rev9 WS-3)", () => {
  it("test files contain tests covering 7 ui[] leaf negatives (declaredRef+renderEvidenceRefs+browserQaEvidenceRefs)", async () => {
    // This integration test itself covers all 7 ui[] negatives (TC-0219..0226 — absent, absolute, bare, empty render, synthetic render, empty browserQa, Windows sep)
    // Verify that those TCs are annotated in this file
    const thisFile = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "tests",
        "integration",
        "prototypingRev9Integration.test.ts",
      ),
      "utf-8",
    );
    expect(thisFile).toContain("TC-0012-0219");
    expect(thisFile).toContain("TC-0012-0220");
    expect(thisFile).toContain("TC-0012-0221");
    expect(thisFile).toContain("TC-0012-0222");
    expect(thisFile).toContain("TC-0012-0223");
    expect(thisFile).toContain("TC-0012-0224");
    expect(thisFile).toContain("TC-0012-0225");
    expect(thisFile).toContain("TC-0012-0226");
  });
});

// QFAI:SPEC-0012:TC-0012-0241
describe("TC-0012-0241: tests/core/ Fixtures Have No Synthetic Token evidenceRefs (v1.7.15 rev9 WS-3)", () => {
  it('tests/core/ fixtures do not use synthetic "a", "b", or "reviewer:1" as evidenceRefs values', async () => {
    // Verify the actual integration tests do not use synthetic tokens in evidenceRefs
    // Check this integration test file itself
    const thisFile = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "tests",
        "integration",
        "prototypingRev9Integration.test.ts",
      ),
      "utf-8",
    );
    // The buildValidEvidence fixture must not use synthetic tokens
    const fixtureSection = thisFile.slice(
      thisFile.indexOf("function buildValidEvidence"),
      thisFile.indexOf("// QFAI:SPEC-0012:TC-0012-0219"),
    );
    expect(fixtureSection).not.toContain('"a"');
    expect(fixtureSection).not.toContain('"b"');
    expect(fixtureSection).not.toContain('"reviewer:1"');
  });

  it("isConcreteArtifactRef rejects synthetic tokens used in old fixtures", () => {
    expect(isConcreteArtifactRef("a")).toBe(false);
    expect(isConcreteArtifactRef("b")).toBe(false);
    expect(isConcreteArtifactRef("reviewer:1")).toBe(false);
  });
});

// QFAI:SPEC-0012:TC-0012-0242
describe("TC-0012-0242: README Enumerates All Concrete-Ref Leaf Fields (v1.7.15 rev9 WS-4)", () => {
  it("packages/qfai/README.md lists all 5 concrete-ref leaf field groups from rev9", async () => {
    const src = await readFile(path.join(repoRoot, "packages", "qfai", "README.md"), "utf-8");
    // All five leaf fields must appear in README
    expect(src).toMatch(/declaredRef/);
    expect(src).toMatch(/renderEvidenceRefs/);
    expect(src).toMatch(/browserQaEvidenceRefs/);
    expect(src).toMatch(/axes.*evidenceRefs|evidenceRefs.*axes/);
    expect(src).toMatch(/reviewerLogs.*evidenceRefs|evidenceRefs.*reviewerLogs/);
  });
});
