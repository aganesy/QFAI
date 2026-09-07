/**
 * A truncated scan cannot prove that nothing executable references an ID.
 *
 * `collectFilesByGlobs` stops at `DEFAULT_GLOB_FILE_LIMIT` and reports
 * `truncated: true`. `coveredByCarrierOnly` is a negative claim — "every
 * carrier for this obligation declares no test" — so a markdown ledger read
 * before the cut and the acceptance test read after it would have produced
 * `QFAI-ATDD-119` for an obligation that is genuinely tested, and a downstream
 * gate reading the two arrays would have inherited the same error.
 *
 * The partition is therefore suppressed while `scan.truncated` is set, and the
 * summary says so rather than letting four empty lists read as "clean".
 * `vi.mock` is hoisted to module scope, so this case lives apart from
 * `atddProseCarrierCoverage.test.ts` instead of forcing the flag on every case
 * there.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as coreFs from "../../src/core/fs.js";
import { describe, expect, it, vi } from "vitest";

type CoreFs = typeof coreFs;

const scan = vi.hoisted(() => ({ truncate: false }));

vi.mock("../../src/core/fs.js", async () => {
  const actual = await vi.importActual<CoreFs>("../../src/core/fs.js");
  return {
    ...actual,
    collectFilesByGlobs: async (
      root: string,
      options: coreFs.CollectFilesByGlobOptions,
    ): Promise<coreFs.CollectFilesByGlobsResult> => {
      const result = await actual.collectFilesByGlobs(root, options);
      // Only the flag is forged: the files are the real ones, which is exactly
      // the shape of a run whose limit cut the tail off.
      return scan.truncate ? { ...result, truncated: true } : result;
    },
  };
});

const { evaluateAtddCodeTraceability } = await import("../../src/core/atddTraceability.js");
const { defaultConfig } = await import("../../src/core/config.js");
const { validateAtddCodeTraceability } =
  await import("../../src/core/validators/atddCodeTraceability.js");

async function withLedgerProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-truncated-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(
      path.join(specDir, "02_User-stories.md"),
      ["# US", "", "## US-0001: story", ""].join("\n"),
      "utf-8",
    );
    await mkdir(path.join(root, "tests", "e2e"), { recursive: true });
    await writeFile(
      path.join(root, "tests", "e2e", "qfai-traceability.md"),
      "- QFAI:SPEC-0001:US-0001\n",
      "utf-8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("carrier-only coverage is not asserted from a truncated scan", () => {
  it("suppresses the partition while the file limit was hit", async () => {
    await withLedgerProject(async (root) => {
      scan.truncate = false;
      const complete = await evaluateAtddCodeTraceability(root, defaultConfig);
      expect(complete.coveredByCarrierOnly.us).toEqual(["SPEC-0001:US-0001"]);

      try {
        scan.truncate = true;
        const cut = await evaluateAtddCodeTraceability(root, defaultConfig);
        expect(cut.scan.truncated).toBe(true);
        expect(cut.coveredByCarrierOnly).toEqual({ us: [], tc: [], conApi: [], conDb: [] });
      } finally {
        scan.truncate = false;
      }
    });
  });

  it("reports the suppression instead of letting the empty lists read as clean", async () => {
    await withLedgerProject(async (root) => {
      try {
        scan.truncate = true;
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.map((entry) => entry.code)).not.toContain("QFAI-ATDD-119");

        const markdown = await readFile(
          path.join(root, ".qfai", "report", "atdd-traceability", "summary.md"),
          "utf-8",
        );
        expect(markdown).toContain("Scan truncated at the file limit");
      } finally {
        scan.truncate = false;
      }
    });
  });
});
