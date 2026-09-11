#!/usr/bin/env node
/**
 * Collect every deliberate simplification the tree records, and refuse one that
 * names no condition for lifting it.
 *
 * `.agents/rules/minimal-implementation.md` asks an author who takes a shortcut
 * on purpose to write it down where it is taken, with two things: the ceiling it
 * stops at, and the condition that lifts it. That rule holds the form; it is not
 * repeated here, and a worked example in this file would be collected as a
 * marker by the very scan below.
 *
 * Unwatched, that convention decays in one direction. A ceiling with no lifting
 * condition cannot be told from an oversight, and the deferral becomes permanent
 * with nobody deciding it should. A marker nobody collects is worth less than no
 * marker, because it reads as tracked.
 *
 * ## What fails the run, and what does not
 *
 * Every marker is printed. Only a marker with no lifting condition exits 1.
 *
 * Failing on the COUNT would make this an argument against marking a shortcut at
 * all, which is the opposite of what it is for: the author who writes the marker
 * would be the one who reddens the build, and the author who takes the same
 * shortcut silently would not.
 *
 * Judging whether a simplification was the right call is review's, not this
 * lane's. No script can read a ceiling and say whether the code should have gone
 * further.
 *
 * ## Scope
 *
 * Comment lines in tracked source files. A marker's subject is code, so Markdown
 * is out: the rule document's own example sits in a fenced block there, and a
 * lane that read it would report the specification as a finding.
 *
 * Exit codes: 0 clean / 1 a marker names no lifting condition / 2 a git error.
 */
/* global console */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

/** Trees whose content is generated, vendored, or scratch. */
const EXCLUDE_PREFIX = ["tmp/", "node_modules/", "packages/qfai/node_modules/", ".codex/agents/"];

const SOURCE_EXTENSIONS = new Set([".ts", ".mts", ".cts", ".mjs", ".cjs", ".js", ".jsx", ".tsx"]);
const SHELL_EXTENSIONS = new Set([".sh", ".ps1"]);

/** The marker and its second half, both read off a comment line. */
const CEILING_RE = /\bSIMPLIFIED:\s*(.*)$/;
const LIFT_RE = /\bLift when:\s*(.*)$/i;

/**
 * How far past the marker the lifting condition may sit.
 *
 * The rule's example puts it on the next line. A wrapped ceiling pushes it
 * further, so the search runs to the end of the comment block the marker opened
 * and stops at the first line that is not a comment. Unbounded within the block
 * rather than a line count: a count would turn a reformatted comment into a
 * finding.
 */
// SIMPLIFIED: decides a comment line by the token it opens with, not by parsing.
// Lift when: a marker is missed inside a block comment with unprefixed continuation lines.
function isCommentLine(rel, line) {
  const trimmed = line.trim();
  if (SHELL_EXTENSIONS.has(path.extname(rel))) return trimmed.startsWith("#");
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf-8", maxBuffer: 128 * 1024 * 1024 });
}

function inScope(rel) {
  if (EXCLUDE_PREFIX.some((p) => rel.startsWith(p))) return false;
  const ext = path.extname(rel);
  return SOURCE_EXTENSIONS.has(ext) || SHELL_EXTENSIONS.has(ext);
}

/** Every marker in one file, in source order. */
function collectMarkers(rel, text) {
  const lines = text.split(/\r?\n/);
  const markers = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!isCommentLine(rel, lines[i])) continue;
    const ceiling = CEILING_RE.exec(lines[i]);
    if (ceiling === null) continue;
    let lift = null;
    for (let j = i + 1; j < lines.length && isCommentLine(rel, lines[j]); j += 1) {
      if (CEILING_RE.test(lines[j])) break;
      const found = LIFT_RE.exec(lines[j]);
      if (found !== null) {
        lift = found[1].trim();
        break;
      }
    }
    markers.push({ file: rel, line: i + 1, ceiling: ceiling[1].trim(), lift });
  }
  return markers;
}

let tracked;
try {
  tracked = git(["ls-files", "-z"]).split("\0").filter(Boolean);
} catch (err) {
  console.error(`check-simplification-ledger: git ls-files failed: ${err.message}`);
  process.exit(2);
}

const markers = [];
for (const rel of tracked) {
  if (!inScope(rel)) continue;
  let text;
  try {
    text = readFileSync(path.join(ROOT, rel), "utf-8");
  } catch {
    continue;
  }
  markers.push(...collectMarkers(rel, text));
}

if (markers.length === 0) {
  console.log("check-simplification-ledger: no deliberate simplifications recorded.");
  process.exit(0);
}

const files = new Set(markers.map((m) => m.file));
console.log(`check-simplification-ledger: ${markers.length} marker(s) in ${files.size} file(s).\n`);
for (const file of [...files].sort()) {
  console.log(file);
  for (const marker of markers.filter((m) => m.file === file)) {
    console.log(`  ${String(marker.line).padStart(5)}  ${marker.ceiling}`);
    console.log(`         lift when: ${marker.lift ?? "— NOT NAMED"}`);
  }
}

const unlifted = markers.filter((m) => m.lift === null);
if (unlifted.length === 0) {
  process.exit(0);
}

console.error("");
for (const marker of unlifted) {
  console.error(
    `${marker.file}:${marker.line}: SIMPLIFIED names a ceiling and no lifting condition`,
  );
}
console.error(
  `\ncheck-simplification-ledger: ${unlifted.length} marker(s) name no lifting condition. ` +
    "Add a `Lift when:` line saying what would make the shortcut worth undoing; " +
    "see .agents/rules/minimal-implementation.md.",
);
process.exit(1);
