/**
 * A register ID defined on more than one row of `decisions.md` or `open-questions.md`.
 *
 * `.gitattributes` merges the two registers with the union driver, so two branches that each
 * append a row merge without a text conflict. The same driver keeps both versions of a row that
 * both sides edited, and Git reports the merge as clean. The full `qfai validate` run reports the
 * duplicate, but it runs in the build job, minutes after the push. This check reads only the two
 * registers, so the scans lane and `pnpm branch:catchup` report the duplicate before a push.
 *
 * A row counts when its first table cell is a register ID. An ID cited inside another row's
 * content does not count.
 *
 * Usage:
 *   node scripts/check-register-duplicates.mjs
 *
 * Exit codes: 0 clean, 1 a duplicate ID, 2 a register could not be read.
 */
/* global console */
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { readBoundedText } from "./lib/bounded-read.mjs";

/** The two registers, repository-relative and POSIX-separated, as `.gitattributes` names them. */
export const REGISTERS = [".qfai/spec/decisions.md", ".qfai/spec/open-questions.md"];

const MAX_BYTES = 64 * 1024 * 1024;

/** A table row whose first cell is a register ID, in the four-digit form validation accepts. */
const ROW_RE = /^\|\s*((?:DEC|OQ)-\d{4})\s*\|/;

/**
 * Reads both registers under `root`.
 *
 * Returns the registers that could not be read, every ID found on more than one row as
 * `{ file, id, lines }` with one-based lines, and the number of rows read.
 */
export function registerFindings(root) {
  const unreadable = [];
  const duplicates = [];
  let rows = 0;
  for (const file of REGISTERS) {
    const text = readBoundedText(path.join(root, ...file.split("/")), MAX_BYTES);
    if (text === undefined) {
      unreadable.push(file);
      continue;
    }
    const lines = new Map();
    text.split(/\r?\n/).forEach((line, index) => {
      const id = ROW_RE.exec(line)?.[1];
      if (id === undefined) return;
      rows += 1;
      const found = lines.get(id);
      if (found === undefined) lines.set(id, [index + 1]);
      else found.push(index + 1);
    });
    for (const [id, found] of lines) {
      if (found.length > 1) duplicates.push({ file, id, lines: found });
    }
  }
  return { unreadable, duplicates, rows };
}

/**
 * One line per finding, `<file> could not be read.` or
 * `<file>:<line>,<line>: <ID> is defined more than once.`, then one line of repair advice.
 */
export function describeFindings({ unreadable, duplicates }) {
  const lines = [
    ...unreadable.map((file) => `${file} could not be read.`),
    ...duplicates.map(
      ({ file, id, lines: found }) =>
        `${file}:${found.join(",")}: ${id} is defined more than once.`,
    ),
  ];
  if (unreadable.length > 0) lines.push("Restore each register at the path named above.");
  if (duplicates.length > 0) {
    lines.push(
      "Keep one row per ID: renumber a new row your branch added under an ID already taken, " +
        "with its references, and merge two edits of one existing row into one row that " +
        "carries both intended changes.",
    );
  }
  return lines;
}

/** Runs the check over `root` and returns the process exit code. */
export function run(root = process.cwd()) {
  const findings = registerFindings(root);
  for (const line of describeFindings(findings)) console.error(line);
  if (findings.unreadable.length > 0) return 2;
  if (findings.duplicates.length > 0) return 1;
  console.log(
    `No register ID is defined more than once (${String(findings.rows)} rows in ${String(REGISTERS.length)} registers).`,
  );
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run());
}
