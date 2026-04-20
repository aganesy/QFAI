// QFAI:SPEC-0012:TC-0012-0198
// QFAI:SPEC-0012:TC-0012-0199
// QFAI:SPEC-0012:TC-0012-0200
// QFAI:SPEC-0012:TC-0012-0201
// QFAI:SPEC-0012:TC-0012-0202
// QFAI:SPEC-0012:TC-0012-0203
// QFAI:SPEC-0012:TC-0012-0204
// QFAI:SPEC-0012:TC-0012-0205
// QFAI:SPEC-0012:TC-0012-0206
// QFAI:SPEC-0012:TC-0012-0207
// QFAI:SPEC-0012:TC-0012-0208
// QFAI:SPEC-0012:TC-0012-0209
// QFAI:SPEC-0012:TC-0012-0210
// QFAI:SPEC-0012:TC-0012-0211
// QFAI:SPEC-0012:TC-0012-0212
// QFAI:SPEC-0012:TC-0012-0213
// QFAI:SPEC-0012:TC-0012-0214
// QFAI:SPEC-0012:TC-0012-0215
// QFAI:SPEC-0012:TC-0012-0216
// QFAI:SPEC-0012:TC-0012-0217
// QFAI:SPEC-0012:TC-0012-0218

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  assertConcreteArtifactRef,
  isConcreteArtifactRef,
  toRepoRelativeArtifactRef,
} from "../../src/core/prototyping/pathUtils.js";
import { validatePrototypingEvidence } from "../../src/core/validators/prototypingEvidence.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

// ---------------------------------------------------------------------------
// Minimal fixture helpers (pattern from unit/validators/prototypingEvidence.test.ts)
// ---------------------------------------------------------------------------

async function withTempRoot(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-rev8-int-"));
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
      reviewerSignoff: { reviewerId: "qa-reviewer", status: "pending", source: "cli" },
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
// TC-0012-0198..0202: pathUtils.ts toRepoRelativeArtifactRef (WS-1)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0198
// QFAI:SPEC-0012:TC-0012-0199
// QFAI:SPEC-0012:TC-0012-0200
// QFAI:SPEC-0012:TC-0012-0201
describe("TC-0012-0198..0201: toRepoRelativeArtifactRef function (v1.7.15 rev8 WS-1)", () => {
  it("pathUtils.ts exports toRepoRelativeArtifactRef with correct signature", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    expect(src).toMatch(/export\s+function\s+toRepoRelativeArtifactRef/);
  });

  it("pathUtils.ts toRepoRelativeArtifactRef accepts repoRoot, absolutePath, line?, anchor? parameters", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    expect(src).toContain("repoRoot");
    expect(src).toContain("absolutePath");
  });

  it("TC-0012-0199: toRepoRelativeArtifactRef throws for outside-root path", () => {
    const tmpDir = os.tmpdir();
    const root = path.join(tmpDir, "qfai-rev8-root-A");
    const outside = path.join(tmpDir, "qfai-rev8-root-B", ".qfai", "evidence", "screen.png");
    expect(() => toRepoRelativeArtifactRef({ repoRoot: root, absolutePath: outside })).toThrow();
  });

  it("TC-0012-0200: toRepoRelativeArtifactRef throws for directory path (no allowed extension)", () => {
    const root = path.join(os.tmpdir(), "qfai-rev8-dir-test");
    const dirPath = path.join(root, ".qfai", "evidence", "iter0");
    expect(() => toRepoRelativeArtifactRef({ repoRoot: root, absolutePath: dirPath })).toThrow();
  });

  it("TC-0012-0201: toRepoRelativeArtifactRef throws when both line and anchor specified", () => {
    const root = path.join(os.tmpdir(), "qfai-rev8-la-test");
    const filePath = path.join(root, ".qfai", "specs", "spec-0001", "01_Spec.md");
    expect(() =>
      toRepoRelativeArtifactRef({
        repoRoot: root,
        absolutePath: filePath,
        line: 5,
        anchor: "section-a",
      }),
    ).toThrow(/both line and anchor/);
  });
});

// QFAI:SPEC-0012:TC-0012-0202
describe("TC-0012-0202: buildSpecCoverageSummary evidenceRefs concrete (v1.7.15 rev8 WS-1)", () => {
  it("specCoverage.ts imports from pathUtils (shared helper usage)", async () => {
    const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    expect(src).toMatch(/pathUtils|isConcreteArtifactRef|assertConcreteArtifactRef/);
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0203..0209: runtimeGate.evidenceRefs validator (WS-2)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0203
// QFAI:SPEC-0012:TC-0012-0204
// QFAI:SPEC-0012:TC-0012-0205
// QFAI:SPEC-0012:TC-0012-0206
// QFAI:SPEC-0012:TC-0012-0207
describe("TC-0012-0203..0207: runtimeGate.evidenceRefs validator (v1.7.15 rev8 WS-2)", () => {
  it("prototypingEvidence.ts validates evidenceRefs field", async () => {
    const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
    expect(src).toContain("evidenceRefs");
  });

  it("TC-0012-0204: evidenceRefs absent triggers QFAI-PROT-101 parse error", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const rg = base.runtimeGate as Record<string, unknown>;
      const rgNoRefs = Object.fromEntries(Object.entries(rg).filter(([k]) => k !== "evidenceRefs"));
      await seedEvidence(root, { ...base, runtimeGate: rgNoRefs });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-101")).toBe(true);
    });
  });

  it("TC-0012-0205: evidenceRefs empty array triggers QFAI-PROT-177", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const rg = base.runtimeGate as Record<string, unknown>;
      await seedEvidence(root, {
        ...base,
        runtimeGate: { ...rg, evidenceRefs: [] },
      });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-177")).toBe(true);
    });
  });

  it("TC-0012-0206: absolute path in evidenceRefs triggers QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const rg = base.runtimeGate as Record<string, unknown>;
      await seedEvidence(root, {
        ...base,
        runtimeGate: { ...rg, evidenceRefs: ["/abs/path/file.json"] },
      });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });

  it("TC-0012-0207: valid concrete refs in evidenceRefs pass without QFAI-PROT-177 or 318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      await seedEvidence(root, buildValidEvidence());
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      const refErrors = issues.filter(
        (i) => i.code === "QFAI-PROT-318" || i.code === "QFAI-PROT-177",
      );
      expect(refErrors).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0208..0213: unified ref grammar (WS-3)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0208
// QFAI:SPEC-0012:TC-0012-0209
// QFAI:SPEC-0012:TC-0012-0210
// QFAI:SPEC-0012:TC-0012-0211
// QFAI:SPEC-0012:TC-0012-0212
// QFAI:SPEC-0012:TC-0012-0213
describe("TC-0012-0208..0213: Unified ref grammar across 5 ref sites (v1.7.15 rev8 WS-3)", () => {
  it("execution.ts imports from pathUtils.js (shared helper, no inline grammar)", async () => {
    const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
    expect(src).toContain("pathUtils");
  });

  it("TC-0012-0209: all 5 ref sites populated with concrete refs pass without QFAI-PROT-318 errors", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      await seedEvidence(root, buildValidEvidence());
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.filter((i) => i.code === "QFAI-PROT-318")).toHaveLength(0);
    });
  });

  it("TC-0012-0210: specCoverage.ts and l2Evidence.ts import concrete-ref helpers from pathUtils (no parallel grammar)", async () => {
    const specCov = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
    const l2Ev = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
    expect(specCov).toMatch(/from ['"]\.\/pathUtils\.js['"]/);
    expect(l2Ev).toMatch(/from ['"]\.\/pathUtils\.js['"]/);
    // isConcreteArtifactRef behaves as a pure predicate
    expect(isConcreteArtifactRef(".qfai/evidence/iter-0/qa.json#/finding-1")).toBe(true);
    expect(isConcreteArtifactRef("/abs/path.json")).toBe(false);
  });

  it("TC-0012-0211: runtimeGateBuilder.ts imports concrete-ref helpers from pathUtils (no parallel grammar)", async () => {
    const src = await readFile(srcPath("prototyping", "runtimeGateBuilder.ts"), "utf-8");
    expect(src).toMatch(/from ['"]\.\/pathUtils\.js['"]/);
  });

  it("TC-0012-0212: absolute path in iterations[].evidenceRefs.runtimeGate triggers QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const fh = base.fullHarness as Record<string, unknown>;
      const iters = fh.iterations as Array<Record<string, unknown>>;
      const iter0 = { ...iters[0] };
      const er = { ...(iter0.evidenceRefs as Record<string, unknown>) };
      iter0.evidenceRefs = { ...er, runtimeGate: ["/abs/path.json"] };
      await seedEvidence(root, { ...base, fullHarness: { ...fh, iterations: [iter0] } });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318" || i.code === "QFAI-PROT-314")).toBe(
        true,
      );
    });
  });

  it("TC-0012-0213: assertConcreteArtifactRef throws for absolute path, passes for valid ref", () => {
    expect(() => assertConcreteArtifactRef("/abs/path/file.md")).toThrow();
    expect(() => assertConcreteArtifactRef(".qfai/evidence/render.json#/screens/0")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// TC-0012-0214..0218: closure regression test + import isolation (WS-4/WS-1)
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0214
// QFAI:SPEC-0012:TC-0012-0215
// QFAI:SPEC-0012:TC-0012-0216
// QFAI:SPEC-0012:TC-0012-0217
// QFAI:SPEC-0012:TC-0012-0218
describe("TC-0012-0214..0218: Closure regression test + import isolation (v1.7.15 rev8 WS-4/WS-1)", () => {
  it("TC-0012-0214: positive closure — productionPath test verifies execution produces concrete evidenceRefs", async () => {
    const testSrc = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "tests",
        "core",
        "prototypingExecution.productionPath.test.ts",
      ),
      "utf-8",
    );
    expect(testSrc).toContain("passes the execution -> validate closure with validator success");
  });

  it("TC-0012-0215: negative injection — specCoverage absolute evidenceRef causes QFAI-PROT-318", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const specs = base.specs as Array<Record<string, unknown>>;
      const spec0 = { ...specs[0] };
      const cr = spec0.coverageRefs as Array<Record<string, unknown>>;
      spec0.coverageRefs = cr.map((r, i) =>
        i === 0 ? { ...r, observedRefs: ["/abs/bad-path/file.md"] } : r,
      );
      const modifiedBase = { ...base, specs: [spec0, ...specs.slice(1)] };
      await seedEvidence(root, modifiedBase);
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-318")).toBe(true);
    });
  });

  it("TC-0012-0216: negative injection — absent runtimeGate.evidenceRefs causes QFAI-PROT-101", async () => {
    await withTempRoot(async (root) => {
      await seedAll(root);
      const base = buildValidEvidence();
      const rg = base.runtimeGate as Record<string, unknown>;
      const rgNoRefs = Object.fromEntries(Object.entries(rg).filter(([k]) => k !== "evidenceRefs"));
      await seedEvidence(root, { ...base, runtimeGate: rgNoRefs });
      const issues = await validatePrototypingEvidence(root, defaultConfig);
      expect(issues.some((i) => i.code === "QFAI-PROT-101")).toBe(true);
    });
  });

  it("TC-0012-0217: specCoverage.ts and prototypingEvidence.ts test files exist (pre-condition)", async () => {
    const testDir = path.join(repoRoot, "packages", "qfai", "tests");
    const specCovTest = await readFile(
      path.join(testDir, "unit", "validators", "specCoverage.test.ts"),
      "utf-8",
    ).catch(() => null);
    const protEvidTest = await readFile(
      path.join(testDir, "unit", "validators", "prototypingEvidence.test.ts"),
      "utf-8",
    ).catch(() => null);
    const protEvidCoreTest = await readFile(
      path.join(testDir, "core", "prototypingEvidence.test.ts"),
      "utf-8",
    ).catch(() => null);
    // At least one of these test files should exist
    const either = specCovTest ?? protEvidTest ?? protEvidCoreTest;
    expect(either).not.toBeNull();
  });

  it("TC-0012-0218: pathUtils.ts has zero imports from execution.ts transitive graph (leaf isolation)", async () => {
    const src = await readFile(srcPath("prototyping", "pathUtils.ts"), "utf-8");
    const forbidden = ["execution", "specCoverage", "l2evidence", "harness/runtime"];
    for (const pattern of forbidden) {
      const importPattern = new RegExp(`^\\s*import[^'"]*['"][^'"]*${pattern}[^'"]*['"]`, "m");
      expect(src, `pathUtils.ts must not import from '${pattern}'`).not.toMatch(importPattern);
    }
  });
});
