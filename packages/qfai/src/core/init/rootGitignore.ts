import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../fs/errno.js";
import {
  ARTICLE_XI_TMP_SAMPLE_PATH,
  QFAI_GITIGNORE_BLOCK,
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_LEGACY_LINES,
  QFAI_GITIGNORE_MARKER,
  QFAI_RUN_STATE_IGNORE,
  RETIRED_LINE_SUCCESSORS,
  effectivelyIgnores,
  negationsOutrankLaterIgnores,
} from "../gitignore.js";
import { info } from "../logger.js";
import { safeLstat } from "./fsGuards.js";

/**
 * Rewrite the managed `.gitignore` block, adding any governance negation it is
 * missing.
 */
export async function ensureRootGitignoreEntries(
  destRoot: string,
  dryRun: boolean,
  // Where the two progress lines go. `qfai init` writes them to stdout; a
  // caller emitting JSON there collects them instead, because a stray line
  // before the document makes it unparseable.
  report: (line: string) => void = info,
): Promise<{
  copied: string[];
  skipped: string[];
}> {
  const gitignorePath = path.join(destRoot, ".gitignore");

  let existing = "";
  try {
    existing = await readFile(gitignorePath, "utf-8");
  } catch (err: unknown) {
    if (!isEnoent(err)) {
      throw err;
    }
    // File does not exist yet — will create
  }

  // The governance negations are checked here but deliberately NOT in
  // `QFAI_GITIGNORE_RECOMMENDED_ENTRIES`: a project that removed them must not
  // start failing validation, yet a project that never had them must still
  // receive them on the next `qfai init`. Without this term the early return
  // fires for every pre-existing managed block and the negations only ever
  // reach fresh inits.
  //
  // Presence alone is not enough — git applies the LAST matching pattern, so a
  // negation with any matching ignore line below it is inert and the record it
  // names stays ignored.
  //
  // The order check reads the **whole file**, not the managed block. A project
  // that appended its own `.qfai/*.json` after the block wins under
  // git's last-match rule, and a block-scoped check called the negation
  // effective while `git check-ignore -v` named the project's line. The repair
  // is `removeManagedBlock` plus a rebuilt block placed below the project's
  // rule (see {@link placeManagedBlock}) — but the early return fired first and
  // it never ran.
  //
  // Required entries are matched only against the managed block: a project that
  // deliberately removed, say, `.qfai/review/*` to track its review packs
  // must not have that choice silently undone by the next `qfai init`.
  const managedBlock = extractManagedBlock(existing);
  const existingLines = existing.split("\n").map((line) => line.trimEnd());
  if (
    existing.includes(QFAI_GITIGNORE_MARKER) &&
    gitignoreLines(managedBlock).includes(QFAI_RUN_STATE_IGNORE) &&
    QFAI_GITIGNORE_GOVERNANCE_NEGATIONS.every((entry) => managedBlock.includes(entry)) &&
    negationsOutrankLaterIgnores(existingLines, QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) &&
    QFAI_GITIGNORE_LEGACY_LINES.every((entry) => !existing.includes(entry))
  ) {
    return { copied: [], skipped: [gitignorePath] };
  }

  // Strip existing managed QFAI block (known block lines only; stop at unknown lines; loop for duplicates)
  const { stripped, blockAt } = existing.includes(QFAI_GITIGNORE_MARKER)
    ? removeManagedBlock(existing)
    : { stripped: existing, blockAt: -1 };

  const omitted =
    managedBlock.length === 0 ? linesTheProjectAlreadyHas(gitignoreLines(stripped)) : [];
  const placement = placeManagedBlock(
    stripped,
    rebuildManagedBlock(managedBlock, omitted),
    blockAt,
  );
  const omittedNote =
    omitted.length > 0
      ? `  left out of the QFAI entries: ${omitted.join(", ")} (already ignored by the project's own lines)`
      : undefined;

  if (dryRun) {
    report(
      placement.inPlace
        ? `  would update: .gitignore (rebuild QFAI entries in place)`
        : `  would update: .gitignore (append QFAI entries)`,
    );
    if (omittedNote !== undefined) report(omittedNote);
    return { copied: [gitignorePath], skipped: [] };
  }

  await replaceRootGitignore(gitignorePath, placement.content);
  report(
    placement.inPlace
      ? "  updated: .gitignore (rebuilt QFAI entries in place)"
      : "  updated: .gitignore (appended QFAI entries)",
  );
  if (omittedNote !== undefined) report(omittedNote);
  // Only the fallback can demote a project negation, and only against a project
  // ignore line that re-ignores a governance record. Naming the loser is the
  // least that move owes an operator: the file the negation re-included
  // silently stops reaching `git add` and `git status`.
  const demoted = placement.inPlace ? [] : demotedProjectNegations(existing, placement.content);
  for (const negation of demoted) {
    report(
      `  WARNING: .gitignore — \`${negation}\` no longer wins; the QFAI managed block now sits below it.`,
    );
  }
  return { copied: [gitignorePath], skipped: [] };
}

/** Writes `.gitignore` in place, refusing a path that is not a regular file. */
export async function replaceRootGitignore(target: string, content: string): Promise<void> {
  const current = await safeLstat(target);
  if (current !== undefined && !current.isFile()) {
    throw new Error("Cannot update .gitignore: its path is not a regular file.");
  }
  await writeFile(target, content, "utf-8");
}

/**
 * The whole file as trailing-trimmed lines, the form
 * {@link negationsOutrankLaterIgnores} reads.
 */
function gitignoreLines(content: string): string[] {
  return content.split("\n").map((line) => line.trimEnd());
}

/**
 * Where the rebuilt block goes: back where it was, or — only when that would
 * leave a QFAI governance negation inert — at end of file.
 *
 * Appending unconditionally lifted every project line that sat *below* the
 * block *above* it, and git applies the LAST matching pattern. A project
 * negation such as `!.qfai/report/dashboard.md` that was winning before the run
 * lost after it, silently: `.gitignore` does not untrack, so nothing failed and
 * the loss surfaced later, as new files under the negated pattern stopped
 * reaching `git add` and `git status`. Deleting an ignore line from the block
 * and writing a negation below the block are two encodings of the same decision
 * — *track this file* — and {@link rebuildManagedBlock} already protects the
 * first.
 *
 * Rebuilding in place costs the block nothing: it is internally ordered
 * (ignores first, negations last), which is what makes QFAI's negations outrank
 * QFAI's ignores. End-of-file matters only against lines QFAI does not own, so
 * the move is kept for exactly that case — a project ignore line below the
 * block re-ignoring a governance record, where the two rules genuinely conflict.
 */
function placeManagedBlock(
  stripped: string,
  block: string,
  blockAt: number,
): { content: string; inPlace: boolean } {
  if (blockAt >= 0 && stripped.length > 0) {
    const candidate = insertManagedBlock(stripped, block, blockAt);
    if (
      negationsOutrankLaterIgnores(gitignoreLines(candidate), QFAI_GITIGNORE_GOVERNANCE_NEGATIONS)
    ) {
      return { content: candidate, inPlace: true };
    }
  }
  const separator = stripped.length > 0 && !stripped.endsWith("\n") ? "\n\n" : "\n";
  return { content: stripped.length > 0 ? stripped + separator + block : block, inPlace: false };
}

/** Splice `block` back in at line `at`, blank-line separated from both sides. */
function insertManagedBlock(stripped: string, block: string, at: number): string {
  const lines = stripped.replace(/\n+$/, "").split("\n");
  const head = lines.slice(0, at);
  const tail = lines.slice(at);

  const parts = [...head];
  if (parts.length > 0 && parts[parts.length - 1] !== "") {
    parts.push("");
  }
  parts.push(...block.replace(/\n+$/, "").split("\n"));
  if (tail.length > 0) {
    if (tail[0] !== "") {
      parts.push("");
    }
    parts.push(...tail);
  }
  return `${parts.join("\n")}\n`;
}

/**
 * Project-owned negations that won before the rewrite and are inert after it.
 *
 * Lines the managed block owns are excluded: those move *with* the block, so
 * their standing is {@link negationsOutrankLaterIgnores}' business, not this
 * one's. What is left is the project's own re-inclusions, judged by the same
 * last-match rule against the whole file.
 */
function demotedProjectNegations(before: string, after: string): string[] {
  const beforeLines = gitignoreLines(before);
  const afterLines = gitignoreLines(after);
  const managed = new Set([...QFAI_GITIGNORE_BLOCK.split("\n"), ...QFAI_GITIGNORE_LEGACY_LINES]);
  const candidates = new Set(
    beforeLines.filter((line) => line.startsWith("!") && !managed.has(line)),
  );
  return [...candidates].filter(
    (negation) =>
      negationsOutrankLaterIgnores(beforeLines, [negation]) &&
      !negationsOutrankLaterIgnores(afterLines, [negation]),
  );
}

/**
 * The Article XI `/tmp/` line, when the project's own lines outside the block
 * already ignore the repository-root staging area.
 *
 * Two owners of one line leave the next edit ambiguous: which one is removed?
 * The question is what git does with the staging area, so a project's
 * unanchored `tmp/` counts and a later `!/tmp/` does not. A line with leading
 * whitespace is a different pattern in git, so it never counts. Every other
 * line of the block stays, because the contract names them as the block's.
 */
function linesTheProjectAlreadyHas(projectLines: readonly string[]): string[] {
  const significant = projectLines.filter((line) => !/^\s/.test(line));
  return effectivelyIgnores(significant, ARTICLE_XI_TMP_SAMPLE_PATH) ? ["/tmp/"] : [];
}

/**
 * The managed block to write, preserving whatever ignore lines the project's
 * existing block already had.
 *
 * Writing `QFAI_GITIGNORE_BLOCK` wholesale was a silent regression for the one
 * case the freshness check exists to protect. A project that deliberately
 * removed, say, `.qfai/review/*` from the block to track its review packs
 * fails the `every(...)` check the moment a NEW governance negation ships —
 * the block is then stripped and the canonical list written back, resurrecting
 * the ignore line the user deleted and re-hiding every pack from that release
 * on.
 *
 * So an existing block keeps its own ignore lines and only gains the governance
 * negations it is missing (appended last, because git applies the last matching
 * pattern). A project with no managed block gets the canonical one, less the
 * lines named in `omit`.
 */
function rebuildManagedBlock(existingBlock: string, omit: readonly string[]): string {
  if (existingBlock.length === 0) {
    return QFAI_GITIGNORE_BLOCK.split("\n")
      .filter((line) => !omit.includes(line))
      .join("\n");
  }
  const legacy = new Set<string>(QFAI_GITIGNORE_LEGACY_LINES);
  const negations = new Set<string>(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS);
  const lines = existingBlock.split("\n").map((line) => line.trimEnd());
  const present = new Set(lines);

  // The retired lines are dropped and the governance negations appended, both
  // unconditionally. What is *kept* is the project's own ignore set.
  //
  // An earlier attempt migrated a legacy-shaped block wholesale, on the theory
  // that a missing ignore there is age rather than a choice. That is not safe:
  // a project can carry a retired line *and* have deleted `.qfai/review/*` to
  // track its review packs, and the wholesale rewrite resurrects the deletion —
  // the very regression this function exists to stop. Age and intent cannot be
  // told apart from the file, so the conservative reading wins in both cases:
  // never re-add an ignore line the block does not have.
  //
  // The cost is that a project on an old block does not pick up a newly shipped
  // *recommended* ignore. The consequence is generated files showing in `git status` — noisy. Silently
  // re-hiding records the project chose to track is not noisy, which is
  // why it is the side to err on.
  const kept = lines.filter(
    (line) => line !== QFAI_GITIGNORE_MARKER && !negations.has(line) && !legacy.has(line),
  );
  // The one exception: a retired line that was *renamed* rather than dropped.
  // Stripping `.qfai/discussion/discussion-*/` without adding its successor
  // would leave the project with no discussion ignore at all — a removal it
  // never asked for, which is the same harm from the other direction.
  const renamed = Object.entries(RETIRED_LINE_SUCCESSORS)
    .filter(([retired, successor]) => present.has(retired) && !present.has(successor))
    .map(([, successor]) => successor);

  // Run state is added against the rule above: it is never a record a project tracks,
  // and a block without it would leave every run's journal for `git add .` to stage.
  const runState = present.has(QFAI_RUN_STATE_IGNORE) ? [] : [QFAI_RUN_STATE_IGNORE];

  return [
    QFAI_GITIGNORE_MARKER,
    ...kept,
    ...renamed,
    ...runState,
    ...QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  ]
    .filter((line, index, all) => line.length > 0 || all[index - 1]?.length !== 0)
    .join("\n");
}

/**
 * One past the last line of the managed block that starts at `startIdx`.
 *
 * ## Why the walk does not stop at the first unknown line
 *
 * A line inside the block that the current writer no longer emits, and that is not registered
 * as legacy — `.qfai/output/*`, which an older release wrote, is one — would end a walk that
 * stops at the first line it does not know. The consequences compound:
 *
 *   - `extractManagedBlock` returns the marker plus one line, so the freshness check finds the
 *     governance negations "missing" and the early return never fires;
 *   - `removeManagedBlock` strips that same two-line prefix and leaves the rest in place;
 *   - the rebuilt block — marker, the one line it saw, and every negation — goes back in at the
 *     old position, ABOVE the lines that were never removed.
 *
 * Every `qfai init` would then append a second copy of the negations, above the ignore lines
 * that cancel them, where git's last-match rule makes it inert. Noise that grows by a block per
 * run is what makes a real change to `.gitignore` unreadable in review.
 *
 * ## The rule, and why it protects a project's own lines
 *
 * The block is terminated by a blank line, by a comment that is not the marker, or by the end
 * of the file — that is how it is written, and how a project's own section is separated from
 * it. Inside that region the block ends at its LAST known line.
 *
 * Both halves matter. Tolerating unknown lines between known ones is what stops a retired line
 * truncating the block. Ending at the last KNOWN line keeps a project's own lines out of it:
 * lines a project appended directly under the block, with no blank between, stay outside it, so
 * they keep their position relative to the negations and git's last-match verdict for them does
 * not change.
 *
 * An unknown line absorbed from between two known ones is not lost: `rebuildManagedBlock` keeps
 * every block line that is neither the marker, a governance negation, nor a retired line, which
 * is exactly what "the project's own ignore set" means there.
 */
function managedBlockEnd(
  lines: readonly string[],
  startIdx: number,
  knownLines: ReadonlySet<string>,
): number {
  let lastKnown = startIdx; // the marker itself is always part of the block
  for (let index = startIdx + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      break;
    }
    // A CRLF checkout ends every line with a carriage return, which the known set lacks.
    if (knownLines.has(line.trimEnd())) {
      lastKnown = index;
    }
  }
  return lastKnown + 1;
}

/**
 * The QFAI managed block, or `""` when the marker is absent.
 *
 * Freshness is judged against the block this writer owns, not the whole file:
 * a project that deliberately deleted an ignore line to track its own audit
 * trail keeps that choice, and a line the user re-added elsewhere does not
 * make a stale managed block look current.
 *
 * **Every block, not the first.** A past duplicate-append bug left some
 * projects with two managed blocks, and `removeManagedBlock` strips all of
 * them. Reading only the first meant an ignore line that lived exclusively in
 * a later block — `.qfai/state.json`, say — was deleted with that block and
 * never rebuilt, exposing local run state to the next commit. The blocks are
 * merged in document order: the first block's ordering is preserved (which is
 * what `negationsOutrankLaterIgnores` and the last-pattern-wins semantics
 * depend on) and any line only a later block carries is appended.
 */
export function extractManagedBlock(content: string): string {
  const lines = content.split("\n");
  const knownLines = new Set([...QFAI_GITIGNORE_BLOCK.split("\n"), ...QFAI_GITIGNORE_LEGACY_LINES]);

  const merged: string[] = [];
  const seen = new Set<string>();
  let cursor = 0;
  while (cursor < lines.length) {
    const startIdx = lines.findIndex(
      (line, index) => index >= cursor && line.includes(QFAI_GITIGNORE_MARKER),
    );
    if (startIdx === -1) break;
    const endIdx = managedBlockEnd(lines, startIdx, knownLines);
    for (const line of lines.slice(startIdx, endIdx)) {
      // The marker itself is deduplicated with everything else, so a merged
      // block carries exactly one.
      if (seen.has(line)) continue;
      seen.add(line);
      merged.push(line);
    }
    cursor = endIdx;
  }
  return merged.join("\n");
}

/**
 * Remove all QFAI managed blocks (known block lines only; stops at unknown
 * lines), and report where the first one sat.
 *
 * `blockAt` is a line index into the stripped file — the seam the rebuilt block
 * goes back into, so the project's own lines keep the side of the block they
 * were written on. Duplicated blocks collapse onto the first one's position.
 */
function removeManagedBlock(content: string): { stripped: string; blockAt: number } {
  const lines = content.split("\n");
  let blockAt = -1;

  // Known lines: current block + legacy lines from previous versions
  const knownLines = new Set([...QFAI_GITIGNORE_BLOCK.split("\n"), ...QFAI_GITIGNORE_LEGACY_LINES]);

  // Loop to handle multiple managed blocks (e.g. from past duplicates)
  while (true) {
    const startIdx = lines.findIndex((line) => line.includes(QFAI_GITIGNORE_MARKER));
    if (startIdx === -1) break;
    if (blockAt === -1) {
      blockAt = startIdx;
    }

    // Through the last known line, tolerating a retired line the writer no longer
    // emits. See {@link managedBlockEnd}.
    let endIdx = managedBlockEnd(lines, startIdx, knownLines);

    // Also remove one trailing blank line if present
    if (endIdx < lines.length) {
      const line = lines[endIdx];
      if (line !== undefined && line.trim() === "") {
        endIdx++;
      }
    }

    lines.splice(startIdx, endIdx - startIdx);
  }

  // Remove trailing blank lines left from removal
  while (lines.length > 0) {
    const last = lines[lines.length - 1];
    if (last === undefined || last.trim() !== "") break;
    lines.pop();
  }
  return {
    stripped: lines.length > 0 ? lines.join("\n") + "\n" : "",
    // A block that sat at the end, or one whose tail was blank lines the trim
    // above removed, lands back at the end.
    blockAt: blockAt === -1 ? -1 : Math.min(blockAt, lines.length),
  };
}
