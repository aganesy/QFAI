import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { writeValidateRunLog } from "../../src/core/runLog.js";
import type { ValidationResult } from "../../src/core/types.js";
import { buildLayeredTraceabilityGraph } from "../../src/core/validators/traceability.js";

// The graph feeds the per-run `traceability.json` artifact. It used to be built
// only for the v1416 layered style, so every spec written in the current v1421
// table layout produced `{nodes: [], edges: []}` — the artifact was empty exactly
// when the spec pack was healthy and modern.
describe("buildLayeredTraceabilityGraph", () => {
  it("walks a v1421 spec pack and emits typed EX/TC edges", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-trace-graph-"));
    try {
      await seedV1421Spec(root, "0006");

      const graph = await buildLayeredTraceabilityGraph(root, defaultConfig);

      expect(layersOf(graph.nodes)).toEqual(["AC", "BR", "EX", "TC", "US"]);
      expect(graph.nodes.map((node) => node.id)).toContain("US-0006-0001");
      expect(graph.nodes.find((node) => node.id === "TC-0006-0001")?.path).toBe(
        ".qfai/specs/spec-0006/06_Test-Cases.md",
      );

      expect(graph.edges).toContainEqual({
        from: "BR-0006-0001",
        to: "AC-0006-0001",
        type: "BR_TO_AC",
      });
      expect(graph.edges).toContainEqual({
        from: "EX-0006-0001",
        to: "BR-0006-0001",
        type: "EX_TO_BR",
      });
      expect(graph.edges).toContainEqual({
        from: "TC-0006-0001",
        to: "EX-0006-0001",
        type: "TC_TO_EX",
      });
      expect(graph.edges).toContainEqual({
        from: "TC-0006-0001",
        to: "AC-0006-0001",
        type: "TC_TO_AC",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps composite spec-local IDs intact instead of collapsing them per spec", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-trace-graph-"));
    try {
      await seedV1421Spec(root, "0006");

      const graph = await buildLayeredTraceabilityGraph(root, defaultConfig);
      const acIds = graph.nodes.filter((node) => node.layer === "AC").map((node) => node.id);

      expect(acIds).toEqual(["AC-0006-0001", "AC-0006-0002"]);
      expect(acIds).not.toContain("AC-0006");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still walks the v1416 SC/CASE vocabulary", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-trace-graph-"));
    try {
      await seedV1416Spec(root, "0001");

      const graph = await buildLayeredTraceabilityGraph(root, defaultConfig);

      expect(layersOf(graph.nodes)).toEqual(["AC", "BR", "CASE", "SC", "US"]);
      expect(graph.edges).toContainEqual({
        from: "AC-0001-0001",
        to: "US-0001-0001",
        type: "AC_TO_US",
      });
      expect(graph.edges).toContainEqual({
        from: "CASE-0001-0001",
        to: "SC-0001-0001",
        type: "CASE_TO_SC",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // Item IDs are file-local and the shipped templates start every spec at
  // `US-0001` / `AC-0001`, so two short-form specs collide on the raw ID. Keying
  // the graph on it dropped the second spec's nodes and overwrote its
  // same-shaped edges.
  it("namespaces short spec-local IDs so two specs cannot overwrite each other", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-trace-graph-"));
    try {
      await seedShortIdSpec(root, "0001");
      await seedShortIdSpec(root, "0002");

      const graph = await buildLayeredTraceabilityGraph(root, defaultConfig);
      const acNodes = graph.nodes.filter((node) => node.layer === "AC");

      expect(acNodes.map((node) => node.id)).toEqual(["spec-0001/AC-0001", "spec-0002/AC-0001"]);
      expect(acNodes.map((node) => node.path)).toEqual([
        ".qfai/specs/spec-0001/03_Acceptance-Criteria.md",
        ".qfai/specs/spec-0002/03_Acceptance-Criteria.md",
      ]);

      // Both specs' identically-shaped edges survive.
      for (const specNumber of ["0001", "0002"]) {
        expect(graph.edges).toContainEqual({
          from: `spec-${specNumber}/BR-0001`,
          to: `spec-${specNumber}/AC-0001`,
          type: "BR_TO_AC",
        });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("types a v1417 EX edge by the parent's own layer", async () => {
    // `validateExamplesParentFormat` accepts `BR-XXXX` **or** `AC-XXXX`, so
    // labelling every EX edge `EX_TO_BR` left an edge whose `to` is an AC node
    // claiming a BR target — a hierarchy any consumer of `type` reads wrong.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-trace-graph-"));
    try {
      await seedV1417Spec(root, "0005");

      const graph = await buildLayeredTraceabilityGraph(root, defaultConfig);
      const exEdges = graph.edges.filter((edge) => edge.from.includes("EX-"));

      expect(exEdges).toContainEqual({
        from: "spec-0005/EX-0001",
        to: "spec-0005/BR-0001",
        type: "EX_TO_BR",
      });
      expect(exEdges).toContainEqual({
        from: "spec-0005/EX-0002",
        to: "spec-0005/AC-0001",
        type: "EX_TO_AC",
      });
      // The AC-parented example must not also claim a BR target.
      expect(exEdges).not.toContainEqual({
        from: "spec-0005/EX-0002",
        to: "spec-0005/AC-0001",
        type: "EX_TO_BR",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns an empty graph when there is no spec pack, without throwing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-trace-graph-"));
    try {
      await mkdir(path.join(root, ".qfai", "specs"), { recursive: true });

      await expect(buildLayeredTraceabilityGraph(root, defaultConfig)).resolves.toEqual({
        nodes: [],
        edges: [],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("traceability.json merges finding-derived IDs into the graph namespace", () => {
  /** A minimal result carrying one finding with a short ref. */
  const resultWith = (issues: ValidationResult["issues"]): ValidationResult =>
    ({
      toolVersion: "0.0.0",
      profile: "full",
      issues,
      counts: { error: 0, warning: 0, info: issues.length },
      traceability: {
        sc: { total: 0, covered: 0, missingIds: [], refs: {} },
        testFiles: { matched: 0, truncated: false, limit: 0, globs: [] },
      },
    }) as unknown as ValidationResult;

  it("qualifies a short ref with the spec that owns the finding's file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-trace-runlog-"));
    try {
      await seedShortIdSpec(root, "0001");
      await seedShortIdSpec(root, "0002");

      const runLog = await writeValidateRunLog({
        root,
        config: defaultConfig,
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        result: resultWith([
          {
            code: "TRACE_DOWNSTREAM_REF",
            severity: "info",
            category: "canonical",
            message: "x",
            file: path.join(root, ".qfai/specs/spec-0002/03_Acceptance-Criteria.md"),
            refs: ["AC-0001"],
          },
          {
            code: "QFAI-LAYER-100",
            severity: "info",
            category: "canonical",
            message: "y",
            file: path.join(root, ".qfai/specs/_policies/01_Objective.md"),
            refs: ["CAP-0001"],
          },
        ]),
      });

      const body: unknown = JSON.parse(
        await readFile(path.join(runLog.reportDir, "traceability.json"), "utf-8"),
      );
      const nodes =
        typeof body === "object" && body !== null && "nodes" in body && Array.isArray(body.nodes)
          ? (body.nodes as Array<{ id: string }>)
          : [];
      const ids = nodes.map((node) => node.id);

      // The graph's own node for that AC — the finding must land ON it, not
      // beside it, or two specs' findings merge onto one unqualified node.
      expect(ids).toContain("spec-0002/AC-0001");
      expect(ids).not.toContain("AC-0001");
      // A repo-level finding has no owning spec and stays unqualified, exactly
      // as the graph leaves policy-level IDs.
      expect(ids).toContain("CAP-0001");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

function layersOf(nodes: Array<{ layer: string }>): string[] {
  return Array.from(new Set(nodes.map((node) => node.layer))).sort();
}

async function seedV1421Spec(root: string, specNumber: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });

  await write(specDir, "01_Spec.md", ["# 01 Spec", "", `- Spec: spec-${specNumber}`]);
  await write(specDir, "02_User-stories.md", [
    "# 02 User Stories",
    "",
    "## US Catalog",
    "",
    `- US-${specNumber}-0001: first story`,
    `- US-${specNumber}-0002: second story`,
  ]);
  await write(specDir, "03_Acceptance-Criteria.md", [
    "# 03 Acceptance Criteria",
    "",
    "```gherkin",
    `# AC-${specNumber}-0001`,
    "Scenario: first",
    "```",
    "",
    "```gherkin",
    `# AC-${specNumber}-0002`,
    "Scenario: second",
    "```",
  ]);
  await write(specDir, "04_Business-Rules.md", [
    "# 04 Business Rules",
    "",
    "| BR-ID             | Title  | AC-Refs           | Rule   |",
    "| ----------------- | ------ | ----------------- | ------ |",
    `| BR-${specNumber}-0001 | rule-1 | AC-${specNumber}-0001 | body-1 |`,
    `| BR-${specNumber}-0002 | rule-2 | AC-${specNumber}-0002 | body-2 |`,
  ]);
  await write(specDir, "05_Examples.md", [
    "# 05 Examples",
    "",
    "| EX-ID             | BR-Ref            | Input   | Expected   |",
    "| ----------------- | ----------------- | ------- | ---------- |",
    `| EX-${specNumber}-0001 | BR-${specNumber}-0001 | input-1 | expected-1 |`,
    `| EX-${specNumber}-0002 | BR-${specNumber}-0002 | input-2 | expected-2 |`,
  ]);
  await write(specDir, "06_Test-Cases.md", [
    "# 06 Test Cases",
    "",
    "| TC-ID             | Level | AC-Refs           | EX-Ref            | Title   |",
    "| ----------------- | ----- | ----------------- | ----------------- | ------- |",
    `| TC-${specNumber}-0001 | L2    | AC-${specNumber}-0001 | EX-${specNumber}-0001 | title-1 |`,
    `| TC-${specNumber}-0002 | L2    | AC-${specNumber}-0002 | EX-${specNumber}-0002 | title-2 |`,
  ]);
}

/** v1421 pack written the way the shipped templates do: file-local short IDs. */
async function seedShortIdSpec(root: string, specNumber: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });

  await write(specDir, "01_Spec.md", ["# 01 Spec"]);
  await write(specDir, "02_User-stories.md", ["# 02 User Stories", "", "- US-0001: a story"]);
  await write(specDir, "03_Acceptance-Criteria.md", [
    "# 03 Acceptance Criteria",
    "",
    "```gherkin",
    "# AC-0001",
    "Scenario: first",
    "```",
  ]);
  await write(specDir, "04_Business-Rules.md", [
    "# 04 Business Rules",
    "",
    "| BR-ID   | Title  | AC-Refs | Rule   |",
    "| ------- | ------ | ------- | ------ |",
    "| BR-0001 | rule-1 | AC-0001 | body-1 |",
  ]);
  await write(specDir, "05_Examples.md", [
    "# 05 Examples",
    "",
    "| EX-ID   | BR-Ref  | Input   | Expected   |",
    "| ------- | ------- | ------- | ---------- |",
    "| EX-0001 | BR-0001 | input-1 | expected-1 |",
  ]);
  await write(specDir, "06_Test-Cases.md", [
    "# 06 Test Cases",
    "",
    "| TC-ID   | Level | AC-Refs | EX-Ref  | Title   |",
    "| ------- | ----- | ------- | ------- | ------- |",
    "| TC-0001 | L2    | AC-0001 | EX-0001 | title-1 |",
  ]);
}

async function seedV1416Spec(root: string, specNumber: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });

  await write(specDir, "01_User-stories.md", [
    "# 01 User Stories",
    "",
    "| US-ID             | Title   |",
    "| ----------------- | ------- |",
    `| US-${specNumber}-0001 | story-1 |`,
  ]);
  await write(specDir, "02_Acceptance-criteria.md", [
    "# 02 Acceptance Criteria",
    "",
    "| AC-ID             | US-Ref            | Title |",
    "| ----------------- | ----------------- | ----- |",
    `| AC-${specNumber}-0001 | US-${specNumber}-0001 | ac-1  |`,
  ]);
  await write(specDir, "03_Business-rules.md", [
    "# 03 Business Rules",
    "",
    "| BR-ID             | AC-Ref            | Rule   |",
    "| ----------------- | ----------------- | ------ |",
    `| BR-${specNumber}-0001 | AC-${specNumber}-0001 | body-1 |`,
  ]);
  await write(specDir, "04_Examples.feature", [
    "Feature: examples",
    "",
    `@SC-${specNumber}-0001`,
    "Scenario: covered",
    `  # AC: AC-${specNumber}-0001`,
    "  Given condition",
    "  When action",
    "  Then result",
  ]);
  await write(specDir, "05_Test-cases.md", [
    "# 05 Test Cases",
    "",
    "| CASE-ID             | SC-Ref            | Title  |",
    "| ------------------- | ----------------- | ------ |",
    `| CASE-${specNumber}-0001 | SC-${specNumber}-0001 | case-1 |`,
  ]);
}

/** v1417 pack: `05_Examples.feature` with `- Parent:` comments per scenario. */
async function seedV1417Spec(root: string, specNumber: string): Promise<void> {
  const specDir = path.join(root, ".qfai", "specs", `spec-${specNumber}`);
  await mkdir(specDir, { recursive: true });

  await write(specDir, "01_Spec.md", ["# 01 Spec"]);
  await write(specDir, "02_User-stories.md", ["# 02 User Stories", "", "## US-0001", "", "- x"]);
  await write(specDir, "03_Acceptance-criteria.md", [
    "# 03 Acceptance Criteria",
    "",
    "## AC-0001",
    "",
    "- Parent: US-0001",
  ]);
  await write(specDir, "04_Business-rules.md", [
    "# 04 Business Rules",
    "",
    "## BR-0001",
    "",
    "- Parent: AC-0001",
  ]);
  await write(specDir, "05_Examples.feature", [
    "Feature: examples",
    "",
    "  @EX-0001",
    "  # Parent: BR-0001",
    "  Scenario: br parented",
    "    Given a precondition",
    "",
    "  @EX-0002",
    "  # Parent: AC-0001",
    "  Scenario: ac parented",
    "    Given a precondition",
  ]);
  await write(specDir, "06_Test-cases.md", [
    "# 06 Test Cases",
    "",
    "## TC-0001",
    "",
    "- Parent: EX-0001",
  ]);
}

async function write(dir: string, name: string, lines: string[]): Promise<void> {
  await writeFile(path.join(dir, name), `${lines.join("\n")}\n`, "utf-8");
}
