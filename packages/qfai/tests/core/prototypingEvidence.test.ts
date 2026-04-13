import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validatePrototypingEvidence } from "../../src/core/validators/prototypingEvidence.js";

async function withTempRoot(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-prot-evidence-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedSpecs(root: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    ["# Spec", "", "- ui_route: /orders", ""].join("\n"),
    "utf-8",
  );
}

async function seedDiscussion(root: string): Promise<void> {
  const packDir = path.join(root, ".qfai", "discussion", "discussion-20260404000000000", "uiux");
  await mkdir(packDir, { recursive: true });
  await writeFile(
    path.join(path.dirname(packDir), "prototyping.yaml"),
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
    path.join(packDir, "40_screen_contracts.md"),
    [
      "# Screen Contracts",
      "",
      "### Screen: Orders",
      "- screen_id: orders",
      "- route: /orders",
      "",
    ].join("\n"),
    "utf-8",
  );
}

async function seedContracts(root: string): Promise<void> {
  const uiRoot = path.join(root, ".qfai", "contracts", "ui");
  await mkdir(uiRoot, { recursive: true });
  await writeFile(
    path.join(uiRoot, "orders.yaml"),
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
}

async function seedRenderBundle(root: string): Promise<void> {
  const renderDir = path.join(root, ".qfai", "evidence", "render");
  await mkdir(renderDir, { recursive: true });
  await writeFile(path.join(renderDir, "orders.desktop.png"), "png", "utf-8");
  await writeFile(path.join(renderDir, "orders.desktop.html"), "<html></html>", "utf-8");
  await writeFile(path.join(renderDir, "orders.mobile.png"), "png", "utf-8");
  await writeFile(path.join(renderDir, "orders.mobile.html"), "<html></html>", "utf-8");
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

async function seedCalibration(root: string): Promise<void> {
  await mkdir(path.join(root, ".qfai", "evidence"), { recursive: true });
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
          mockPaths: [{ id: "orders-missing-empty-state", status: "finding" }],
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
      runId: "fh-1",
      calibrationRef: {
        configPath: "qfai.config.yaml",
        packPath: ".qfai/evidence/calibration.yaml",
        packVersion: "1.7.15",
      },
      iterationCount: 1,
      bestIteration: 1,
      status: "in-progress",
      finalDecision: "pending",
      reviewerSignoff: {
        reviewerId: "qa-reviewer",
        status: "pending",
        source: "cli",
      },
      reviewerLogs: [
        {
          iteration: 1,
          reviewerId: "qa-reviewer",
          verdict: "revise",
          summary: "Iteration 1 requires another pass before terminal signoff.",
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
          limitations: [],
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
              ".qfai/discussion/discussion-20260404000000000/uiux/20_design_eval_invariant.md#discussion-axes-invariant",
            ],
            screenContract: [
              ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders",
            ],
            trend: [".qfai/discussion/discussion-20260404000000000/04_Sources.md#trend-scan"],
          },
          l1: {
            panel: "L1",
            total: 0.9,
            axes: [
              {
                axisId: "runtime",
                score: 0.9,
                rationale: "ok",
                evidenceRefs: [".qfai/evidence/render.json#/screens/0"],
              },
            ],
          },
          l2: {
            panel: "L2",
            total: 0.9,
            axes: [
              {
                axisId: "design",
                score: 0.9,
                rationale: "ok",
                evidenceRefs: [
                  ".qfai/discussion/discussion-20260404000000000/uiux/20_design_eval_invariant.md#axis-1",
                ],
              },
            ],
          },
          weightedTotal: 0.9,
          deltaFromPrevious: null,
          decision: "accept",
        },
      ],
      scoringTrace: [
        {
          iteration: 1,
          l1Total: 0.9,
          l2Total: 0.9,
          weightedTotal: 0.9,
          deltaFromPrevious: null,
          decision: "accept",
          commitSha: "abc0001",
        },
      ],
      limitations: [],
    },
    meta: {
      generatedAt: "2026-04-04T00:00:00.000Z",
      toolVersion: "1.7.15",
      commands: ["qfai prototyping run --mode full-harness"],
    },
    ...overrides,
  };
}

describe("validatePrototypingEvidence", () => {
  it("fails when prototyping evidence files are missing", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-101")).toBe(true);
    });
  });

  it("accepts full-harness UI-only evidence with concrete refs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      await seedEvidence(root, buildValidEvidence());

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues).toEqual([]);
    });
  });

  it("rejects unsupported legacy mode metadata", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedEvidence(
        root,
        buildValidEvidence({
          mode: {
            requested: "standard",
            effective: "standard",
            source: "explicit-request",
            rationale: "legacy mode",
          },
        }),
      );

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-101")).toBe(true);
    });
  });

  it("rejects synthetic runtimeGate/specCoverage refs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      const fullHarness = invalid.fullHarness as {
        iterations: Array<{ evidenceRefs: { runtimeGate: string[]; specCoverage: string[] } }>;
      };
      fullHarness.iterations[0].evidenceRefs.runtimeGate = [".qfai/evidence/render"];
      fullHarness.iterations[0].evidenceRefs.specCoverage = ["specs: spec-0001"];
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-318")).toBe(true);
    });
  });

  it("rejects malformed top-level runtimeGate.evidenceRefs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      (invalid.runtimeGate as { evidenceRefs: string[] }).evidenceRefs = [
        path.join(root, ".qfai", "evidence", "render", "orders.desktop.png"),
      ];
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-318")).toBe(true);
    });
  });

  it("rejects self refs in top-level runtimeGate.evidenceRefs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      (invalid.runtimeGate as { evidenceRefs: string[] }).evidenceRefs = [
        ".qfai/evidence/prototyping.json#/runtimeGate",
      ];
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-318")).toBe(true);
    });
  });

  it("rejects missing runtimeGate.ui[].declaredRef at parse time", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      delete (
        (invalid.runtimeGate as { ui: Array<Record<string, unknown>> }).ui[0] as Record<
          string,
          unknown
        >
      ).declaredRef;
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-101")).toBe(true);
    });
  });

  it("rejects malformed runtimeGate.ui leaf refs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      const row = (invalid.runtimeGate as { ui: Array<Record<string, unknown>> }).ui[0] as Record<
        string,
        unknown
      >;
      row.declaredRef = path.join(root, ".qfai", "specs", "spec-0001", "01_Spec.md");
      row.renderEvidenceRefs = [".qfai/evidence/render"];
      row.browserQaEvidenceRefs = ["browser-qa.json"];
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.filter((item) => item.code === "QFAI-PROT-318").length).toBeGreaterThanOrEqual(
        3,
      );
    });
  });

  it("rejects windows-style runtimeGate.ui browserQa refs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      const row = (invalid.runtimeGate as { ui: Array<Record<string, unknown>> }).ui[0] as Record<
        string,
        unknown
      >;
      (row.browserQaEvidenceRefs as string[])[0] = ".qfai\\evidence\\browser-qa.json#/phases/0";
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-318")).toBe(true);
    });
  });

  it("rejects empty runtimeGate.ui leaf evidence arrays", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      const row = (invalid.runtimeGate as { ui: Array<Record<string, unknown>> }).ui[0] as Record<
        string,
        unknown
      >;
      row.renderEvidenceRefs = [];
      row.browserQaEvidenceRefs = [];
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.filter((item) => item.code === "QFAI-PROT-318").length).toBeGreaterThanOrEqual(
        2,
      );
    });
  });

  it("rejects missing top-level runtimeGate.evidenceRefs at parse time", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      delete (invalid.runtimeGate as Record<string, unknown>).evidenceRefs;
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-101")).toBe(true);
    });
  });

  it("rejects empty top-level runtimeGate.evidenceRefs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      (invalid.runtimeGate as { evidenceRefs: string[] }).evidenceRefs = [];
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-177")).toBe(true);
    });
  });

  it("rejects non-concrete per-spec coverage declaredRef", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      (
        (invalid.specs as Array<Record<string, unknown>>)[0]?.coverageRefs as Array<
          Record<string, unknown>
        >
      )[0].declaredRef = path.join(root, ".qfai", "specs", "spec-0001", "01_Spec.md");
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-318")).toBe(true);
    });
  });

  it("rejects non-concrete fullHarness axis evidence refs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      const iteration = (invalid.fullHarness as { iterations: Array<Record<string, unknown>> })
        .iterations[0] as Record<string, unknown>;
      const l1Axis = (
        (iteration.l1 as Record<string, unknown>).axes as Array<Record<string, unknown>>
      )[0] as Record<string, unknown>;
      const l2Axis = (
        (iteration.l2 as Record<string, unknown>).axes as Array<Record<string, unknown>>
      )[0] as Record<string, unknown>;
      (l1Axis.evidenceRefs as string[])[0] = "a";
      (l2Axis.evidenceRefs as string[])[0] = ".qfai/evidence/prototyping.json#/fullHarness";
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.filter((item) => item.code === "QFAI-PROT-318").length).toBeGreaterThanOrEqual(
        2,
      );
    });
  });

  it("rejects empty fullHarness axis evidence refs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      const iteration = (invalid.fullHarness as { iterations: Array<Record<string, unknown>> })
        .iterations[0] as Record<string, unknown>;
      const l1Axis = (
        (iteration.l1 as Record<string, unknown>).axes as Array<Record<string, unknown>>
      )[0] as Record<string, unknown>;
      l1Axis.evidenceRefs = [];
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-318")).toBe(true);
    });
  });

  it("rejects non-concrete reviewer log evidence refs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      const log = (invalid.fullHarness as { reviewerLogs: Array<Record<string, unknown>> })
        .reviewerLogs[0] as Record<string, unknown>;
      (log.evidenceRefs as string[])[0] = "reviewer:1";
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-318")).toBe(true);
    });
  });

  it("rejects empty reviewer log evidence refs", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      const log = (invalid.fullHarness as { reviewerLogs: Array<Record<string, unknown>> })
        .reviewerLogs[0] as Record<string, unknown>;
      log.evidenceRefs = [];
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-318")).toBe(true);
    });
  });

  it("rejects mismatched reviewer semantics", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      await seedEvidence(
        root,
        buildValidEvidence({
          fullHarness: {
            ...(buildValidEvidence().fullHarness as Record<string, unknown>),
            finalDecision: "abandoned",
            reviewerSignoff: {
              reviewerId: "qa-reviewer",
              status: "approved",
              timestamp: "2026-04-04T00:00:00Z",
              source: "cli",
            },
            reviewerLogs: [
              {
                iteration: 1,
                reviewerId: "qa-reviewer",
                verdict: "approve",
                summary: "mismatched",
                evidenceRefs: [".qfai/evidence/render.json#/screens/0"],
              },
            ],
          },
        }),
      );

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-316")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-PROT-317")).toBe(true);
    });
  });

  it("rejects mismatched calibration metadata", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      await seedEvidence(
        root,
        buildValidEvidence({
          fullHarness: {
            ...(buildValidEvidence().fullHarness as Record<string, unknown>),
            calibrationRef: {
              configPath: "custom.config.yaml",
              packPath: ".qfai/evidence/calibration.yaml",
              packVersion: "9.9.9",
            },
          },
        }),
      );

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-320")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-PROT-321")).toBe(true);
    });
  });

  it("rejects non-terminal accepted or approved semantics", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      await seedEvidence(
        root,
        buildValidEvidence({
          fullHarness: {
            ...(buildValidEvidence().fullHarness as Record<string, unknown>),
            finalDecision: "accepted",
            reviewerSignoff: {
              reviewerId: "qa-reviewer",
              status: "approved",
              source: "cli",
            },
          },
        }),
      );

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-322")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-PROT-323")).toBe(true);
    });
  });

  it("rejects terminationReason on in-progress fullHarness", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      await seedEvidence(
        root,
        buildValidEvidence({
          fullHarness: {
            ...(buildValidEvidence().fullHarness as Record<string, unknown>),
            terminationReason: "plateau",
          },
        }),
      );

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-324")).toBe(true);
    });
  });

  it("rejects route-slug screen contract refs in runtimeGate and iteration evidence", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      (
        (invalid.runtimeGate as { ui: Array<Record<string, unknown>> }).ui[0] as Record<
          string,
          unknown
        >
      ).declaredRef =
        ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#screen:orders";
      (
        (
          (invalid.fullHarness as { iterations: Array<Record<string, unknown>> })
            .iterations[0] as Record<string, unknown>
        ).evidenceRefs as Record<string, string[]>
      ).screenContract = [
        ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#screen:orders",
      ];
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-326")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-PROT-327")).toBe(true);
    });
  });

  it("rejects non-spec declaredRef even when it is concrete", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      (
        (invalid.specs as Array<Record<string, unknown>>)[0]?.coverageRefs as Array<
          Record<string, unknown>
        >
      )[0].declaredRef =
        ".qfai/discussion/discussion-20260404000000000/uiux/40_screen_contracts.md#orders";
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-328")).toBe(true);
    });
  });

  it.each([
    ["render", "render", "specs:render"],
    ["browserQa", "browserQa", "/abs/browser-qa.json#/phases/0"],
    ["uiObservation", "uiObservation", ".qfai/evidence/prototyping.json#/uiObservation"],
    ["discussion", "discussion", "discussion-axes"],
    ["trend", "trend", ".qfai\\evidence\\trend.md#trend"],
  ] as const)(
    "rejects non-concrete iteration evidenceRefs.%s",
    async (_label, category, badRef) => {
      await withTempRoot(async (root) => {
        await seedSpecs(root);
        await seedDiscussion(root);
        await seedContracts(root);
        await seedCalibration(root);
        await seedRenderBundle(root);
        await seedBrowserQaBundle(root);
        const invalid = buildValidEvidence();
        const iteration = (invalid.fullHarness as { iterations: Array<Record<string, unknown>> })
          .iterations[0] as Record<string, unknown>;
        (iteration.evidenceRefs as Record<string, string[]>)[category] = [badRef];
        await seedEvidence(root, invalid);

        const issues = await validatePrototypingEvidence(root, defaultConfig);
        expect(issues.some((item) => item.code === "QFAI-PROT-318")).toBe(true);
      });
    },
  );

  it.each([
    "render",
    "browserQa",
    "uiObservation",
    "discussion",
    "screenContract",
    "trend",
  ] as const)("rejects empty iteration evidenceRefs.%s", async (category) => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      const iteration = (invalid.fullHarness as { iterations: Array<Record<string, unknown>> })
        .iterations[0] as Record<string, unknown>;
      (iteration.evidenceRefs as Record<string, string[]>)[category] = [];
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(
        issues.some((item) => item.code === "QFAI-PROT-314" || item.code === "QFAI-PROT-318"),
      ).toBe(true);
    });
  });

  it("rejects status=completed when reviewerSignoff is still pending", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      const fh = invalid.fullHarness as Record<string, unknown>;
      fh.status = "completed";
      fh.terminationReason = "converged";
      fh.finalDecision = "accepted";
      (fh.reviewerSignoff as Record<string, unknown>).status = "pending";
      delete (fh.reviewerSignoff as Record<string, unknown>).timestamp;
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((item) => item.code === "QFAI-PROT-325")).toBe(true);
      expect(issues.some((item) => item.code === "QFAI-PROT-329")).toBe(true);
    });
  });

  it("rejects status=completed when finalDecision and reviewerSignoff disagree", async () => {
    await withTempRoot(async (root) => {
      await seedSpecs(root);
      await seedDiscussion(root);
      await seedContracts(root);
      await seedCalibration(root);
      await seedRenderBundle(root);
      await seedBrowserQaBundle(root);
      const invalid = buildValidEvidence();
      const fh = invalid.fullHarness as Record<string, unknown>;
      fh.status = "completed";
      fh.terminationReason = "converged";
      fh.finalDecision = "accepted";
      const signoff = fh.reviewerSignoff as Record<string, unknown>;
      signoff.status = "rejected";
      signoff.timestamp = "2026-04-04T00:00:00Z";
      await seedEvidence(root, invalid);

      const issues = await validatePrototypingEvidence(root, defaultConfig);
      // expectedSignoffStatus mismatch — finalDecision=accepted requires approved
      expect(issues.some((item) => item.message.includes("reviewerSignoff.status"))).toBe(true);
    });
  });
});
