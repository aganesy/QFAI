/**
 * `QFAI-GRILL-001` (severity warning): a stage whose mandatory grilling session
 * left no trace in the evidence it wrote.
 *
 * What it reads is the tracked artifacts. `.qfai/specs/**` is outside the
 * managed ignore block, and `.qfai/discussion/**` is only recommended for
 * ignoring at info severity, because both are governance records a project may
 * legitimately want tracked — so both are present in a CI checkout of a project
 * that tracks them.
 *
 * What it does not read is whether any particular conversation happened. A
 * trigger round is a response to something detected, so its absence is not
 * observable; only the mandatory ones are checked, and only through the record
 * the stage was told to write.
 *
 * **Warning, deliberately.** The check reads a record the agent wrote about its
 * own run, so it establishes that the record exists — not that a session
 * happened. A severity that stops CI would claim more than that. Raising it is
 * cheap once the false-positive rate is known.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

/** The finding this validator emits. */
export const GRILLING_TRACE_CODE = "QFAI-GRILL-001";

/**
 * The heading a spec stage writes its run-or-skip rows under, in the evidence
 * file for that spec.
 */
const SPEC_SECTION = "## Pre-draft Grilling";

/** The heading a discussion stage writes its session row under. */
const DISCUSSION_SECTION = "## Grilling Session";

/** Evidence file names a spec stage writes, by convention `sdd-<spec-id>.md`. */
const SPEC_EVIDENCE_RE = /^sdd-(.+)\.md$/;

/** Files under the discussion tree whose presence means a pack was authored. */
const DISCUSSION_PACK_MARKER = "01_Context.md";

/**
 * The evidence tree, relative to the project root.
 *
 * A fixed path rather than a configured one, because there is no
 * `paths.evidenceDir`: every writer and reader of this tree spells it out
 * (`preflight/importLiteEvidence.ts`, `validators/atddCoverageDepth.ts`), and a
 * second spelling here would be a second answer to where the tree is.
 */
const EVIDENCE_DIR_REL = ".qfai/evidence";

/** Directory entries, or `[]` when the directory is not there. */
async function entriesOf(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() || entry.isDirectory())
      .map((entry) => entry.name);
  } catch (err: unknown) {
    if (isEnoent(err)) return [];
    throw err;
  }
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

function finding(relPath: string, subject: string, section: string): Issue {
  return issue(
    GRILLING_TRACE_CODE,
    `${GRILLING_TRACE_CODE}: ${relPath} records no grilling session for ${subject}. ` +
      `The stage runs one before it writes, and records it under "${section}" — a stage ` +
      `that skipped the session and one that ran it leave the same artifacts otherwise. ` +
      `Justification: file=${relPath}, missing=${section}.`,
    "warning",
    relPath,
    "grilling.traceMissing",
  );
}

/**
 * Spec-stage evidence that carries no `## Pre-draft Grilling` section.
 *
 * Keyed on the evidence file rather than on the spec, because the evidence is
 * what the stage wrote: a spec with no evidence file has not run the stage, and
 * reporting that is another validator's job.
 */
async function specStageFindings(root: string): Promise<Issue[]> {
  const evidenceDir = path.join(root, ...EVIDENCE_DIR_REL.split("/"));
  if (!(await exists(evidenceDir))) return [];
  const issues: Issue[] = [];
  for (const name of await entriesOf(evidenceDir)) {
    const match = SPEC_EVIDENCE_RE.exec(name);
    if (match === null) continue;
    const file = path.join(evidenceDir, name);
    const text = await textOf(file);
    if (text === null || text.includes(SPEC_SECTION)) continue;
    const relPath = path.relative(root, file).replace(/\\/g, "/");
    issues.push(finding(relPath, `spec ${match[1] ?? name}`, SPEC_SECTION));
  }
  return issues;
}

/**
 * Discussion packs whose evidence carries no `## Grilling Session` row.
 *
 * The pack is what says a run happened; the row is what says its interview did.
 */
async function discussionFindings(root: string, config: QfaiConfig): Promise<Issue[]> {
  const discussionDir = resolvePath(root, config, "discussionDir");
  const evidenceDir = path.join(root, ...EVIDENCE_DIR_REL.split("/"));
  if (!(await exists(discussionDir))) return [];
  const issues: Issue[] = [];
  for (const pack of await entriesOf(discussionDir)) {
    if (!(await exists(path.join(discussionDir, pack, DISCUSSION_PACK_MARKER)))) continue;
    const file = path.join(evidenceDir, `${pack}.md`);
    const text = await textOf(file);
    if (text !== null && text.includes(DISCUSSION_SECTION)) continue;
    const relPath = path.relative(root, path.join(discussionDir, pack)).replace(/\\/g, "/");
    issues.push(finding(relPath, "this pack", DISCUSSION_SECTION));
  }
  return issues;
}

export async function validateGrillingTrace(
  root: string,
  options: { config?: QfaiConfig } = {},
): Promise<Issue[]> {
  const config = options.config;
  // Without a config there is no configured path to read, and guessing the
  // defaults would scan a tree the project may have moved — reporting a missing
  // record for evidence that is somewhere else entirely.
  if (config === undefined) return [];
  return [...(await specStageFindings(root)), ...(await discussionFindings(root, config))];
}
