/**
 * The shipped assistant tree and the shipped root rules state obligations in
 * plain words. A capitalised `MANDATORY`, `CRITICAL` or `MUST` is kept only
 * where a validator, a gate or a test reads the exact phrase, and each of
 * those is named in `emphasisWords.allowlist.ts`.
 *
 * The allowlist is matched by phrase, not by count, so rewriting one kept
 * phrase frees no room for a new capitalised word elsewhere in the file.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { KEPT_EMPHASIS, type KeptEmphasis } from "./emphasisWords.allowlist.js";

// tests/assets/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const initRoot = path.join(packageRoot, "assets", "init");

/** The shipped surfaces this guard reads, relative to `assets/init/`. */
const SCANNED_ROOTS = [".qfai/assistant", "root/.agents/rules"];

const EMPHASIS_WORD = /\b(?:MANDATORY|CRITICAL|MUST)\b/g;

const collapse = (text: string): string => text.replace(/\s+/g, " ");

interface FileVerdict {
  /** Capitalised words no entry covers, as `<path>: …<context>…`. */
  readonly uncovered: string[];
  /** Entries whose phrase the file no longer holds. */
  readonly stale: string[];
}

/**
 * Match one file's capitalised words against the entries it may keep. Each
 * entry covers the words inside one occurrence of its phrase; a second
 * occurrence needs a second entry.
 */
function checkFile(relPath: string, content: string, kept: readonly KeptEmphasis[]): FileVerdict {
  const text = collapse(content);
  const covered = new Set<number>();
  const stale: string[] = [];
  const nextSearchFrom = new Map<string, number>();

  for (const entry of kept) {
    const phrase = collapse(entry.phrase);
    const at = text.indexOf(phrase, nextSearchFrom.get(phrase) ?? 0);
    if (at === -1) {
      stale.push(`${relPath}: ${entry.phrase}`);
      continue;
    }
    nextSearchFrom.set(phrase, at + phrase.length);
    for (const match of phrase.matchAll(EMPHASIS_WORD)) {
      covered.add(at + match.index);
    }
  }

  const uncovered: string[] = [];
  for (const match of text.matchAll(EMPHASIS_WORD)) {
    if (!covered.has(match.index)) {
      const context = text.slice(Math.max(0, match.index - 40), match.index + 40);
      uncovered.push(`${relPath}: …${context}…`);
    }
  }
  return { uncovered, stale };
}

async function shippedFiles(): Promise<string[]> {
  const files = await fg(
    SCANNED_ROOTS.map((root) => `${root}/**/*`),
    {
      cwd: initRoot,
      dot: true,
      onlyFiles: true,
    },
  );
  return files.sort();
}

describe("capitalised emphasis in the shipped assistant tree and root rules", () => {
  it("keeps a capitalised word only where the allowlist names its phrase", async () => {
    const files = await shippedFiles();
    expect(files.length).toBeGreaterThan(0);

    const uncovered: string[] = [];
    const stale: string[] = [];
    for (const relPath of files) {
      const content = await readFile(path.join(initRoot, relPath), "utf-8");
      const verdict = checkFile(relPath, content, KEPT_EMPHASIS[relPath] ?? []);
      uncovered.push(...verdict.uncovered);
      stale.push(...verdict.stale);
    }

    expect(
      uncovered,
      "State the obligation in plain words: an imperative, or a lowercase must. " +
        "Capitals stay only where a validator, gate or test reads the phrase.",
    ).toEqual([]);
    expect(stale, "allowlist entries whose phrase is gone — delete them").toEqual([]);
  });

  it("names only files that exist on the scanned surface", async () => {
    const files = new Set(await shippedFiles());
    expect(Object.keys(KEPT_EMPHASIS).filter((relPath) => !files.has(relPath))).toEqual([]);
  });

  it("names a reader that exists for every kept phrase", () => {
    const missing = Object.entries(KEPT_EMPHASIS).flatMap(([relPath, entries]) =>
      entries
        .filter((entry) => !existsSync(path.join(packageRoot, entry.readBy)))
        .map((entry) => `${relPath}: ${entry.phrase} (read by ${entry.readBy})`),
    );
    expect(missing).toEqual([]);
  });

  it("holds exactly one capitalised word in every kept phrase", () => {
    // An entry covering two words would let one reader's phrase carry a
    // second, unread word through the guard.
    const offenders = Object.entries(KEPT_EMPHASIS).flatMap(([relPath, entries]) =>
      entries
        .filter((entry) => [...entry.phrase.matchAll(EMPHASIS_WORD)].length !== 1)
        .map((entry) => `${relPath}: ${entry.phrase}`),
    );
    expect(offenders).toEqual([]);
  });

  it("reports a capitalised word no entry covers, and an entry whose phrase is gone", () => {
    // The positive control: every case above passes when the scan finds
    // nothing, so a scan that never matched would pass any tree.
    const verdict = checkFile("sample.md", "## Evidence (MANDATORY)\n\nYou MUST write it.\n", [
      { phrase: "## Evidence (MANDATORY)", readBy: "unused" },
      { phrase: "gone MUST", readBy: "unused" },
    ]);

    expect(verdict.uncovered).toEqual(["sample.md: …## Evidence (MANDATORY) You MUST write it. …"]);
    expect(verdict.stale).toEqual(["sample.md: gone MUST"]);
  });

  it("needs a second entry for a second occurrence of the same phrase", () => {
    const verdict = checkFile("sample.md", "[X:MANDATORY]\n[X:MANDATORY]\n", [
      { phrase: "[X:MANDATORY]", readBy: "unused" },
    ]);

    expect(verdict.uncovered).toHaveLength(1);
    expect(verdict.stale).toEqual([]);
  });

  it("reads a lowercase must as plain wording", () => {
    expect(checkFile("sample.md", "You must write it.\n", []).uncovered).toEqual([]);
  });

  it("reads the marker every skill carries as plain wording at a path no entry names", () => {
    // The marker is required of every skill by the runtime validator, so a
    // skill at a new path must pass this guard without an entry of its own.
    const verdict = checkFile(
      ".qfai/assistant/skill/qfai-new/SKILL.md",
      "## qfai-new\n\n[DRIFT-PROTOCOL:REQUIRED]\n",
      [],
    );

    expect(verdict.uncovered).toEqual([]);
  });
});
