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
 * Exit codes: 0 clean, 1 markers found, 2 the file list could not be read.
 */
/* global console, process */
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";

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

/** Extensions whose fenced blocks hold examples rather than content. */
const fencedExtensions = new Set([".md", ".markdown"]);

/**
 * Every tracked path, or `null` when git cannot answer.
 *
 * `null` is a distinct outcome rather than an empty list: a caller outside a
 * repository would otherwise get a clean run over nothing at all, which claims
 * a result this never established.
 */
export function trackedFiles(cwd = process.cwd()) {
  try {
    return execFileSync("git", ["ls-files", "-z"], {
      cwd,
      encoding: "buffer",
      maxBuffer: 64 * 1024 * 1024,
    })
      .toString("utf-8")
      .split("\0")
      .filter((entry) => entry !== "");
  } catch {
    return null;
  }
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

/** Whether this entry is a regular file this should read. */
function isScannableEntry(absolute) {
  let info;
  try {
    info = lstatSync(absolute);
  } catch {
    return false;
  }
  return info.isFile() && !binaryExtensions.has(path.extname(absolute).toLowerCase());
}

/** Runs the scan over `cwd` and returns the process exit code. */
export function run(cwd = process.cwd()) {
  const tracked = trackedFiles(cwd);
  if (tracked === null) {
    console.error("check-conflict-markers: `git ls-files` produced no list; nothing was scanned.");
    return 2;
  }

  const findings = [];
  let scanned = 0;
  for (const relative of tracked) {
    const absolute = path.join(cwd, relative);
    if (!isScannableEntry(absolute)) {
      continue;
    }
    let text;
    try {
      text = readFileSync(absolute, "utf-8");
    } catch {
      continue;
    }
    scanned += 1;
    const fenced = fencedExtensions.has(path.extname(relative).toLowerCase());
    for (const hit of markersIn(text, { fenced })) {
      findings.push({ file: relative, ...hit });
    }
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
    return 1;
  }

  console.log(`No conflict markers found (${String(scanned)} tracked text files).`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(run());
}
