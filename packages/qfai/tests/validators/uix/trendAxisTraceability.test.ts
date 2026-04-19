import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateTrendAxisTraceability } from "../../../src/core/validators/uix/trendAxisTraceability.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-trend-axis-trace-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

// UI-bearing classification block that passes validated parsing.
function completeContext(): string {
  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: true",
    "- primary_surface: web",
    "- secondary_surfaces:",
    "  - mobile",
    "- classification_rationale: Primary workflow is screen-based.",
    "",
  ].join("\n");
}

// Non-UI classification block.
function nonUiContext(): string {
  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: false",
    "- primary_surface: non-ui",
    "- secondary_surfaces:",
    "- classification_rationale: API-only workflow.",
    "",
  ].join("\n");
}

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
  await writeFile(path.join(root, "01_Context.md"), completeContext(), "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

type EntryOpts = {
  sourceId: string;
  evaluationConnection?: string | null; // null = omit field entirely
};

function entry(opts: EntryOpts): string {
  const lines: string[] = [
    `#### Entry ${opts.sourceId}`,
    "",
    `- source_id: ${opts.sourceId}`,
    "- reference: https://example.com",
    "- observation: Concrete trend observation.",
    "- decision_connection: Influences which option should be selected.",
  ];
  if (opts.evaluationConnection !== null) {
    lines.push(`- evaluation_connection: ${opts.evaluationConnection ?? ""}`);
  }
  lines.push("- local_implication: Concrete local implication.");
  lines.push("");
  return lines.join("\n");
}

type TrendScanOpts = {
  userExpectationEntries?: string[];
  productNeighborEntries?: string[];
  platformConventionEntries?: string[];
  accessibilityEntries?: string[];
  visualEntries?: string[]; // extra "### color" category for T04 fixtures
};

function buildSources(opts: TrendScanOpts): string {
  const ueEntries = opts.userExpectationEntries ?? [];
  const pnEntries = opts.productNeighborEntries ?? [];
  const pcEntries = opts.platformConventionEntries ?? [];
  const acEntries = opts.accessibilityEntries ?? [];
  const vEntries = opts.visualEntries ?? [];

  const sections: string[] = [
    "# 04 Sources",
    "",
    "## Source Registry",
    "",
    "## Trend Scan",
    "",
    "### user expectation / market norm",
    "",
    ...ueEntries,
    "### product neighbor / comparable flow",
    "",
    ...pnEntries,
    "### platform convention",
    "",
    ...pcEntries,
    "### accessibility / compliance relevant signal",
    "",
    ...acEntries,
  ];

  if (vEntries.length > 0) {
    sections.push("### color");
    sections.push("");
    sections.push(...vEntries);
  }

  sections.push("## Competitive Reference Registry");
  sections.push("");
  sections.push("## Traceability");
  sections.push("");

  return sections.join("\n");
}

type AxisOpts = {
  id: string; // e.g., "TRD-01"
  name?: string;
  origin?: string;
  intent?: string;
  sourceRefs?: string[];
};

function axis(opts: AxisOpts): string {
  const refs = opts.sourceRefs ?? [];
  const refLines = refs.length > 0 ? refs.map((ref) => `  - ${ref}`) : ["  - none"];
  return [
    `### Axis: [${opts.id}]`,
    "",
    `- axis_id: ${opts.id}`,
    `- axis_name: ${opts.name ?? "Progressive Disclosure"}`,
    "- layer: trend-derived",
    `- origin: ${opts.origin ?? "industry trend"}`,
    `- intent: ${opts.intent ?? "measures task efficiency"}`,
    "- why_it_matters: business/user impact",
    "- score_scale: 1-5",
    "- score_anchors:",
    "  - low: 1 poor",
    "  - mid: 3 acceptable",
    "  - high: 5 excellent",
    "- source_refs:",
    ...refLines,
    "",
  ].join("\n");
}

function buildAxes(axes: string[]): string {
  return [
    "# Evaluation Layer: Trend-derived",
    "",
    "## Layer Classification",
    "",
    "- Layer: trend-derived",
    "",
    "## Axes",
    "",
    ...axes,
  ].join("\n");
}

async function writePack(root: string, sources: string, axesContent: string | null): Promise<void> {
  await writeFile(path.join(root, "04_Sources.md"), sources, "utf-8");
  if (axesContent !== null) {
    await writeFile(
      path.join(root, "uiux", "21_design_eval_trend_derived.md"),
      axesContent,
      "utf-8",
    );
  }
}

describe("validateTrendAxisTraceability", () => {
  // QFAI:SPEC-0014:TC-0014-0020 — T01 missing evaluation_connection fires ERROR
  it("TC-0014-0020: fires UIX-VAL-T01 ERROR when evaluation_connection is missing", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const sources = buildSources({
      userExpectationEntries: [entry({ sourceId: "SRC-1", evaluationConnection: null })],
      productNeighborEntries: [entry({ sourceId: "SRC-2", evaluationConnection: "TRD-01" })],
      platformConventionEntries: [entry({ sourceId: "SRC-3", evaluationConnection: "TRD-01" })],
      accessibilityEntries: [entry({ sourceId: "SRC-4", evaluationConnection: "TRD-01" })],
    });
    const axes = buildAxes([
      axis({ id: "TRD-01", sourceRefs: ["SRC-1", "SRC-2", "SRC-3", "SRC-4"] }),
    ]);
    await writePack(root, sources, axes);

    const issues = await validateTrendAxisTraceability(root, defaultConfig);
    const t01 = issues.filter((i) => i.code === "UIX-VAL-T01");
    expect(t01).toHaveLength(1);
    expect(t01[0]?.severity).toBe("error");
    expect(t01[0]?.message).toContain("evaluation_connection");
    expect(t01[0]?.message).toContain("SRC-1");
    expect(t01[0]?.file).toBe("04_Sources.md");
  });

  // QFAI:SPEC-0014:TC-0014-0021 — T01 all present passes
  it("TC-0014-0021: emits zero UIX-VAL-T01 when all evaluation_connection are present", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const sources = buildSources({
      userExpectationEntries: [entry({ sourceId: "SRC-1", evaluationConnection: "TRD-01" })],
      productNeighborEntries: [entry({ sourceId: "SRC-2", evaluationConnection: "TRD-01" })],
      platformConventionEntries: [entry({ sourceId: "SRC-3", evaluationConnection: "TRD-01" })],
      accessibilityEntries: [entry({ sourceId: "SRC-4", evaluationConnection: "TRD-01" })],
    });
    const axes = buildAxes([
      axis({ id: "TRD-01", sourceRefs: ["SRC-1", "SRC-2", "SRC-3", "SRC-4"] }),
    ]);
    await writePack(root, sources, axes);

    const issues = await validateTrendAxisTraceability(root, defaultConfig);
    expect(issues.filter((i) => i.code === "UIX-VAL-T01")).toHaveLength(0);
  });

  // QFAI:SPEC-0014:TC-0014-0022 — T01 empty string boundary
  it("TC-0014-0022: fires UIX-VAL-T01 ERROR when evaluation_connection is empty string", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const sources = buildSources({
      userExpectationEntries: [entry({ sourceId: "SRC-1", evaluationConnection: "" })],
      productNeighborEntries: [entry({ sourceId: "SRC-2", evaluationConnection: "TRD-01" })],
      platformConventionEntries: [entry({ sourceId: "SRC-3", evaluationConnection: "TRD-01" })],
      accessibilityEntries: [entry({ sourceId: "SRC-4", evaluationConnection: "TRD-01" })],
    });
    const axes = buildAxes([
      axis({ id: "TRD-01", sourceRefs: ["SRC-1", "SRC-2", "SRC-3", "SRC-4"] }),
    ]);
    await writePack(root, sources, axes);

    const issues = await validateTrendAxisTraceability(root, defaultConfig);
    const t01 = issues.filter((i) => i.code === "UIX-VAL-T01");
    expect(t01).toHaveLength(1);
    expect(t01[0]?.severity).toBe("error");
    expect(t01[0]?.message).toContain("SRC-1");
  });

  // QFAI:SPEC-0014:TC-0014-0023 — T02 dangling evaluation_connection fires ERROR
  it("TC-0014-0023: fires UIX-VAL-T02 ERROR when evaluation_connection references unknown TRD", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const sources = buildSources({
      userExpectationEntries: [entry({ sourceId: "SRC-1", evaluationConnection: "TRD-99" })],
      productNeighborEntries: [entry({ sourceId: "SRC-2", evaluationConnection: "TRD-01" })],
      platformConventionEntries: [entry({ sourceId: "SRC-3", evaluationConnection: "TRD-01" })],
      accessibilityEntries: [entry({ sourceId: "SRC-4", evaluationConnection: "TRD-02" })],
    });
    const axes = buildAxes([
      axis({ id: "TRD-01", sourceRefs: ["SRC-1", "SRC-2", "SRC-3"] }),
      axis({ id: "TRD-02", sourceRefs: ["SRC-4"] }),
    ]);
    await writePack(root, sources, axes);

    const issues = await validateTrendAxisTraceability(root, defaultConfig);
    const t02 = issues.filter((i) => i.code === "UIX-VAL-T02");
    expect(t02).toHaveLength(1);
    expect(t02[0]?.severity).toBe("error");
    expect(t02[0]?.message).toContain("TRD-99");
    expect(t02[0]?.file).toBe("04_Sources.md");
  });

  // QFAI:SPEC-0014:TC-0014-0024 — T03 dangling source_refs fires WARNING
  it("TC-0014-0024: fires UIX-VAL-T03 WARNING when axis source_refs references unknown source", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const sources = buildSources({
      userExpectationEntries: [entry({ sourceId: "SRC-1", evaluationConnection: "TRD-01" })],
      productNeighborEntries: [entry({ sourceId: "SRC-2", evaluationConnection: "TRD-02" })],
      platformConventionEntries: [entry({ sourceId: "SRC-3", evaluationConnection: "TRD-01" })],
      accessibilityEntries: [entry({ sourceId: "SRC-4", evaluationConnection: "TRD-02" })],
    });
    const axes = buildAxes([
      axis({ id: "TRD-01", sourceRefs: ["SRC-1", "SRC-3"] }),
      axis({ id: "TRD-02", sourceRefs: ["SRC-TREND-77"] }),
    ]);
    await writePack(root, sources, axes);

    const issues = await validateTrendAxisTraceability(root, defaultConfig);
    const t03 = issues.filter((i) => i.code === "UIX-VAL-T03");
    expect(t03).toHaveLength(1);
    expect(t03[0]?.severity).toBe("warning");
    expect(t03[0]?.message).toContain("SRC-TREND-77");
    expect(t03[0]?.file).toBe("uiux/21_design_eval_trend_derived.md");
  });

  // QFAI:SPEC-0014:TC-0014-0025 — T04 visual trend without visual axis fires WARNING
  it("TC-0014-0025: fires UIX-VAL-T04 WARNING when visual trend entry has no visual axis", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const sources = buildSources({
      userExpectationEntries: [entry({ sourceId: "SRC-1", evaluationConnection: "TRD-01" })],
      productNeighborEntries: [entry({ sourceId: "SRC-2", evaluationConnection: "TRD-01" })],
      platformConventionEntries: [entry({ sourceId: "SRC-3", evaluationConnection: "TRD-01" })],
      accessibilityEntries: [entry({ sourceId: "SRC-4", evaluationConnection: "TRD-01" })],
      // `color` category entry — counts as visual category per heuristic.
      visualEntries: [entry({ sourceId: "SRC-COLOR-1", evaluationConnection: "TRD-01" })],
    });
    // All axes are behavioral — no 'visual' token in origin/intent/axis_name.
    const axes = buildAxes([
      axis({
        id: "TRD-01",
        name: "Progressive Disclosure",
        origin: "industry trend research",
        intent: "measures task efficiency and behavioral flow",
        sourceRefs: ["SRC-1", "SRC-2", "SRC-3", "SRC-4", "SRC-COLOR-1"],
      }),
    ]);
    await writePack(root, sources, axes);

    const issues = await validateTrendAxisTraceability(root, defaultConfig);
    const t04 = issues.filter((i) => i.code === "UIX-VAL-T04");
    expect(t04).toHaveLength(1);
    expect(t04[0]?.severity).toBe("warning");
    expect(t04[0]?.file).toBe("04_Sources.md");
    expect(t04[0]?.message.toLowerCase()).toContain("visual");
  });

  // Non-UI safety smoke (de-risks TC-0014-0030)
  it("non-UI pack yields zero issues across T01..T04", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
    await writeFile(path.join(root, "01_Context.md"), nonUiContext(), "utf-8");
    // Intentionally write violating content — validator must skip on non-UI.
    const sources = buildSources({
      userExpectationEntries: [entry({ sourceId: "SRC-1", evaluationConnection: null })],
    });
    await writeFile(path.join(root, "04_Sources.md"), sources, "utf-8");

    const issues = await validateTrendAxisTraceability(root, defaultConfig);
    expect(issues).toEqual([]);
  });
});

// ─── TC-0010-0048: UIX-VAL-T04 severity constant is "warning" ────────────────

describe("TC-0048 — UIX-VAL-T04 severity is warning per NFR-0007", () => {
  // QFAI:SPEC-0010:TC-0010-0048
  it("UIX-VAL-T04 severity resolves to 'warning' (staged introduction, not error)", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    // Visual category entry with a valid evaluation_connection (so T01/T02 don't fire)
    const sources = buildSources({
      visualEntries: [
        "#### Entry VIS-01\n\n- source_id: SRC-V01\n- evaluation_connection: TRD-01\n",
      ],
    });
    await writeFile(path.join(root, "04_Sources.md"), sources, "utf-8");

    // No visual axis in TRD file → T04 must fire
    const trdContent = [
      "# Evaluation Layer: Trend-derived",
      "",
      "## Axes",
      "",
      "### Axis: TRD-01 — Typography Hierarchy",
      "",
      "- axis_id: TRD-01",
      "- source_refs: [SRC-V01]",
      "- weight: 0.15",
      "",
    ].join("\n");
    await writeFile(
      path.join(root, "uiux", "21_design_eval_trend_derived.md"),
      trdContent,
      "utf-8",
    );

    const issues = await validateTrendAxisTraceability(root, defaultConfig);
    const t04Issues = issues.filter((i) => i.code === "UIX-VAL-T04");

    expect(t04Issues.length, "UIX-VAL-T04 should have fired").toBeGreaterThan(0);
    for (const issue of t04Issues) {
      expect(issue.severity).toBe("warning");
    }
  });
});
