/**
 * A merge-conflict marker left in a tracked file.
 *
 * Nothing else asks this question, and the gap is not theoretical: an evidence
 * document reached the default branch carrying a `=======` separator, a
 * superseded line and a `>>>>>>>` marker, and every lane stayed green.
 *
 * Each lane passed for its own reason, and none of them is wrong:
 *
 * - `lint:md` reads `=======` as a setext heading underline and `>>>>>>> ref`
 *   as a paragraph, both of which are valid Markdown.
 * - `lint:mdschema` covers spec packs and `_policies`; evidence is not in the
 *   manifest.
 * - `format:check` reformats the markers rather than rejecting them.
 * - The guard that reads the figure in that paragraph takes the first matching
 *   line and stops, so it never saw the second.
 *
 * The failure mode is silence, and it lands in the artifacts nobody re-reads:
 * evidence documents, changelogs, generated records. A marker in source would
 * break a build. A marker in prose survives and leaves two contradictory
 * statements where a reader expects one.
 *
 * ## What counts as a marker
 *
 * A line that starts with seven `<`, `=` or `>` and is either exactly that or
 * followed by a space. Git writes `<<<<<<< ours`, `=======`, `>>>>>>> theirs`
 * and, for a diff3 merge, `||||||| base`. Requiring the boundary is what keeps
 * a row of eight equals signs used as a rule, or `>>>>>>>>` in ASCII art, from
 * being a finding.
 *
 * ## Fenced blocks are skipped
 *
 * A document explaining conflict resolution shows markers on purpose, and this
 * one does. Inside a fence they are an example; outside one they are a defect.
 * The fence scan is Markdown-only and tracks its own opening length, so a fence
 * nested in a longer one closes at the right place.
 *
 * Usage:
 *   node scripts/check-conflict-markers.mjs
 *
 * Exit codes: 0 clean, 1 markers found, 2 the scan is incomplete (the file
 * list, or a tracked file that is present, could not be read). A path deleted
 * between listing and reading, or one that is not a regular file, is skipped.
 */
/* global console, process */
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { trackedFiles } from "./lib/tracked-files.mjs";

/** Seven of one marker character, then a space or the end of the line. */
const MARKER_RE = /^(?:<{7}|={7}|>{7}|\|{7})(?: |$)/;

/** A fence opener or closer: three or more backticks or tildes. */
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/;

/** Extensions whose bytes are not text, so a marker in them means nothing. */
const binaryExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".webp",
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".zip",
  ".gz",
  ".tgz",
  ".mp4",
  ".webm",
  ".wasm",
]);

/**
 * Whether a path's bytes are read as text: every extension but the binary
 * ones above, compared lowercased.
 */
export function readsText(relative) {
  return !binaryExtensions.has(path.extname(relative).toLowerCase());
}

/** Extensions whose fenced blocks hold examples rather than content. */
const fencedExtensions = new Set([".md", ".markdown"]);

/**
 * Whether `markersIn` skips fenced blocks for this path: a Markdown file's fence
 * holds an example, and a fence means nothing in any other file.
 */
export function readsFences(relative) {
  return fencedExtensions.has(path.extname(relative).toLowerCase());
}

/**
 * The marker lines in one text, as `{ line, text }`, one-based.
 *
 * `fenced` says whether fenced blocks are skipped. It follows the file's
 * extension rather than being decided here: a fence means nothing in a `.ts`
 * file, and a marker inside a template literal there is still a defect.
 */
export function markersIn(text, { fenced = false } = {}) {
  const hits = [];
  let openFence = null;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (fenced) {
      const fence = FENCE_RE.exec(line)?.[1];
      if (fence !== undefined) {
        if (openFence === null) {
          openFence =
            fence[0] === "`"
              ? { char: "`", length: fence.length }
              : { char: "~", length: fence.length };
        } else if (fence[0] === openFence.char && fence.length >= openFence.length) {
          openFence = null;
        }
        continue;
      }
      if (openFence !== null) {
        continue;
      }
    }
    if (MARKER_RE.test(line)) {
      hits.push({ line: i + 1, text: line });
    }
  }
  return hits;
}

/**
 * Error codes that mean the entry is not there to read, or is not a regular
 * file: a path deleted between `git ls-files` and the read, a parent directory
 * replaced by a file, a file replaced by a directory. Skipping these claims
 * nothing about content the working tree holds. Any other failure (access,
 * I/O) leaves content unread, so the scan is incomplete.
 */
const ABSENT_CODES = new Set(["ENOENT", "ENOTDIR", "EISDIR"]);

/** Whether a thrown error says the entry is absent or not a regular file. */
function isAbsent(cause) {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    ABSENT_CODES.has(String(cause.code))
  );
}

/** A short reason for an unreadable entry: its error code, else its message. */
function reasonOf(cause) {
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    return String(cause.code);
  }
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Runs the scan over `cwd` and returns the process exit code.
 *
 * `lstat` and `read` default to node:fs and are parameters so a test can make
 * one path fail the way a locked or damaged file does on any platform.
 *
 * @param {string} [cwd]
 * @param {{ lstat?: (absolute: string) => { isFile(): boolean }, read?: (absolute: string) => string }} [options]
 */
export function run(
  cwd = process.cwd(),
  { lstat = lstatSync, read = (absolute) => readFileSync(absolute, "utf-8") } = {},
) {
  const tracked = trackedFiles(cwd);
  if (tracked === null) {
    console.error("check-conflict-markers: `git ls-files` produced no list; nothing was scanned.");
    return 2;
  }

  const findings = [];
  const unreadable = [];
  let scanned = 0;
  for (const relative of tracked) {
    const absolute = path.join(cwd, relative);
    let text;
    try {
      if (!lstat(absolute).isFile() || !readsText(absolute)) {
        continue;
      }
      text = read(absolute);
    } catch (cause) {
      if (!isAbsent(cause)) {
        unreadable.push({ file: relative, reason: reasonOf(cause) });
      }
      continue;
    }
    scanned += 1;
    for (const hit of markersIn(text, { fenced: readsFences(relative) })) {
      findings.push({ file: relative, ...hit });
    }
  }

  for (const entry of unreadable) {
    console.error(`${entry.file}: could not be read (${entry.reason})`);
  }

  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`${finding.file}:${finding.line}: ${finding.text}`);
    }
    console.error(
      "A conflict marker in a tracked file leaves two contradictory statements " +
        "where a reader expects one, and no other lane rejects it. Resolve the " +
        "block: keep the side that is true and delete the markers with it.",
    );
  }

  if (unreadable.length > 0) {
    console.error(
      `check-conflict-markers: the scan is incomplete; ${String(unreadable.length)} tracked ` +
        "file(s) above could not be read, so a clean result would claim content nobody inspected.",
    );
    return 2;
  }

  if (findings.length > 0) {
    return 1;
  }

  console.log(`No conflict markers found (${String(scanned)} tracked text files).`);
  return 0;
}

// `pathToFileURL`, not `file://` + the path: on Windows `process.argv[1]` is a
// drive-letter path with backslashes, which concatenation turns into a string no
// `import.meta.url` ever equals. The guard then never fires, the lane exits 0
// having scanned nothing, and a run that never looked reads as a run that passed.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run());
}
