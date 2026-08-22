/**
 * `### Change Type` printed `decision entries: 0` for a tree full of deltas.
 *
 * `parseDeltaV1` reads one shape only (`## Decision Log` / `### DL-` /
 * `#### Meta`), and the shipped template did not carry it, so every populated
 * `09_delta.md` parsed to nothing and the whole section reported zeros while
 * `delta coverage: ok (issues=0)` sat underneath it (#545).
 *
 * A count has to name the input it counted: "no delta was classified" and
 * "deltas were read and could not be counted" are different claims, and only
 * the second one is a defect the author can act on. That disclosure is tracked
 * per file — a whole-tree `totalEntries === 0` test goes quiet as soon as one
 * spec adopts the current template — and it reaches `issues`, `summary.counts`
 * and `deltaCoverage.status`, not the Markdown prose alone, so a consumer
 * reading the JSON is not told the run was clean.
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createReportData, formatReportMarkdown } from "../../src/core/report.js";
import type { ValidationResult } from "../../src/core/types.js";

// tests/core/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SHIPPED_DELTA_TEMPLATE = path.join(
  repoRoot,
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/spec/09_delta.md",
);

/** The shape the shipped template used to teach: no `## Decision Log` at all. */
const UNPARSABLE_DELTA = `# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-08-22
- Primary: Behavior
- Tags: @api
- Summary: something real happened here
`;

const PARSABLE_DELTA = `# 09 Delta

## Decision Log

### DL-0001

#### Meta

\`\`\`yaml
id: DL-0001
date: 2026-08-22
primary: Behavior
tags: ["@api"]
compat: Change
scope:
  - src/core/report.ts
notes: something real happened here
\`\`\`
`;

const NOTE_MARKER = "yielded no counted decision entry";
const SCAN_CODE = "QFAI-CTYPE-004";

/** A validation run that found nothing, so the report's own findings stand alone. */
const EMPTY_VALIDATION: ValidationResult = {
  toolVersion: "0.0.0-test",
  issues: [],
  counts: { info: 0, warning: 0, error: 0 },
  traceability: {
    sc: { total: 0, covered: 0, missing: 0, missingIds: [], refs: {} },
    testFiles: { globs: [], excludeGlobs: [], matchedFileCount: 0, truncated: false, limit: 0 },
  },
};

/**
 * Builds a project whose spec packs carry the given deltas.
 *
 * Keyed by spec id so a tree can mix a delta the parser reads with one it does
 * not — the case a whole-tree zero check cannot see.
 */
async function withProject<T>(
  deltas: Record<string, string>,
  fn: (root: string) => Promise<T>,
): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-deltascan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specIds = Object.keys(deltas).length > 0 ? Object.keys(deltas) : ["spec-0001"];
  try {
    for (const specId of specIds) {
      const specDir = path.join(root, ".qfai", "specs", specId);
      await mkdir(specDir, { recursive: true });
      for (const [name, body] of [
        ["01_Spec.md", "# Spec\n"],
        ["02_User-stories.md", "# US\n"],
        ["03_Acceptance-Criteria.md", "# AC\n"],
        ["05_Examples.md", "# 05 Examples\n\n| EX-ID | BR-Ref |\n| --- | --- |\n"],
        ["06_Test-Cases.md", "# TC\n"],
      ] as const) {
        await writeFile(path.join(specDir, name), body, "utf-8");
      }
      const delta = deltas[specId];
      if (delta !== undefined) {
        await writeFile(path.join(specDir, "09_delta.md"), delta, "utf-8");
      }
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("the Change Type summary names the input it counted", () => {
  it("says which delta files were read when none of them parses", async () => {
    await withProject({ "spec-0001": UNPARSABLE_DELTA }, async (root) => {
      const data = await createReportData(root);

      expect(data.changeType.summary.deltaFilesScanned).toBe(1);
      expect(data.changeType.summary.totalEntries).toBe(0);
      expect(data.changeType.summary.uncountedDeltaFiles).toEqual([
        { file: ".qfai/specs/spec-0001/09_delta.md", reason: "unparsed" },
      ]);

      const markdown = formatReportMarkdown(data);
      expect(markdown).toContain("- delta files scanned: 1");
      expect(markdown).toContain("- decision entries: 0");
      expect(markdown).toContain(NOTE_MARKER);
      expect(markdown).toContain(".qfai/specs/spec-0001/09_delta.md");
    });
  });

  it("does not cry wolf when there is no delta file to read", async () => {
    await withProject({}, async (root) => {
      const data = await createReportData(root);

      expect(data.changeType.summary.deltaFilesScanned).toBe(0);
      expect(data.changeType.summary.uncountedDeltaFiles).toEqual([]);
      expect(data.changeType.deltaCoverage.status).toBe("ok");

      const markdown = formatReportMarkdown(data);
      expect(markdown).toContain("- delta files scanned: 0");
      expect(markdown).not.toContain(NOTE_MARKER);
    });
  });

  it("stays quiet once the delta carries the structure the parser reads", async () => {
    await withProject({ "spec-0001": PARSABLE_DELTA }, async (root) => {
      const data = await createReportData(root);

      expect(data.changeType.summary.deltaFilesScanned).toBe(1);
      expect(data.changeType.summary.totalEntries).toBe(1);
      expect(data.changeType.summary.primary.Behavior).toBe(1);
      expect(data.changeType.summary.compat.Change).toBe(1);
      expect(data.changeType.summary.uncountedDeltaFiles).toEqual([]);
      expect(data.changeType.deltaCoverage.status).toBe("ok");
      expect(data.issues.filter((issue) => issue.code === SCAN_CODE)).toEqual([]);

      const markdown = formatReportMarkdown(data);
      expect(markdown).toContain("- delta files scanned: 1");
      expect(markdown).not.toContain(NOTE_MARKER);
    });
  });

  it("still warns when only some of the delta files parse", async () => {
    // The case `totalEntries === 0` cannot see: the first spec to adopt the new
    // template takes the total positive, and every other delta goes silent.
    await withProject(
      { "spec-0001": PARSABLE_DELTA, "spec-0002": UNPARSABLE_DELTA },
      async (root) => {
        const data = await createReportData(root);

        expect(data.changeType.summary.deltaFilesScanned).toBe(2);
        expect(data.changeType.summary.totalEntries).toBe(1);
        expect(data.changeType.summary.uncountedDeltaFiles).toEqual([
          { file: ".qfai/specs/spec-0002/09_delta.md", reason: "unparsed" },
        ]);

        const markdown = formatReportMarkdown(data);
        expect(markdown).toContain("- decision entries: 1");
        expect(markdown).toContain(NOTE_MARKER);
        expect(markdown).toContain(".qfai/specs/spec-0002/09_delta.md");
      },
    );
  });

  it("does not count the unfilled template as a decision", async () => {
    // The shipped skeleton carries all seven Meta keys and real `primary` /
    // `compat` values on purpose, so counting it would publish
    // `Initial 1 / @docs 1 / Improvement 1` for a spec that decided nothing —
    // and the fabricated 1 would suppress the disclosure above.
    const template = await readFile(SHIPPED_DELTA_TEMPLATE, "utf-8");
    await withProject({ "spec-0001": template }, async (root) => {
      const data = await createReportData(root);

      expect(data.changeType.summary.totalEntries).toBe(0);
      expect(data.changeType.summary.primary.Initial).toBe(0);
      expect(data.changeType.summary.compat.Improvement).toBe(0);
      expect(data.changeType.summary.tags["@docs"]).toBe(0);
      expect(data.changeType.summary.uncountedDeltaFiles).toEqual([
        { file: ".qfai/specs/spec-0001/09_delta.md", reason: "placeholder" },
      ]);

      expect(formatReportMarkdown(data)).toContain(NOTE_MARKER);
    });
  });
});

describe("an uncounted delta file is a finding, not only prose", () => {
  it("reaches issues, summary.counts and deltaCoverage", async () => {
    await withProject(
      { "spec-0001": PARSABLE_DELTA, "spec-0002": UNPARSABLE_DELTA },
      async (root) => {
        // An empty validation result, so every count below is the report's own
        // contribution rather than whatever the fixture tree happens to trip.
        const data = await createReportData(root, EMPTY_VALIDATION);

        const findings = data.issues.filter((issue) => issue.code === SCAN_CODE);
        expect(findings).toHaveLength(1);
        expect(findings[0]?.severity).toBe("warning");
        expect(findings[0]?.category).toBe("change");
        expect(findings[0]?.file).toBe(".qfai/specs/spec-0002/09_delta.md");

        // The gate reads counts, not the Markdown body.
        expect(data.summary.counts).toEqual({ info: 0, warning: 1, error: 0 });
        expect(data.changeType.deltaCoverage.status).toBe("delta-not-counted");
        expect(data.changeType.deltaCoverage.uncountedDeltaFiles).toBe(1);

        const markdown = formatReportMarkdown(data);
        expect(markdown).toContain("- fail-on=warning: FAIL");
        expect(markdown).toContain(SCAN_CODE);
      },
    );
  });
});
