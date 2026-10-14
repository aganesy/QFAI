/**
 * A register ID defined on more than one row of `decisions.md` or `open-questions.md`.
 *
 * `.gitattributes` merges the two registers with the union driver, so two branches that each
 * append a row merge without a text conflict. The same driver keeps both versions of a row that
 * both sides edited, and Git reports the merge as clean. The full `qfai validate` run reports the
 * duplicate, but it runs in the build job, minutes after the push. This check reads only the
 * registers, so the scans lane and `pnpm branch:catchup` report the duplicate before a push. The
 * decisions register is its root file and every `decisions/page-NNNN.md` page: an ID defined twice
 * in one page, in two pages, or in a page and the root is a duplicate.
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
import { lstatSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { readBoundedText } from "./lib/bounded-read.mjs";

/** The two registers, repository-relative and POSIX-separated, as `.gitattributes` names them. */
export const REGISTERS = [".qfai/spec/decisions.md", ".qfai/spec/open-questions.md"];

/** The directory of decision pages. Its pages and the root tail are one register. */
const DECISION_PAGES = ".qfai/spec/decisions";

/** A direct decision page, as the register's page list names it. */
const PAGE_RE = /^page-\d{4}\.md$/;

const MAX_BYTES = 64 * 1024 * 1024;

/** A table row whose first cell is a register ID, in the four-digit form validation accepts. */
const ROW_RE = /^\|\s*((?:DEC|OQ)-\d{4})\s*\|/;

/**
 * Every document of one register: the file, and for the decisions register its pages in name order.
 *
 * A pages directory that is absent means no pages. One that is a link, is not a directory, or
 * cannot be listed is returned as unreadable, so a pull request cannot point the check elsewhere.
 */
function registerFiles(root, file) {
  const files = [file];
  const unreadable = [];
  if (file !== REGISTERS[0]) return { files, unreadable };
  const directory = path.join(root, ...DECISION_PAGES.split("/"));
  let names = [];
  try {
    const stats = lstatSync(directory);
    if (stats.isSymbolicLink() || !stats.isDirectory()) unreadable.push(DECISION_PAGES);
    else names = readdirSync(directory);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      unreadable.push(DECISION_PAGES);
    }
  }
  for (const name of names.filter((entry) => PAGE_RE.test(entry)).sort()) {
    files.push(`${DECISION_PAGES}/${name}`);
  }
  return { files, unreadable };
}

/**
 * Reads both registers under `root`, the decisions register as its root file and every page.
 *
 * Returns the documents that could not be read, every ID found on more than one row as
 * `{ id, locations }` with `{ file, line }` locations and one-based lines, and the number of rows
 * read. An ID counts once per register, wherever its rows sit: two pages, or a page and the root.
 */
export function registerFindings(root) {
  const unreadable = [];
  const duplicates = [];
  let rows = 0;
  for (const register of REGISTERS) {
    const listing = registerFiles(root, register);
    unreadable.push(...listing.unreadable);
    const found = new Map();
    for (const file of listing.files) {
      const text = readBoundedText(path.join(root, ...file.split("/")), MAX_BYTES);
      if (text === undefined) {
        unreadable.push(file);
        continue;
      }
      text.split(/\r?\n/).forEach((line, index) => {
        const id = ROW_RE.exec(line)?.[1];
        if (id === undefined) return;
        rows += 1;
        const locations = found.get(id) ?? [];
        locations.push({ file, line: index + 1 });
        found.set(id, locations);
      });
    }
    for (const [id, locations] of found) {
      if (locations.length > 1) duplicates.push({ id, locations });
    }
  }
  return { unreadable, duplicates, rows };
}

/** The locations of one duplicate as `<file>:<line>,<line>`, joined with ` and ` across files. */
function describeLocations(locations) {
  const byFile = new Map();
  for (const { file, line } of locations) byFile.set(file, [...(byFile.get(file) ?? []), line]);
  return [...byFile].map(([file, lines]) => `${file}:${lines.join(",")}`).join(" and ");
}

/**
 * One line per finding, `<file> could not be read.` or
 * `<file>:<line>,<line>: <ID> is defined more than once.` (`<file>:<line> and <file>:<line>` when
 * the rows are in different documents), then one line of repair advice.
 */
export function describeFindings({ unreadable, duplicates }) {
  const lines = [
    ...unreadable.map((file) => `${file} could not be read.`),
    ...duplicates.map(
      ({ id, locations }) => `${describeLocations(locations)}: ${id} is defined more than once.`,
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
