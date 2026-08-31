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

const options = parseArgs(process.argv.slice(2));
const rootLines = comparableLines(readLines(options.root), options.root);
const packageLines = comparableLines(readLines(options.package), options.package);

if (reportMismatches(options, rootLines, packageLines)) {
  process.exit(1);
}

console.log(`${options.root} and ${options.package} are aligned (${rootLines.length} lines).`);
