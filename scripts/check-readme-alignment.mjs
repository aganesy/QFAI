/* global console */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

/*
 * Enforces the alignment claim made in the "Contributing" section of both
 * READMEs: every line of `README.md` and `packages/qfai/README.md` must be
 * identical, except for lines inside an HTML-comment block delimited by
 * `readme-align:ignore-start` / `readme-align:ignore-end`. A block also
 * absorbs the blank line(s) directly above it, because Prettier always
 * surrounds an HTML block with blank lines and the counterpart file has no
 * such blank line to match.
 *
 * Two oracles run, and both report before the exit:
 *   1. line-identity between the two READMEs (above);
 *   2. the CI section's workflow claim against the in-binary write set
 *      in `shared/shippedWorkflowNames.ts` (see `reportCiSectionDrift`).
 *
 * Oracle 2 exists because oracle 1 cannot fail on a statement that is
 * wrong in both files: `aligned` was being read as `correct`.
 *
 * Exit codes: 0 aligned / 1 diverged or unreadable / 2 usage error.
 */

const IGNORE_START = "<!-- readme-align:ignore-start -->";
const IGNORE_END = "<!-- readme-align:ignore-end -->";
const MAX_REPORTED = 5;

const DEFAULTS = {
  root: "README.md",
  package: "packages/qfai/README.md",
};

function usage(message) {
  console.error(message);
  console.error(
    "usage: node scripts/check-readme-alignment.mjs [--root <path>] [--package <path>]",
  );
  process.exit(2);
}

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg !== "--root" && arg !== "--package") {
      usage(`unknown argument: ${arg}`);
    }
    const value = argv[i + 1];
    if (typeof value !== "string" || value.trim() === "") {
      usage(`${arg} requires a non-empty path value.`);
    }
    options[arg === "--root" ? "root" : "package"] = value;
    i += 1;
  }
  return options;
}

function readLines(relative) {
  const filePath = path.resolve(relative);
  try {
    return readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n").split("\n");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`${relative}: cannot read file (${reason})`);
    process.exit(1);
  }
}

/**
 * Drops ignore-marked blocks and keeps the source line number of every
 * surviving line so a mismatch can be reported against the real file.
 */
function comparableLines(lines, label) {
  const kept = [];
  let ignoringFrom = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === IGNORE_START) {
      if (ignoringFrom !== 0) {
        console.error(`${label}:${i + 1}: nested ${IGNORE_START} (opened at line ${ignoringFrom})`);
        process.exit(1);
      }
      ignoringFrom = i + 1;
      while (kept.length > 0 && kept[kept.length - 1].text.trim() === "") {
        kept.pop();
      }
      continue;
    }
    if (trimmed === IGNORE_END) {
      if (ignoringFrom === 0) {
        console.error(`${label}:${i + 1}: ${IGNORE_END} without a matching ${IGNORE_START}`);
        process.exit(1);
      }
      ignoringFrom = 0;
      continue;
    }
    if (ignoringFrom === 0) {
      kept.push({ text: lines[i], line: i + 1 });
    }
  }
  if (ignoringFrom !== 0) {
    console.error(`${label}:${ignoringFrom}: ${IGNORE_START} is never closed`);
    process.exit(1);
  }
  return kept;
}

function describe(entry) {
  return entry === undefined ? "<end of file>" : `${entry.line}: ${entry.text}`;
}

function reportMismatches(options, rootLines, packageLines) {
  const mismatches = [];
  const length = Math.max(rootLines.length, packageLines.length);
  for (let i = 0; i < length && mismatches.length < MAX_REPORTED; i++) {
    const rootEntry = rootLines[i];
    const packageEntry = packageLines[i];
    if (rootEntry?.text !== packageEntry?.text) {
      mismatches.push({ rootEntry, packageEntry });
    }
  }
  if (mismatches.length === 0) {
    return false;
  }
  console.error(`${options.root} and ${options.package} have diverged.`);
  for (const { rootEntry, packageEntry } of mismatches) {
    console.error(`  ${options.root}:${describe(rootEntry)}`);
    console.error(`  ${options.package}:${describe(packageEntry)}`);
  }
  console.error(
    `Apply the edit to both files, or wrap the file-specific part in ${IGNORE_START} / ${IGNORE_END}.`,
  );
  return true;
}

/**
 * Second oracle: the CI section's workflow claim, against the write set.
 *
 * Line-identity is the only thing this guard used to check, and "aligned" was
 * being read as "correct". It is not: two READMEs that are wrong in the same
 * way are perfectly aligned, and both said
 *
 *   It does not generate GitHub Actions workflows.
 *
 * while `qfai init` wrote two of them — contradicting the sentence immediately
 * above it, which lists `.github/**` among the trees QFAI generates. The gate
 * ran clean over that for as long as it stood (#1063).
 *
 * So this oracle is tied to behaviour rather than to the other file: the write
 * set is `shared/shippedWorkflowNames.ts`, which is in-binary by design — its
 * own docstring says the list is "never computed by globbing the asset tree at
 * runtime or the adopter's disk", because a set derived from what happens to be
 * on disk cannot distinguish a file this package ships from one somebody else
 * put there. The README has to name exactly that set.
 *
 * Read from the TypeScript source by pattern, which is how the other guards in
 * this repository read a constant out of `src/`. A shape this cannot parse is
 * reported rather than skipped: a guard that silently measures nothing is worse
 * than one that is absent, and that is the failure mode this whole oracle
 * exists to answer.
 */
const WORKFLOW_NAMES_REL = "packages/qfai/src/shared/shippedWorkflowNames.ts";

function workflowNameSet(source, constName) {
  // Both declared forms: `new Set<string>([...])`, and the empty
  // `new Set<string>()` that `RETIRED_WORKFLOW_NAMES` currently uses. The
  // first draft required the bracketed form and reported the empty one as
  // unparseable — which is the behaviour asked for here, and is how that gap
  // was found instead of shipped.
  const pattern = new RegExp(
    `export const ${constName}\\s*:[^=]*=\\s*new Set<string>\\(\\s*(?:\\[([\\s\\S]*?)\\]\\s*)?\\)`,
  );
  const block = pattern.exec(source);
  if (block === null) {
    console.error(
      `${WORKFLOW_NAMES_REL}: cannot locate ${constName} as a \`new Set<string>(...)\` declaration. ` +
        "The README CI oracle reads the write set from this declaration; a reshaped " +
        "declaration must be matched here rather than left unparsed.",
    );
    process.exit(1);
  }
  return [...(block[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

const CI_HEADING = /^## Continuous integration$/m;

function reportCiSectionDrift(rootPath, rootIsDefault) {
  // A README with no CI section makes no workflow claim, so there is nothing
  // for this oracle to judge — which is the case for the fixture pairs the
  // guard's own tests drive oracle 1 over. But silence has to be earned: when
  // the guard is checking the repository's own README, a missing section means
  // the claim was deleted rather than absent, and that disables this oracle.
  const readmeText = readLines(rootPath).join("\n");
  if (!CI_HEADING.test(readmeText)) {
    if (!rootIsDefault) return false;
    console.error(
      `${rootPath}: no "## Continuous integration" section, so the workflow claim this oracle ` +
        "checks cannot be located. Restore the section, or move the claim and update " +
        "CI_HEADING here — an oracle that passes because its subject vanished is the " +
        "failure mode it exists to answer.",
    );
    return true;
  }

  const source = readLines(WORKFLOW_NAMES_REL).join("\n");
  const shipped = workflowNameSet(source, "SHIPPED_WORKFLOW_NAMES");
  const retired = workflowNameSet(source, "RETIRED_WORKFLOW_NAMES");
  if (shipped.length === 0) {
    console.error(
      `${WORKFLOW_NAMES_REL}: SHIPPED_WORKFLOW_NAMES parsed as empty, so this oracle would ` +
        "pass over any README text. Check the declaration shape.",
    );
    process.exit(1);
  }

  const readme = readmeText;
  const problems = [];

  for (const name of shipped) {
    if (!readme.includes(name)) {
      problems.push(
        `${rootPath}: the CI section does not name \`${name}\`, which \`qfai init\` writes into ` +
          "the adopter's `.github/workflows/`.",
      );
    }
  }
  for (const name of retired) {
    if (readme.includes(name)) {
      problems.push(
        `${rootPath}: names \`${name}\`, which this version no longer ships (it is in ` +
          "RETIRED_WORKFLOW_NAMES).",
      );
    }
  }
  // The sentence this oracle was written for. Kept as an explicit check rather
  // than left to the name list, because "does not generate" plus both correct
  // file names is a self-contradicting README that the name list alone accepts.
  if (/does not generate GitHub Actions workflows/.test(readme)) {
    problems.push(
      `${rootPath}: still claims QFAI "does not generate GitHub Actions workflows", which ` +
        `${WORKFLOW_NAMES_REL} contradicts (${shipped.join(", ")}).`,
    );
  }

  if (problems.length === 0) {
    return false;
  }
  for (const problem of problems) {
    console.error(problem);
  }
  console.error(
    "The CI section's workflow claim is checked against the in-binary write set, not against " +
      "the other README: two files wrong in the same way are aligned.",
  );
  return true;
}

const options = parseArgs(process.argv.slice(2));
const rootLines = comparableLines(readLines(options.root), options.root);
const packageLines = comparableLines(readLines(options.package), options.package);

let diverged = reportMismatches(options, rootLines, packageLines);
// Both oracles run before exiting, so one invocation reports everything the
// gate can see rather than only the first thing it hit.
if (reportCiSectionDrift(options.root, options.root === DEFAULTS.root)) {
  diverged = true;
}
if (diverged) {
  process.exit(1);
}

console.log(`${options.root} and ${options.package} are aligned (${rootLines.length} lines).`);
