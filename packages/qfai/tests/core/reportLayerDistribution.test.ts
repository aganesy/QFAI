/**
 * `### Layer distribution` printed 0 in every bucket.
 *
 * `Layer` is a hard-required column of `tdd/test-list.md` — validation refuses a
 * ledger without the header — but the one layer surface qfai ships was computed
 * from Gherkin `@layer-*` scenario tags in `entry.examplesPath`, which on the
 * v1421 layered layout is the **Markdown** `05_Examples.md`. The Gherkin parse
 * failed, the error was swallowed by `continue`, and every bucket reported zero
 * — while the toolkit mandates layer routing and gates completion on it.
 *
 * Zeros with no source named are the worst form of this: they read as "no tests
 * at any layer", which is a different claim from "nothing could be read".
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createReportData, formatReportMarkdown } from "../../src/core/report.js";

const LEDGER = `# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |
| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |
| TDD-0001 | TC-0001 | Unit | tests/unit/a.test.ts | a | done | - | ok |
| TDD-0002 | TC-0002 | Unit | tests/unit/b.test.ts | b | todo | - | - |
| TDD-0003 | TC-0003 | Integration | tests/integration/c.test.ts | c | todo | - | - |
| TDD-0004 | - | E2E | tests/e2e/d.test.ts | d | todo | - | - |
| TDD-0005 | TC-0005 | System | tests/unit/e.test.ts | e | todo | - | - |
| TDD-0006 | TC-0006 | - | tests/unit/f.test.ts | f | todo | - | - |
`;

async function withProject<T>(
  fn: (root: string) => Promise<T>,
  opts: { ledger?: string; examples?: string; spec?: string; config?: string } = {},
): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-layerdist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(path.join(specDir, "tdd"), { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", opts.spec ?? "# Spec\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["05_Examples.md", opts.examples ?? "# 05 Examples\n\n| EX-ID | BR-Ref |\n| --- | --- |\n"],
      ["06_Test-Cases.md", "# TC\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    if (opts.ledger !== undefined) {
      await writeFile(path.join(specDir, "tdd", "test-list.md"), opts.ledger, "utf-8");
    }
    if (opts.config !== undefined) {
      await writeFile(path.join(root, "qfai.config.yaml"), opts.config, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** A project that set the two E2E knobs, as `qfai.config.yaml` documents them. */
function configWith(knobs: { ratio?: number; count?: number }): string {
  const lines = ["validation:", "  testStrategy:"];
  if (knobs.ratio !== undefined) lines.push(`    maxE2eScenarioRatio: ${String(knobs.ratio)}`);
  if (knobs.count !== undefined) lines.push(`    maxE2eScenarioCount: ${String(knobs.count)}`);
  return `${lines.join("\n")}\n`;
}

describe("the layer distribution reads the artifact the templates produce", () => {
  it("counts the ledger's Layer column when no Gherkin scenario parses", async () => {
    await withProject(
      async (root) => {
        const data = await createReportData(root);
        const report = { testStrategy: data.testStrategy, markdown: formatReportMarkdown(data) };
        expect(report.testStrategy.layerSource).toBe("ledger-layer");
        expect(report.testStrategy.layer.unit).toBe(2);
        expect(report.testStrategy.layer.integration).toBe(1);
        expect(report.testStrategy.layer.e2e).toBe(1);
      },
      { ledger: LEDGER },
    );
  });

  /**
   * The total and the E2E count follow the histogram, because the two knobs are
   * compared against THEM and not against the buckets.
   *
   * Until they did, the report contradicted itself — six buckets summing to six
   * beside `totalScenarios: 0` — and the contradiction was load-bearing:
   * `maxE2eScenarioRatio` and `maxE2eScenarioCount` were measured against zero
   * on the layered layout, which is the normal shape for a project whose E2E
   * lives in code rather than in Gherkin. A project could set either knob, read
   * it back in `qfai.config.yaml`, and never be told anything (#1197).
   */
  describe("the E2E knobs measure what the ledger says", () => {
    it("carries the ledger's totals, so the buckets and the total agree", async () => {
      await withProject(
        async (root) => {
          const data = await createReportData(root);
          const buckets = Object.values(data.testStrategy.layer).reduce((a, b) => a + b, 0);
          expect(data.testStrategy.totalScenarios).toBe(buckets);
          expect(data.testStrategy.totalScenarios).toBe(6);
          expect(data.testStrategy.e2e.count).toBe(1);
          expect(data.testStrategy.e2e.ratio).toBeCloseTo(1 / 6);
        },
        { ledger: LEDGER },
      );
    });

    it("fires the count knob on a ledger the Gherkin path cannot see", async () => {
      await withProject(
        async (root) => {
          const data = await createReportData(root);
          expect(data.testStrategy.e2e.maxCount).toBe(0);
          expect(data.testStrategy.e2e.countExceeded).toBe(true);
        },
        { ledger: LEDGER, config: configWith({ count: 0 }) },
      );
    });

    it("fires the ratio knob too", async () => {
      await withProject(
        async (root) => {
          const data = await createReportData(root);
          // 1 of 6 rows is E2E; a project asking for at most 10% is over.
          expect(data.testStrategy.e2e.ratioExceeded).toBe(true);
        },
        { ledger: LEDGER, config: configWith({ ratio: 0.1 }) },
      );
    });

    it("leaves a ledger inside the budget alone", async () => {
      await withProject(
        async (root) => {
          const data = await createReportData(root);
          expect(data.testStrategy.e2e.countExceeded).toBe(false);
          expect(data.testStrategy.e2e.ratioExceeded).toBe(false);
        },
        { ledger: LEDGER, config: configWith({ count: 1, ratio: 0.5 }) },
      );
    });

    it("still reports nothing when neither source exists", async () => {
      // `layerSource: "none"` is not "no E2E tests" — it is "nothing could be
      // read", and a knob must not read the second as the first.
      await withProject(
        async (root) => {
          const data = await createReportData(root);
          expect(data.testStrategy.layerSource).toBe("none");
          expect(data.testStrategy.totalScenarios).toBe(0);
          expect(data.testStrategy.e2e.countExceeded).toBe(false);
        },
        { config: configWith({ count: 0 }) },
      );
    });
  });

  it("buckets an empty cell as `none`, not as nothing", async () => {
    await withProject(
      async (root) => {
        const data = await createReportData(root);
        const report = { testStrategy: data.testStrategy, markdown: formatReportMarkdown(data) };
        expect(report.testStrategy.layer.none).toBe(1);
      },
      { ledger: LEDGER },
    );
  });

  it("buckets a value outside the vocabulary as `unknown`", async () => {
    // Dropping it would understate the ledger; `TDDLIST_UNKNOWN_LAYER` already
    // reports the value itself.
    await withProject(
      async (root) => {
        const data = await createReportData(root);
        const report = { testStrategy: data.testStrategy, markdown: formatReportMarkdown(data) };
        expect(report.testStrategy.layer.unknown).toBe(1);
      },
      { ledger: LEDGER },
    );
  });

  it("names the source it used", async () => {
    await withProject(
      async (root) => {
        const data = await createReportData(root);
        const report = { testStrategy: data.testStrategy, markdown: formatReportMarkdown(data) };
        expect(report.markdown).toContain("- source: `Layer` column of `tdd/test-list.md`");
      },
      { ledger: LEDGER },
    );
  });

  it("leaves a retired spec's ledger out of the distribution", async () => {
    // `validate` has stopped gating on these rows; counting them here would
    // present a retired spec's history as the repository's current test mix.
    await withProject(
      async (root) => {
        const data = await createReportData(root);
        const report = { testStrategy: data.testStrategy, markdown: formatReportMarkdown(data) };
        expect(report.testStrategy.layerSource).toBe("none");
        expect(report.testStrategy.layer.unit).toBe(0);
      },
      { ledger: LEDGER, spec: "# Spec\n\n- Status: deprecated\n- Deprecated-at: 2026-01-01\n" },
    );
  });

  it("leaves a retired spec's scenarios out of the distribution too", async () => {
    // The scenario path runs first and one readable file suppresses the ledger
    // fallback entirely, so counting a retired spec's `@layer-*` scenarios both
    // mixed its history into the current test mix and stopped every active
    // layered spec's `Layer` column from being read at all.
    await withProject(
      async (root) => {
        const data = await createReportData(root);
        expect(data.testStrategy.totalScenarios).toBe(0);
        expect(data.testStrategy.layer.e2e).toBe(0);
        expect(data.testStrategy.layerSource).toBe("none");
        // The headline count reads the same list. Filtering only inside
        // `collectTestStrategy` left one report stating two scenario totals —
        // `totalScenarios` 0 beside `summary.scenarios` 1, the second of them
        // a retired spec's history counted as current work.
        expect(data.summary.scenarios).toBe(0);
      },
      {
        ledger: LEDGER,
        spec: "# Spec\n\n- Status: deprecated\n- Deprecated-at: 2026-01-01\n",
        examples: [
          "Feature: retired",
          "",
          "  @layer-e2e @size-s",
          "  Scenario: history",
          "    Given a retired spec",
          "",
        ].join("\n"),
      },
    );
  });

  it("still counts the scenarios of an active spec", async () => {
    // The guard above must key on the lifecycle, not on the file.
    await withProject(
      async (root) => {
        const data = await createReportData(root);
        expect(data.testStrategy.totalScenarios).toBe(1);
        expect(data.testStrategy.layer.e2e).toBe(1);
        expect(data.testStrategy.layerSource).toBe("scenario-tags");
        expect(data.summary.scenarios).toBe(1);
      },
      {
        ledger: LEDGER,
        spec: "# Spec\n\n- Status: active\n",
        examples: [
          "Feature: current",
          "",
          "  @layer-e2e @size-s",
          "  Scenario: live",
          "    Given an active spec",
          "",
        ].join("\n"),
      },
    );
  });

  it("leaves a retired spec's SC IDs out of SC Coverage as well", async () => {
    // SC coverage is computed inside `validateProject` and only carried into
    // the report, so filtering the report's own list left one report saying two
    // things: `summary.scenarios` 0 beside an SC Coverage total of 1 whose
    // `missingIds` demanded tests for a retired obligation — and `scSources`,
    // built from the active list, could name no file those IDs came from.
    await withProject(
      async (root) => {
        const data = await createReportData(root);
        expect(data.summary.scenarios).toBe(0);
        expect(data.traceability.sc.total).toBe(0);
        expect(data.traceability.sc.missingIds).toEqual([]);
        expect(Object.keys(data.traceability.scSources)).toEqual([]);
      },
      {
        ledger: LEDGER,
        spec: "# Spec\n\n- Status: deprecated\n- Deprecated-at: 2026-01-01\n",
        examples: [
          "Feature: retired",
          "",
          "  @layer-e2e @size-s @SC-0001-0001",
          "  Scenario: history",
          "    Given a retired spec",
          "",
        ].join("\n"),
      },
    );
  });

  it("still reports an active spec's SC IDs as coverage", async () => {
    // The over-correction pin: SC Coverage must keep gating on the specs that
    // are still current, so an uncovered SC ID stays in `missingIds`.
    await withProject(
      async (root) => {
        const data = await createReportData(root);
        expect(data.summary.scenarios).toBe(1);
        expect(data.traceability.sc.total).toBe(1);
        expect(data.traceability.sc.missingIds).toEqual(["SC-0001-0001"]);
      },
      {
        ledger: LEDGER,
        spec: "# Spec\n\n- Status: active\n",
        examples: [
          "Feature: current",
          "",
          "  @layer-e2e @size-s @SC-0001-0001",
          "  Scenario: live",
          "    Given an active spec",
          "",
        ].join("\n"),
      },
    );
  });

  it("says so when nothing could be read, instead of reporting zeros silently", async () => {
    await withProject(async (root) => {
      const data = await createReportData(root);
      const report = { testStrategy: data.testStrategy, markdown: formatReportMarkdown(data) };
      expect(report.testStrategy.layerSource).toBe("none");
      expect(report.markdown).toContain("no readable `Layer` column");
    });
  });
});
