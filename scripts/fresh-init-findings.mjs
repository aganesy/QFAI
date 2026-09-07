/**
 * The findings a fresh `qfai init` is expected to produce, and how to compare.
 *
 * `verify:pack` installs the packed tarball, runs `qfai init` into an empty
 * sandbox and validates it. That result is the out-of-box experience, and until
 * this module existed nothing described it: the run had to exit zero, so a new
 * warning on the seed could join the list unnoticed, and removing one was
 * recorded nowhere and could come back.
 *
 * The baseline is compared in both directions. An unexpected finding fails, and
 * so does an expected one that no longer appears — the second half is what makes
 * a fix stay fixed.
 *
 * ## What a finding is compared by
 *
 * `severity`, `code` and `file`, and nothing else. Messages carry counts and
 * prose that move for reasons the baseline should not care about, while these
 * three answer the question the baseline is for: which check fired, how loudly,
 * and about what. `file` is what tells four `QFAI-ASSETS-003` rows apart, so it
 * is part of the key rather than a detail.
 *
 * The comparison is a multiset: a code that legitimately fires twice for one
 * file is listed twice, and a third occurrence reports as new.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

/** The committed baseline, beside this module. */
export const BASELINE_PATH = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "fresh-init-findings.json",
);

/** Setting this to `1` rewrites the baseline instead of failing on a difference. */
export const UPDATE_ENV = "QFAI_PACK_FINDINGS_UPDATE";

/**
 * One issue reduced to the three fields the baseline compares.
 *
 * `file` is optional in the report — a project-wide finding has none — so it
 * collapses to `-` rather than to `undefined`, which would sort and print
 * inconsistently across runtimes.
 */
export function fingerprint(issue) {
  const file = typeof issue.file === "string" && issue.file.length > 0 ? issue.file : "-";
  return `${issue.severity} ${issue.code} ${file.split(path.sep).join("/")}`;
}

/** Every issue in a `validate.json`, fingerprinted and sorted. */
export function fingerprintReport(report) {
  const issues = Array.isArray(report.issues) ? report.issues : [];
  return issues.map(fingerprint).sort();
}

/**
 * What two fingerprint lists disagree about, as multisets.
 *
 * `added` is a finding the tree produces and the baseline does not name;
 * `missing` is one the baseline names and the tree no longer produces.
 */
export function diffFingerprints(actual, expected) {
  const remaining = new Map();
  for (const entry of expected) {
    remaining.set(entry, (remaining.get(entry) ?? 0) + 1);
  }

  const added = [];
  for (const entry of actual) {
    const left = remaining.get(entry) ?? 0;
    if (left === 0) {
      added.push(entry);
      continue;
    }
    remaining.set(entry, left - 1);
  }

  const missing = [];
  for (const [entry, count] of remaining) {
    for (let index = 0; index < count; index += 1) {
      missing.push(entry);
    }
  }

  return { added: added.sort(), missing: missing.sort() };
}

/** The failure text, naming both directions and how to accept the change. */
export function formatDiff({ added, missing }) {
  const lines = ["A fresh `qfai init` no longer validates to the recorded finding set."];
  if (added.length > 0) {
    lines.push("", "Findings the baseline does not name:", ...added.map((e) => `  + ${e}`));
  }
  if (missing.length > 0) {
    lines.push(
      "",
      "Findings the baseline names that no longer appear:",
      ...missing.map((e) => `  - ${e}`),
    );
  }
  lines.push(
    "",
    "Both directions fail on purpose. A new finding on a tree the tool wrote is a",
    "decision, and a finding that is gone should stay gone.",
    "",
    `If the change is intended, re-record it with ${UPDATE_ENV}=1 pnpm verify:pack`,
    "and commit the baseline in the same change.",
  );
  return lines.join("\n");
}

/** The recorded baseline. */
export function readBaseline() {
  const parsed = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
  return Array.isArray(parsed.findings) ? parsed.findings : [];
}

/** Record `findings` as the baseline, one per line for a readable diff. */
export function writeBaseline(findings) {
  const body = {
    // Stated in the file so a reader meeting it first knows what it governs.
    description:
      "Findings a fresh `qfai init` produces under `verify:pack`. " +
      "Compared in both directions by severity, code and file.",
    findings,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(body, null, 2)}\n`, "utf-8");
}
