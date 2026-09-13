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

/**
 * The evidence file a discussion run writes: its seventeen-digit stamp, the
 * same one its pack directory carries. Equal-width stamps sort in time order.
 */
const DISCUSSION_EVIDENCE_RE = /^discussion-\d{17}\.md$/;

/**
 * A value the shipped template leaves for its author to replace — `<ISO8601>`,
 * `<n>`, `<ref>`. A row still holding one was copied, not written.
 */
const TEMPLATE_PLACEHOLDER_RE = /<[^<>|]+>/;

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
 * Whether the section exists and holds a row somebody wrote.
 *
 * A heading with nothing under it satisfies a presence check and tells a reader
 * nothing, which is the state an agent reaches by copying the template and
 * filling none of it in. The template's worked rows reach it too: they are
 * table rows, but every one still carries a placeholder, so a copy nobody
 * filled in counts as no row at all.
 */
function carriesPopulatedSection(text: string, heading: string): boolean {
  const at = text.indexOf(heading);
  if (at === -1) return false;
  const rest = text.slice(at + heading.length);
  const next = /^## /m.exec(rest);
  const body = next === null ? rest : rest.slice(0, next.index);
  const tableLines = body.split(/\r?\n/).filter((line) => line.trim().startsWith("|"));
  // The first table line is the header whenever a separator follows it; the
  // separator itself is never a row.
  const separator = (line: string | undefined): boolean =>
    line !== undefined && /^\s*\|[\s|:-]*\|\s*$/.test(line);
  const rows = separator(tableLines[1]) ? tableLines.slice(2) : tableLines;
  return rows.some((line) => !separator(line) && !TEMPLATE_PLACEHOLDER_RE.test(line));
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
 * The latest discussion run's evidence with no populated `## Grilling Session`
 * section.
 *
 * A `--spec` run reads nothing here: discussion evidence belongs to no spec, so
 * a scoped run could not act on the finding.
 */
export async function validateDiscussionGrillingTrace(
  root: string,
  options: { specScope?: ReadonlySet<string> | undefined } = {},
): Promise<Issue[]> {
  if (options.specScope !== undefined) return [];
  const tree = await evidenceEntries(root);
  if (tree === null) return [];

  const latest = tree.entries
    .filter((entry) => entry.isFile() && DISCUSSION_EVIDENCE_RE.test(entry.name))
    .at(-1);
  if (latest === undefined) return [];

  const text = await textOf(path.join(tree.evidenceDir, latest.name));
  if (text === null || carriesPopulatedSection(text, DISCUSSION_SECTION)) return [];

  const relPath = `${EVIDENCE_DIR_REL}/${latest.name}`;
  return [
    issue(
      GRILLING_TRACE_CODE,
      `${GRILLING_TRACE_CODE}: ${relPath} records no grilling session for the latest discussion ` +
        `run. The run records its session under "${DISCUSSION_SECTION}" before it authors the ` +
        `pack — a run that skipped the session and one that ran it leave the same pack ` +
        `otherwise. Justification: file=${relPath}, missing=${DISCUSSION_SECTION} with a session row.`,
      "warning",
      relPath,
      "grilling.traceMissing",
    ),
  ];
}
