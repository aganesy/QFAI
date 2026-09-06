/**
 * Characters a reviewer cannot see, rejected before they reach a diff.
 *
 * Two scans over two file sets, because the two hazards are not the same size.
 *
 * 1. BIDI OVERRIDES AND BOM, over the six documents below. These reorder how a
 *    line RENDERS, so a reader and a compiler disagree about the same bytes.
 *    The set stays explicit: the tree carries U+FEFF in two files today, and
 *    widening this scan is a judgement about those, not a free extension.
 *
 * 2. NUL AND C0 CONTROLS, over every tracked file. These do not reorder
 *    anything; they hide inside a token and are drawn as nothing, or as the
 *    space they replaced.
 *
 * The second scan exists because the first class of guard cannot catch the
 * second. `instructionLanguageRules.ts` shipped with a NUL where a separator
 * space belonged, in a Map key AND in the expression that looked it up — so
 * the two agreed, and `tsc`, `eslint`, `prettier` (which reformatted the file
 * and left it), and all thirteen of the module's own tests were green. No test
 * could have found it: self-consistent corruption has no input that
 * distinguishes it from the correct program. It surfaced because `grep`
 * answered `Binary file ... matches`, which is luck, not a lane.
 *
 * That is also why the byte, not the rendering, is what is checked. One NUL
 * makes a file binary to every text tool in the repository: `git diff` says
 * `Binary files differ`, ripgrep prints a one-line notice, and a scanner that
 * reads text either skips the file or stops at the NUL. A single byte can take
 * a file out of the reach of every other guard here, the leakage scan
 * included.
 *
 * DEL (0x7f) is rejected beside the C0 block. It is not C0, but it is the same
 * hazard — invisible in a diff, legal inside a string literal.
 */
/* global console */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, lstatSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const targets = [
  "README.md",
  "packages/qfai/README.md",
  "CHANGELOG.md",
  "RELEASE.md",
  "package.json",
  "packages/qfai/package.json",
];

const bidiRanges = [
  [0x202a, 0x202e],
  [0x2066, 0x2069],
];

const bidiSingles = new Set([0x200e, 0x200f, 0x061c]);
const bomCode = 0xfeff;

/**
 * The three C0 bytes a text file is allowed to carry: TAB, LF, CR.
 *
 * Everything else below 0x20 is rejected, including form feed (0x0c) and
 * vertical tab (0x0b). Both have a historical claim to being page structure;
 * neither appears in this tree, and a file that needs one can say so in a
 * review rather than arriving unannounced.
 */
const allowedControlBytes = new Set([0x09, 0x0a, 0x0d]);
const deleteByte = 0x7f;

/**
 * Extensions read as bytes rather than text.
 *
 * Empty of anything this repository tracks today — every tracked file is text.
 * It is a DENY list rather than an allow list of text extensions on purpose:
 * an unlisted new binary type fails the lane and is added here, which a
 * reviewer sees, while an unlisted new TEXT type under an allow list would go
 * silently unscanned, which nobody sees.
 */
const binaryExtensions = new Set([
  ".avif",
  ".bmp",
  ".br",
  ".class",
  ".dll",
  ".dylib",
  ".eot",
  ".exe",
  ".gif",
  ".gz",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".mp3",
  ".mp4",
  ".node",
  ".otf",
  ".pdf",
  ".png",
  ".so",
  ".svgz",
  ".tar",
  ".ttf",
  ".wasm",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
  ".7z",
]);

const hits = [];

function isBidiCode(code) {
  if (bidiSingles.has(code)) {
    return true;
  }
  return bidiRanges.some(([start, end]) => code >= start && code <= end);
}

function classifyCode(code) {
  if (code === bomCode) {
    return "bom";
  }
  if (isBidiCode(code)) {
    return "bidi";
  }
  return null;
}

for (const relative of targets) {
  const filePath = path.resolve(relative);
  if (!existsSync(filePath)) {
    continue;
  }
  const text = readFileSync(filePath, "utf-8");
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const kind = classifyCode(code);
    if (kind) {
      hits.push({
        file: relative,
        index: i,
        kind,
        code: `U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
      });
    }
  }
}

/**
 * The tracked files, from git rather than from a walk.
 *
 * `-z` because a path may carry a newline, and git quotes such a path in the
 * default output — a quoted path does not open. A checkout is not guaranteed
 * (a tarball, a vendored copy), and there the scan reports nothing rather than
 * failing: the lane it runs in has a repository, and a caller that does not is
 * not the case this defends.
 */
function trackedFiles(cwd = process.cwd()) {
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
 * Whether this entry is a regular file whose bytes are text.
 *
 * `lstat`, not `stat`: the skill trees are directories reached through
 * symlinks (`.claude/skills/qfai-sdd` -> `.agents/skills/qfai-sdd`), and
 * following them would read a directory on one platform and scan the same
 * bytes several times on another. Every such target is tracked in its own
 * right, so nothing goes unscanned by skipping the links.
 */
function isScannableEntry(absolute) {
  let info;
  try {
    info = lstatSync(absolute);
  } catch {
    return false;
  }
  if (!info.isFile()) {
    return false;
  }
  return !binaryExtensions.has(path.extname(absolute).toLowerCase());
}

/** Where a byte offset falls, counted the way an editor counts. */
function locate(bytes, offset) {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset; i++) {
    if (bytes[i] === 0x0a) {
      line += 1;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

const tracked = trackedFiles();
for (const relative of tracked ?? []) {
  const absolute = path.resolve(relative);
  if (!isScannableEntry(absolute)) {
    continue;
  }
  const bytes = readFileSync(absolute);
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte >= 0x20 && byte !== deleteByte) {
      continue;
    }
    if (allowedControlBytes.has(byte)) {
      continue;
    }
    const { line, column } = locate(bytes, i);
    hits.push({
      file: relative,
      kind: "c0",
      // The byte, not a code point: a NUL is a NUL whatever the encoding, and
      // decoding first is what would have hidden it.
      code: `0x${byte.toString(16).padStart(2, "0")}`,
      where: `line ${line}, column ${column}`,
    });
  }
}

if (hits.length > 0) {
  for (const hit of hits) {
    const label = hit.kind === "bom" ? "BOM" : hit.kind === "c0" ? "control" : "bidi/control";
    const where = hit.where ?? `index ${hit.index}`;
    console.error(`${hit.file}: ${label} character ${hit.code} at ${where}`);
  }
  if (hits.some((hit) => hit.kind === "c0")) {
    console.error(
      "A control character is invisible in a diff and can make the whole file " +
        "binary to every text tool here. Replace it with the character it stands " +
        "in for (a space, a tab), or with its two-character escape if the value " +
        "is genuinely wanted.",
    );
  }
  process.exit(1);
}

console.log(
  tracked === null
    ? "No bidi/control/BOM characters found (no git checkout: the tracked-file scan was skipped)."
    : `No bidi/control/BOM characters found (${tracked.length} tracked paths).`,
);
