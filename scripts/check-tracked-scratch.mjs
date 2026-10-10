/**
 * A tracked file under a directory whose contents are never committed.
 *
 * Two kinds of directory hold nothing the repository owns:
 *
 * - `tmp/`, the sole staging area for scratch output;
 * - the directories qfai and its stages write local records and generated
 *   output to, which the managed `.gitignore` block ignores whole.
 *
 * `.gitignore` lists each of them, which is why the rule reads as held — but an
 * ignore rule does not untrack a file that is already tracked, so a file added
 * before the entry, or with `git add -f`, stays in the index and the ignore
 * entry no longer applies to it.
 *
 * What that costs differs by kind. A contributor who finds a file under `tmp/`
 * cannot tell whether it is someone's leftover or repository content. A tracked
 * generated report is rewritten by every local `qfai validate`, so each run
 * leaves a modified tracked file that is easy to commit by accident. Only this
 * guard makes the ignore entries true.
 *
 * Usage:
 *   node scripts/check-tracked-scratch.mjs
 *
 * Exit codes: 0 clean, 1 a tracked path under one of the directories, 2 the
 * file list could not be read.
 */
/* global console, process */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** The directory the temporary-files rule reserves, as a message names it. */
export const SCRATCH_PREFIX = "tmp/";

/**
 * The same directory as a git pathspec, without the separator.
 *
 * `tmp/` matches what is under the directory and not the path itself, so a
 * tracked regular file or symlink named `tmp` — which stops the directory
 * existing at all — returns no entries and reads as a clean run. `tmp` matches
 * both.
 */
const SCRATCH_PATHSPEC = "tmp";

/**
 * The directories qfai writes local records and generated output to, as git
 * pathspecs.
 *
 * Each one is ignored whole by a `.qfai/<dir>/*` line of the managed
 * `.gitignore` block; `trackedScratch.test.ts` holds the two lists together.
 */
export const GENERATED_DIRS = [
  ".qfai/report",
  ".qfai/evidence",
  ".qfai/review",
  ".qfai/discussion",
];

/**
 * Tracked paths under the given pathspecs, or `null` when git cannot answer.
 *
 * `null` is a distinct outcome rather than an empty list, for the reason the
 * conflict-marker guard gives: a caller outside a repository would otherwise
 * get a clean run over nothing at all, which claims a result it never
 * established.
 */
export function trackedFilesUnder(pathspecs, cwd = process.cwd()) {
  let output;
  try {
    output = execFileSync("git", ["ls-files", "-z", "--", ...pathspecs], {
      cwd,
      encoding: "buffer",
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    return null;
  }
  return output
    .toString("utf-8")
    .split("\0")
    .filter((entry) => entry !== "");
}

/** Tracked paths under `tmp/`, or `null` when git cannot answer. */
export function trackedScratchFiles(cwd = process.cwd()) {
  return trackedFilesUnder([SCRATCH_PATHSPEC], cwd);
}

/** Tracked paths under the generated-output directories, or `null`. */
export function trackedGeneratedFiles(cwd = process.cwd()) {
  return trackedFilesUnder(GENERATED_DIRS, cwd);
}

export function run(cwd = process.cwd()) {
  const scratch = trackedScratchFiles(cwd);
  const generated = trackedGeneratedFiles(cwd);
  if (scratch === null || generated === null) {
    console.error(
      `Could not list tracked files under ${SCRATCH_PREFIX} — is this a git repository?`,
    );
    return 2;
  }

  if (scratch.length > 0) {
    for (const file of scratch) console.error(`${file}: tracked under ${SCRATCH_PREFIX}`);
    console.error(
      `${SCRATCH_PREFIX} is the scratch area, and nothing there is committed. Run ` +
        `\`git rm --cached <path>\` and delete the file, or move it to where its kind ` +
        `of content belongs.`,
    );
  }
  if (generated.length > 0) {
    for (const file of generated) console.error(`${file}: tracked generated output`);
    console.error(
      `${GENERATED_DIRS.join(", ")} hold output qfai writes, and nothing there is ` +
        "committed. Run `git rm --cached <path>`; the managed .gitignore block keeps the " +
        "file ignored from then on.",
    );
  }
  if (scratch.length > 0 || generated.length > 0) return 1;

  console.log(`No tracked files under ${SCRATCH_PREFIX} or ${GENERATED_DIRS.join(", ")}.`);
  return 0;
}

// `pathToFileURL`, not `file://` + the path: on Windows `process.argv[1]` is a
// drive-letter path with backslashes, which concatenation turns into a string no
// `import.meta.url` ever equals. The guard then never fires, the lane exits 0
// having scanned nothing, and a run that never looked reads as a run that passed.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run());
}
