#!/usr/bin/env node
/**
 * Refuse a change to this repository's own CI that says nothing about the
 * workflow templates an adopter receives.
 *
 * `packages/qfai/assets/init/root/.github/workflows/` is the CI `qfai init`
 * writes into a consuming project. An improvement that lands only in this
 * repository's CI is one adopters never get, and nothing else in the tree
 * notices: the shape gate reads the shipped set against its own declared
 * shape, and the hygiene lane reads both trees against one rule set, but
 * neither asks whether a change to one of them should have reached the other.
 * The lane grouping that took this repository's lint gate from 114.5s to 80.1s
 * has no counterpart in the shipped set, and no gate ever said so.
 *
 * Most changes to this repository's CI genuinely do not transfer, and this
 * lane does not argue with that. It asks only that "it does not transfer" be
 * something someone wrote down rather than something nobody said.
 *
 * ## What is watched
 *
 * Everything this repository's CI is made of, which is more than the workflow
 * files:
 *
 *   - `.github/workflows/**` — the workflows themselves;
 *   - `.github/actions/**` — the composite toolchain action every job calls,
 *     and the two files it reads;
 *   - `scripts/run-lint-checks.sh` — the helper that groups the lint lanes,
 *     which is where a grouping improvement actually lives;
 *   - the `ci:*` entries of the root `package.json` — the lane bodies the
 *     workflows invoke by name. A workflow step reading `pnpm ci:lint` moves
 *     when that entry moves, so watching the workflow alone watches a pointer.
 *
 * The shipped templates themselves are NOT watched. A change to them is the
 * obligation being met, not incurred.
 *
 * ## The marker
 *
 *   # SHIPPED-CI: not-applicable
 *   # Because: the composite action pins digests of files only this repository has.
 *
 * A disposition out of a closed set, and a reason. The second half is
 * mandatory the way a lifting condition is: a disposition on its own cannot be
 * told from a shrug, and the exemption becomes automatic with nobody deciding
 * it should. A placeholder reason is refused for the same reason.
 *
 * The marker sits on a line THIS CHANGE ADDED, in the file it is about. Two
 * files cannot carry one, and they route to the companion ledger instead:
 *
 *   - the root manifest, whose `ci:*` entries are single JSON strings with
 *     nowhere to put a comment;
 *   - a watched file this change DELETES, which has no line left to write on.
 *
 * A companion entry names the file it disposes of, so the ledger says what
 * each line is about rather than accumulating unattributed exemptions.
 *
 * Every marker found is printed on a green run. That publication is the only
 * pressure against an exemption becoming automatic, so it is not optional.
 *
 * ## What does not count as a change
 *
 * A whole-file trigger makes a reformat owe a record, and an author who owes a
 * record for reflowing a comment learns to write whatever clears the lane. So
 * the trigger reads lines that carry meaning: a blank line, a comment line and
 * a derived line are not changes to this repository's CI.
 *
 * Derived, concretely, is a line whose content some tool computes:
 *
 *   - a `<sha256>  <path>` pin line, rewritten by `scripts/pin-guard-bytes.mjs`
 *     whenever any guard under `scripts/` is edited;
 *   - a `uses: <target>@<sha>` line whose target was already on that file at
 *     the base. That is a version bump, which the dependency bot opens by
 *     itself and cannot write a reason into. A `uses:` line whose target is
 *     NEW is a step someone added, and counts.
 *
 * The root manifest is read the same way but through its values: the `ci:*`
 * entries are compared as strings between the base and HEAD, so a reformat of
 * the manifest is not a change to a lane.
 *
 * ## The base, and the two diff forms
 *
 * On a pull request the question is what this branch is responsible for, which
 * is the merge-base comparison `<base>...HEAD`.
 *
 * On a push to the default branch that form compares the branch with itself:
 * the changed set is empty, the lane is green, and it is green forever. So a
 * push takes `<before>..HEAD` — two-dot, against the previous head the event
 * carries. A range that still comes out degenerate falls back to `HEAD^..HEAD`
 * and says so.
 *
 * An unresolvable base warns and passes. It is not rare and not necessarily
 * wrong — a shallow clone or an unfetched branch produces it for a perfectly
 * good ref — and a lane that hard-failed there would red a pull request for a
 * reason nothing in its diff explains. What it never does is pass in silence.
 *
 * Exit codes: 0 clean or base unresolvable / 1 a disposition is owed or
 * incomplete / 2 a git error or an unknown argument.
 */
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { argv, env, exit, stdout, stderr } from "node:process";
import { pathToFileURL } from "node:url";

/** Directory trees whose every file is part of this repository's CI. */
const WATCHED_PREFIXES = [".github/workflows/", ".github/actions/"];

/** Single files that are part of it. */
const WATCHED_FILES = ["scripts/run-lint-checks.sh"];

const MANIFEST_REL = "package.json";

/** The manifest entries that are CI: the lane aggregates the workflows invoke. */
const MANIFEST_ENTRY_RE = /^ci:/;

/** The counterpart an adopter receives. */
const SHIPPED_PREFIX = "packages/qfai/assets/init/root/.github/workflows/";

/** Where a disposition goes for a file that cannot carry one. */
const COMPANION_REL = ".github/shipped-ci-dispositions.md";

const RULE_DOC_REL = ".agents/rules/shipped-ci-parity.md";

/**
 * Documents whose subject is the marker itself, and whose worked example would
 * otherwise read as a live disposition.
 *
 * `check-doc-clarity.mjs` excludes its own rule document for the same reason: a
 * specification has to spell out the shape it specifies. Neither path is in a
 * scanned set today, so this is the bound that keeps a later widening of the
 * watched set from arming them. The example inside a fenced block is handled
 * separately, by the fence skip in `markersIn` — that one bites now, because
 * the companion ledger's own header carries one.
 */
const MARKER_EXCLUDED = new Set([RULE_DOC_REL, ".claude/rules/shipped-ci-parity.md"]);

/** What a change may say about the shipped set. Closed, so "yes" is not an answer. */
const DISPOSITIONS = ["transferred", "not-applicable", "deferred"];

const MARKER_RE = /\bSHIPPED-CI:\s*([A-Za-z-]+)\s*(?:for\s+(\S+))?\s*(.*)$/;
const REASON_RE = /\bBecause:\s*(.*)$/i;

/** A `<sha256>  <path>` line, which a resealing tool writes and nobody edits. */
const DIGEST_PIN_RE = /^[0-9a-f]{64}\s{1,2}\S+$/;

/** An action reference pinned to a commit, with the target it names. */
const ACTION_PIN_RE = /\buses:\s*(\S+?)@[0-9a-f]{40}\b/;

const SOURCE_COMMENT_EXTENSIONS = new Set([".mjs", ".cjs", ".js", ".ts"]);
const MARKDOWN_EXTENSIONS = new Set([".md"]);

function git(args) {
  return execFileSync("git", args, { encoding: "utf-8", maxBuffer: 128 * 1024 * 1024 });
}

/** Runs git for its stdout, or `null` when the command cannot run. */
function gitOrNull(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf-8",
      maxBuffer: 128 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

function revParse(rev) {
  return gitOrNull(["rev-parse", "--verify", `${rev}^{commit}`])?.trim() ?? null;
}

/** A file's content at a revision, or `null` when that revision does not carry it. */
function blobAt(rev, rel) {
  return gitOrNull(["show", `${rev}:${rel}`]);
}

function parseArgs(args) {
  const out = {};
  for (let i = 2; i < args.length; i += 1) {
    if (args[i] === "--base") {
      out.base = args[i + 1];
      i += 1;
    } else if (args[i] === "--help" || args[i] === "-h") {
      out.help = true;
    } else {
      stderr.write(`check-shipped-ci-parity: unknown argument ${JSON.stringify(args[i])}\n`);
      return null;
    }
  }
  return out;
}

function printHelp() {
  stdout.write(
    [
      "Usage: check-shipped-ci-parity.mjs [--base <ref>]",
      "",
      "Refuses a change to this repository's CI that records no disposition about",
      `the workflow templates under ${SHIPPED_PREFIX}.`,
      "",
      "  --base <ref>   compare against <ref> (default: $BASE_REF or origin/main).",
      "                 On a push event it is the previous head instead.",
      "",
    ].join("\n"),
  );
}

/**
 * The previous head of a push, from the event payload the runner writes.
 *
 * `github.event.before` is not exported as an environment variable, so the
 * payload file is the only place a job that declares no `env:` block can read
 * it. `GITHUB_EVENT_BEFORE` is honoured first so a caller can state it
 * directly.
 */
function pushBeforeSha() {
  const direct = env.GITHUB_EVENT_BEFORE?.trim();
  if (direct !== undefined && direct.length > 0) return direct;
  const payloadPath = env.GITHUB_EVENT_PATH;
  if (payloadPath === undefined || payloadPath.length === 0) return null;
  try {
    const payload = JSON.parse(readFileSync(payloadPath, "utf-8"));
    return typeof payload.before === "string" && payload.before.length > 0 ? payload.before : null;
  } catch {
    return null;
  }
}

function tryFetchBase(base) {
  if (!base.startsWith("origin/")) return;
  const branch = base.slice("origin/".length);
  if (branch.length === 0) return;
  try {
    execFileSync("git", ["fetch", "--no-tags", "origin", branch], { stdio: "ignore" });
  } catch {
    // Ignored; the retry below decides the outcome.
  }
}

/** The range to diff, the revision the base side of it names, and what to say about it. */
function resolveRange(explicitBase) {
  const head = revParse("HEAD");
  if (head === null) {
    return { unresolvable: "HEAD does not resolve to a commit" };
  }
  const parent = revParse("HEAD^");

  if (env.GITHUB_EVENT_NAME === "push") {
    // A push compares against the previous head, never against the branch it
    // just moved. `<branch>...HEAD` there is the branch against itself.
    const before = explicitBase ?? pushBeforeSha();
    const beforeRev = before === null || before === undefined ? null : revParse(before);
    const baseRev = beforeRev ?? parent;
    if (baseRev === null) {
      return { unresolvable: "this push carries no previous head and HEAD has no parent" };
    }
    return {
      range: `${baseRev}..HEAD`,
      baseRev,
      note:
        beforeRev === null
          ? "push event: the previous head does not resolve, so the range is HEAD^..HEAD"
          : "push event: the range is the previous head to HEAD",
    };
  }

  const base = explicitBase ?? env.BASE_REF ?? "origin/main";
  if (revParse(base) === null) tryFetchBase(base);
  const baseRev = revParse(base);
  if (baseRev === null) {
    return { unresolvable: `base ref '${base}' is not reachable in this clone` };
  }
  if (baseRev === head) {
    // The same degeneracy a push produces, reached another way: a checkout
    // sitting on the base. Reported rather than passed through, because an
    // empty changed set here is an artefact and not an answer.
    if (parent === null) {
      return { unresolvable: `HEAD is '${base}' itself and has no parent to compare against` };
    }
    return {
      range: `${parent}..HEAD`,
      baseRev: parent,
      note: `HEAD is '${base}' itself, so the range is HEAD^..HEAD`,
    };
  }
  return {
    range: `${base}...HEAD`,
    baseRev: gitOrNull(["merge-base", base, "HEAD"])?.trim() ?? base,
  };
}

/**
 * The path a `---` or `+++` header names, with the quoting git applies when the
 * path holds a character it will not print raw.
 *
 * A quoted path left as it is matches no watched prefix, so the file reads as
 * untouched and whatever it changed goes unasked.
 */
export function headerPath(raw) {
  if (!raw.startsWith('"')) return raw;
  const body = raw.slice(1, raw.endsWith('"') ? -1 : undefined);
  const bytes = [];
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] !== "\\") {
      bytes.push(...Buffer.from(body[i], "utf-8"));
      continue;
    }
    const next = body[i + 1] ?? "";
    const named = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, "\\": 92 }[next];
    if (named !== undefined) {
      bytes.push(named);
      i += 1;
      continue;
    }
    const octal = /^[0-7]{1,3}/.exec(body.slice(i + 1))?.[0];
    if (octal === undefined) {
      // Not an escape git writes. Kept as the backslash it is, so a path
      // carrying one is not silently shortened.
      bytes.push(92);
      continue;
    }
    bytes.push(Number.parseInt(octal, 8));
    i += octal.length;
  }
  return Buffer.from(bytes).toString("utf-8");
}

/**
 * Per path: the lines this change added, the lines it removed, and whether the
 * path is gone at HEAD.
 *
 * `--ignore-cr-at-eol` and `--no-renames` for the reasons
 * `packages/qfai/src/core/gitChanges.ts` gives: a line-ending rewrite is not an
 * edit anyone owes a record for, and rename detection would report only a
 * move's destination.
 */
function changedHunks(range) {
  const diff = git([
    "-c",
    // Without it a path holding a byte outside ASCII arrives wrapped in quotes
    // with its bytes octal-escaped, so it matches no watched prefix and the
    // file reads as untouched. `headerPath` handles the forms this does not.
    "core.quotePath=false",
    "diff",
    "--no-color",
    "-U0",
    "--ignore-cr-at-eol",
    "--no-renames",
    range,
    "--",
  ]);
  const byPath = new Map();
  let oldPath = null;
  let entry = null;
  let nextLine = 0;
  const open = (rel, gone) => {
    if (!byPath.has(rel)) byPath.set(rel, { added: [], removed: [], gone });
    const found = byPath.get(rel);
    found.gone = gone;
    return found;
  };
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("--- ")) {
      const p = headerPath(raw.slice(4).trim());
      oldPath = p === "/dev/null" ? null : p.replace(/^a\//, "");
      continue;
    }
    if (raw.startsWith("+++ ")) {
      const p = headerPath(raw.slice(4).trim());
      entry =
        p === "/dev/null"
          ? oldPath === null
            ? null
            : open(oldPath, true)
          : open(p.replace(/^b\//, ""), false);
      continue;
    }
    if (entry === null) continue;
    if (raw.startsWith("@@")) {
      nextLine = Number(/\+(\d+)/.exec(raw)?.[1] ?? 0);
      continue;
    }
    if (raw.startsWith("+")) {
      entry.added.push({ line: nextLine, text: raw.slice(1) });
      nextLine += 1;
    } else if (raw.startsWith("-")) {
      entry.removed.push(raw.slice(1));
    }
  }
  return byPath;
}

function isCommentLine(rel, trimmed) {
  if (SOURCE_COMMENT_EXTENSIONS.has(path.extname(rel))) {
    return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
  }
  return trimmed.startsWith("#");
}

/**
 * What a resealing tool rewrites in place on this line, or `null` for any other
 * line: the path a digest protects, or the action a `uses:` reference names.
 *
 * The key is what stays the same across a reseal. The value beside it — the
 * digest, the commit — is what changes, and is the part nobody decides.
 */
function resealKey(trimmed) {
  if (DIGEST_PIN_RE.test(trimmed)) return `digest ${trimmed.slice(64).trim()}`;
  const pinned = ACTION_PIN_RE.exec(trimmed);
  return pinned === null ? null : `action ${pinned[1]}`;
}

/**
 * The keys this change rewrote in place: present on both sides of the diff, the
 * same number of times.
 *
 * Pairing is what makes the exemption safe. A resealed line appears as one
 * removal and one addition under an unchanged key. A pin added, deleted, or
 * pointed at a different path appears on one side only — and each of those
 * changes what CI verifies, whatever the line looks like.
 */
function resealedKeys(entry) {
  const tally = (texts) => {
    const counts = new Map();
    for (const text of texts) {
      const key = resealKey(text.trim());
      if (key !== null) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  const added = tally(entry.added.map(({ text }) => text));
  const removed = tally(entry.removed);
  const paired = new Set();
  for (const [key, count] of added) {
    if (removed.get(key) === count) paired.add(key);
  }
  return paired;
}

/** Whether a changed line carries meaning a reviewer decides, rather than a computed value. */
function isSubstantive(rel, text, resealed) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  if (isCommentLine(rel, trimmed)) return false;
  const key = resealKey(trimmed);
  return key === null || !resealed.has(key);
}

/**
 * Whether what a file does changed, on either side of the diff.
 *
 * Removals count. A change that deletes a step, a lane or a whole workflow is
 * the kind most worth asking about, and reading additions alone would let it
 * through as nothing at all.
 */
function movesMeaning(rel, entry) {
  const resealed = resealedKeys(entry);
  return (
    entry.added.some(({ text }) => isSubstantive(rel, text, resealed)) ||
    entry.removed.some((text) => isSubstantive(rel, text, resealed))
  );
}

/** The `ci:*` scripts a manifest declares, or `null` when it does not parse. */
function ciEntries(text) {
  if (text === null) return null;
  try {
    const scripts = JSON.parse(text).scripts;
    if (typeof scripts !== "object" || scripts === null) return new Map();
    return new Map(Object.entries(scripts).filter(([name]) => MANIFEST_ENTRY_RE.test(name)));
  } catch {
    return null;
  }
}

/**
 * Whether a CI entry's command list moved.
 *
 * Read as values rather than as lines: the entries are single JSON strings, so
 * a reformat of the manifest rewrites every one of them without changing a lane.
 */
function manifestCiChanged(baseRev) {
  const before = ciEntries(baseRev === null ? null : blobAt(baseRev, MANIFEST_REL));
  const after = ciEntries(blobAt("HEAD", MANIFEST_REL));
  if (before === null || after === null) return true;
  if (before.size !== after.size) return true;
  for (const [name, body] of after) {
    if (before.get(name) !== body) return true;
  }
  return false;
}

function isWatched(rel) {
  return WATCHED_PREFIXES.some((prefix) => rel.startsWith(prefix)) || WATCHED_FILES.includes(rel);
}

/**
 * The lines of the block a marker opens: the comment lines that follow it in a
 * source file, or the non-blank lines that follow it in Markdown.
 *
 * The block rather than a line count, so a wrapped disposition does not push
 * its reason out of reach.
 *
 * Only lines this change added. A marker written directly above an explanation
 * that was already there would otherwise be answered by it, and the change
 * would state no reason of its own.
 */
function blockAfter(rel, lines, start, addedLines) {
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (MARKER_RE.test(lines[i])) break;
    if (!addedLines.has(i + 1)) break;
    if (MARKDOWN_EXTENSIONS.has(path.extname(rel))) {
      if (trimmed.length === 0) break;
    } else if (!isCommentLine(rel, trimmed)) {
      break;
    }
    out.push(lines[i]);
  }
  return out;
}

/**
 * Every disposition a file records on a line this change added.
 *
 * Fenced blocks are skipped in Markdown. The companion ledger's own header
 * shows the shape it asks for, and a header read as a live entry would satisfy
 * an obligation nobody answered.
 */
function markersIn(rel, text, addedLines) {
  if (MARKER_EXCLUDED.has(rel) || text === null) return [];
  const lines = text.split(/\r?\n/);
  const markdown = MARKDOWN_EXTENSIONS.has(path.extname(rel));
  const found = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (markdown && /^\s*(?:```|~~~)/.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    if (fenced || !addedLines.has(i + 1)) continue;
    const trimmed = lines[i].trim();
    if (!markdown && !isCommentLine(rel, trimmed)) continue;
    const marker = MARKER_RE.exec(lines[i]);
    if (marker === null) continue;
    const tail = [marker[3], ...blockAfter(rel, lines, i, addedLines)];
    const reason = tail
      .map((line) => REASON_RE.exec(line)?.[1])
      .find((value) => value !== undefined);
    found.push({
      file: rel,
      line: i + 1,
      disposition: marker[1],
      target: marker[2] ?? null,
      reason: reason?.trim() ?? null,
    });
  }
  return found;
}

/** Wordings that fill the slot without answering it. */
const PLACEHOLDER_REASONS = new Set([
  "tbd",
  "todo",
  "n/a",
  "na",
  "none",
  "-",
  "--",
  "?",
  "xxx",
  "fixme",
  "later",
  "wip",
  "reasons",
  "see above",
  "same as above",
  "no reason",
  "not applicable",
]);

// SIMPLIFIED: a placeholder is caught by a word list plus a length floor, not by
// judging whether the sentence answers anything.
// Lift when: a reason clears the floor and says nothing, and a reviewer has an
// example of it to write the rule against.
const REASON_MIN_WORDS = 4;
const REASON_MIN_LETTERS = 20;

/** What is wrong with a reason, or `null` when nothing is. */
function reasonProblem(reason) {
  const value = reason?.trim() ?? "";
  if (value.length === 0) return "no reason";
  const normalized = value
    .toLowerCase()
    .replace(/[.!]+$/, "")
    .trim();
  if (PLACEHOLDER_REASONS.has(normalized)) return `a placeholder reason ("${value}")`;
  const words = value.split(/\s+/).filter((word) => word.length > 0);
  if (words.length < REASON_MIN_WORDS || value.replace(/\s+/g, "").length < REASON_MIN_LETTERS) {
    return `a reason too short to be one ("${value}")`;
  }
  return null;
}

const REMEDIATION =
  `Record the decision where the change is, on a line this change adds:\n` +
  `    # SHIPPED-CI: not-applicable\n` +
  `    # Because: <why the shipped templates do not take this change>\n` +
  `  The disposition is one of ${DISPOSITIONS.join(", ")}, and the reason is required.\n` +
  `  For a file that cannot carry a comment, add the entry to ${COMPANION_REL}:\n` +
  `    - SHIPPED-CI: not-applicable for <path>\n` +
  `      Because: <reason>\n` +
  `  Changing ${SHIPPED_PREFIX} in the same change answers it outright.\n` +
  `  See ${RULE_DOC_REL}.`;

/** The watched files this change touched, split by where their disposition may sit. */
function obligations(hunks, baseRev) {
  const inFile = [];
  const routed = [];
  for (const [rel, entry] of hunks) {
    if (!isWatched(rel)) continue;
    if (!movesMeaning(rel, entry)) continue;
    if (entry.gone) routed.push(rel);
    else inFile.push(rel);
  }
  if (hunks.has(MANIFEST_REL) && manifestCiChanged(baseRev)) routed.push(MANIFEST_REL);
  return { inFile, routed };
}

function reportMarkers(markers) {
  if (markers.length === 0) return;
  stdout.write(`check-shipped-ci-parity: ${String(markers.length)} disposition(s) recorded.\n`);
  for (const marker of markers) {
    const about = marker.target === null ? "" : ` for ${marker.target}`;
    stdout.write(`  ${marker.file}:${String(marker.line)}  ${marker.disposition}${about}\n`);
    stdout.write(`      because: ${marker.reason ?? "— NOT GIVEN"}\n`);
  }
}

/** Every disposition the change records, and every one that is not usable. */
function collectMarkers(hunks, owed) {
  const sources = new Set([...owed.inFile, COMPANION_REL]);
  const markers = [];
  const faults = [];
  // The ledger is the record of what was decided, so an entry may be added and
  // never taken away. Without this a change could put its own disposition where
  // an earlier one stood and pass, with the decision it overwrote gone.
  const ledger = hunks.get(COMPANION_REL);
  if (ledger !== undefined && ledger.removed.some((text) => text.trim().length > 0)) {
    faults.push(
      `${COMPANION_REL}: this change removes or rewrites lines that were already there. ` +
        "Entries are added to the end; an earlier decision stays as it was recorded",
    );
  }
  for (const rel of sources) {
    const entry = hunks.get(rel);
    if (entry === undefined || entry.gone) continue;
    const added = new Set(entry.added.map(({ line }) => line));
    for (const marker of markersIn(rel, blobAt("HEAD", rel), added)) {
      if (!DISPOSITIONS.includes(marker.disposition)) {
        faults.push(
          `${marker.file}:${String(marker.line)}: SHIPPED-CI names "${marker.disposition}", ` +
            `which is not one of ${DISPOSITIONS.join(", ")}`,
        );
        continue;
      }
      const problem = reasonProblem(marker.reason);
      if (problem !== null) {
        faults.push(
          `${marker.file}:${String(marker.line)}: SHIPPED-CI names a disposition and ${problem}. ` +
            "Add a `Because:` line saying why the shipped templates do or do not take this change",
        );
        continue;
      }
      markers.push(marker);
    }
  }
  return { markers, faults };
}

function main() {
  const args = parseArgs(argv);
  if (args === null) return 2;
  if (args.help === true) {
    printHelp();
    return 0;
  }

  const resolved = resolveRange(args.base);
  if (resolved.unresolvable !== undefined) {
    stderr.write(
      `check-shipped-ci-parity: ${resolved.unresolvable}; the shipped-CI disposition was not ` +
        "checked in this run.\n",
    );
    return 0;
  }
  if (resolved.note !== undefined) {
    stdout.write(`check-shipped-ci-parity: ${resolved.note}.\n`);
  }

  let hunks;
  try {
    hunks = changedHunks(resolved.range);
  } catch (err) {
    stderr.write(
      `check-shipped-ci-parity: git diff over ${resolved.range} failed: ` +
        `${err && err.message ? err.message : String(err)}\n`,
    );
    return 2;
  }

  const owed = obligations(hunks, resolved.baseRev);
  const { markers, faults } = collectMarkers(hunks, owed);

  // A deleted template counts, and so does a deleted step inside one. Removing
  // a lane from this repository is transferred by removing it there too, and a
  // check that read additions alone would refuse the answer it asked for.
  const shipped = [...hunks]
    .filter(([rel, entry]) => rel.startsWith(SHIPPED_PREFIX) && movesMeaning(rel, entry))
    .map(([rel]) => rel);

  if (owed.inFile.length === 0 && owed.routed.length === 0) {
    stdout.write("check-shipped-ci-parity: this change touches none of this repository's CI.\n");
    reportMarkers(markers);
    return faults.length === 0 ? 0 : reportFaults(faults);
  }

  if (shipped.length > 0) {
    stdout.write(
      `check-shipped-ci-parity: the shipped workflow templates changed in the same change ` +
        `(${shipped.join(", ")}), so the change transferred and no disposition is owed.\n`,
    );
    reportMarkers(markers);
    return faults.length === 0 ? 0 : reportFaults(faults);
  }

  const covered = new Set(markers.map((marker) => marker.target ?? marker.file));
  const missing = [
    ...owed.inFile.filter((rel) => !markers.some((marker) => marker.file === rel)),
    ...owed.routed.filter((rel) => !covered.has(rel)),
  ];

  reportMarkers(markers);
  if (missing.length === 0 && faults.length === 0) return 0;

  stderr.write("\n");
  for (const fault of faults) stderr.write(`${fault}\n`);
  for (const rel of missing) {
    const place = owed.routed.includes(rel)
      ? `${COMPANION_REL}, as an entry naming ${rel}`
      : `a comment among the lines this change added to ${rel}`;
    stderr.write(`${rel}: this change moves this repository's CI and records no disposition.\n`);
    stderr.write(`  The place: ${place}.\n`);
    stderr.write("  The missing half: the disposition and its reason.\n");
  }
  stderr.write(`\ncheck-shipped-ci-parity: ${REMEDIATION}\n`);
  return 1;
}

function reportFaults(faults) {
  stderr.write("\n");
  for (const fault of faults) stderr.write(`${fault}\n`);
  stderr.write(`\ncheck-shipped-ci-parity: ${REMEDIATION}\n`);
  return 1;
}

export { markersIn, isSubstantive, reasonProblem, MARKER_EXCLUDED };

// `pathToFileURL`, not `file://` + the path: on Windows `argv[1]` is a
// drive-letter path with backslashes, which concatenation turns into a string no
// `import.meta.url` ever equals. The guard then never fires and a run that never
// looked reads as a run that passed.
if (argv[1] !== undefined && import.meta.url === pathToFileURL(argv[1]).href) {
  exit(main());
}
