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
 * own file, only the most recent is read. An earlier run is over and the next
 * one writes somewhere else, so a finding against it would stand for the life
 * of the project. What that costs is a session skipped two runs ago and grilled
 * since, which is inside what a record-exists check claims anyway.
 *
 * The two stages differ in how the repair arrives rather than in whether it
 * can. A spec's record has a path the next run of that spec opens anyway, so
 * the occasion comes with the work; a per-run stamp has no such occasion, which
 * is why only its newest run is asked about. A run that predates the record
 * obligation is reported until the stage next runs — the record cannot be
 * written for a session that ended, and the next run is the repair.
 *
 * **Which run is the most recent comes from the stage, not from the files.** A
 * run that wrote no record is invisible in a listing of records, and under the
 * rule above the run before it would answer in its place with a record that is
 * not about it. The stage's own tree of runs says which one to ask about, so a
 * run with no record at all is the finding rather than a gap.
 *
 * **Two stages, not three.** Prototyping's
 * `.qfai/evidence/prototyping/grilling.md` is out for three reasons, and the
 * one about absence is not among them — the skill writes that file before cycle
 * 0 whether or not the session settled anything, so its absence is decidable
 * exactly as a discussion pack's is. What rules it out is the shape of the
 * record: an empty session is written as `none` under the heading, which is a
 * legal record this check's row test would report; the file is one per project
 * and rewritten in place, so there is no run to key a finding on and both rules
 * above need one; and `## Escalated` rows are a state no row count can read.
 */

import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../fs/errno.js";
import {
  CANONICAL_TIMESTAMP_DIGITS,
  findPacks,
  latestPack,
  type PackKind,
} from "../packLocator.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

/** The finding this validator emits. */
export const GRILLING_TRACE_CODE = "QFAI-GRILL-001";

/**
 * The heading each stage writes its rows under.
 *
 * Exported because the skills that write these sections spell the same strings,
 * and a test that holds the two together is what keeps a rename in one from
 * leaving the other reading a heading nobody writes.
 */
export const GRILLING_SECTIONS = {
  spec: "## Pre-draft Grilling",
  discussion: "## Grilling Session",
} as const satisfies Readonly<Record<GrillingSubject, string>>;

/**
 * The stages this reads, by the profile that gates each.
 *
 * A caller names its own: `runSddValidators` and `runDiscussionValidators` both
 * dispatch this, and a full run calls both, so a call reading every stage would
 * report each finding twice.
 */
export const GRILLING_SUBJECTS = ["spec", "discussion"] as const;

export type GrillingSubject = (typeof GRILLING_SUBJECTS)[number];

/** What every stage this reads has in common. */
type SubjectBase = {
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
};

/**
 * A stage whose evidence carries a grilling record.
 *
 * The two shapes are the two ways a stage keeps its records, and the union is
 * what stops them being mixed. A `latest` subject reads one run of many and
 * needs the stage's own list of runs to know which; an `each` subject has one
 * file per subject and no such list, and giving it one would let a run this
 * check invented replace a record the stage actually wrote.
 */
type Subject =
  | (SubjectBase & { readonly reads: "each"; readonly packs?: undefined })
  | (SubjectBase & { readonly reads: "latest"; readonly packs: PackKind });

const SUBJECTS: readonly Subject[] = [
  {
    stage: "spec",
    // Anchored on the spec id rather than on anything after `sdd-`, so a file a
    // project named `sdd-notes.md` is not held to a contract it never entered.
    file: /^sdd-(spec-\d{4})\.md$/,
    section: GRILLING_SECTIONS.spec,
    row: "phase row",
    specKeyed: true,
    reads: "each",
  },
  {
    stage: "discussion",
    // The discussion run opens its evidence under its own stamp before it
    // writes anything else, and opens its pack under that same stamp, so the
    // two names agree and the greatest is the most recent run. The width comes
    // from `packLocator.ts` rather than being written again here: it is the
    // only width that resolves a pack, so a second spelling could drift into
    // reading records no pack will ever be found for.
    file: new RegExp(`^(discussion-\\d{${String(CANONICAL_TIMESTAMP_DIGITS)}})\\.md$`),
    section: GRILLING_SECTIONS.discussion,
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
 * `paths.discussionDir`. The default is `core/config.ts`'s, and a test holds
 * the two together — a caller that reads this stage without naming a directory
 * would otherwise look somewhere the project does not keep its runs.
 */
export const DISCUSSION_DIR_REL = ".qfai/discussion";

/**
 * A markdown table's delimiter row, with either outer pipe optional.
 *
 * GFM writes the outer pipes as a courtesy rather than a requirement, so a
 * table that leaves them off is a table. Reading only the pipe-led form found
 * no rows in one and reported a record that was there as missing.
 */
const DELIMITER_RE = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

/**
 * A cell that is nothing but a template placeholder.
 *
 * Anchored on the whole cell, as `deltaV1.ts` and `importLiteEvidence.ts`
 * anchor theirs: a cell carrying an angle-bracketed construct inside a sentence
 * has been written. The first character must be a letter and the token must
 * carry no colon, which is what separates `<ISO8601>` and `<ref>` from an HTML
 * comment and from an autolink — both of which are content, and both of which a
 * looser pattern dropped, reporting a written record as missing.
 */
const UNREPLACED_CELL_RE = /^<[A-Za-z][^<>:]*>$/;

/**
 * Whether a markdown table row is still the template's.
 *
 * Two shapes qualify, and both are what a copied template looks like: a cell
 * left at its placeholder, and a row whose cells are all empty. A row with some
 * cells filled and some not is not one of them — it is a partial record, and
 * saying so is a judgement this check does not make.
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

/** `value`, with every character a regular expression reads as syntax escaped. */
function literal(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The heading, and what ends the section it opens. */
function headingPatterns(section: string): { heading: RegExp; ends: RegExp } {
  const parsed = /^(#+)\s+(.*)$/.exec(section);
  const hashes = parsed?.[1] ?? "##";
  const title = parsed?.[2] ?? section;
  return {
    // As CommonMark admits an ATX heading: up to three leading spaces, and an
    // optional closing run of hashes. An exact-line match reported a written
    // record as missing for both.
    heading: new RegExp(`^ {0,3}${hashes}\\s+${literal(title)}\\s*#*\\s*$`),
    ends: new RegExp(`^ {0,3}#{1,${String(hashes.length)}}\\s`),
  };
}

/** What one section holds: the rows the stage wrote, and the ones it did not. */
type SectionRows = { readonly written: string[]; readonly unwritten: number };

/**
 * The rows of the table under `section`.
 *
 * The delimiter is what identifies the table, so everything up to and including
 * it is the header and the rows are the contiguous block after it. Contiguous,
 * because a section may hold more than one table: reading to the end of the
 * section let a second table's own header stand in for the record, and a
 * subsection with any table in it satisfied the check.
 *
 * `null` when the section is absent, which the caller reports differently from
 * a section present with nothing readable under it.
 */
function ownRowsUnder(text: string, section: string): SectionRows | null {
  const { heading, ends } = headingPatterns(section);
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return null;

  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (ends.test(line)) break;
    body.push(line);
  }

  const delimiter = body.findIndex((line) => DELIMITER_RE.test(line));
  if (delimiter === -1) return { written: [], unwritten: 0 };

  const rows: string[] = [];
  for (const line of body.slice(delimiter + 1)) {
    if (!line.includes("|")) break;
    rows.push(line);
  }
  const written = rows.filter((line) => !rowIsUnwritten(line));
  return { written, unwritten: rows.length - written.length };
}

/** What the file the finding names is. */
type State = "absent" | "no-section" | "no-table" | "unwritten";

/** The message for each state the finding reports. */
function remediation(relPath: string, id: string, subject: Subject, state: State): string {
  // Each opening says only what was observed. One that names the placeholders
  // where none were read sends an operator whose table is written to look for
  // something that is not there.
  const opening = {
    absent:
      `${relPath} does not exist, and the stage's own tree holds a run for ${id}. ` +
      `The stage opens this file before it writes anything else, so a run with no file wrote no record.`,
    "no-section": `${relPath} records no grilling session for ${id}.`,
    "no-table": `${relPath} carries "${subject.section}" for ${id} with no table under it.`,
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
 * `names` is sorted, and two things rest on it: two runs over one tree report
 * in one order, which `readdir` does not promise, and the last name a `latest`
 * subject matches is its most recent run.
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
      // to look at is left alone. A run that names no spec is the other case
      // and the opposite answer: `core/specScope.ts#isFindingInSpecScope` keeps
      // an unattributed finding in every slice, and `reviewArtifactsScope` says
      // so of a discussion pack by name. Dropping it here would be this one
      // validator answering a question the repository has already settled.
      if (scope !== undefined && subject.specKeyed && !scope.has(id.replace("spec-", ""))) {
        continue;
      }
      matched.push({ name, id, subject });
    }
    picked.push(...(subject.reads === "latest" ? newest(matched) : matched));
  }
  return picked.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The greatest name among `matched`, or nothing when there is none.
 *
 * Taken by comparison rather than by position, so the pick does not rest on
 * `readdir` having returned a sorted listing. The sort above fixes the order
 * findings are reported in; it is not load-bearing for which run is read.
 */
function newest(matched: readonly Candidate[]): Candidate[] {
  let best: Candidate | undefined;
  for (const candidate of matched) {
    if (best === undefined || candidate.name.localeCompare(best.name) > 0) best = candidate;
  }
  return best === undefined ? [] : [best];
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
  discussionDir: string | undefined,
  stages: readonly GrillingSubject[],
): Promise<Candidate[]> {
  const out = [...candidates];
  for (const subject of SUBJECTS) {
    if (subject.packs === undefined || !stages.includes(subject.stage)) continue;
    // `path.resolve`, not `path.join`, so an absolute `paths.discussionDir` is
    // used as it stands rather than hung off the project root —
    // `cli/commands/discussion.ts` resolves the same key the same way.
    const packsDir = path.resolve(root, discussionDir ?? DISCUSSION_DIR_REL);
    // A tree this cannot enumerate leaves the branch inert and the run
    // reporting clean, which is the answer a project that grilled every run
    // gets — and that is still the right behaviour here.
    //
    // A `paths.discussionDir` that is not a directory is a settled case rather
    // than an open one: `doctor` reports it under `paths.discussionDir`, and
    // two suites hold the readers that meet it to carrying on instead of
    // stopping (`validators/importLite.test.ts`,
    // `integration/cli/commands/discussion.test.ts`). Raising here would make a
    // warning-severity check the one thing that ends the run over it.
    const pack = latestPack(await findPacks(packsDir, subject.packs));
    if (pack === null) continue;

    const at = out.findIndex((candidate) => candidate.subject === subject);
    const seen = at === -1 ? undefined : out[at]?.name;
    const name = `${pack.name}.md`;
    // A record newer than the newest pack is the record of a run whose pack is
    // not there to be read; it answers for itself and this adds nothing.
    if (seen !== undefined && seen.localeCompare(name) >= 0) continue;
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
  let entries: Dirent[];
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
    options.discussionDir,
    stages,
  );
  for (const { name, id, subject, owed } of candidates) {
    const text = await textOf(path.join(evidenceDir, name));
    // A file that vanished between the listing and the read is a race, not a
    // finding — unless the stage's own tree says it is owed, which is the one
    // case where absence is what this reports.
    if (text === null && owed !== true) continue;
    const section = text === null ? null : ownRowsUnder(text, subject.section);
    if (section !== null && section.written.length > 0) continue;
    const state: State =
      text === null
        ? "absent"
        : section === null
          ? "no-section"
          : section.unwritten > 0
            ? "unwritten"
            : "no-table";

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
