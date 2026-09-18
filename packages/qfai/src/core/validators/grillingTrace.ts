/**
 * `QFAI-GRILL-001` and `QFAI-GRILL-002` (severity warning): a stage whose
 * mandatory grilling session left no trace in the evidence it wrote — the spec
 * stage under the first code and a discussion run under the second.
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
import { maskFencedCodeBlocks } from "../ids.js";
import {
  CANONICAL_TIMESTAMP_DIGITS,
  findPacks,
  latestPack,
  type PackKind,
} from "../packLocator.js";
import { splitMarkdownRow } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

/**
 * The finding each stage's half emits.
 *
 * One code per stage rather than one for the check. Two runners dispatch this
 * and each names its own stage, so a single family would be claimed whole by
 * both profiles while each evaluated half of it — and the unevaluated-gates
 * notice would report partial coverage as complete, which the narrower gate
 * groups beside it are split to prevent.
 */
const SPEC_TRACE_CODE = "QFAI-GRILL-001";
const DISCUSSION_TRACE_CODE = "QFAI-GRILL-002";

export const GRILLING_TRACE_CODES = {
  spec: SPEC_TRACE_CODE,
  discussion: DISCUSSION_TRACE_CODE,
} as const satisfies Readonly<Record<GrillingSubject, string>>;

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
 * Columns that identify each stage's table, so another table under the heading
 * is not read as the record.
 *
 * A section may hold a table about something else. Taken for the record, such a
 * table says a row is there, which is true, and that the row is the session's,
 * which is not. Two columns each, held against the shipped templates by a test.
 */
export const GRILLING_COLUMNS = {
  spec: ["Phase", "Session"],
  discussion: ["Ended", "Authoring began"],
} as const satisfies Readonly<Record<GrillingSubject, readonly string[]>>;

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
  /** The finding this stage's half emits. */
  readonly code: string;
  /** The evidence file's name, capturing what the finding calls the run. */
  readonly file: RegExp;
  /** The heading the stage writes its rows under. */
  readonly section: string;
  /** What the finding calls one row. */
  readonly row: string;
  /** Columns whose presence in a header identifies this stage's table. */
  readonly columns: readonly string[];
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
    code: SPEC_TRACE_CODE,
    // Anchored on the spec id rather than on anything after `sdd-`, so a file a
    // project named `sdd-notes.md` is not held to a contract it never entered.
    file: /^sdd-(spec-\d{4})\.md$/,
    section: GRILLING_SECTIONS.spec,
    row: "phase row",
    columns: GRILLING_COLUMNS.spec,
    specKeyed: true,
    reads: "each",
  },
  {
    stage: "discussion",
    code: DISCUSSION_TRACE_CODE,
    // The discussion run opens its evidence under its own stamp before it
    // writes anything else, and opens its pack under that same stamp, so the
    // two names agree and the greatest is the most recent run. The width comes
    // from `packLocator.ts` rather than being written again here: it is the
    // only width that resolves a pack, so a second spelling could drift into
    // reading records no pack will ever be found for.
    file: new RegExp(`^(discussion-\\d{${String(CANONICAL_TIMESTAMP_DIGITS)}})\\.md$`),
    section: GRILLING_SECTIONS.discussion,
    row: "session row",
    columns: GRILLING_COLUMNS.discussion,
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
 * table that leaves them off is a table. Reading only the pipe-led form would
 * find no rows in one and report a record that is there as missing.
 */
const DELIMITER_RE = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

/**
 * A line CommonMark reads as an indented code block.
 *
 * Four columns makes a block an example of a document rather than part of one,
 * exactly as a fence does, so an indented table example under the section is
 * not the record. A tab is four columns, so it opens one on its own.
 */
const INDENTED_CODE_RE = /^(?: {4,}|\t)\s*\S/;

/** An HTML comment's opening and closing lines. */
const HTML_COMMENT_OPEN_RE = /^ {0,3}<!--/;
const HTML_COMMENT_CLOSE_RE = /-->/;

/**
 * A cell that is nothing but a template placeholder.
 *
 * Anchored on the whole cell, as `deltaV1.ts` and `importLiteEvidence.ts`
 * anchor theirs: a cell carrying an angle-bracketed construct inside a sentence
 * has been written.
 *
 * Named the way the templates name theirs — `<ISO8601>`, `<n>`, `<screen id>`,
 * `<hex from DESIGN.md.lock.yaml>` — rather than by what it is not. Every
 * autolink CommonMark admits carries a character this does not: a URL its
 * scheme colon, an email its `@`, an HTML tag its slash or its `!`. Each of
 * those is content, and reading one as a placeholder would drop its row and
 * report a written record as missing.
 */
const UNREPLACED_CELL_RE = /^<[A-Za-z][A-Za-z0-9 ._-]*>$/;

/**
 * Which of the two unwritten shapes a row is, or `null` for a written one.
 *
 * Both are what a copied template looks like — a cell left at its placeholder,
 * and a row whose cells are all empty, which is the shape the review request
 * ships for a reviewer to fill in. They are told apart because the finding says
 * what was seen: naming placeholders where the row is simply blank sends an
 * operator looking for something that is not there. A row with some cells
 * filled and some not is neither — it is a partial record, and saying so is a
 * judgement this check does not make.
 */
function unwrittenAs(line: string): "empty" | "placeheld" | null {
  const cells = cellsOf(line);
  if (cells.every((cell) => cell === "")) return "empty";
  return cells.some((cell) => UNREPLACED_CELL_RE.test(cell)) ? "placeheld" : null;
}

/**
 * Codes for a path that holds no readable file: absent, a directory, or under
 * something that is not one.
 *
 * An owed candidate is a name the stage's run list implies rather than one the
 * listing produced, so it can be any of the three. Reading only the first would
 * throw `EISDIR` out of the whole command over a directory sitting where a
 * record belongs — a crash where the finding is what an operator needs.
 */
const NO_FILE_THERE = new Set(["EISDIR", "ENOTDIR", "ELOOP", "ENAMETOOLONG", "EINVAL"]);

/** A file's text, or `null` when no readable file is there. */
async function textOf(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf-8");
  } catch (err: unknown) {
    if (isEnoent(err)) return null;
    const code = (err as NodeJS.ErrnoException | null)?.code;
    if (code !== undefined && NO_FILE_THERE.has(code)) return null;
    throw err;
  }
}

/** `value`, with every character a regular expression reads as syntax escaped. */
function literal(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The heading, and what ends the section it opens. */
function headingRe(section: string): RegExp {
  const parsed = /^(#+)\s+(.*)$/.exec(section);
  const hashes = parsed?.[1] ?? "##";
  const title = parsed?.[2] ?? section;
  // As CommonMark admits an ATX heading: up to three leading spaces, and an
  // optional closing run of hashes. An exact-line match would report a written
  // record as missing for both.
  //
  // The closing run needs whitespace before it. CommonMark reads `## Title###`
  // as a heading whose text is `Title###`, so accepting it would match a heading
  // nobody writes and let a file with no section pass.
  return new RegExp(`^ {0,3}${hashes}\\s+${literal(title)}(?:\\s+#+)?\\s*$`);
}

/**
 * Any ATX heading, which is where the section's own content stops.
 *
 * Any, not one of the section's level or above: a subsection's content belongs
 * to the subsection. The record's rows go directly under the section heading,
 * so reading past a `###` would let a table that belongs to something else
 * stand in for a table the stage never wrote.
 *
 * The text is optional, because CommonMark admits an empty heading: a bare
 * `###` opens a subsection whose title is nothing, and requiring a title would
 * read one as prose and carry on into the table below it.
 */
const ANY_HEADING_RE = /^ {0,3}#{1,6}(?:\s|$)/;

/**
 * The cells of a markdown table row.
 *
 * `splitMarkdownRow` rather than a split on the character: a pipe escaped as
 * `\\|` is cell content, and counting it as a separator would make a header
 * wider than its own delimiter, so a written table would fail the arity check
 * below and its record would be reported as missing.
 */
function cellsOf(line: string): string[] {
  return splitMarkdownRow(line);
}

/**
 * The document with everything that is not Markdown blanked out.
 *
 * Blanked rather than removed, and the line count is kept: closing the gap over
 * a masked block would make a header written above one and a delimiter written
 * below it adjacent, and the two would read as a table the document does not
 * contain.
 *
 * Fences come from `maskFencedCodeBlocks`, which is where this repository keeps
 * the rule — a fence closes only on its own marker at its own length or more,
 * so a `~~~` block quoting a backtick line is one block rather than two. A
 * toggle on any fence line would end the block at the inner line and hide the
 * table that follows the real closer.
 *
 * Indented blocks and HTML comments are masked for the same reason a fence is:
 * their contents are an example of a document rather than part of one, and a
 * `### Example` inside a comment must not end the section before the table
 * under it.
 */
function maskedLines(text: string): string[] {
  const lines = maskFencedCodeBlocks(text).split("\n");
  const out: string[] = [];
  let inComment = false;
  for (const line of lines) {
    if (inComment) {
      const closes = HTML_COMMENT_CLOSE_RE.test(line);
      out.push("");
      inComment = !closes;
      continue;
    }
    if (HTML_COMMENT_OPEN_RE.test(line)) {
      inComment = !HTML_COMMENT_CLOSE_RE.test(line);
      out.push("");
      continue;
    }
    out.push(INDENTED_CODE_RE.test(line) ? "" : line);
  }
  return out;
}

/** What one section holds: the rows the stage wrote, and the ones it did not. */
type SectionRows = {
  readonly written: string[];
  readonly empty: number;
  readonly placeheld: number;
};

/**
 * The rows of the table under `section`.
 *
 * The delimiter is what identifies the table, so everything up to and including
 * it is the header and the rows are the contiguous block after it. Contiguous,
 * because a section may hold more than one table: reading to the end of the
 * section would let a second table's own header stand in for the record, and a
 * subsection with any table in it would satisfy the check.
 *
 * `null` when the section is absent, which the caller reports differently from
 * a section present with nothing readable under it.
 */
function ownRowsUnder(text: string, subject: Subject): SectionRows | null {
  const heading = headingRe(subject.section);
  const lines = maskedLines(text);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return null;

  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (ANY_HEADING_RE.test(line)) break;
    body.push(line);
  }

  // A delimiter under a header of the same width, which is the only thing GFM
  // reads as one. Matched on shape alone, a thematic break under a line that
  // happens to hold a pipe would take the role, and what follows would read as
  // rows.
  const delimiter = body.findIndex((line, at) => {
    const header = body[at - 1];
    if (at === 0 || header === undefined || !header.includes("|")) return false;
    if (!DELIMITER_RE.test(line) || cellsOf(line).length !== cellsOf(header).length) return false;
    // And the header names this stage's table. A section may hold a table about
    // something else, and taken for the record it says a row is there, which is
    // true, and that the row is the session's, which is not.
    const named = cellsOf(header).map((cell) => cell.trim());
    return subject.columns.every((column) => named.includes(column));
  });
  if (delimiter === -1) return { written: [], empty: 0, placeheld: 0 };

  const written: string[] = [];
  let empty = 0;
  let placeheld = 0;
  for (const line of body.slice(delimiter + 1)) {
    if (!line.includes("|")) break;
    // A second delimiter is the table's furniture, not a row of it. Its cells
    // are neither empty nor placeholders, so counting it would let a copied
    // table with two delimiters and no data satisfy the check.
    if (DELIMITER_RE.test(line)) continue;
    const shape = unwrittenAs(line);
    if (shape === null) written.push(line);
    else if (shape === "empty") empty += 1;
    else placeheld += 1;
  }
  return { written, empty, placeheld };
}

/** What the file the finding names is. */
type State = "absent" | "no-section" | "no-table" | SectionRows;

/** What an unwritten table's rows were, in the words of what was seen. */
function sawInstead(rows: SectionRows): string {
  if (rows.placeheld === 0) return "every row is empty";
  if (rows.empty === 0) return "every row still holds the template's placeholders";
  return "every row is empty or still holds the template's placeholders";
}

/** The message for each state the finding reports. */
function remediation(relPath: string, id: string, subject: Subject, state: State): string {
  // Each opening says only what was observed. One that names the placeholders
  // where the row is simply blank sends an operator looking for something that
  // is not there.
  if (typeof state === "object") {
    return tail(
      `${relPath} carries "${subject.section}" for ${id} with no ${subject.row} of its own — ` +
        `${sawInstead(state)}.`,
      relPath,
      subject,
    );
  }
  const opening = {
    absent:
      `${relPath} does not exist, and the stage's own tree holds a run for ${id}. ` +
      `The stage opens this file before it writes anything else, so a run with no file wrote no record.`,
    "no-section": `${relPath} records no grilling session for ${id}.`,
    "no-table": `${relPath} carries "${subject.section}" for ${id} with no table under it.`,
  }[state];
  return tail(opening, relPath, subject);
}

/** The half of the message every state shares. */
function tail(opening: string, relPath: string, subject: Subject): string {
  return (
    `${subject.code}: ${opening} ` +
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
    // gets, and the right one here.
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
    const section = text === null ? null : ownRowsUnder(text, subject);
    if (section !== null && section.written.length > 0) continue;
    const state: State =
      text === null
        ? "absent"
        : section === null
          ? "no-section"
          : section.empty + section.placeheld > 0
            ? section
            : "no-table";

    const relPath = `${EVIDENCE_DIR_REL}/${name}`;
    issues.push(
      issue(
        subject.code,
        remediation(relPath, id, subject, state),
        "warning",
        relPath,
        "grilling.traceMissing",
      ),
    );
  }
  return issues;
}
