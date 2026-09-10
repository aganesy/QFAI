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
import { validateProject } from "../../src/core/validate.js";

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

/**
 * One real decision beside two the counters cannot use.
 *
 * `DL-0002` is the shipped skeleton, `DL-0003` is a `#### Meta` block missing
 * `compat` / `scope` / `notes`. A file-level check calls this file healthy
 * because `DL-0001` counts, and the two decisions it under-reports appear
 * nowhere.
 */
const PARTIALLY_COUNTED_DELTA = `# 09 Delta

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

### DL-0002

#### Meta

\`\`\`yaml
id: DL-0002
date: YYYY-MM-DD
primary: Initial
tags: ["@docs"]
compat: Improvement
scope:
  - <file / module this decision touches>
notes: <what was decided and why>
\`\`\`

### DL-0003

#### Meta

\`\`\`yaml
id: DL-0003
date: 2026-08-22
primary: Ops
tags: ["@test"]
\`\`\`
`;

const NOTE_MARKER = "hold decision entries the counters could not use";
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

/** A `QFAI-CTYPE-004` waiver naming the file and nothing inside it. */
function fileWaiver(): string {
  return [
    "version: 1",
    "waivers:",
    "  - id: WVR-20260822-01",
    `    rule: ${SCAN_CODE}`,
    "    scope:",
    '      paths: [".qfai/specs/**"]',
    '    reason: "delta is intentionally unfilled until the spec is decided"',
    '    expires: "2099-01-01"',
    '    evidence: ".qfai/specs/spec-0001/09_delta.md"',
    "",
  ].join("\n");
}

/** A waiver naming a rule nothing emits, which the pass refuses rather than applies. */
function unknownRuleWaiver(): string {
  return [
    "version: 1",
    "waivers:",
    "  - id: WVR-20260822-02",
    "    rule: QFAI-NOT-A-RULE-999",
    "    scope:",
    '      paths: [".qfai/specs/**"]',
    '    reason: "delta is intentionally unfilled until the spec is decided"',
    '    expires: "2099-01-01"',
    '    evidence: ".qfai/specs/spec-0001/09_delta.md"',
    "",
  ].join("\n");
}

describe("the Change Type summary names the input it counted", () => {
  it("says which delta files were read when none of them parses", async () => {
    await withProject({ "spec-0001": UNPARSABLE_DELTA }, async (root) => {
      const data = await createReportData(root);

      expect(data.changeType.summary.deltaFilesScanned).toBe(1);
      expect(data.changeType.summary.totalEntries).toBe(0);
      expect(data.changeType.summary.uncountedDeltaFiles).toEqual([
        {
          file: ".qfai/specs/spec-0001/09_delta.md",
          reason: "unparsed",
          countedEntries: 0,
          uncountedEntries: [],
        },
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
          {
            file: ".qfai/specs/spec-0002/09_delta.md",
            reason: "unparsed",
            countedEntries: 0,
            uncountedEntries: [],
          },
        ]);

        const markdown = formatReportMarkdown(data);
        expect(markdown).toContain("- decision entries: 1");
        expect(markdown).toContain(NOTE_MARKER);
        expect(markdown).toContain(".qfai/specs/spec-0002/09_delta.md");
      },
    );
  });

  it("warns about the uncounted entries beside a counted one in the same file", async () => {
    // The case a file-level check cannot see: `DL-0001` counts, so the file
    // looks healthy while `DL-0002` / `DL-0003` leave the Change Type total
    // short by two with nothing anywhere saying so.
    await withProject({ "spec-0001": PARTIALLY_COUNTED_DELTA }, async (root) => {
      const data = await createReportData(root, EMPTY_VALIDATION);

      expect(data.changeType.summary.totalEntries).toBe(1);
      expect(data.changeType.summary.uncountedDeltaFiles).toEqual([
        {
          file: ".qfai/specs/spec-0001/09_delta.md",
          reason: "mixed",
          countedEntries: 1,
          uncountedEntries: [
            { dlId: "DL-0002", reason: "placeholder" },
            { dlId: "DL-0003", reason: "unparsed" },
          ],
        },
      ]);
      expect(data.changeType.deltaCoverage.status).toBe("delta-not-counted");
      expect(data.summary.counts.error).toBe(2);

      const findings = data.issues.filter((issue) => issue.code === SCAN_CODE);
      expect(findings).toHaveLength(2);
      expect(findings[0]?.message).toContain("3 件のうち 2 件");

      const markdown = formatReportMarkdown(data);
      expect(markdown).toContain("- decision entries: 1");
      expect(markdown).toContain(NOTE_MARKER);
      expect(markdown).toContain("2/3 entries uncounted");
    });
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
        {
          file: ".qfai/specs/spec-0001/09_delta.md",
          reason: "placeholder",
          countedEntries: 0,
          uncountedEntries: [{ dlId: "DL-0001", reason: "placeholder" }],
        },
      ]);

      expect(formatReportMarkdown(data)).toContain(NOTE_MARKER);
    });
  });
});

describe("an uncounted delta file is a finding, not only prose", () => {
  // A waiver no longer suppresses it: `QFAI-WAIVER-002` forbids a waiver whose
  // rule is an error, and this finding is one. Pinned because the previous
  // behaviour — a suppressible warning — is what an operator carrying such a
  // waiver expects.
  //
  // The subject here is suppression, not the refusal. Whether the report also
  // publishes `QFAI-WAIVER-002` is a separate question, with its own cases.
  it("is not suppressed by a waiver, because the finding is an error", async () => {
    await withProject({ "spec-0001": UNPARSABLE_DELTA }, async (root) => {
      await writeFile(path.join(root, ".qfai", "waivers.yml"), fileWaiver(), "utf-8");

      const data = await createReportData(root, EMPTY_VALIDATION);

      expect(data.issues.find((issue) => issue.code === SCAN_CODE)?.suppressed).toBeUndefined();
      expect(data.waivers.suppressed.total).toBe(0);
    });
  });
  it("reaches issues, summary.counts and deltaCoverage", async () => {
    await withProject(
      { "spec-0001": PARSABLE_DELTA, "spec-0002": UNPARSABLE_DELTA },
      async (root) => {
        // An empty validation result, so every count below is the report's own
        // contribution rather than whatever the fixture tree happens to trip.
        const data = await createReportData(root, EMPTY_VALIDATION);

        const findings = data.issues.filter((issue) => issue.code === SCAN_CODE);
        expect(findings).toHaveLength(1);
        expect(findings[0]?.severity).toBe("error");
        expect(findings[0]?.category).toBe("change");
        expect(findings[0]?.file).toBe(".qfai/specs/spec-0002/09_delta.md");

        // The gate reads counts, not the Markdown body.
        expect(data.summary.counts).toEqual({ info: 0, warning: 0, error: 1 });
        expect(data.changeType.deltaCoverage.status).toBe("delta-not-counted");
        expect(data.changeType.deltaCoverage.uncountedDeltaFiles).toBe(1);

        const markdown = formatReportMarkdown(data);
        expect(markdown).toContain("- fail-on=error: FAIL");
        expect(markdown).toContain(SCAN_CODE);
      },
    );
  });
  // A refused waiver is not an active one. It was loaded, and the pass then
  // declined to arm it, so the report lists nothing under `active` and the
  // reason arrives as the verdict the case below asserts. Pinned because the
  // active list is the other half of the answer an operator reads: a waiver
  // that appears there and suppresses nothing is a different bug.
  it("arms nothing when the pass refuses the waiver", async () => {
    await withProject({ "spec-0001": UNPARSABLE_DELTA }, async (root) => {
      await writeFile(path.join(root, ".qfai", "waivers.yml"), fileWaiver(), "utf-8");

      const data = await createReportData(root, EMPTY_VALIDATION);

      expect(data.waivers.active).toEqual([]);
      expect(data.waivers.suppressed.total).toBe(0);
    });
  });

  // A waiver the pass refuses says so, the same as one it applies. Without the
  // verdict the operator sees a waiver that changed nothing and no reason for
  // it, which reads like the finding is unwaivable rather than like the waiver
  // is wrong.
  it("reports the verdict its own pass reached on the waiver file", async () => {
    await withProject({ "spec-0001": UNPARSABLE_DELTA }, async (root) => {
      await writeFile(path.join(root, ".qfai", "waivers.yml"), unknownRuleWaiver(), "utf-8");

      const data = await createReportData(root, EMPTY_VALIDATION);

      const verdicts = data.issues.filter((issue) => issue.code === "QFAI-WAIVER-004");
      expect(verdicts).toHaveLength(1);
      expect(verdicts[0]?.message).toContain("QFAI-NOT-A-RULE-999");
      expect(verdicts[0]?.file).toBe(".qfai/waivers.yml");
      // Counted, not merely listed: a verdict outside `summary.counts` cannot
      // reach the gate. The delta-scan finding beside it is an error now, so
      // the two land in different buckets.
      expect(data.summary.counts.warning).toBe(1);
      expect(data.summary.counts.error).toBe(1);

      expect(formatReportMarkdown(data)).toContain("QFAI-WAIVER-004");
    });
  });

  // The reason the verdict was dropped in the first place. Both passes read the
  // same file, so a refusal validation already published must not arrive twice.
  it("does not repeat a verdict the validation result already carries", async () => {
    await withProject({ "spec-0001": UNPARSABLE_DELTA }, async (root) => {
      await writeFile(path.join(root, ".qfai", "waivers.yml"), unknownRuleWaiver(), "utf-8");

      const validated = await validateProject(root);
      expect(validated.issues.filter((issue) => issue.code === "QFAI-WAIVER-004")).toHaveLength(1);

      const data = await createReportData(root, validated);

      expect(data.issues.filter((issue) => issue.code === "QFAI-WAIVER-004")).toHaveLength(1);
    });
  });
});
