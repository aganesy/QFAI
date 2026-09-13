/**
 * `QFAI-GRILL-001` (severity warning): a stage whose mandatory grilling
 * session left no trace in the evidence it wrote.
 *
 * The failure it exists for leaves nothing else behind. A stage that ran its
 * session and one that skipped it produce the same pack, the same coverage, the
 * same work orders — the only difference is the record the stage was told to
 * write, so that record's absence is the finding.
 *
 * **Warning, deliberately.** The check reads a record the agent wrote about its
 * own run, so it establishes that the record exists — not that a session
 * happened. A severity that stops CI would claim more than that. Raising it is
 * cheap once the false-positive rate is known.
 *
 * **A row still carrying the template's placeholders is not a record.** The
 * template ships the section with worked rows in it, so a section nobody filled
 * in holds three of them. Counting any row at all would accept the copy as the
 * thing it is a template for, which is the one route to the record without the
 * session.
 *
 * **A finding it raises is one somebody can clear.** Where every run opens its
 * own file, only the most recent is read: an earlier run is over, the next one
 * writes somewhere else, and a finding on it would stand for the life of the
 * project. What that costs is a session skipped two runs ago and grilled since,
 * which is inside what a record-exists check claims anyway.
 *
 * **Which run is the most recent comes from the stage, not from the files.** A
 * run that wrote no record is invisible in a listing of records, and under the
 * rule above the run before it would answer in its place with a record that is
 * not about it. The stage's own tree of runs says which one to ask about, so a
 * run with no record at all is the finding rather than a gap.
 *
 * **Two stages, not three.** A spec stage and a discussion run each write a
 * record, at a path each names. Prototyping's
 * `.qfai/evidence/prototyping/grilling.md` is a loop input rather than a
 * per-run record: one file per project, holding the current state of the
 * decision tree, read by the generator and the reviewer every cycle. A project
 * that has not reached a prototyping loop and one whose loop wrote nothing are
 * the same absence there, so a check on the same terms would report the first.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../fs/errno.js";
import { findLatestPack, type PackKind } from "../packLocator.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

/** The finding this validator emits. */
export const GRILLING_TRACE_CODE = "QFAI-GRILL-001";

/**
 * The stages this reads, by the profile that gates each.
 *
 * A caller names its own: `runSddValidators` and `runDiscussionValidators` both
 * dispatch this, and a full run calls both, so a call reading every stage would
 * report each finding twice.
 */
export const GRILLING_SUBJECTS = ["spec", "discussion"] as const;

export type GrillingSubject = (typeof GRILLING_SUBJECTS)[number];

/** A stage whose evidence carries a grilling record. */
type Subject = {
  /** Which stage this is, as a caller names it. */
  readonly stage: GrillingSubject;
  /** The evidence file's name, capturing what the finding calls the run. */
  readonly file: RegExp;
  /** The heading the stage writes its rows under. */
  readonly section: string;
  /** What the finding calls one row. */
  readonly row: string;
  /** Whether the name holds a spec id, so a `--spec` run can place it. */
  readonly specKeyed: boolean;
  /**
   * Which of the matching files are read.
   *
   * `each` where a stage keeps one file per subject and later runs write to it
   * again: the finding names a file the next run repairs, so it clears.
   *
   * `latest` where every run opens a file under its own stamp. An earlier run's
   * record cannot be written now — the run is over and the next one writes
   * somewhere else — so a finding on one would stand for the life of the
   * project. A list nobody can empty is the list people stop reading, and this
   * check has one finding to spend.
   */
  readonly reads: "each" | "latest";
  /**
   * Where the stage's own runs are listed, for a `latest` subject.
   *
   * Read from the files alone, the check sees only runs that wrote one, so a
   * run that wrote no record at all is invisible — and under `latest` an
   * earlier run's populated record answers in its place. The pack tree is the
   * stage's own list of what it ran, so a pack with no record beside it is the
   * finding rather than a gap.
   *
   * A spec stage has no equivalent and needs none: there, a missing evidence
   * file means the stage never ran on that spec, which is another validator's
   * subject.
   */
  readonly packs?: PackKind;
};

const SUBJECTS: readonly Subject[] = [
  {
    stage: "spec",
    // Anchored on the spec id rather than on anything after `sdd-`, so a file a
    // project named `sdd-notes.md` is not held to a contract it never entered.
    file: /^sdd-(spec-\d{4})\.md$/,
    section: "## Pre-draft Grilling",
    row: "phase row",
    specKeyed: true,
    reads: "each",
  },
  {
    stage: "discussion",
    // The discussion run opens its evidence under its own stamp before it
    // writes anything else, so the record has a path from the first moment the
    // session can end. The stamp is fixed-width, so the greatest name is the
    // most recent run.
    file: /^(discussion-\d{17})\.md$/,
    section: "## Grilling Session",
    row: "session row",
    specKeyed: false,
    reads: "latest",
    packs: "discussion",
  },
];

/**
 * The evidence tree, relative to the project root.
 *
 * A fixed path rather than a configured one, because there is no
 * `paths.evidenceDir`: every writer and reader of this tree spells it out
 * (`preflight/importLiteEvidence.ts`, `validators/atddCoverageDepth.ts`), and a
 * second spelling here would be a second answer to where the tree is.
 */
const EVIDENCE_DIR_REL = ".qfai/evidence";

/**
 * Where discussion packs live when a caller names no other place.
 *
 * Unlike the evidence tree this one is configurable, so a caller passes
 * `paths.discussionDir`. The default matches `core/config.ts`'s, and is here so
 * a caller that reads the discussion stage still looks somewhere real.
 */
const DISCUSSION_DIR_REL = ".qfai/discussion";

/** A markdown table's separator, e.g. `| --- | :-: |`. */
const SEPARATOR_RE = /^\s*\|[\s|:-]*\|\s*$/;

/**
 * A cell that is nothing but an angle-bracket token.
 *
 * Anchored on the whole cell, as `deltaV1.ts` and `importLiteEvidence.ts` both
 * anchor theirs. A row is prose as well as values, and a cell carrying an
 * autolink or an inline tag inside a sentence has been written — reading every
 * angle-bracketed construct as a placeholder would drop that row and report the
 * evidence as missing.
 */
const UNREPLACED_CELL_RE = /^<[^<>]*>$/;

/**
 * Whether a markdown table row is still the template's.
 *
 * Two shapes qualify, and both are what a copied template looks like: a cell
 * left at its placeholder, and a row whose cells are all empty.
 */
function rowIsUnwritten(line: string): boolean {
  const cells = line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.trim());
  return cells.every((cell) => cell === "") || cells.some((cell) => UNREPLACED_CELL_RE.test(cell));
}

/** A file's text, or `null` when it is not there. */
async function textOf(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf-8");
  } catch (err: unknown) {
    if (isEnoent(err)) return null;
    throw err;
  }
}

/**
 * The table rows under `section` that the stage wrote itself.
 *
 * Everything up to and including the separator is the table's header, so what
 * follows it is the data — which is what makes this independent of the column
 * a table happens to start with. A table with no separator is not one, and its
 * header alone would otherwise read as a row.
 *
 * `null` when the section is absent, which the caller reports differently from
 * a section present and empty.
 */
function ownRowsUnder(text: string, section: string): string[] | null {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trimEnd() === section);
  if (start === -1) return null;

  const table: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trimStart().startsWith("## ")) break;
    if (line.trim().startsWith("|")) table.push(line);
  }
  const separator = table.findIndex((line) => SEPARATOR_RE.test(line));
  if (separator === -1) return [];
  return table.slice(separator + 1).filter((line) => !rowIsUnwritten(line));
}

/** What the file the finding names is: absent, present and bare, or unwritten. */
type State = "absent" | "no-section" | "unwritten";

/** The message for each state the finding reports. */
function remediation(relPath: string, id: string, subject: Subject, state: State): string {
  const opening = {
    absent:
      `${relPath} does not exist, and the stage's own tree holds a run for ${id}. ` +
      `The stage opens this file before it writes anything else, so a run with no file wrote no record.`,
    "no-section": `${relPath} records no grilling session for ${id}.`,
    unwritten:
      `${relPath} carries "${subject.section}" for ${id} with no ${subject.row} of its own — ` +
      `every row still holds the template's placeholders.`,
  }[state];
  return (
    `${GRILLING_TRACE_CODE}: ${opening} ` +
    `Each grilling-covered phase runs one before it writes and records it under ` +
    `"${subject.section}" — a stage that skipped the session and one that ran it leave ` +
    `the same pack otherwise. Justification: file=${relPath}, ` +
    `missing=${subject.section} with at least one ${subject.row}.`
  );
}

/** One evidence file this run will read, with the subject that claimed it. */
type Candidate = {
  readonly name: string;
  readonly id: string;
  readonly subject: Subject;
  /** Whether the stage's own tree says this file is owed. */
  readonly owed?: boolean;
};

/**
 * The evidence files to read, in one order.
 *
 * `names` is sorted, so `readdir` returning a different order twice cannot
 * reshuffle the findings, and the last name a `latest` subject matches is its
 * most recent run.
 */
function candidatesIn(
  names: readonly string[],
  scope: ReadonlySet<string> | undefined,
  stages: readonly GrillingSubject[],
): Candidate[] {
  const picked: Candidate[] = [];
  for (const subject of SUBJECTS.filter((s) => stages.includes(s.stage))) {
    const matched: Candidate[] = [];
    for (const name of names) {
      const id = subject.file.exec(name)?.[1];
      if (id === undefined) continue;
      // A `--spec` run is gating on its own spec, so a sibling it was told not
      // to look at is left alone. A run that names no spec cannot be placed in
      // that selection at all, which is the same position from the operator's
      // side: a finding they cannot act on from where they are.
      if (scope !== undefined && (!subject.specKeyed || !scope.has(id.replace("spec-", "")))) {
        continue;
      }
      matched.push({ name, id, subject });
    }
    picked.push(...(subject.reads === "latest" ? matched.slice(-1) : matched));
  }
  return picked.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The candidates, with a `latest` subject's newest run taken from its own tree.
 *
 * Read from the evidence directory alone, the newest run is the newest one that
 * wrote a file — so a run that wrote none is invisible, and under `latest` the
 * run before it answers in its place with a record that is not about it. The
 * pack tree says which runs happened, so the newest of the two is the run this
 * reports on, and its file is owed whether or not it exists.
 */
async function withOwedRuns(
  candidates: Candidate[],
  root: string,
  options: { discussionDir?: string | undefined },
  stages: readonly GrillingSubject[],
): Promise<Candidate[]> {
  const out = [...candidates];
  for (const subject of SUBJECTS) {
    if (subject.packs === undefined || !stages.includes(subject.stage)) continue;
    // `path.resolve`, not `path.join`, so an absolute `paths.discussionDir` is
    // used as it stands rather than hung off the project root —
    // `cli/commands/discussion.ts` resolves the same key the same way.
    const packsDir = path.resolve(root, options.discussionDir ?? DISCUSSION_DIR_REL);
    const pack = await findLatestPack(packsDir, subject.packs);
    if (pack === null) continue;

    const at = out.findIndex((c) => c.subject === subject);
    const seen = at === -1 ? null : out[at]?.name;
    const name = `${pack.name}.md`;
    // `localeCompare` on a fixed-width stamp is the same order the listing uses.
    if (seen !== null && seen !== undefined && seen.localeCompare(name) >= 0) continue;
    const candidate: Candidate = { name, id: pack.name, subject, owed: true };
    if (at === -1) out.push(candidate);
    else out[at] = candidate;
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Stage evidence with no grilling record of its own.
 *
 * Keyed on the evidence file rather than on the stage, because the evidence is
 * what the stage wrote: a spec with no evidence file has not run the stage, and
 * reporting that is another validator's job. A stage that keeps its own list of
 * runs is the exception — see `Subject.packs`.
 *
 * `specScope` is the `--spec` selection when a run has one — the four-digit
 * numbers, as `core/specScope.ts` normalizes them.
 *
 * `subjects` is the stages this call gates, defaulting to all of them. Two
 * runners dispatch this and a full run calls both, so each names its own rather
 * than reporting the other's findings a second time.
 *
 * `discussionDir` is `paths.discussionDir`, which the discussion stage's own
 * run list lives under.
 */
export async function validateGrillingTrace(
  root: string,
  options: {
    specScope?: ReadonlySet<string> | undefined;
    subjects?: readonly GrillingSubject[] | undefined;
    discussionDir?: string | undefined;
  } = {},
): Promise<Issue[]> {
  const evidenceDir = path.join(root, ...EVIDENCE_DIR_REL.split("/"));
  let entries;
  try {
    entries = (await exists(evidenceDir))
      ? await readdir(evidenceDir, { withFileTypes: true })
      : [];
  } catch (err: unknown) {
    if (isEnoent(err)) return [];
    throw err;
  }

  const names = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const issues: Issue[] = [];
  const stages = options.subjects ?? GRILLING_SUBJECTS;
  const candidates = await withOwedRuns(
    candidatesIn(names, options.specScope, stages),
    root,
    options,
    stages,
  );
  for (const { name, id, subject, owed } of candidates) {
    const text = await textOf(path.join(evidenceDir, name));
    // A file that vanished between the listing and the read is a race, not a
    // finding — unless the stage's own tree says it is owed, which is the one
    // case where absence is what this reports.
    if (text === null && owed !== true) continue;
    const rows = text === null ? null : ownRowsUnder(text, subject.section);
    if (rows !== null && rows.length > 0) continue;
    const state: State = text === null ? "absent" : rows === null ? "no-section" : "unwritten";

    const relPath = `${EVIDENCE_DIR_REL}/${name}`;
    issues.push(
      issue(
        GRILLING_TRACE_CODE,
        remediation(relPath, id, subject, state),
        "warning",
        relPath,
        "grilling.traceMissing",
      ),
    );
  }
  return issues;
}
