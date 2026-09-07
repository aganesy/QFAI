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
 *
 * ## What the baseline leaves out
 *
 * A rule whose answer comes from somewhere other than the tree `init` wrote —
 * see {@link UNPINNED_CODES}. Recording one would pin a property of the machine
 * the run happens on, and the pin would then fail on every machine that differs
 * while the tool and the tree are identical.
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

/** The severities `validate.json` reports, and the only ones a baseline may hold. */
const SEVERITIES = new Set(["info", "warning", "error"]);

/**
 * Codes the baseline does not record, whatever the run reports.
 *
 * The subject of this pin is the tree `qfai init` writes. `QFAI-TRACE-003`
 * answers a different question: it reports on the git checkout the validate run
 * happens inside. The sandbox is created under this repository's own work tree,
 * so the diff behind that rule resolves against this checkout — and it fires
 * both when the base ref is absent, which it is in every shallow clone, and
 * when the branch changed a spec the sandbox does not carry. One `init` output
 * therefore produces the finding on one machine and not on the next, so the
 * pin would record how the repository was fetched rather than what the tool
 * wrote.
 *
 * Dropping it here removes it from the comparison only. The run still reports
 * it, and it is still read by everything that reads a validate report.
 */
export const UNPINNED_CODES = new Set(["QFAI-TRACE-003"]);

/** The code in a line `fingerprint` wrote. */
function codeOf(entry) {
  return entry.split(" ")[1] ?? "";
}

/**
 * One issue reduced to the three fields the baseline compares.
 *
 * `severity` and `code` are required and checked, because the update path
 * writes whatever it is handed. A report that is not the shape this reads
 * would be recorded as `undefined undefined -` and every later comparison
 * would agree with it — a baseline that pins nothing while looking pinned. So
 * a malformed issue stops the run and names itself instead.
 *
 * `file` is optional — a project-wide finding has none — so it collapses to
 * `-` rather than to `undefined`, which would sort and print inconsistently
 * across runtimes.
 */
export function fingerprint(issue) {
  if (issue === null || typeof issue !== "object") {
    throw new Error(`validate.json holds an issue that is not an object: ${JSON.stringify(issue)}`);
  }
  if (typeof issue.code !== "string" || issue.code.length === 0) {
    throw new Error(`validate.json holds an issue with no \`code\`: ${JSON.stringify(issue)}`);
  }
  if (!SEVERITIES.has(issue.severity)) {
    throw new Error(
      `validate.json holds an issue whose \`severity\` is not one of ` +
        `${[...SEVERITIES].join(" / ")}: ${JSON.stringify(issue)}`,
    );
  }
  const file = typeof issue.file === "string" && issue.file.length > 0 ? issue.file : "-";
  return `${issue.severity} ${issue.code} ${file.split(path.sep).join("/")}`;
}

/**
 * Every issue in a `validate.json`, fingerprinted and sorted, less the codes
 * {@link UNPINNED_CODES} names.
 *
 * The shape is checked for the same reason the baseline's is: `issues` is a
 * required field of the report, so a value that is not a list is a file this
 * cannot read. Read as an empty list instead, a truncated report would record
 * or match "the tree produces nothing" — the one answer the comparison exists
 * to withhold.
 *
 * Every issue is fingerprinted before any is dropped, so the shape check runs
 * on the whole report rather than on the part of it the pin keeps.
 */
export function fingerprintReport(report, where = "validate.json") {
  if (typeof report !== "object" || report === null || !Array.isArray(report.issues)) {
    throw new Error(
      `${where} has no \`issues\` array. That list is what a fresh run reports, so a report ` +
        `without one is unreadable rather than clean.`,
    );
  }
  return report.issues
    .map(fingerprint)
    .filter((entry) => !UNPINNED_CODES.has(codeOf(entry)))
    .sort();
}

/**
 * A `validate.json` parsed, named in the failure.
 *
 * The parse error alone says only that some JSON was malformed, and the run
 * reads several files.
 */
export function parseValidateReport(text, where = "validate.json") {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `${where} is not JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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

/**
 * The findings a parsed baseline records.
 *
 * Stated rather than defaulted to an empty list. An empty baseline is a real
 * value — it says the tree produces nothing — so reading a malformed file as
 * one turns a corrupt pin into a claim, and the comparison then reports every
 * finding the tree has as newly arrived. A file that cannot be read is not a
 * baseline, and saying so names what to fix.
 */
export function parseBaseline(text, where = BASELINE_PATH) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `${where} is not JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (typeof parsed !== "object" || parsed === null || !Array.isArray(parsed.findings)) {
    throw new Error(
      `${where} has no \`findings\` array. That list is the pin, so a file without one records ` +
        `nothing while looking recorded.`,
    );
  }
  const wrong = parsed.findings.filter((entry) => typeof entry !== "string");
  if (wrong.length > 0) {
    // Shown, not just counted: the reader's next move is to open the file and
    // find them, and a count does not say where to look. Capped because a
    // wholly wrong file would otherwise print itself.
    const shown = wrong
      .slice(0, 3)
      .map((entry) => JSON.stringify(entry))
      .join(", ");
    const rest = wrong.length > 3 ? `, and ${String(wrong.length - 3)} more` : "";
    throw new Error(
      `${where}: every entry is the \`<severity> <code> <file>\` line \`fingerprint\` writes, and ` +
        `${String(wrong.length)} is not a string: ${shown}${rest}.`,
    );
  }
  // A code the comparison drops can never match, so a baseline naming one
  // reports it as gone on every run and no change to the tree removes it.
  // Named here, where the fix is to strike the line, rather than left to
  // surface as a finding that disappeared.
  const unpinned = parsed.findings.filter((entry) => UNPINNED_CODES.has(codeOf(entry)));
  if (unpinned.length > 0) {
    throw new Error(
      `${where} records ${unpinned.join(", ")}, which the comparison does not read: that rule ` +
        `reports on the checkout the run happens in rather than on the tree init wrote. Remove ` +
        `the line.`,
    );
  }
  return parsed.findings;
}

/** The recorded baseline. */
export function readBaseline() {
  return parseBaseline(readFileSync(BASELINE_PATH, "utf-8"));
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
