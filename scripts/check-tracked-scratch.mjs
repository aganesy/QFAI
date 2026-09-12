/**
 * A tracked file under the repository's scratch directory.
 *
 * `tmp/` is the sole staging area for scratch output, and nothing there is ever
 * committed. `.gitignore` lists `/tmp/`, which is why the rule reads as held —
 * but an ignore rule does not stop tracking a file that is already tracked, so
 * a file added before the entry, or with `git add -f`, stays in the index and
 * `git status` never mentions it again.
 *
 * What that costs is the rule's one cheap check. A contributor who finds a file
 * under `tmp/` cannot tell whether it is someone's leftover or repository
 * content, and every worktree checkout materialises it. The ignore entry says
 * the directory holds nothing the repository owns, and only this guard makes
 * that true.
 *
 * Usage:
 *   node scripts/check-tracked-scratch.mjs
 *
 * Exit codes: 0 clean, 1 a tracked path under `tmp/`, 2 the file list could not
 * be read.
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
 * Tracked paths under `tmp/`, or `null` when git cannot answer.
 *
 * `null` is a distinct outcome rather than an empty list, for the reason the
 * conflict-marker guard gives: a caller outside a repository would otherwise
 * get a clean run over nothing at all, which claims a result it never
 * established.
 */
export function trackedScratchFiles(cwd = process.cwd()) {
  let output;
  try {
    output = execFileSync("git", ["ls-files", "-z", "--", SCRATCH_PATHSPEC], {
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

export function run(cwd = process.cwd()) {
  const tracked = trackedScratchFiles(cwd);
  if (tracked === null) {
    console.error(
      `Could not list tracked files under ${SCRATCH_PREFIX} — is this a git repository?`,
    );
    return 2;
  }

  if (tracked.length > 0) {
    for (const file of tracked) console.error(`${file}: tracked under ${SCRATCH_PREFIX}`);
    console.error(
      `${SCRATCH_PREFIX} is the scratch area, and nothing there is committed. Run ` +
        `\`git rm --cached <path>\` and delete the file, or move it to where its kind ` +
        `of content belongs.`,
    );
    return 1;
  }

  console.log(`No tracked files under ${SCRATCH_PREFIX}.`);
  return 0;
}

// `pathToFileURL`, not `file://` + the path: on Windows `process.argv[1]` is a
// drive-letter path with backslashes, which concatenation turns into a string no
// `import.meta.url` ever equals. The guard then never fires, the lane exits 0
// having scanned nothing, and a run that never looked reads as a run that passed.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run());
}
