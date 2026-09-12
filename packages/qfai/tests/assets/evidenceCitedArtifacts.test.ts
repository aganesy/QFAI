import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { compileGlob } from "../../src/core/atdd/scaffoldDialect.js";

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

/** What closes each kind of group a citation can open. */
const GROUP_CLOSERS: Readonly<Record<string, string>> = { "(": ")", "{": "}", "[": "]" };

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
    let index = from + start[0].length;
    const closers: string[] = [];
    let usable = true;
    while (index < line.length) {
      const character = line[index] ?? "";
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
      } else if (
        closers.length > 0 &&
        (character === "|" || character === "," || character === "!" || character === "^")
      ) {
        // The separators a group's alternatives use, and the two spellings of a
        // negated bracket class.
      } else if ((character === "@" || character === "!") && line[index + 1] === "(") {
        // An extglob introducer, which is one only where a group follows it.
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
const INITIAL_CENSUS_SIZE = 93;

/**
 * The census keys themselves, as one digest.
 *
 * A length alone is not the no-growth rule: replacing a repaired entry with a
 * new one keeps it at 93, and every other check then passes while a fresh
 * citation inherits the retired slot. The digest moves for any substitution, and
 * does not move when an entry is repaired — repair adds to `CLEARED` and leaves
 * the census alone.
 */
const INITIAL_CENSUS_DIGEST = "f0754587d775d81ffddaf020f6f49d44629489c25a07337e1e83a9b20eef7763";

/**
 * Every citation the first census found unresolved. **Append nothing here.**
 *
 * A record added today does not belong to a census taken before it existed. When
 * one of these is repaired, its key goes to `CLEARED`; this list stays as
 * measured.
 */
const INITIAL_CENSUS: ReadonlyArray<readonly [string, string]> = [
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-2026082*/R0*.md"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-*"],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/review/review-20260818*"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260414195449523/**"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260418093755100/**"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260416195500000/**"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/run-20260822024224027"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/specs-coverage/spec-0017.md"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/validate.log"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260820200000000"],
  [
    ".qfai/evidence/atdd-spec-0017.md",
    ".qfai/review/review-20260820200000000/R02_completion-reviewer.md",
  ],
  [
    ".qfai/evidence/atdd-spec-0017.md",
    ".qfai/review/review-20260820200000000/R03_qa-gatekeeper.md",
  ],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260820220000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821000000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821020000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821040000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821060000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821080000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821100000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821120000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821140000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821160000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821180000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821200000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822030000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822060000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822090000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822120000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822150000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822180000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260823000000000"],
  [".qfai/evidence/coverage-depth-spec-0002.md", ".qfai/report/atdd-traceability/summary.json"],
  [".qfai/evidence/discussion-20260330153902875.md", ".qfai/discussion/README.md"],
  [".qfai/evidence/discussion-20260415161758193.md", ".qfai/discussion/README.md"],
  [".qfai/evidence/discussion-20260415203030886.md", ".qfai/review/review-20260415203030887"],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/discussion/discussion-20260416023323603/01..14",
  ],
  [".qfai/evidence/discussion-20260416023323603.md", ".qfai/discussion/README.md"],
  [".qfai/evidence/discussion-20260416023323603.md", ".qfai/review/review-20260416023323603"],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/review/review-20260416023323603/R01_completion-reviewer.md",
  ],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/review/review-20260416023323603/R02_requirements-reviewer.md",
  ],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/review/review-20260416023323603/R03_architecture-reviewer.md",
  ],
  [".qfai/evidence/discussion-20260416092414328.md", ".qfai/review/review-20260416092414328"],
  [".qfai/evidence/discussion-20260416195444737.md", ".qfai/discussion/README.md"],
  [".qfai/evidence/discussion-20260416195444737.md", ".qfai/review/review-20260416195500000"],
  [".qfai/evidence/discussion-20260418170937652.md", ".qfai/discussion/README.md"],
  [
    ".qfai/evidence/discussion-20260418170937652.md",
    ".qfai/review/review-20260418170937652/R03_architecture-reviewer.md",
  ],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/report/validate.log"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805190301000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805190302000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805192001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805192002000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805193501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805195501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805202001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805204501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805210001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805212001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805214501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805221501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805224501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805224502000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806001501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806001502000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806010001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806014501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806023001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806073001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806220001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806220002000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260807030001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260807120001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260807180001000"],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/report/atdd-traceability/summary.json"],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/report/validate.json"],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/report/validate.log"],
  [".qfai/evidence/implement-spec-0017.md", ".qfai/review/review-20260820140000000"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260415014056471"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260516144141078"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/README.md"],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/report/preflight/run-20260911090607227/preflight_summary.md",
  ],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/run-20260518132742559"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/run-20260518175405426"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate-sdd.json"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.json"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log"],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/review/review-20260415060932/R01_completion-reviewer.md",
  ],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/review/review-20260415060932/R02_architecture-reviewer.md",
  ],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260415060932/review_request.md"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260415060932/summary.json"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260415161758193"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260416070000000/summary.json"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260416195500000"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260417070000000"],
];

/**
 * Census entries that have since been repaired.
 *
 * An entry leaves the backlog by arriving here, and the case below holds that it
 * really is repaired — the path resolves, or the record no longer cites it. The
 * list is the progress the census is meant to produce, and it is the only list
 * that grows.
 */
const CLEARED: ReadonlyArray<readonly [string, string]> = [
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/validate.log"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-*"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/report/validate.log"],
];

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
  .filter(
    (file) =>
      file.startsWith(".qfai/evidence/") && (file.endsWith(".md") || file.endsWith(".json")),
  )
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

/** Every citation the committed evidence carries, as `[evidence file, path]`. */
async function measureCitations(): Promise<[string, string][]> {
  const measured: [string, string][] = [];
  for (const file of evidenceFiles) {
    const text = await readFile(path.join(repoRoot, file), "utf-8");
    // Per file, so the same path cited twice in one record is one obligation.
    const seen = new Set<string>();
    const disclaimed = disclaimedByLine(text);
    text.split("\n").forEach((line, index) => {
      const covered = disclaimed[index];
      if (covered === "all") return;
      for (const match of citationsIn(line)) {
        const cited = normalizeCitation(match);
        // `continue`, not `return`: one line can carry several citations, and
        // leaving the line on the first one that is seen, root-only or
        // disclaimed loses every citation after it.
        if (covered?.has(cited) === true) continue;
        if (seen.has(cited) || !namesSomethingInside(cited)) continue;
        seen.add(cited);
        measured.push([file, cited]);
      }
    });
  }
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
  const disclaimed: Array<"all" | Set<string> | undefined> = lines.map((line) =>
    NOT_A_CITATION.test(line) ? "all" : undefined,
  );
  let open: { character: string; length: number } | null = null;
  let covers: Set<string> | null = null;
  lines.forEach((line, index) => {
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence === null) {
      if (open !== null && covers !== null) disclaimed[index] = covers;
      return;
    }
    const run = fence[1] ?? "";
    const rest = fence[2] ?? "";
    if (open === null) {
      if (run.startsWith("`") && rest.includes("`")) return;
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

/** The paths a marker names, or `null` when the line carries no marker naming any. */
function disclaimedPaths(line: string): Set<string> | null {
  const marker = /<!--\s*qfai:not-a-citation([^>]*?)-->/.exec(line);
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
  const open = cited.indexOf("{");
  if (open === -1) return [cited];
  const close = matchingBrace(cited, open);
  if (close === -1) return [cited];
  const before = cited.slice(0, open);
  const after = cited.slice(close + 1);
  return topLevelAlternatives(cited.slice(open + 1, close)).flatMap((part) =>
    expandBraces(`${before}${part}${after}`),
  );
}

/** The index of the `}` matching the `{` at `open`, or `-1` when it has none. */
function matchingBrace(cited: string, open: number): number {
  let depth = 0;
  for (let index = open; index < cited.length; index += 1) {
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
 * a nested pair separate this list's members.
 */
function topLevelAlternatives(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of body) {
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  parts.push(current.trim());
  return parts;
}

/**
 * A glob as a regular expression over a whole path.
 *
 * Delegated to the dialect this package already implements, rather than written
 * again here. Two implementations of one notation are two answers for one tree,
 * and every round of review on this file found another construct the second one
 * did not know: a one-character wildcard, a brace list, an extended group, a
 * quantified extended group, an empty alternative. The shared compiler knows
 * them because it was written against the same matcher the project's own globs
 * are read by.
 *
 * A record naming a set still claims the set exists, so a glob is resolved like
 * a single path rather than skipped — the tree carried three matching nothing at
 * all, and skipping them let that provenance through as green.
 */
function globToRegExp(cited: string): RegExp {
  return new RegExp(`^${compileGlob(cited)}$`);
}

/** Whether a citation names a set rather than one path. */
function namesASet(cited: string): boolean {
  return /[*?]/.test(cited) || /[?*+@!]\(/.test(cited) || cited.includes("{");
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
  if (namesASet(cited)) {
    // Directories as well as files: `.qfai/discussion/discussion-*` names a set
    // of packs, and an anchored pattern matches no file below one of them — so
    // reading files alone reports a citation unresolved while the tree holds
    // every pack it names.
    const pattern = globToRegExp(cited);
    for (const candidate of [...tracked.files, ...tracked.directories]) {
      if (pattern.test(candidate)) return true;
    }
    return false;
  }
  return tracked.files.has(cited) || tracked.directories.has(cited);
}

const key = ([file, cited]: readonly [string, string]): string => `${file} -> ${cited}`;

/** The census, minus what has been repaired since. */
const UNRESOLVED_CITATION_BACKLOG: ReadonlyArray<readonly [string, string]> = INITIAL_CENSUS.filter(
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
    // around it, so a name merely starting with the excluded text is refused
    // where fast-glob admits it. Filed separately; pinned here so the fix has
    // a case to flip rather than a silent behaviour change.
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

  it("resolves a one-member brace list", () => {
    // A list of one is still a list. Resolving the brace token itself reports a
    // tracked artifact as missing.
    expect(resolves(".qfai/discussion/{discussion-20260330153902875}")).toBe(
      resolves(".qfai/discussion/discussion-20260330153902875"),
    );
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
