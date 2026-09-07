/**
 * The fresh-init finding set is pinned, and the pin is read in both directions.
 *
 * `verify:pack` runs `qfai init` into an empty sandbox and validates it. It used
 * to require only that the run exit zero, so the reported findings could move
 * either way without failing anything: a new warning on a tree the tool wrote
 * joined the list unnoticed, and a fix that removed one was recorded nowhere and
 * could come back.
 *
 * These cases hold the comparison the script now runs, and the shape of the
 * baseline it reads.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  BASELINE_PATH,
  UPDATE_ENV,
  diffFingerprints,
  fingerprint,
  fingerprintReport,
  formatDiff,
  // @ts-expect-error -- a plain .mjs script module with no type declarations.
} from "../../../../scripts/fresh-init-findings.mjs";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

describe("fresh-init finding fingerprints", () => {
  it("keys a finding by severity, code and file", () => {
    expect(fingerprint({ severity: "warning", code: "QFAI-ASSETS-003", file: ".qfai/a.md" })).toBe(
      "warning QFAI-ASSETS-003 .qfai/a.md",
    );
  });

  it("distinguishes one code reported about different files", () => {
    // Four rows share `QFAI-ASSETS-003` on a fresh tree. Keyed by code alone
    // they would collapse into one, and three could disappear unnoticed.
    const report = {
      issues: [
        { severity: "warning", code: "QFAI-ASSETS-003", file: ".qfai/a.md" },
        { severity: "warning", code: "QFAI-ASSETS-003", file: ".qfai/b.md" },
      ],
    };

    expect(fingerprintReport(report)).toEqual([
      "warning QFAI-ASSETS-003 .qfai/a.md",
      "warning QFAI-ASSETS-003 .qfai/b.md",
    ]);
  });

  it("gives a project-wide finding a file field anyway", () => {
    // `undefined` sorts and prints inconsistently; `-` is a value.
    expect(fingerprint({ severity: "notice", code: "QFAI-SPACK-000" })).toBe(
      "notice QFAI-SPACK-000 -",
    );
    expect(fingerprint({ severity: "notice", code: "QFAI-SPACK-000", file: "" })).toBe(
      "notice QFAI-SPACK-000 -",
    );
  });

  it("ignores the message, which carries counts that move on their own", () => {
    const withCount = { severity: "warning", code: "QFAI-ASSETS-003", file: "a.md", message: "19" };
    const withOther = { severity: "warning", code: "QFAI-ASSETS-003", file: "a.md", message: "20" };

    expect(fingerprint(withCount)).toBe(fingerprint(withOther));
  });

  it("reads a report with no issues as an empty set", () => {
    expect(fingerprintReport({ issues: [] })).toEqual([]);
    expect(fingerprintReport({})).toEqual([]);
  });
});

describe("comparing against the baseline", () => {
  it("passes when the tree reports exactly what is recorded", () => {
    const recorded = ["notice QFAI-SPACK-000 -", "warning QFAI-DCON-034 DESIGN.md"];

    expect(diffFingerprints([...recorded], recorded)).toEqual({ added: [], missing: [] });
  });

  it("reports a finding the baseline does not name", () => {
    const diff = diffFingerprints(
      ["notice QFAI-SPACK-000 -", "warning QFAI-NEW-001 a.md"],
      ["notice QFAI-SPACK-000 -"],
    );

    expect(diff.added).toEqual(["warning QFAI-NEW-001 a.md"]);
    expect(diff.missing).toEqual([]);
  });

  it("reports a recorded finding that no longer appears", () => {
    // The direction that makes a fix stay fixed.
    const diff = diffFingerprints([], ["warning QFAI-DCON-034 DESIGN.md"]);

    expect(diff.added).toEqual([]);
    expect(diff.missing).toEqual(["warning QFAI-DCON-034 DESIGN.md"]);
  });

  it("counts repeats, so a third occurrence of a listed pair is new", () => {
    const twice = ["warning QFAI-ASSETS-003 a.md", "warning QFAI-ASSETS-003 a.md"];
    const diff = diffFingerprints([...twice, "warning QFAI-ASSETS-003 a.md"], twice);

    expect(diff.added).toEqual(["warning QFAI-ASSETS-003 a.md"]);
    expect(diff.missing).toEqual([]);
  });

  it("reports a severity change as one finding gone and one arrived", () => {
    // A code moving from warning to error is exactly the decision this pin is
    // for, so it must not pass as "the same finding".
    const diff = diffFingerprints(["error QFAI-ASSETS-003 a.md"], ["warning QFAI-ASSETS-003 a.md"]);

    expect(diff.added).toEqual(["error QFAI-ASSETS-003 a.md"]);
    expect(diff.missing).toEqual(["warning QFAI-ASSETS-003 a.md"]);
  });
});

describe("the failure text", () => {
  it("names both directions and how to accept the change", () => {
    const text = formatDiff({
      added: ["warning QFAI-NEW-001 a.md"],
      missing: ["notice QFAI-OLD-002 -"],
    });

    expect(text).toContain("warning QFAI-NEW-001 a.md");
    expect(text).toContain("notice QFAI-OLD-002 -");
    expect(text).toContain(UPDATE_ENV);
    // The remedy has to say the baseline is committed, or a run that only
    // rewrites the file locally looks like the whole fix.
    expect(text).toContain("commit the baseline in the same change");
  });
});

describe("the committed baseline", () => {
  it("is recorded in the shape the comparison reads", () => {
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));

    expect(Array.isArray(baseline.findings), "findings must be an array").toBe(true);
    expect(baseline.findings.length, "an empty baseline pins nothing").toBeGreaterThan(0);
    expect(typeof baseline.description).toBe("string");
  });

  it("holds each entry in the fingerprint form, sorted", () => {
    const { findings } = JSON.parse(readFileSync(BASELINE_PATH, "utf-8")) as {
      findings: string[];
    };

    for (const entry of findings) {
      expect(entry, `${entry} is not "<severity> <code> <file>"`).toMatch(
        /^(error|warning|notice|info) QFAI-[A-Z0-9-]+ \S+$/,
      );
    }
    expect(findings, "a sorted list keeps a re-record to the lines that changed").toEqual(
      [...findings].sort(),
    );
  });

  it("sits beside the script that reads it", () => {
    expect(path.relative(repoRoot, BASELINE_PATH).split(path.sep).join("/")).toBe(
      "scripts/fresh-init-findings.json",
    );
  });
});
