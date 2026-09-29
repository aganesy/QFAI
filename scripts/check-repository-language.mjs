/**
 * Every tracked text file is written in English.
 *
 * `.agents/rules/repository-language.md` states the rule. This guard holds it
 * for the whole repository: it lists the tracked files with `git ls-files` and
 * reports each line that carries a character from a script other than Latin.
 * There is no allowlist and no exempt file, so a count that reaches zero stays
 * there.
 *
 * Forbidden: Han, Hiragana, Katakana, Hangul, Cyrillic, Arabic, Hebrew, Thai
 * and Devanagari letters, the CJK Symbols and Punctuation block, and the
 * Halfwidth and Fullwidth Forms block. Latin letters with diacritics, Greek,
 * arrows, box-drawing characters and dashes stay allowed.
 *
 * Where behaviour needs a non-English literal, write it as `\uXXXX` escapes
 * beside an English comment saying what it is.
 *
 * Skipped without a verdict: symlinks, files holding a NUL byte, and files that
 * are not valid UTF-8. None of them is text a reader could write in a language.
 *
 * Usage:
 *   node scripts/check-repository-language.mjs
 *
 * Exit codes: 0 clean, 1 a forbidden character found, 2 the file list could not
 * be read.
 */
/* global console, process, TextDecoder */
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * The forbidden classes, checked in order. A block comes before the scripts so
 * an ideographic space or a fullwidth digit is named for its block.
 */
const FORBIDDEN_CLASSES = [
  ["CJK Symbols and Punctuation", /[\u{3000}-\u{303F}]/u],
  ["Halfwidth and Fullwidth Forms", /[\u{FF00}-\u{FFEF}]/u],
  ["Han", /\p{Script_Extensions=Han}/u],
  ["Hiragana", /\p{Script_Extensions=Hiragana}/u],
  ["Katakana", /\p{Script_Extensions=Katakana}/u],
  ["Hangul", /\p{Script_Extensions=Hangul}/u],
  ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Arabic", /\p{Script=Arabic}/u],
  ["Hebrew", /\p{Script=Hebrew}/u],
  ["Thai", /\p{Script=Thai}/u],
  ["Devanagari", /\p{Script=Devanagari}/u],
];

/** The script or block name of a forbidden character, or `null` when it is allowed. */
function classify(character) {
  for (const [name, pattern] of FORBIDDEN_CLASSES) {
    if (pattern.test(character)) return name;
  }
  return null;
}

/**
 * Every forbidden character in `text`, in reading order.
 *
 * Line and column are 1-based; the column counts characters, so an astral
 * character advances it by one.
 */
export function findNonEnglish(text) {
  const findings = [];
  const lines = text.split(/\r\n|\n|\r/);
  for (let index = 0; index < lines.length; index++) {
    let column = 0;
    for (const character of lines[index]) {
      column += 1;
      const script = classify(character);
      if (script === null) continue;
      const code = character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
      findings.push({ line: index + 1, column, codePoint: `U+${code}`, script });
    }
  }
  return findings;
}

/** Tracked paths, or `null` when git cannot answer. */
function trackedFiles(cwd) {
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

/** The file's text, or `null` for a non-file, a binary file or invalid UTF-8. */
function readText(absolute) {
  let info;
  try {
    info = lstatSync(absolute);
  } catch {
    return null;
  }
  if (!info.isFile()) return null;
  const bytes = readFileSync(absolute);
  if (bytes.includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function run(cwd = process.cwd()) {
  const tracked = trackedFiles(cwd);
  if (tracked === null) {
    console.error("Could not list tracked files: is this a git repository?");
    return 2;
  }

  let total = 0;
  for (const relative of tracked) {
    const text = readText(path.resolve(cwd, relative));
    if (text === null) continue;
    for (const finding of findNonEnglish(text)) {
      total += 1;
      console.error(
        `${relative}:${finding.line}:${finding.column}: ${finding.codePoint} ${finding.script}`,
      );
    }
  }

  if (total > 0) {
    console.error(
      "This repository is written in English. Write it in English; where behaviour " +
        "needs the literal, write it as \\uXXXX escapes with an English comment.",
    );
    return 1;
  }

  console.log(`No non-English characters found (${tracked.length} tracked paths).`);
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run());
}
