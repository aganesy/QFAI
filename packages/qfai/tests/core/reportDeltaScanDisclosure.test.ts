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

/** The same waiver, scoped down to the `### DL-` entries it actually accepts. */
function entryWaiver(dlIds: readonly string[]): string {
  return [
    "version: 1",
    "waivers:",
    "  - id: WVR-20260822-01",
    `    rule: ${SCAN_CODE}`,
    "    scope:",
    '      paths: [".qfai/specs/**"]',
    "    match:",
    `      dl_ids: [${dlIds.map((id) => `"${id}"`).join(", ")}]`,
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
      expect(data.summary.counts.warning).toBe(2);

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

  // The finding is raised after `validateProject` has already applied waivers,
  // so it has to run the same pass itself. Without it a project that keeps an
  // unfilled delta on purpose has no way to accept the warning.
  it("goes through the project's waivers like any other finding", async () => {
    await withProject({ "spec-0001": UNPARSABLE_DELTA }, async (root) => {
      await writeFile(path.join(root, ".qfai", "waivers.yml"), fileWaiver(), "utf-8");

      const data = await createReportData(root, EMPTY_VALIDATION);

      expect(data.issues.find((issue) => issue.code === SCAN_CODE)?.suppressed).toBe(true);
      expect(data.summary.counts).toEqual({ info: 0, warning: 0, error: 0 });
      expect(data.waivers.suppressed.total).toBe(1);
      expect(data.waivers.suppressed.byRule["QFAI-CTYPE-004"]).toBe(1);

      // A waiver that silences the finding but not the verdict it drives is not
      // a waiver: the Dashboard has to read clean too.
      expect(data.changeType.deltaCoverage.status).toBe("ok");
      expect(data.changeType.deltaCoverage.uncountedDeltaFiles).toBe(0);
      expect(data.changeType.summary.uncountedDeltaFiles).toEqual([]);

      const markdown = formatReportMarkdown(data);
      expect(markdown).toContain("- fail-on=warning: PASS");
      expect(markdown).not.toContain(NOTE_MARKER);
    });
  });

  // The suppression above is performed by the report's own waiver pass, which
  // reads `.qfai/waivers.yml` itself. The `ValidationResult` it is folded into
  // need not have done the same — a stored `validate.json` predating the
  // waivers block carries none — so the active list has to come from the pass
  // that actually applied the waiver.
  it("names the waiver its own pass applied, not just the suppressed count", async () => {
    await withProject({ "spec-0001": UNPARSABLE_DELTA }, async (root) => {
      await writeFile(path.join(root, ".qfai", "waivers.yml"), fileWaiver(), "utf-8");

      const data = await createReportData(root, EMPTY_VALIDATION);

      expect(data.waivers.suppressed.total).toBe(1);
      expect(data.waivers.active.map((waiver) => waiver.id)).toEqual(["WVR-20260822-01"]);
      expect(data.waivers.active[0]?.rule).toBe(SCAN_CODE);

      expect(formatReportMarkdown(data)).toContain("- waivers: active 1 / suppressed 1");
    });
  });

  // Both passes read the same file, so the common case is the same waiver
  // arriving twice. It must be listed once.
  it("does not list the same waiver twice when both passes loaded it", async () => {
    await withProject({ "spec-0001": UNPARSABLE_DELTA }, async (root) => {
      await writeFile(path.join(root, ".qfai", "waivers.yml"), fileWaiver(), "utf-8");

      const validated = await validateProject(root);
      const data = await createReportData(root, validated);

      expect(data.waivers.active.map((waiver) => waiver.id)).toEqual(["WVR-20260822-01"]);
    });
  });
});

describe("a QFAI-CTYPE-004 waiver is scoped to the entry it accepted", () => {
  it("raises one finding per uncounted entry, each naming its DL id", async () => {
    await withProject({ "spec-0001": PARTIALLY_COUNTED_DELTA }, async (root) => {
      const data = await createReportData(root, EMPTY_VALIDATION);

      const findings = data.issues.filter((issue) => issue.code === SCAN_CODE);
      expect(findings.map((issue) => issue.dl_id)).toEqual(["DL-0002", "DL-0003"]);
      expect(findings[0]?.message).toContain("`### DL-0002`");
      // The suggestion has to name the key that scopes the waiver, or the
      // operator writes the `scope.paths`-only one that no longer applies.
      expect(findings[0]?.suggested_action).toContain("match.dl_ids");
      expect(findings[0]?.suggested_action).toContain("DL-0002");
    });
  });

  it("keeps the entries a paths-only waiver never named", async () => {
    // The over-broad waiver this scoping exists to refuse: it names the file and
    // nothing else, so it must not decide anything about the rows inside it.
    await withProject({ "spec-0001": PARTIALLY_COUNTED_DELTA }, async (root) => {
      await writeFile(path.join(root, ".qfai", "waivers.yml"), fileWaiver(), "utf-8");

      const data = await createReportData(root, EMPTY_VALIDATION);

      const findings = data.issues.filter((issue) => issue.code === SCAN_CODE);
      expect(findings.map((issue) => issue.suppressed ?? false)).toEqual([false, false]);
      expect(data.waivers.suppressed.total).toBe(0);
      expect(data.changeType.deltaCoverage.status).toBe("delta-not-counted");
      expect(data.summary.counts.warning).toBe(2);
      expect(formatReportMarkdown(data)).toContain("- fail-on=warning: FAIL");
    });
  });

  it("suppresses only the entry the waiver listed in match.dl_ids", async () => {
    await withProject({ "spec-0001": PARTIALLY_COUNTED_DELTA }, async (root) => {
      await writeFile(path.join(root, ".qfai", "waivers.yml"), entryWaiver(["DL-0002"]), "utf-8");

      const data = await createReportData(root, EMPTY_VALIDATION);

      const findings = data.issues.filter((issue) => issue.code === SCAN_CODE);
      expect(findings.map((issue) => [issue.dl_id, issue.suppressed ?? false])).toEqual([
        ["DL-0002", true],
        ["DL-0003", false],
      ]);
      expect(data.waivers.suppressed.total).toBe(1);

      // The gap row and the coverage verdict follow the same split: DL-0003 is
      // still uncounted, so the Dashboard must not read OK.
      expect(data.changeType.summary.uncountedDeltaFiles).toEqual([
        {
          file: ".qfai/specs/spec-0001/09_delta.md",
          reason: "unparsed",
          countedEntries: 1,
          uncountedEntries: [{ dlId: "DL-0003", reason: "unparsed" }],
        },
      ]);
      expect(data.changeType.deltaCoverage.status).toBe("delta-not-counted");
      expect(data.summary.counts.warning).toBe(1);
    });
  });

  // Over-correction pin: scoping the waiver per entry must not make a genuine
  // accept-everything waiver impossible — naming both ids still clears the file.
  it("clears the file once the waiver names every uncounted entry", async () => {
    await withProject({ "spec-0001": PARTIALLY_COUNTED_DELTA }, async (root) => {
      await writeFile(
        path.join(root, ".qfai", "waivers.yml"),
        entryWaiver(["DL-0002", "DL-0003"]),
        "utf-8",
      );

      const data = await createReportData(root, EMPTY_VALIDATION);

      expect(data.waivers.suppressed.total).toBe(2);
      expect(data.changeType.summary.uncountedDeltaFiles).toEqual([]);
      expect(data.changeType.deltaCoverage.status).toBe("ok");
      expect(data.summary.counts).toEqual({ info: 0, warning: 0, error: 0 });
      expect(formatReportMarkdown(data)).not.toContain(NOTE_MARKER);
    });
  });
});
