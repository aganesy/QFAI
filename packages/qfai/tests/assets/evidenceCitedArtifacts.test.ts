import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parseDocument, visit } from "yaml";

import { compileGlob, findClassClose } from "../../src/core/atdd/scaffoldDialect.js";

// Anchored to this file rather than to `process.cwd()`, for the reason the
// clarification-budget suite gives: a runner launched from the repo root would
// otherwise resolve `../..` above the repo.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/**
 * The generated trees a committed record may not point into blindly.
 *
 * Each is ignored, and the records that cite them are committed. A clone has the
 * claim without its subject: a reader cannot open what the record points at, and
 * neither can a gate — the stage seal resolves the recorded `Review pack` under
 * the repository root and returns false when the directory is not there, so on
 * every clone but the author's a seal cannot be recomputed.
 */
const GENERATED_ROOTS = [
  ".qfai/review/",
  ".qfai/review_archive/",
  ".qfai/report/",
  ".qfai/discussion/",
  // The legacy output tree, ignored like the rest. Production still reads
  // `.qfai/output/verify.json` as a fallback, so a record citing one of its
  // files is the same unsupported provenance as any other.
  ".qfai/output/",
] as const;

/**
 * A citation as the scan records it.
 *
 * Sentence punctuation after a path is not part of it, and a directory is
 * written with or without its trailing separator. One spelling here is what
 * lets a disclaimer naming `.qfai/report/run-123/` cover the `run-123` the scan
 * produces from the line below it.
 */
function normalizeCitation(cited: string): string {
  return cited.replace(/[.,;:]+$/, "").replace(/\/+$/, "");
}

/** Where a citation can start: the root, which is the only fixed part. */
const CITED_GENERATED_ROOT = /\.qfai\/(?:review|review_archive|report|discussion|output)\//g;

/** The characters a citation carries outside a group. */
const CITATION_CHARACTER = /[A-Za-z0-9._/*?+-]/;

/**
 * A character a file name holds that ends no citation: not space, quoting,
 * punctuation, or the `#` that opens a fragment after a path.
 */
const NAME_CHARACTER = /[^\s`"'<>|,;:()[\]{}\\!#]/u;

/** What closes each kind of group a citation can open. */
const GROUP_CLOSERS: Readonly<Record<string, string>> = { "(": ")", "{": "}", "[": "]" };

/** The characters a citation carries only inside a group. */
const IN_GROUP_CHARACTER = /[|,!^:=]/;

/**
 * The emphasis run that opens the citation at `from`, or `null` where there is
 * no citation there at all.
 *
 * The root is searched for anywhere on the line, so a path that merely holds it
 * — `/tmp/run-42/.qfai/report/validate.json`, a name belonging to a machine or
 * another tree — yielded the suffix after it, and the suffix resolved against
 * this repository's own tracked file. The record then read as clone-readable
 * provenance for a file nobody had.
 *
 * A citation opens where the text before it is not path text. Two exceptions:
 * the explicit `./` prefix, which writes a repository-relative path rather than
 * a longer one, and the Markdown emphasis a record wraps a name in. The run that
 * opened the citation is returned, because it is also what closes it — a
 * trailing `**` is emphasis rather than a wildcard.
 */
function citationOpener(line: string, from: number): string | null {
  let start = from;
  if (start >= 2 && line.slice(start - 2, start) === "./") start -= 2;
  // Markdown emphasis around a path is not part of it. A run of `*` or `_` is
  // emphasis where what comes before the run is itself a boundary; inside a
  // path the same two characters are a wildcard and an ordinary name character,
  // which is why the run is read rather than the one character before the root.
  let opener = start;
  while (opener > 0 && EMPHASIS_CHARACTER.test(line[opener - 1] ?? "")) opener -= 1;
  const emphasis =
    opener < start && (opener === 0 || !CITATION_CHARACTER.test(line[opener - 1] ?? ""))
      ? line.slice(opener, start)
      : "";
  const before = emphasis === "" ? start : opener;
  // A backslash before the root is Windows path text: `C:\run\.qfai/report/…` names
  // a machine's file, as a POSIX absolute path does.
  const previous = line[before - 1] ?? "";
  if (before !== 0 && (CITATION_CHARACTER.test(previous) || previous === "\\")) return null;
  return emphasis;
}

/** The two characters Markdown wraps emphasis in. */
const EMPHASIS_CHARACTER = /[*_]/;

/**
 * Whether the run at `index` is the delimiter that closes the emphasis.
 *
 * A delimiter inside a name is not one: `_.qfai/report/preflight_summary.md_`
 * carries an underscore in the middle, and a break there measured the prefix
 * before it. What closes emphasis is the run followed by something that is not
 * path text — the end of the line, a backtick, a space.
 */
function closesEmphasis(line: string, index: number, opener: string): boolean {
  if (!line.startsWith(opener, index)) return false;
  const after = line[index + opener.length];
  return after === undefined || !CITATION_CHARACTER.test(after);
}

/**
 * Every citation a line carries, taken whole.
 *
 * A regular expression cannot balance, and the dialect nests: `@(a|+(b|c))` is
 * a valid pattern, and a class that stops at the first `)` cuts the token to
 * something the tree does not have — which is measured as the root, discarded,
 * and the artifacts it really named go unchecked. So the root is found by
 * pattern and the rest is scanned, counting each opener against its closer.
 */
function citationsIn(line: string): string[] {
  const found: string[] = [];
  for (const start of [...line.matchAll(CITED_GENERATED_ROOT)]) {
    const from = start.index;
    if (from === undefined) continue;
    const opener = citationOpener(line, from);
    if (opener === null) continue;
    let index = from + start[0].length;
    const closers: string[] = [];
    let usable = true;
    while (index < line.length) {
      // The run that opened the citation closes it: a path written in emphasis
      // ends where the emphasis does, and a trailing `**` is not a wildcard.
      // The run has to close, though — `preflight_summary.md` carries the
      // delimiter inside a name, and breaking there measured a prefix.
      if (opener !== "" && closesEmphasis(line, index, opener)) break;
      const character = line[index] ?? "";
      if (character === "[") {
        // Through the compiler's own scanner: an initial `]` is a member and an
        // inner `[` is one too, so the generic stack closed `[]a]` at the first
        // `]` and read `[[]` as unbalanced — discarding a citation the matcher
        // resolves.
        const close = findClassClose(line, index);
        // Bounded to the token: a class that never closes inside the citation
        // would otherwise borrow a `]` out of the sentence around it.
        const body = close === -1 ? "" : line.slice(index, close);
        if (close !== -1 && body.trim() === body && !body.includes(" ")) {
          index = close + 1;
          continue;
        }
      }
      const closer = GROUP_CLOSERS[character];
      if (closer !== undefined) {
        closers.push(closer);
      } else if (character === ")" || character === "}" || character === "]") {
        // A closer with no opener inside the token belongs to the text around
        // it — a Markdown link's `)`, a parenthesis the sentence opened before
        // the path. It ends the citation rather than spoiling it. A mismatch
        // against a group this token opened is a different thing: the token is
        // not a path, and recording the text before the group would record a
        // prefix nothing has.
        if (closers.length === 0) break;
        if (closers.at(-1) !== character) {
          usable = false;
          break;
        }
        closers.pop();
      } else if (CITATION_CHARACTER.test(character)) {
        // An ordinary path character, inside a group or out.
      } else if (closers.length > 0 && IN_GROUP_CHARACTER.test(character)) {
        // The separators a group's alternatives use, the two spellings of a
        // negated bracket class, and the delimiters of a named class inside
        // one — `[[:digit:]]` is a pattern the compiler resolves, and a scan
        // that stopped at its first `:` left both closers open and threw the
        // whole citation away.
      } else if ((character === "@" || character === "!") && line[index + 1] === "(") {
        // An extglob introducer, which is one only where a group follows it.
      } else if (NAME_CHARACTER.test(character)) {
        // A character a file name holds and the dialect gives no meaning, such as
        // the `@` of `@missing.md` or a letter outside ASCII. Stopping before it
        // measured the prefix, which resolved against its directory.
      } else {
        break;
      }
      index += 1;
    }
    if (!usable || closers.length > 0) continue;
    const cited = line.slice(from, index);
    if (cited.length > start[0].length) found.push(cited);
  }
  return found;
}

/**
 * A line that says a path is not provenance.
 *
 * A record explaining why an artifact is absent, or saying it is deliberately
 * not cited, writes the path like any other. Without a way to say so it would
 * either fail this guard or need a backlog entry claiming a citation it just
 * disclaimed. The marker is per line, so it covers what a reader can see it
 * covering.
 *
 * On the line before a fenced block it covers the paths it names inside that
 * block, and only those. A transcript is where both halves of that matter: the
 * marker cannot go inside the fence, where it renders as though the command had
 * printed it, and it cannot cover the whole block either, because a transcript
 * carries real citations beside the disclaimed mention.
 */
const NOT_A_CITATION = /<!--\s*qfai:not-a-citation[^>]*-->/;

/**
 * Citations that do not resolve in the committed tree, as measured.
 *
 * A backlog, not permission. Two rules hold it, both below: a citation that is
 * not here fails, and an entry that resolves or is no longer cited fails too. So
 * the list may only shrink, and a record added today cannot take a slot an old
 * one vacated.
 *
 * An entry leaves when the path resolves — the artifact is committed — or when
 * the record stops citing it. Recording the reviewer role, verdict, revision and
 * audited hash beside the name is what makes the second safe, and for most of
 * these packs that content is not in this repository at all: it has to come from
 * whoever holds the run.
 */

/**
 * How many citations the first census measured.
 *
 * Exact, not a ceiling. A ceiling alone lets one repair pay for one new record:
 * the length stays where it was, every entry is still recorded, and nothing is
 * stale. Repairing an entry moves it to `CLEARED` below and leaves this list
 * untouched, so the only way to reach this number after adding a citation is to
 * remove one that was really there — and either edit is visible.
 */
const INITIAL_CENSUS_SIZE = 127;

/**
 * The census keys themselves, as one digest.
 *
 * A length alone is not the no-growth rule: replacing a repaired entry with a
 * new one keeps it at 127, and every other check then passes while a fresh
 * citation inherits the retired slot. The digest moves for any substitution, and
 * does not move when an entry is repaired — repair adds to `CLEARED` and leaves
 * the census alone.
 */
const INITIAL_CENSUS_DIGEST = "61beb69a762bcf0d473e43f8aa8d91155aa1fa926391ab79d6e3e8bca8b521f9";

/**
 * Every citation the first census found unresolved. **Append nothing here.**
 *
 * A record added today does not belong to a census taken before it existed. When
 * one of these is repaired, its key goes to `CLEARED`; this list stays as
 * measured.
 */
const INITIAL_CENSUS: ReadonlyArray<Citation> = [
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/run-20260822024224027", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/specs-coverage/spec-0017.md", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-2026082*/R0*.md", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-2026082*/R0*.md", 2],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260820200000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260820200000000", 2],
  [
    ".qfai/evidence/atdd-spec-0017.md",
    ".qfai/review/review-20260820200000000/R02_completion-reviewer.md",
    1,
  ],
  [
    ".qfai/evidence/atdd-spec-0017.md",
    ".qfai/review/review-20260820200000000/R03_qa-gatekeeper.md",
    1,
  ],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260820220000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821000000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821020000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821040000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821060000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821080000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821100000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821120000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821140000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821160000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821180000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821200000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822030000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822060000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822090000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822120000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822150000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822180000000", 1],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260823000000000", 1],
  [".qfai/evidence/coverage-depth-spec-0002.md", ".qfai/report/atdd-traceability/summary.json", 1],
  [".qfai/evidence/discussion-20260330153902875.md", ".qfai/discussion/README.md", 1],
  [".qfai/evidence/discussion-20260330153902875.md", ".qfai/discussion/README.md", 2],
  [".qfai/evidence/discussion-20260415161758193.md", ".qfai/discussion/README.md", 1],
  [".qfai/evidence/discussion-20260415203030886.md", ".qfai/review/review-20260415203030887", 1],
  [".qfai/evidence/discussion-20260416023323603.md", ".qfai/discussion/README.md", 1],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/discussion/discussion-20260416023323603/01..14",
    1,
  ],
  [".qfai/evidence/discussion-20260416023323603.md", ".qfai/review/review-20260416023323603", 1],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/review/review-20260416023323603/R01_completion-reviewer.md",
    1,
  ],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/review/review-20260416023323603/R02_requirements-reviewer.md",
    1,
  ],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/review/review-20260416023323603/R03_architecture-reviewer.md",
    1,
  ],
  [".qfai/evidence/discussion-20260416092414328.md", ".qfai/review/review-20260416092414328", 1],
  [".qfai/evidence/discussion-20260416195444737.md", ".qfai/discussion/README.md", 1],
  [".qfai/evidence/discussion-20260416195444737.md", ".qfai/review/review-20260416195500000", 1],
  [".qfai/evidence/discussion-20260416195444737.md", ".qfai/review/review-20260416195500000", 2],
  [".qfai/evidence/discussion-20260418170937652.md", ".qfai/discussion/README.md", 1],
  [
    ".qfai/evidence/discussion-20260418170937652.md",
    ".qfai/review/review-20260418170937652/R03_architecture-reviewer.md",
    1,
  ],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805190301000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805190302000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805192001000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805192002000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805193501000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805195501000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805202001000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805204501000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805210001000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805212001000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805214501000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805221501000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805224501000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805224502000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806001501000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806001502000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806010001000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806014501000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806023001000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806073001000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806220001000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806220002000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260807030001000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260807120001000", 1],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260807180001000", 1],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/report/atdd-traceability/summary.json", 1],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/report/validate.json", 1],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/report/validate.log", 1],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/review/review-20260818*", 1],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/review/review-20260818*", 2],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/review/review-20260818*", 3],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/review/review-20260818*", 4],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/review/review-20260818*", 5],
  [".qfai/evidence/implement-spec-0017.md", ".qfai/review/review-20260820140000000", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/README.md", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/README.md", 2],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260414195449523/**", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260415014056471", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260418093755100/**", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260516144141078", 1],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/report/preflight/run-20260911090607227/preflight_summary.md",
    1,
  ],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/report/preflight/run-20260911090607227/preflight_summary.md",
    2,
  ],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/run-20260518132742559", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/run-20260518175405426", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/run-20260518175405426", 2],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate-sdd.json", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.json", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.json", 2],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.json", 3],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.json", 4],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 2],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 3],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 4],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 5],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 6],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 7],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 8],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 9],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 10],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 11],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 12],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 13],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 14],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 15],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 16],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 17],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 18],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 19],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 20],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 21],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log", 22],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/review/review-20260415060932/R01_completion-reviewer.md",
    1,
  ],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/review/review-20260415060932/R01_completion-reviewer.md",
    2,
  ],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/review/review-20260415060932/R02_architecture-reviewer.md",
    1,
  ],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/review/review-20260415060932/R02_architecture-reviewer.md",
    2,
  ],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260415060932/review_request.md", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260415060932/summary.json", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260415161758193", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260416070000000/summary.json", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260416195500000", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260416195500000/**", 1],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260417070000000", 1],
];

/**
 * Census entries that have since been repaired.
 *
 * An entry leaves the backlog by arriving here, and the case below holds that it
 * really is repaired — the path resolves, or the record no longer cites it that
 * many times. Removing any one citation of a path renumbers the rest from one,
 * so the entry that stops being measured, and moves here, is the highest. The
 * list is the progress the census is meant to produce, and it is the only list
 * that grows.
 */
const CLEARED: ReadonlyArray<Citation> = [];

/** Every path git tracks, and every directory one of them lies under. */
function trackedPaths(): { files: ReadonlySet<string>; directories: ReadonlySet<string> } {
  // `git ls-files`, not `readdir`: these trees are ignored, so a developer
  // checkout holds artifacts its own QFAI runs generated. Walking the disk would
  // fail on an uncommitted evidence file and pass on a citation that resolves
  // only here — the opposite of the guard's purpose, in both directions.
  //
  // `-s` for the mode, because being listed is not the same as being readable in
  // a clone. A force-added symlink is a path git tracks and a file nobody can
  // open when its target is missing or outside the repository, and a gitlink is
  // a commit id rather than content. Only a regular blob carries the artifact a
  // citation claims.
  const listed = execFileSync("git", ["ls-files", "-s", "-z"], {
    cwd: repoRoot,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  })
    .toString("utf-8")
    .split("\0")
    .filter((entry) => entry !== "")
    .flatMap((entry) => {
      // `<mode> <object> <stage>\t<path>`
      const tab = entry.indexOf("\t");
      const mode = entry.slice(0, 6);
      if (tab === -1 || (mode !== "100644" && mode !== "100755")) return [];
      return [entry.slice(tab + 1)];
    });

  const directories = new Set<string>();
  for (const file of listed) {
    const parts = file.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join("/"));
    }
  }
  return { files: new Set(listed), directories };
}

const tracked = trackedPaths();

/**
 * Evidence files the repository carries, in path order.
 *
 * Markdown and JSON both: a decision record is written as JSON, its question,
 * answer and scope are free text, and a path cited in one of those fields is a
 * claim about an artifact exactly as a path in a Markdown record is.
 */
const evidenceFiles = [...tracked.files]
  .filter((file) => file.startsWith(".qfai/evidence/") && /\.(?:md|json|ya?ml)$/.test(file))
  .sort();

/**
 * True when the cited path stays inside the generated root it opened with.
 *
 * `.qfai/report/../../package.json` normalises to a file that exists, so a
 * resolution check alone would accept it as provenance for something no record
 * cited.
 */
function staysInsideRoot(cited: string, root: string): boolean {
  const normalized = path.posix.normalize(cited);
  return !normalized.split("/").includes("..") && normalized.startsWith(root);
}

/** A citation: the evidence file, the path it cites, and which citation of that path it is. */
type Citation = readonly [file: string, cited: string, occurrence: number];

/**
 * Every citation the committed evidence carries, numbered per path within its
 * file.
 *
 * Each occurrence is its own claim. Counted once per file, a section added
 * beside an old one could cite the same absent pack again and be covered by the
 * backlog entry the old section holds.
 */
async function measureCitations(): Promise<Citation[]> {
  const measured: Citation[] = [];
  for (const file of evidenceFiles) {
    const text = await readFile(path.join(repoRoot, file), "utf-8");
    measured.push(...citationsOf(file, file.endsWith(".md") ? text : decodedRecord(file, text)));
  }
  return measured;
}

/**
 * A JSON record's string values, one per line, as the record means them.
 *
 * JSON may write a separator as `\/` or `\u002f`, and the raw text then holds no
 * root to find. A record that does not parse is read as the text it is.
 */
function decodedJson(text: string): string {
  return decodedRecord("record.json", text);
}

/**
 * A JSON or YAML record's keys and string values, one per line, as the record
 * means them. A record that does not parse is read as the text it is.
 */
function decodedRecord(file: string, text: string): string {
  const strings: string[] = [];
  const collect = (value: unknown): void => {
    if (typeof value === "string") strings.push(...value.split("\n"));
    else if (Array.isArray(value)) value.forEach(collect);
    else if (typeof value === "object" && value !== null) {
      // A key is a string too, and a manifest often keys its entries by path.
      for (const [name, member] of Object.entries(value)) {
        strings.push(...name.split("\n"));
        collect(member);
      }
    }
  };
  if (!file.endsWith(".json")) {
    // Every scalar node, keys included, without resolving an alias: a record
    // holding one is still read, and an alias adds no text of its own.
    const document = parseDocument(text);
    if (document.errors.length > 0) return text;
    visit(document, {
      Scalar(_key, node) {
        if (typeof node.value === "string") strings.push(...node.value.split("\n"));
      },
    });
    return strings.join("\n");
  }
  try {
    collect(JSON.parse(text));
  } catch {
    return text;
  }
  return strings.join("\n");
}

/** The citations one evidence file's text carries, numbered per path. */
function citationsOf(file: string, text: string): Citation[] {
  const measured: Citation[] = [];
  const occurrences = new Map<string, number>();
  const disclaimed = disclaimedByLine(text);
  text.split("\n").forEach((line, index) => {
    const covered = disclaimed[index];
    if (covered === "all") return;
    for (const match of citationsIn(line)) {
      const cited = normalizeCitation(match);
      // `continue`, not `return`: one line can carry several citations, and
      // leaving the line on the first one that is root-only or disclaimed loses
      // every citation after it.
      if (covered?.has(cited) === true || !namesSomethingInside(cited)) continue;
      const occurrence = (occurrences.get(cited) ?? 0) + 1;
      occurrences.set(cited, occurrence);
      measured.push([file, cited, occurrence]);
    }
  });
  return measured;
}

/**
 * What each line of a record has been said not to be provenance for.
 *
 * `"all"` is the marker on the line itself, which is how prose disclaims a path
 * it is explaining rather than citing. A set is the marker on the line before a
 * fenced block, naming the paths it covers inside that block: a marker inside
 * the fence renders as though the command printed it, which alters the record of
 * what was observed in order to control a scanner — and a block form that
 * covered everything would hide the real citations a transcript also carries.
 */
function disclaimedByLine(text: string): Array<"all" | Set<string> | undefined> {
  const lines = text.split("\n");
  const disclaimed: Array<"all" | Set<string> | undefined> = lines.map(() => undefined);
  let open: { character: string; length: number } | null = null;
  let covers: Set<string> | null = null;
  lines.forEach((line, index) => {
    // Only outside a fence: inside one the marker is part of what the command
    // printed, and read as a disclaimer it hid every citation on the line.
    const outside = (): void => {
      if (open === null && NOT_A_CITATION.test(withoutInlineCode(line))) disclaimed[index] = "all";
    };
    // A fence inside a list item or a blockquote is indented past three spaces,
    // or carries the quote marker, and is still a fence.
    const fence = /^(?:[ \t]*>)*[ \t]*(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence === null) {
      if (open !== null && covers !== null) disclaimed[index] = covers;
      outside();
      return;
    }
    const run = fence[1] ?? "";
    const rest = fence[2] ?? "";
    if (open === null) {
      if (run.startsWith("`") && rest.includes("`")) {
        outside();
        return;
      }
      open = { character: run[0] ?? "`", length: run.length };
      covers = disclaimedPaths(lines[index - 1] ?? "");
      return;
    }
    if (run[0] === open.character && run.length >= open.length && rest.trim() === "") {
      open = null;
      covers = null;
    } else if (covers !== null) {
      disclaimed[index] = covers;
    }
  });
  return disclaimed;
}

/**
 * A line with its inline code spans removed. A marker inside one renders as
 * text, like a marker inside a fence, and disclaims nothing.
 */
function withoutInlineCode(line: string): string {
  return line.replace(/(`+)[^`]*?\1/g, "");
}

/** The paths a marker names, or `null` when the line carries no marker naming any. */
function disclaimedPaths(line: string): Set<string> | null {
  const marker = /<!--\s*qfai:not-a-citation([^>]*?)-->/.exec(withoutInlineCode(line));
  // Normalized the way a measured citation is, so a marker naming a directory
  // with its conventional trailing separator covers the path the scan produces.
  const named = citationsIn(marker?.[1] ?? "").map(normalizeCitation);
  return named.length === 0 ? null : new Set(named);
}

/**
 * True when the path names something inside a generated tree rather than the
 * tree itself.
 *
 * `.qfai/review/*` and `.qfai/review/**` are how the ignore rules and the
 * exclusion lists spell the directory, and a record quoting one is describing
 * what is ignored — there is no artifact being claimed. A glob whose first
 * segment carries a literal, `review-2026082*`, names a set of packs and claims
 * that set exists.
 */
function namesSomethingInside(cited: string): boolean {
  const root = GENERATED_ROOTS.find((candidate) => cited.startsWith(candidate));
  if (root === undefined) return false;
  // Those two spellings and no others. Removing every wildcard and separator
  // before deciding exempts `review/*/*` and `review/**/*` as well, and those
  // name descendants: when the tree tracks none, the citation is dropped before
  // it can be reported unresolved.
  const inside = cited.slice(root.length);
  return inside !== "" && inside !== "*" && inside !== "**";
}

/**
 * A citation as the one or more paths it names.
 *
 * `README.md` spells a review pack's contents as a brace list, and a record
 * using that spelling claims every name in it — which is why the list is
 * expanded here rather than left to the compiler, whose braces are an
 * alternation: one member matching is enough for a matcher, and not enough for
 * a claim. An empty member is a member: `{,draft-}validate.json` names the base
 * report as well as the draft.
 */
function expandBraces(cited: string): string[] {
  for (const open of outsideClasses(cited)) {
    if (cited[open] !== "{") continue;
    const close = matchingBrace(cited, open);
    if (close === -1) continue;
    const body = cited.slice(open + 1, close);
    const list = topLevelAlternatives(body);
    // A body with no top-level comma and no range is literal text to the
    // matcher: `{discussion-1}` names a directory spelled with its braces.
    const members = braceRange(body) ?? (list.length > 1 ? list : null);
    if (members === null) continue;
    const before = cited.slice(0, open);
    const after = cited.slice(close + 1);
    return members.flatMap((part) => expandBraces(`${before}${part}${after}`));
  }
  return [cited];
}

/**
 * The members of a brace range, `1..3`, `01..03` or `a..c`, with an optional
 * increment, or `null` when the body is not one the guard expands.
 *
 * The matcher expands a range to every member between its ends, so `{1..3}`
 * names three files, not one called `1..3`.
 *
 * SIMPLIFIED: a range with a negative end, or with more than
 * {@link RANGE_MEMBER_LIMIT} members, is not expanded, and a citation holding
 * one is reported unresolved rather than guessed at. A timestamp-sized range
 * would otherwise step past the precision a number holds and never end.
 * Lift when: a record cites such a range and needs it resolved.
 */
function braceRange(body: string): string[] | null {
  const numeric = /^(\d+)\.\.(\d+)(?:\.\.(-?\d+))?$/.exec(body);
  const alphabetic = /^([A-Za-z])\.\.([A-Za-z])(?:\.\.(-?\d+))?$/.exec(body);
  const match = numeric ?? alphabetic;
  if (match === null) return null;
  const [from, to] = [match[1] ?? "", match[2] ?? ""];
  const [start, end] =
    numeric === null ? [from.charCodeAt(0), to.charCodeAt(0)] : [Number(from), Number(to)];
  const increment = rangeIncrement(match[3]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
  if (Math.abs(end - start) / increment + 1 > RANGE_MEMBER_LIMIT) return null;
  const width =
    numeric !== null && (/^0\d/.test(from) || /^0\d/.test(to))
      ? Math.max(from.length, to.length)
      : 0;
  const step = start <= end ? increment : -increment;
  const members: string[] = [];
  for (let value = start; step > 0 ? value <= end : value >= end; value += step) {
    members.push(
      numeric === null ? String.fromCharCode(value) : String(value).padStart(width, "0"),
    );
  }
  return members;
}

/** The most members a range may name before the guard stops expanding it. */
const RANGE_MEMBER_LIMIT = 1000;
/** A range's increment, `{1..5..2}`: its size, and 1 where it names none or 0. */
function rangeIncrement(written: string | undefined): number {
  const size = Math.abs(Number(written ?? 1));
  return size === 0 ? 1 : size;
}

/**
 * The indices of `text` from `start` on that are not inside a bracket
 * expression.
 *
 * A brace or a comma inside a class is a member of it: `[{}].json` names
 * `{.json` and `}.json`, and read as a brace list it named neither.
 */
function outsideClasses(text: string, start = 0): number[] {
  const indices: number[] = [];
  for (let index = start; index < text.length; index += 1) {
    const close = text[index] === "[" ? findClassClose(text, index) : -1;
    if (close !== -1) {
      index = close;
      continue;
    }
    indices.push(index);
  }
  return indices;
}

/** The index of the `}` matching the `{` at `open`, or `-1` when it has none. */
function matchingBrace(cited: string, open: number): number {
  let depth = 0;
  for (const index of outsideClasses(cited, open)) {
    if (cited[index] === "{") depth += 1;
    if (cited[index] === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/**
 * A brace body's alternatives, split at the commas that belong to it.
 *
 * A list can hold a list — `{a,{b,c}}` — and splitting on every comma makes
 * names carrying a stray brace, which resolve nowhere. Only the commas outside
 * a nested pair and outside a class separate this list's members.
 */
function topLevelAlternatives(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (const index of outsideClasses(body)) {
    const character = body[index];
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(body.slice(from, index).trim());
      from = index + 1;
    }
  }
  parts.push(body.slice(from).trim());
  return parts;
}

/**
 * A glob as a regular expression over a whole path.
 *
 * Delegated to the dialect this package already implements, rather than written
 * again here. Two implementations of one notation give two answers for one
 * tree, and the shared compiler is the one written against the matcher the
 * project's own globs are read by.
 *
 * A record naming a set still claims the set exists, so a glob is resolved like
 * a single path rather than skipped — the tree carried three matching nothing at
 * all, and skipping them let that provenance through as green.
 */
function globToRegExp(cited: string): RegExp {
  return new RegExp(`^${compileGlob(cited)}$`);
}

/**
 * Whether a citation names a set rather than one path.
 *
 * A bracket expression is one of the ways, and reading it as literal characters
 * sent `0[1]_Context.md` to an exact-path lookup and reported the tracked
 * `01_Context.md` it names as missing.
 */
function namesASet(cited: string): boolean {
  return (
    /[*?]/.test(cited) || /[?*+@!]\(/.test(cited) || cited.includes("{") || /\[.*\]/.test(cited)
  );
}

/**
 * Whether a wildcard is being allowed to match a name that has to be written.
 *
 * `*` compiles to any run of characters that is not a separator, which a
 * leading dot satisfies — while the globs this project actually scans with do
 * not match one unless it is spelled. The gap shows up where it matters most: a
 * generated directory keeps a tracked `.gitignore` so the directory survives
 * with nothing generated in it, and `.qfai/report/**` resolved against exactly
 * that, passing a record that claims the run's artifacts are there.
 *
 * A dot-leading name counts only where the citation spells one that matches it,
 * so `.qfai/report/.*` still resolves and a plain wildcard does not.
 */
function hidesADotName(cited: string, candidate: string): boolean {
  return !alignsWithDotPolicy(cited.split("/"), candidate.split("/"));
}

/**
 * Whether the pattern matches the candidate with every dot-leading segment
 * spelled, segment against the segment it matched.
 *
 * Checking each candidate segment against the whole pattern instead let one
 * explicit `.cache` vouch for a second the wildcard beside it consumed, so
 * provenance reached through a hidden directory nobody named read as valid.
 * `**` consumes whole segments and spells none of them, which is what a
 * wildcard is; every other segment is compiled on its own and asked what it
 * does with the same name minus its dot.
 */
function alignsWithDotPolicy(parts: readonly string[], segments: readonly string[]): boolean {
  const [part, ...rest] = parts;
  if (part === undefined) return segments.length === 0;
  if (part === "**") {
    for (let taken = 0; taken <= segments.length; taken += 1) {
      if (taken > 0 && (segments[taken - 1] ?? "").startsWith(".")) break;
      if (alignsWithDotPolicy(rest, segments.slice(taken))) return true;
    }
    return false;
  }
  const segment = segments[0];
  if (segment === undefined) return false;
  if (!segmentAdmits(part, segment)) return false;
  return alignsWithDotPolicy(rest, segments.slice(1));
}

/**
 * Whether one pattern segment matches a candidate segment and, where that name
 * is dot-leading, asks for the dot rather than allowing it.
 *
 * Asked of the whole segment, an extglob carrying both an explicit and an
 * implicit alternative answered wrongly: `@(.gitignore|g*)` matches
 * `.gitignore` through the first and `gitignore` through the second, so the
 * explicit spelling read as a wildcard's reach. Each alternative is therefore
 * asked on its own, and the segment admits the name when one of them spells it.
 */
function segmentAdmits(part: string, segment: string): boolean {
  const matches = (candidate: string, source: string): boolean =>
    new RegExp(`^${compileGlob(source)}$`).test(candidate);
  if (!matches(segment, part)) return false;
  if (!segment.startsWith(".")) return true;
  return topLevelAlternativesOf(part).some(
    (alternative) => matches(segment, alternative) && !matches(segment.slice(1), alternative),
  );
}

/**
 * One segment's alternatives, where it is written as a list of them.
 *
 * A brace list names a set, and so does a segment holding an extended group:
 * `@(…)` and `?(…)` match one member, so each member, with the text around the
 * group, is a pattern in its own right. `+(…)` and `*(…)` match a run of
 * members, and a leading dot the group spells is spelled by the first, so each
 * member comes back followed by the group again. A plain wildcard is one
 * pattern, and comes back as itself. A member holding a group of its own is
 * opened too: `@(@(.git|g*)ignore|x)` spells `.gitignore` only inside, and
 * left whole its `g*` sibling read the spelling as a wildcard's reach.
 */
function topLevelAlternativesOf(part: string): string[] {
  const open = outsideClasses(part).find(
    (index) => "@?+*".includes(part[index] ?? "") && part[index + 1] === "(",
  );
  const close = open === undefined ? -1 : groupClose(part, open + 1);
  if (open === undefined || close === -1) return expandBraces(part);
  const before = part.slice(0, open);
  const body = part.slice(open + 2, close);
  const after = part.slice(close + 1);
  const repeat = part[open] === "+" || part[open] === "*" ? `*(${body})` : "";
  // `?(…)` and `*(…)` also match nothing, and a group after this one spells
  // its own alternatives: `?(x)@(.git|g*)` admits `.git` through both.
  const members = [
    ...splitAlternatives(body),
    ...(part[open] === "?" || part[open] === "*" ? [""] : []),
  ];
  const rests = topLevelAlternativesOf(after);
  return members.flatMap((member) =>
    topLevelAlternativesOf(member).flatMap((inner) =>
      rests.flatMap((rest) =>
        expandBraces(`${before}${inner}${inner === "" ? "" : repeat}${rest}`),
      ),
    ),
  );
}

/** The index of the `)` closing the group opened at `open`, or `-1`. */
function groupClose(part: string, open: number): number {
  let depth = 0;
  for (const index of outsideClasses(part, open)) {
    if (part[index] === "(") depth += 1;
    if (part[index] === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/**
 * One extended group body's alternatives, at the top level of that body. Only
 * `|` separates them: a comma there is part of a name.
 */
function splitAlternatives(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index] ?? "";
    // A bracket expression is copied whole: a separator inside one is a member
    // of the class.
    if (character === "[") {
      const close = findClassClose(body, index);
      if (close !== -1) {
        current += body.slice(index, close + 1);
        index = close;
        continue;
      }
    }
    if (character === "(" || character === "{") depth += 1;
    else if (character === ")" || character === "}") depth -= 1;
    else if (character === "|" && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  parts.push(current);
  return parts;
}

/**
 * A cited path resolves when git tracks it, or tracks something under it.
 *
 * A glob resolves when it matches at least one tracked path, which is the whole
 * of what a set-naming citation claims.
 */
function resolves(cited: string): boolean {
  // Every name, not one of them: a brace list claims all of what it names, and
  // a check that any member resolves passes a pack missing two of three.
  // Whenever expansion changed the citation, not only where it produced several
  // names: a one-member list is still a list, and resolving the brace token
  // itself reports a tracked artifact as missing.
  const names = expandBraces(cited);
  if (names.length !== 1 || names[0] !== cited) {
    return names.every((name) => resolves(name));
  }
  const root = GENERATED_ROOTS.find((candidate) => cited.startsWith(candidate));
  if (root === undefined || !staysInsideRoot(cited, root)) return false;
  // Braces that did not expand are literal text, which the compiler would read
  // as a list. Nothing the tree tracks is spelled with them, so the citation
  // is unresolved rather than matched against the name inside them.
  if (outsideClasses(cited).some((index) => cited[index] === "{")) {
    return tracked.files.has(cited) || tracked.directories.has(cited);
  }
  if (namesASet(cited)) {
    // Directories as well as files: `.qfai/discussion/discussion-*` names a set
    // of packs, and an anchored pattern matches no file below one of them — so
    // reading files alone reports a citation unresolved while the tree holds
    // every pack it names.
    const pattern = globToRegExp(cited);
    for (const candidate of [...tracked.files, ...tracked.directories]) {
      if (pattern.test(candidate) && !hidesADotName(cited, candidate)) return true;
    }
    return false;
  }
  return tracked.files.has(cited) || tracked.directories.has(cited);
}

const key = ([file, cited, occurrence]: Citation): string => `${file} -> ${cited} #${occurrence}`;

/** The census, minus what has been repaired since. */
const UNRESOLVED_CITATION_BACKLOG: ReadonlyArray<Citation> = INITIAL_CENSUS.filter(
  (entry) => !new Set(CLEARED.map(key)).has(key(entry)),
);

describe("a committed record cites what the repository has", () => {
  it("reads the evidence the repository carries", async () => {
    // An empty read passes both cases below without asking anything, and the two
    // ways to get one — a moved directory, a filter that matches nothing — look
    // identical to a green run.
    expect(evidenceFiles.length, "git tracks no evidence file").toBeGreaterThan(0);
    expect((await measureCitations()).length, "no citation was measured").toBeGreaterThan(0);
  });

  it("names no artifact the committed tree does not carry", async () => {
    // A name that resolves nowhere still reads as provenance, and it costs a
    // reader a search to find out otherwise. The backlog is the exception, and
    // the case below is what keeps it an exception rather than a licence.
    const recorded = new Set(UNRESOLVED_CITATION_BACKLOG.map(key));
    const unlisted = (await measureCitations())
      .filter((citation) => !resolves(citation[1]))
      .map(key)
      .filter((entry) => !recorded.has(entry));
    expect(
      unlisted.sort(),
      "a committed evidence file cites a path the committed tree does not have. Commit the " +
        "artifact, or record beside the name what a reader needs from it — the reviewer role, " +
        "the verdict, the revision, the audited hash — and stop writing it as a path",
    ).toEqual([]);
  });

  it("keeps the census at what it measured", () => {
    // Exact. A repair moves its key to `CLEARED` and leaves this list alone, so
    // the length only moves when a citation is added to a census taken before
    // that record existed — which is the edit this refuses.
    expect(
      INITIAL_CENSUS.length,
      "the census is not the size it was measured at. A record added today does not belong in it: " +
        "repair moves a key to CLEARED and leaves the census as it stands",
    ).toBe(INITIAL_CENSUS_SIZE);
    expect(
      createHash("sha256").update(INITIAL_CENSUS.map(key).sort().join("|")).digest("hex"),
      "the census holds a key it was not measured with. Swapping one entry for another keeps the " +
        "length and hands a new citation a retired slot, which is what this digest refuses",
    ).toBe(INITIAL_CENSUS_DIGEST);
  });

  it("clears only what is really repaired", async () => {
    const measured = new Set((await measureCitations()).map(key));
    const notRepaired: string[] = [];
    for (const entry of CLEARED) {
      if (measured.has(key(entry)) && !resolves(entry[1])) notRepaired.push(key(entry));
    }
    expect(
      notRepaired.sort(),
      "a cleared entry is still cited and still unresolved — it is in the backlog, not out of it",
    ).toEqual([]);
  });

  it("keeps the backlog to what is still unresolved", async () => {
    // An entry for a path that now resolves is a slot: remove it in the change
    // that fixed it, or the next unresolved citation inherits it silently.
    const measured = new Set((await measureCitations()).map(key));
    const stale: string[] = [];
    for (const entry of UNRESOLVED_CITATION_BACKLOG) {
      if (!measured.has(key(entry))) stale.push(`${key(entry)} (no longer cited)`);
      else if (resolves(entry[1])) stale.push(`${key(entry)} (now resolves)`);
    }
    expect(
      stale.sort(),
      "the backlog may only shrink — drop the entry in the same change that fixes it",
    ).toEqual([]);
  });

  it("refuses a citation that climbs out of the tree it names", () => {
    // The path exists, so a resolution check alone reads it as provenance for an
    // artifact under `.qfai/report/` that no record ever cited.
    expect(resolves(".qfai/report/../../package.json")).toBe(false);
    expect(staysInsideRoot(".qfai/report/validate.json", ".qfai/report/")).toBe(true);
  });
});

describe("what the scan counts as a citation", () => {
  const matches = (line: string): string[] => (NOT_A_CITATION.test(line) ? [] : citationsIn(line));

  it("takes a scoped report's whole filename", () => {
    // A class stopping at the plus measures a prefix nothing has, and reports
    // the real file as missing while git tracks it.
    expect(matches("- `.qfai/report/validate.spec-0003+0004.json` — scoped run")).toEqual([
      ".qfai/report/validate.spec-0003+0004.json",
    ]);
  });

  it("reads the legacy output tree", () => {
    expect(matches("Fallback: `.qfai/output/verify.json`")).toEqual([".qfai/output/verify.json"]);
  });

  it("counts nothing where the root is the tail of a longer path", () => {
    // A path naming another tree — a temporary run directory, a checkout on the
    // machine that produced the record — holds the root too. Measured from
    // there, the suffix resolves against this repository's own tracked file,
    // and a name nobody here can open reads as clone-readable provenance.
    expect(matches("- `/tmp/run-42/.qfai/report/validate.json` — the runner's copy")).toEqual([]);
    expect(matches("- `../other-clone/.qfai/report/validate.json`")).toEqual([]);
    // The explicit repository-relative prefix is still a citation.
    expect(matches("- `./.qfai/report/validate.json`")).toEqual([".qfai/report/validate.json"]);
  });

  it("reads a path a record wrote in emphasis", () => {
    // `*` and `_` are a wildcard and an ordinary name character inside a path,
    // and emphasis delimiters around one. Read as path text, a record that
    // stressed a name was a record whose name nothing measured.
    for (const line of [
      "- **.qfai/report/missing.json**",
      "- _.qfai/report/missing.json_",
      "- __.qfai/report/missing.json__",
    ]) {
      expect(matches(line), line).toEqual([".qfai/report/missing.json"]);
    }
    // A run that is path text, not emphasis, still ends the citation before it.
    expect(matches("- `x_.qfai/report/missing.json`")).toEqual([]);
  });

  it("takes a brace list whole", () => {
    // Cut at the brace, the token left is the pack directory, and a tracked
    // pack holding anything at all then passes a citation whose every named
    // artifact may be missing.
    const pack = ".qfai/review/review-20260912000000000";
    expect(matches(`- \`${pack}/{review_request.md,summary.json}\``)).toEqual([
      `${pack}/{review_request.md,summary.json}`,
    ]);
  });

  it("takes an extended glob group whole", () => {
    // The dialect supports `@(a|b)` and its siblings. Cut at the `@`, what is
    // left is the pack directory, and a tracked pack passes a citation naming
    // two packs that may both be missing.
    expect(matches("- `.qfai/review/@(review-a|review-b)/summary.json`")).toEqual([
      ".qfai/review/@(review-a|review-b)/summary.json",
    ]);
    // An ordinary parenthesis after a path still ends the token.
    expect(matches("- `.qfai/report/validate.json` (the scoped run)")).toEqual([
      ".qfai/report/validate.json",
    ]);
  });

  it("takes a nested group whole", () => {
    // The dialect compiles alternatives recursively, so a group can hold one.
    // Cut at the first `)`, what is left is a prefix nothing has.
    const cited = ".qfai/review/@(review-a|+(review-b|review-c))/summary.json";
    expect(matches("- `" + cited + "`")).toEqual([cited]);
  });

  it("drops a group that never closes", () => {
    // The text before it opened is a prefix nothing has, and recording it would
    // be the very entry this scan exists to avoid.
    expect(matches("- `.qfai/review/@(review-a|review-b/summary.json`")).toEqual([]);
  });

  it("ends a citation at punctuation the surrounding text opened", () => {
    // A Markdown link destination. The `)` was opened before the path, so it
    // closes the link rather than spoiling the citation.
    expect(matches("see [the report](.qfai/report/missing.json)")).toEqual([
      ".qfai/report/missing.json",
    ]);
    // A group this token opened is different: a mismatch there means the token
    // is not a path, and the text before the group is a prefix nothing has.
    expect(matches("- `.qfai/review/@(review-a|review-b/summary.json`")).toEqual([]);
  });

  it("takes a bracket class whole", () => {
    expect(matches("- `.qfai/report/[0-9]*.json`")).toEqual([".qfai/report/[0-9]*.json"]);
  });

  it("takes a one-character wildcard", () => {
    // The dialect supports `?`, and a grammar that stops before it leaves the
    // pack directory to be checked in place of the file set the citation named.
    expect(matches("- `.qfai/discussion/pack/?9_missing.md`")).toEqual([
      ".qfai/discussion/pack/?9_missing.md",
    ]);
  });

  it("covers a disclaimed directory written with its separator", () => {
    // The scan strips the trailing separator from the line below, so a marker
    // keeping it would name a path the scan never produces.
    const text = [
      "<!-- qfai:not-a-citation .qfai/report/run-123/ -->",
      "```text",
      "wrote .qfai/report/run-123/ and .qfai/report/validate.json",
      "```",
      "",
    ].join("\n");
    const covered = disclaimedByLine(text)[2];
    expect(covered).not.toBe("all");
    expect(covered instanceof Set && covered.has(".qfai/report/run-123")).toBe(true);
    // And only that path: the transcript's other citation is still measured.
    expect(covered instanceof Set && covered.has(".qfai/report/validate.json")).toBe(false);
  });

  it("counts nothing on a line that says the path is not provenance", () => {
    // A record explaining why an artifact is absent writes the path like any
    // other, and would otherwise need a backlog entry for a citation it just
    // disclaimed.
    expect(
      matches("`.qfai/report/validate.log` is not cited here. <!-- qfai:not-a-citation -->"),
    ).toEqual([]);
  });
});

describe("a glob is a claim about a set", () => {
  const matchesLine = (line: string): string[] => citationsIn(line);
  /** A pattern compiled the way the writer's own destination check compiles it. */
  const compiled = (pattern: string): RegExp => new RegExp(`^${compileGlob(pattern)}$`);

  it("resolves when at least one tracked path matches", () => {
    // `.qfai/specs/**` is not a generated root, so a glob under one of those is
    // the case: the tree carries packs, and a glob naming them resolves.
    // A glob matching no tracked path is the unsupported provenance the guard
    // exists to refuse, and skipping globs let it through as green.
    expect(resolves(".qfai/review/review-2026082*/R0*.md")).toBe(false);
    expect(
      globToRegExp(".qfai/review/review-2026082*/R0*.md").test(
        ".qfai/review/review-20260820200000000/R01_x.md",
      ),
    ).toBe(true);
    expect(
      globToRegExp(".qfai/review/review-2026082*/R0*.md").test(
        ".qfai/review/review-20260820200000000/sub/R01_x.md",
      ),
    ).toBe(false);
    expect(
      globToRegExp(".qfai/discussion/discussion-1/**").test(
        ".qfai/discussion/discussion-1/a/b/c.md",
      ),
    ).toBe(true);
  });

  it("reads a bracket expression as the set it names", () => {
    // A class with no wildcard beside it went to exact-path lookup, so a
    // citation naming a tracked file by one reported that file as missing.
    expect(namesASet(".qfai/report/validate.spec-00[0-9][0-9].json")).toBe(true);
    expect(namesASet(".qfai/report/validate.json")).toBe(false);
    expect(globToRegExp(".qfai/report/0[1]_Context.md").test(".qfai/report/01_Context.md")).toBe(
      true,
    );
    // The named classes the matcher accepts are written out, so a class the
    // pattern spells is the set it spells rather than the letters of its name.
    expect(
      globToRegExp(".qfai/report/TC-[[:digit:]][[:digit:]].json").test(".qfai/report/TC-04.json"),
    ).toBe(true);
    expect(
      globToRegExp(".qfai/report/TC-[[:digit:]][[:digit:]].json").test(".qfai/report/TC-dg.json"),
    ).toBe(false);
  });

  it("does not let a wildcard stand in for a name that has to be written", () => {
    // The control file that keeps a generated directory in the tree is the one
    // path there when nothing has been generated, and the globs this project
    // scans with do not match it. A record claiming the run's artifacts are
    // under the tree passed on it alone.
    const control = ".qfai/report/.gitignore";
    expect(globToRegExp(".qfai/report/**").test(control)).toBe(true);
    expect(hidesADotName(".qfai/report/**", control)).toBe(true);
    expect(hidesADotName(".qfai/report/**", ".qfai/report/validate.json")).toBe(false);
    // Spelled, it is a name like any other — including a spelling whose own
    // text does not start with the dot it asks for.
    expect(hidesADotName(".qfai/report/.gitignore", control)).toBe(false);
    expect(hidesADotName(".qfai/report/.*", control)).toBe(false);
    expect(hidesADotName(".qfai/report/[.]gitignore", control)).toBe(false);
  });

  it("reads a dot-leading name at the position that matched it", () => {
    // Checked against the whole pattern, one explicitly written `.cache`
    // vouched for a second the wildcard beside it consumed, so provenance
    // reached through a hidden directory nobody named read as valid.
    const cited = ".qfai/report/.cache/*/summary.json";
    expect(globToRegExp(cited).test(".qfai/report/.cache/.cache/summary.json")).toBe(true);
    expect(hidesADotName(cited, ".qfai/report/.cache/.cache/summary.json")).toBe(true);
    expect(hidesADotName(cited, ".qfai/report/.cache/run-1/summary.json")).toBe(false);
  });

  it("ends an emphasized citation at the delimiter that closes it", () => {
    // A delimiter inside a name is not a closer: breaking at the underscore
    // in `preflight_summary.md` measured the prefix before it.
    const cited = ".qfai/report/preflight_summary.md";
    expect(citationsIn(`- _${cited}_`)).toEqual([cited]);
    expect(citationsIn(`- **${cited}**`)).toEqual([cited]);
  });

  it("reads the alternative that spells a dot-leading name", () => {
    // Asked of the whole segment, a group carrying an explicit and an implicit
    // alternative answered wrongly: the explicit spelling read as a wildcard's
    // reach because a sibling alternative also matches the name without its dot.
    const cited = ".qfai/report/@(.gitignore|g*)";
    expect(globToRegExp(cited).test(".qfai/report/.gitignore")).toBe(true);
    expect(hidesADotName(cited, ".qfai/report/.gitignore")).toBe(false);
    // A group with no explicit spelling still does not reach a hidden name.
    expect(hidesADotName(".qfai/report/@(a*|g*)", ".qfai/report/.gitignore")).toBe(true);
  });

  it("reads a class beside an extended group, and a range written wrongly", () => {
    // The group scanner split on a separator inside the class, so a pattern the
    // project's own scan collects for was rejected. And a descending range
    // matches nothing there rather than throwing out of the command.
    expect(compiled("@([T,]|x)*.test.ts").test("TC-0000-0000.test.ts")).toBe(true);
    expect(compiled("@([T,]|x)*.test.ts").test("abc.test.ts")).toBe(false);
    expect(() => compiled("[z-a]*.test.ts")).not.toThrow();
    expect(compiled("[z-a]*.test.ts").test("TC-0000-0000.test.ts")).toBe(false);
  });

  it("matches nothing with a class holding an element it cannot write", () => {
    // Copied in as characters, `[[:TC:]]` accepted the `T` a skeleton name
    // starts with, while the project's own scan collects nothing for it. The
    // same holds negated, beside known members, and for the equivalence and
    // collating forms.
    for (const pattern of [
      "[[:TC:]]*.test.ts",
      "[![:TC:]]*.test.ts",
      "[a[:TC:]]*.test.ts",
      "[[:digit:][:TC:]]*.test.ts",
      "[[=T=]]*.test.ts",
      "[[.T.]]*.test.ts",
    ]) {
      expect(compiled(pattern).test("TC-0000-0000.test.ts"), pattern).toBe(false);
    }
    expect(compiled("[[:alpha:]]*.test.ts").test("TC-0000-0000.test.ts")).toBe(true);
  });

  it("keeps a brace inside a class a member of the class", () => {
    // Read as a brace list, `[{}]` lost both members and the tracked `{.json`
    // it names read as missing. A comma inside a class is a member too.
    expect(expandBraces(".qfai/report/[{}].json")).toEqual([".qfai/report/[{}].json"]);
    expect(globToRegExp(".qfai/report/[{}].json").test(".qfai/report/{.json")).toBe(true);
    expect(expandBraces(".qfai/report/{a,[,]b}.json")).toEqual([
      ".qfai/report/a.json",
      ".qfai/report/[,]b.json",
    ]);
  });

  it("reads the alternative that spells a dot-leading name in any quantified group", () => {
    // `?(…)`, `+(…)` and `*(…)` admit a spelled `.gitignore` as `@(…)` does, and
    // asked of the whole group, a wildcard sibling matching `gitignore` read the
    // spelling as that wildcard's reach.
    const control = ".qfai/report/.gitignore";
    for (const quantifier of ["?", "+", "*"]) {
      expect(hidesADotName(`.qfai/report/${quantifier}(.gitignore|g*)`, control), quantifier).toBe(
        false,
      );
      expect(hidesADotName(`.qfai/report/${quantifier}(a*|g*)`, control), quantifier).toBe(true);
    }
  });

  it("reads a backslash in a class as escaping the member after it", () => {
    expect(compiled("[\\-T]C-*").test("TC-0001")).toBe(true);
    expect(compiled("[\\-T]C-*").test("-C-0001")).toBe(true);
    expect(compiled("[\\-T]C-*").test("UC-0001")).toBe(false);
    expect(compiled("[\\]]x").test("]x")).toBe(true);
  });

  it("reads nested extended groups to the alternative that spells a dot-leading name", () => {
    expect(segmentAdmits("@(@(.git|g*)ignore|x)", ".gitignore")).toBe(true);
    expect(segmentAdmits("@(@(g*)ignore|x)", ".gitignore")).toBe(false);
  });

  it("expands a brace range to every member between its ends", () => {
    expect(expandBraces(".qfai/report/run-{1..3}.json")).toEqual([
      ".qfai/report/run-1.json",
      ".qfai/report/run-2.json",
      ".qfai/report/run-3.json",
    ]);
    expect(expandBraces("r-{08..10}")).toEqual(["r-08", "r-09", "r-10"]);
    expect(expandBraces("r-{c..a}")).toEqual(["r-c", "r-b", "r-a"]);
  });

  it("expands a stepped brace range", () => {
    expect(expandBraces("run-{1..5..2}")).toEqual(["run-1", "run-3", "run-5"]);
    expect(expandBraces("run-{a..e..2}")).toEqual(["run-a", "run-c", "run-e"]);
  });

  it("reads a marker inside a fence as transcript text", () => {
    const FENCE = "`".repeat(3);
    const text = [
      FENCE,
      "wrote .qfai/report/missing.json <!-- qfai:not-a-citation -->",
      FENCE,
      "prose about .qfai/report/other.json <!-- qfai:not-a-citation -->",
    ].join("\n");
    expect(citationsOf("x.md", text).map(([, cited]) => cited)).toEqual([
      ".qfai/report/missing.json",
    ]);
  });

  it("reads a JSON record's keys as well as its values", () => {
    const record = JSON.stringify({ ".qfai/report/missing.json": "sha256:0" });
    expect(citationsOf("x.json", decodedJson(record)).map(([, cited]) => cited)).toEqual([
      ".qfai/report/missing.json",
    ]);
  });

  it("reads a marker inside inline code as transcript text", () => {
    const line = `\`wrote .qfai/report/missing.json <!-- qfai:not-a-citation -->\``;
    expect(citationsOf("x.md", line).map(([, cited]) => cited)).toEqual([
      ".qfai/report/missing.json",
    ]);
  });

  it("reads a YAML record holding an alias", () => {
    const record = [
      "base: &base kept",
      "copy: *base",
      'path: ".qfai\\u002freport\\u002fmissing.json"',
      "",
    ].join("\n");
    expect(
      citationsOf("x.yaml", decodedRecord("x.yaml", record)).map(([, cited]) => cited),
    ).toEqual([".qfai/report/missing.json"]);
  });

  it("keeps a file name character the dialect gives no meaning", () => {
    const pack = ".qfai/discussion/discussion-20260328212829687";
    expect(citationsIn(`see ${pack}/@missing.md here`)).toEqual([`${pack}/@missing.md`]);
    expect(citationsIn(`see ${pack}/r\u00e9sum\u00e9.md`)).toEqual([`${pack}/r\u00e9sum\u00e9.md`]);
  });

  it("reads a dot-leading name a later sibling group spells", () => {
    expect(segmentAdmits("?(x)@(.git|g*)", ".git")).toBe(true);
    expect(segmentAdmits("?(x)@(g*)", ".git")).toBe(false);
  });

  it("counts nothing where a Windows path holds the root", () => {
    expect(citationsIn("C:\\tmp\\run\\.qfai/report/validate.json")).toEqual([]);
  });

  it("reads a JSON record's strings decoded", () => {
    const record = JSON.stringify({ source: ".qfai/report/missing.json" }).replaceAll("/", "\\/");
    expect(record).not.toContain(".qfai/report/");
    expect(citationsOf("x.json", decodedJson(record)).map(([, cited]) => cited)).toEqual([
      ".qfai/report/missing.json",
    ]);
  });

  it("keeps a negated class's leading hyphen a member", () => {
    // Written beside the members, the separator made a range with the hyphen:
    // `[!-a-z]` compiled to a class whose `/-a` also excluded every capital, so
    // a name the project's own scan accepts was refused.
    expect(compiled("[!-a-z]*.test.ts").test("TC-0000-0000.test.ts")).toBe(true);
    expect(compiled("[!-a-z]*.test.ts").test("-x.test.ts")).toBe(false);
    expect(compiled("[!-a-z]*.test.ts").test("b.test.ts")).toBe(false);
    expect(compiled("tests[!-a]x").test("tests/x")).toBe(false);
  });

  it("reads a comma in an extended group as part of a name", () => {
    // Only `|` separates an extended group; the matcher reads
    // `@(preflight_summary.md,missing.md)` as one name holding a comma, and split
    // there it resolved against the tracked summary it does not name.
    const cited = ".qfai/report/@(preflight_summary.md,missing.md)";
    expect(globToRegExp(cited).test(".qfai/report/preflight_summary.md")).toBe(false);
    expect(globToRegExp(cited).test(".qfai/report/preflight_summary.md,missing.md")).toBe(true);
    // A brace list is still a list.
    expect(globToRegExp(".qfai/report/{a,b}.md").test(".qfai/report/b.md")).toBe(true);
  });

  it("reads the alternative that spells a dot-leading name inside a longer segment", () => {
    // With text after the group, the whole segment was asked at once, and the
    // wildcard sibling matching the name without its dot hid the spelled one.
    const control = ".qfai/report/.gitignore";
    expect(hidesADotName(".qfai/report/@(.git|g*)ignore", control)).toBe(false);
    expect(hidesADotName(".qfai/report/@(a|g*)ignore", control)).toBe(true);
  });
  it("counts each citation of a path, not the path once per record", () => {
    // Counted once per file, a section added beside an old one could cite the
    // same absent pack and pass on the backlog entry the old section holds.
    const text = [
      "- `.qfai/review/review-20260101000000000`",
      "",
      "- `.qfai/review/review-20260101000000000` again, in a later section",
    ].join("\n");
    expect(citationsOf(".qfai/evidence/x.md", text).map(key)).toEqual([
      ".qfai/evidence/x.md -> .qfai/review/review-20260101000000000 #1",
      ".qfai/evidence/x.md -> .qfai/review/review-20260101000000000 #2",
    ]);
  });
  it("keeps a class off the separator, whatever it spells", () => {
    // A range holding `/` — `[.-9]` does — otherwise matched the separator,
    // and a destination the project's own scan cannot reach was accepted.
    expect(compiled("tests[.-9]integration/x.json").test("tests/integration/x.json")).toBe(false);
    expect(compiled("tests[.-9]integration/x.json").test("tests0integration/x.json")).toBe(true);
    // Negated, the separator joins what the class excludes.
    expect(compiled("tests[!a]integration").test("tests/integration")).toBe(false);
    expect(compiled("tests[!a]integration").test("testsbintegration")).toBe(true);
  });

  it("keeps a class whose first member is a bracket whole", () => {
    // The compiler reads an initial `]` as a member and an inner `[` as one,
    // so a generic bracket stack closed the first at its first `]` and read the
    // second as unbalanced — discarding a citation the matcher resolves.
    for (const cited of [".qfai/report/[]a]validate.json", ".qfai/report/[[]validate.json"]) {
      expect(citationsIn(`- \`${cited}\``), cited).toEqual([cited]);
    }
  });

  it("keeps a named class whole while scanning", () => {
    // The compiler resolves `[[:digit:]]`, and a scan that stopped at its first
    // `:` left both closers open and threw the citation away — so a set written
    // in the supported notation reached no check at all.
    const cited = ".qfai/report/validate.[[:digit:]][[:digit:]].json";
    expect(citationsIn(`- \`${cited}\``)).toEqual([cited]);
  });

  it("claims every name in a brace list", () => {
    // The spelling `README.md` uses for a review pack's contents. Read as one
    // path it resolves nowhere; read as the directory before the brace, a pack
    // holding anything at all would pass it.
    const pack = ".qfai/review/review-20260912000000000";
    expect(resolves(`${pack}/{review_request.md,R01_*.md,summary.json}`)).toBe(false);
  });

  it("routes a one-character wildcard through the matcher", () => {
    // A `?` glob that names a tracked artifact still has to reach the matcher:
    // falling through to the exact-path lookup reports valid provenance as
    // missing, which is the opposite failure to the one the guard exists for.
    const pack = ".qfai/discussion/discussion-20260328212829687";
    expect(resolves(`${pack}/0?_Context.md`)).toBe(resolves(`${pack}/0*_Context.md`));
  });

  it("reads an extended glob group as the set it names", () => {
    const one = globToRegExp(".qfai/review/@(review-a|review-b)/summary.json");
    expect(one.test(".qfai/review/review-a/summary.json")).toBe(true);
    expect(one.test(".qfai/review/review-c/summary.json")).toBe(false);
    expect(globToRegExp(".qfai/report/+(a|b).json").test(".qfai/report/abab.json")).toBe(true);
    expect(globToRegExp(".qfai/report/?(draft-)run.json").test(".qfai/report/run.json")).toBe(true);
    expect(globToRegExp(".qfai/report/!(draft).json").test(".qfai/report/draft.json")).toBe(false);
    expect(globToRegExp(".qfai/report/!(draft).json").test(".qfai/report/final.json")).toBe(true);
    // The dialect reads the negation by prefix rather than by the pattern
    // around it, so a name that merely starts with the excluded text is refused
    // where fast-glob admits it.
    expect(globToRegExp(".qfai/report/!(draft).json").test(".qfai/report/draftx.json")).toBe(false);
  });

  it("resolves every extended form through the matcher", () => {
    // A group of literal alternatives carries no `*` or `?`, so a branch keyed
    // on those two fell through to the exact-path lookup and reported a tracked
    // artifact missing.
    const pack = ".qfai/discussion/discussion-20260328212829687";
    expect(resolves(`${pack}/@(01_Context|99_missing).md`)).toBe(true);
    expect(resolves(`${pack}/@(98_missing|99_missing).md`)).toBe(false);
    expect(resolves(`${pack}/!(01_Context).md`)).toBe(true);
  });

  it("keeps a quantified group whole in the grammar", () => {
    // Cut at the introducer, `*(a|b).json` becomes `*` — which names the tree
    // rather than anything inside it, so the citation is discarded entirely.
    expect(matchesLine("- `.qfai/report/*(a|b).json`")).toEqual([".qfai/report/*(a|b).json"]);
    expect(matchesLine("- `.qfai/report/+(a|b).json`")).toEqual([".qfai/report/+(a|b).json"]);
    expect(matchesLine("- `.qfai/report/?(a|b).json`")).toEqual([".qfai/report/?(a|b).json"]);
  });

  it("claims an empty brace alternative too", () => {
    // `{,draft-}x` names the base as well as the draft, so a tree holding only
    // the draft does not satisfy it.
    expect(expandBraces(".qfai/report/{,draft-}validate.json")).toEqual([
      ".qfai/report/validate.json",
      ".qfai/report/draft-validate.json",
    ]);
  });

  it("measures every citation on one line", () => {
    // A line carrying a disclaimed path and a real one lost the second when the
    // first ended the line's scan.
    const line = "checked `.qfai/report/validate.log` and `.qfai/report/run-20260822024224027`";
    expect(matchesLine(line)).toHaveLength(2);
  });

  it("expands a nested brace list without stray braces", () => {
    expect(expandBraces(".qfai/report/{a,{b,c}}.json")).toEqual([
      ".qfai/report/a.json",
      ".qfai/report/b.json",
      ".qfai/report/c.json",
    ]);
  });

  it("reads a bracket class as the set it names", () => {
    const pattern = globToRegExp(".qfai/report/[0-9]*.json");
    expect(pattern.test(".qfai/report/1x.json")).toBe(true);
    expect(pattern.test(".qfai/report/x1.json")).toBe(false);
    expect(globToRegExp(".qfai/report/[!0-9]*.json").test(".qfai/report/x1.json")).toBe(true);
  });

  it("reads braces with no list or range in them as literal text", () => {
    // The matcher reads `{discussion-1}` as a name spelled with its braces, so the
    // tracked directory without them is not what the citation names.
    const pack = "discussion-20260330153902875";
    expect(expandBraces(`.qfai/discussion/{${pack}}`)).toEqual([`.qfai/discussion/{${pack}}`]);
    expect(resolves(`.qfai/discussion/{${pack}}`)).toBe(false);
    expect(expandBraces("a/{literal}/{b,c}")).toEqual(["a/{literal}/b", "a/{literal}/c"]);
  });

  it("does not expand a range past what it can count", () => {
    // A 17-digit timestamp is past a number's precision; stepped there, the
    // loop never ends.
    expect(expandBraces("run-{20260913000000000..20260913000000001}")).toEqual([
      "run-{20260913000000000..20260913000000001}",
    ]);
    expect(expandBraces("run-{0..5000}")).toEqual(["run-{0..5000}"]);
    expect(expandBraces("run-{-2..2}")).toEqual(["run-{-2..2}"]);
  });

  it("reads a fence inside a list item as a fence", () => {
    const FENCE = "`".repeat(3);
    const lines = [
      "- a step:",
      `    ${FENCE}text`,
      "    wrote .qfai/report/missing.json <!-- qfai:not-a-citation -->",
      `    ${FENCE}`,
    ].join("\n");
    expect(citationsOf("x.md", lines).map(([, cited]) => cited)).toEqual([
      ".qfai/report/missing.json",
    ]);
  });

  it("reads a YAML record's keys and values", () => {
    const record = [
      "notes:",
      "  - seen at .qfai/report/missing.json",
      ".qfai/review/review-1: kept",
      "",
    ].join("\n");
    expect(
      citationsOf("x.yaml", decodedRecord("x.yaml", record)).map(([, cited]) => cited),
    ).toEqual([".qfai/report/missing.json", ".qfai/review/review-1"]);
  });

  it("keeps a globstar inside its segment unless it is the whole segment", () => {
    // `discussion-**.md` names files in the tree itself. Read as cross-segment
    // it matches a file inside a pack, and a pattern nothing satisfies resolves.
    expect(
      globToRegExp(".qfai/discussion/discussion-**.md").test(
        ".qfai/discussion/discussion-1/01_Context.md",
      ),
    ).toBe(false);
    expect(
      globToRegExp(".qfai/discussion/discussion-**.md").test(".qfai/discussion/discussion-1.md"),
    ).toBe(true);
    // A whole-segment globstar still crosses them.
    expect(
      globToRegExp(".qfai/discussion/**/01_Context.md").test(
        ".qfai/discussion/discussion-1/01_Context.md",
      ),
    ).toBe(true);
  });

  it("reads a one-character wildcard", () => {
    // The dialect supports `?`, and a token grammar that stops before it left
    // the pack directory to be checked in place of the file set named.
    expect(globToRegExp(".qfai/report/validate.?.json").test(".qfai/report/validate.1.json")).toBe(
      true,
    );
    expect(globToRegExp(".qfai/report/validate.?.json").test(".qfai/report/validate.12.json")).toBe(
      false,
    );
  });

  it("does not measure a path that names the tree itself", () => {
    // `.qfai/review/*` and `.qfai/review/**` are how the ignore rules and the
    // exclusion lists spell the directory, so a record quoting one is
    // describing what is ignored rather than claiming an artifact.
    expect(namesSomethingInside(".qfai/review/*")).toBe(false);
    expect(namesSomethingInside(".qfai/review/**")).toBe(false);
    // A deeper all-wildcard glob names descendants rather than the tree, so it
    // is measured and has to resolve like any other set-naming citation.
    expect(namesSomethingInside(".qfai/review/*/*")).toBe(true);
    expect(namesSomethingInside(".qfai/review/**/*")).toBe(true);
    expect(namesSomethingInside(".qfai/review/review-2026082*")).toBe(true);
    expect(namesSomethingInside(".qfai/report/validate.json")).toBe(true);
    // A literal after the wildcard-only segment is still a claim about a set.
    expect(namesSomethingInside(".qfai/review/**/*.json")).toBe(true);
    expect(namesSomethingInside(".qfai/review/**/summary.json")).toBe(true);
  });
});

describe("a globstar can match no segment at all", () => {
  it("resolves a file sitting directly in the tree the glob names", () => {
    // `report/**/*.json` names every JSON under the tree, including one in the
    // tree itself. A translation that keeps the separator demands a directory
    // nobody wrote, and reports a tracked file as missing.
    const pattern = globToRegExp(".qfai/report/**/*.json");
    expect(pattern.test(".qfai/report/validate.spec-0017.json")).toBe(true);
    expect(pattern.test(".qfai/report/run-1/validate.json")).toBe(true);
    expect(pattern.test(".qfai/report/a/b/validate.json")).toBe(true);
    expect(pattern.test(".qfai/report/validate.log")).toBe(false);
  });
});
