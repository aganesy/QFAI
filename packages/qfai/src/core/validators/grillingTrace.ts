/**
 * `QFAI-GRILL-001` (severity warning): a spec stage whose mandatory grilling
 * session left no trace in the evidence it wrote.
 *
 * The failure it exists for leaves nothing else behind. A stage that ran its
 * session and one that skipped it produce the same spec pack, the same
 * coverage, the same work orders — the only difference is the record the stage
 * was told to write, so that record's absence is the finding.
 *
 * **Warning, deliberately.** The check reads a record the agent wrote about its
 * own run, so it establishes that the record exists — not that a session
 * happened. A severity that stops CI would claim more than that. Raising it is
 * cheap once the false-positive rate is known.
 *
 * **Spec stages only, for now.** A discussion pack's session has no writable
 * home yet: the row is described in the skill and nothing names a file the
 * skill may write it to before it authors the pack. Checking for a record with
 * no defined path would report every run.
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
 * Whether the section exists and holds a row.
 *
 * A heading with nothing under it satisfies a presence check and tells a reader
 * nothing, which is the state an agent reaches by copying the template and
 * filling none of it in.
 */
function carriesPopulatedSection(text: string): boolean {
  const at = text.indexOf(SPEC_SECTION);
  if (at === -1) return false;
  const rest = text.slice(at + SPEC_SECTION.length);
  const next = /^## /m.exec(rest);
  const body = next === null ? rest : rest.slice(0, next.index);
  // A data row, not the header or its separator: the template ships both, so a
  // section nobody filled in still has two table lines.
  return body
    .split(/\r?\n/)
    .some(
      (line) =>
        line.trim().startsWith("|") &&
        !/^\s*\|[\s|:-]*\|\s*$/.test(line) &&
        !/\|\s*Phase\s*\|/i.test(line),
    );
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
  const evidenceDir = path.join(root, ...EVIDENCE_DIR_REL.split("/"));
  if (!(await exists(evidenceDir))) return [];

  let entries;
  try {
    entries = await readdir(evidenceDir, { withFileTypes: true });
  } catch (err: unknown) {
    if (isEnoent(err)) return [];
    throw err;
  }

  const scope = options.specScope;
  const issues: Issue[] = [];
  // Sorted, so two runs over one tree report in one order. `readdir` does not
  // promise one, and a findings list that reshuffles reads as churn in a diff.
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile()) continue;
    const match = SPEC_EVIDENCE_RE.exec(entry.name);
    const specId = match?.[1];
    if (specId === undefined) continue;
    if (scope !== undefined && !scope.has(specId.replace("spec-", ""))) continue;

    const file = path.join(evidenceDir, entry.name);
    const text = await textOf(file);
    if (text === null || carriesPopulatedSection(text)) continue;

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
