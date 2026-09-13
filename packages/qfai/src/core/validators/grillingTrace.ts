/**
 * `QFAI-GRILL-001` (severity warning): a stage whose mandatory grilling session
 * left no trace in the evidence it wrote.
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
 * **Two stages, and why not the third.**
 *
 * | Stage       | Record                                                    | Read |
 * | ----------- | --------------------------------------------------------- | ---- |
 * | Spec        | `## Pre-draft Grilling` in `sdd-spec-NNNN.md`             | yes  |
 * | Discussion  | `## Grilling Session` in the latest `discussion-<stamp>.md` | yes  |
 * | Prototyping | `prototyping/grilling.md`                                 | no   |
 *
 * The discussion stage opens its evidence before it writes anything else and
 * records the session at every ending it admits, so a file with no section is
 * a run that wrote no record. Only the latest run is read: an earlier one is
 * history, and a record written for it now would be a claim rather than a
 * record.
 *
 * The prototyping file is a loop input the generator and the reviewer read every
 * cycle, one per project rather than one per run. Its absence is also what a
 * project that has not reached a prototyping loop looks like, so reporting it
 * would report every such project.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../fs/errno.js";
import { maskFencedCodeBlocks } from "../ids.js";
import { findLatestPack } from "../packLocator.js";
import { parseHeadings } from "../parse/markdown.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

/** The finding this validator emits. */
export const GRILLING_TRACE_CODE = "QFAI-GRILL-001";

/** The heading a spec stage writes its run-or-skip rows under. */
const SPEC_SECTION = "## Pre-draft Grilling";

/** The heading the discussion stage writes its session row under. */
const DISCUSSION_SECTION = "## Grilling Session";

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
 * The evidence file a spec stage writes, by its canonical name.
 *
 * Anchored on the spec id rather than on anything after `sdd-`, so a file a
 * project named `sdd-notes.md` is not held to a contract it never entered.
 */
const SPEC_EVIDENCE_RE = /^sdd-(spec-\d{4})\.md$/;

/** Where discussion packs sit when the caller names no configured directory. */
const DEFAULT_DISCUSSION_DIR_REL = ".qfai/discussion";

/**
 * The values the shipped template leaves for its author to replace. A row still
 * holding one was copied, not written.
 *
 * Named one by one rather than matched as any `<...>`, because a filled row may
 * carry Markdown of that shape: `<br>`, or an autolink.
 */
export const TEMPLATE_PLACEHOLDERS: readonly string[] = ["<ISO8601>", "<n>", "<ref>"];

/** A table's header separator: every cell a run of dashes, optionally aligned. */
const SEPARATOR_RE = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/;

/** A table row holding nothing but blanks and dashes. */
const BLANK_ROW_RE = /^\s*\|[\s|:-]*\|\s*$/;

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
 * Whether a level-two section headed `heading` holds a row somebody wrote.
 *
 * Only a heading line opens the section: a `###` heading, a mention in prose and
 * a fenced example of the section are not it. A heading with nothing under it
 * satisfies a presence check and tells a reader nothing, which is the state an
 * agent reaches by copying the template and filling none of it in. The
 * template's worked rows reach it too: they are table rows, but every one still
 * carries a placeholder, so a copy nobody filled in counts as no row at all.
 */
function carriesPopulatedSection(text: string, heading: string): boolean {
  const masked = maskFencedCodeBlocks(text);
  const lines = masked.split("\n");
  const headings = parseHeadings(masked);
  return headings.some((section, index) => {
    if (section.level !== 2 || `## ${section.title}` !== heading) return false;
    // The next heading at level two or above ends it: a `# Appendix` is not part
    // of the session section, and a table under it is not a session row.
    const next = headings.slice(index + 1).find((candidate) => candidate.level <= 2);
    const end = (next?.line ?? lines.length + 1) - 1;
    return tableRows(lines.slice(section.line, end)).some(
      (row) =>
        !BLANK_ROW_RE.test(row) && !TEMPLATE_PLACEHOLDERS.some((token) => row.includes(token)),
    );
  });
}

/**
 * The data rows of the tables in `lines`. A run of `|` lines is a table only
 * when its second line is the header separator, so a header left without one
 * holds no row.
 */
function tableRows(lines: readonly string[]): string[] {
  const rows: string[] = [];
  let run: string[] = [];
  for (const line of [...lines, ""]) {
    if (line.trim().startsWith("|")) {
      run.push(line);
      continue;
    }
    if (SEPARATOR_RE.test(run[1] ?? "")) rows.push(...run.slice(2));
    run = [];
  }
  return rows;
}

/** The sorted directory entries of the evidence tree, or `null` when it is absent. */
async function evidenceEntries(root: string) {
  const evidenceDir = path.join(root, ...EVIDENCE_DIR_REL.split("/"));
  if (!(await exists(evidenceDir))) return null;
  try {
    const entries = await readdir(evidenceDir, { withFileTypes: true });
    // Sorted, so two runs over one tree report in one order. `readdir` does not
    // promise one, and a findings list that reshuffles reads as churn in a diff.
    return { evidenceDir, entries: [...entries].sort((a, b) => a.name.localeCompare(b.name)) };
  } catch (err: unknown) {
    if (isEnoent(err)) return null;
    throw err;
  }
}

/**
 * Spec-stage evidence with no populated `## Pre-draft Grilling` section.
 *
 * Keyed on the evidence file rather than on the spec, because the evidence is
 * what the stage wrote: a spec with no evidence file has not run the stage, and
 * reporting that is another validator's job.
 *
 * `specScope` is the `--spec` selection when a run has one — the four-digit
 * numbers, as `core/specScope.ts` normalizes them. A scoped run is gating on its
 * own spec, and a finding about a sibling it was told not to look at is one the
 * operator cannot act on from where they are.
 */
export async function validateGrillingTrace(
  root: string,
  options: { specScope?: ReadonlySet<string> | undefined } = {},
): Promise<Issue[]> {
  const tree = await evidenceEntries(root);
  if (tree === null) return [];

  const scope = options.specScope;
  const issues: Issue[] = [];
  for (const entry of tree.entries) {
    if (!entry.isFile()) continue;
    const match = SPEC_EVIDENCE_RE.exec(entry.name);
    const specId = match?.[1];
    if (specId === undefined) continue;
    if (scope !== undefined && !scope.has(specId.replace("spec-", ""))) continue;

    const text = await textOf(path.join(tree.evidenceDir, entry.name));
    if (text === null || carriesPopulatedSection(text, SPEC_SECTION)) continue;

    const relPath = `${EVIDENCE_DIR_REL}/${entry.name}`;
    issues.push(
      issue(
        GRILLING_TRACE_CODE,
        `${GRILLING_TRACE_CODE}: ${relPath} records no grilling session for ${specId}. ` +
          `Each grilling-covered phase runs one before it writes and records it under ` +
          `"${SPEC_SECTION}" — a stage that skipped the session and one that ran it leave ` +
          `the same pack otherwise. Justification: file=${relPath}, ` +
          `missing=${SPEC_SECTION} with at least one phase row.`,
        "warning",
        relPath,
        "grilling.traceMissing",
      ),
    );
  }
  return issues;
}

/**
 * The latest discussion run, when its evidence records no populated
 * `## Grilling Session` section.
 *
 * The run is the latest canonical discussion pack, and its evidence is the file
 * carrying that pack's stamp, which is the name the discussion stage writes. An
 * older run's populated record therefore does not stand for a newer pack, and a
 * pack with no evidence file at all is reported as having no record.
 *
 * A `--spec` run reads nothing here: discussion evidence belongs to no spec, so
 * a scoped run could not act on the finding.
 */
export async function validateDiscussionGrillingTrace(
  root: string,
  options: { specScope?: ReadonlySet<string> | undefined; discussionDir?: string } = {},
): Promise<Issue[]> {
  if (options.specScope !== undefined) return [];
  const pack = await findLatestPack(
    options.discussionDir ?? path.join(root, DEFAULT_DISCUSSION_DIR_REL),
    "discussion",
  );
  if (pack?.timestamp == null) return [];

  const name = `discussion-${pack.timestamp}.md`;
  const relPath = `${EVIDENCE_DIR_REL}/${name}`;
  const text = await textOf(path.join(root, EVIDENCE_DIR_REL, name));
  if (text !== null && carriesPopulatedSection(text, DISCUSSION_SECTION)) return [];

  const what =
    text === null
      ? `the latest discussion run, ${pack.name}, has no evidence file at ${relPath}`
      : `${relPath} records no grilling session for the latest discussion run`;
  return [
    issue(
      GRILLING_TRACE_CODE,
      `${GRILLING_TRACE_CODE}: ${what}. The run records its session under ` +
        `"${DISCUSSION_SECTION}" in that file before it authors the pack — a run that ` +
        `skipped the session and one that ran it leave the same pack otherwise. ` +
        `Justification: file=${relPath}, missing=${DISCUSSION_SECTION} with a session row.`,
      "warning",
      relPath,
      "grilling.traceMissing",
    ),
  ];
}
