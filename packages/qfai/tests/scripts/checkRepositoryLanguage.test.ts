/**
 * `scripts/check-repository-language.mjs` holds every tracked text file to
 * English.
 *
 * Forbidden samples use Unicode escapes or numeric code points, so this file
 * stores none of the characters it tests for.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { findNonEnglish } from "../../../../scripts/check-repository-language.mjs";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCRIPT = path.join(repoRoot, "scripts", "check-repository-language.mjs");

describe("findNonEnglish", () => {
  it.each([
    ["Han", "\u{4E2D}"],
    ["Hiragana", "\u{3042}"],
    ["Katakana", "\u{30AB}"],
    ["Hangul", "\u{D55C}"],
    ["Cyrillic", "\u{0416}"],
    ["Arabic", "\u{0627}"],
    ["Hebrew", "\u{05D0}"],
    ["Thai", "\u{0E01}"],
    ["Devanagari", "\u{0905}"],
    ["CJK Symbols and Punctuation", "\u{3000}"],
    ["CJK Symbols and Punctuation", "\u{3002}"],
    ["Halfwidth and Fullwidth Forms", "\u{FF21}"],
    ["Halfwidth and Fullwidth Forms", "\u{FF71}"],
  ])("flags %s", (script, sample) => {
    const [finding] = findNonEnglish(`a${sample}b`);
    expect(finding?.script).toBe(script);
    expect(finding?.column).toBe(2);
  });

  it("names the code point in U+XXXX form", () => {
    expect(findNonEnglish("\u{4E2D}")).toEqual([
      { line: 1, column: 1, codePoint: "U+4E2D", script: "Han" },
    ]);
  });

  it("allows Latin diacritics, Greek, arrows, box drawing and dashes", () => {
    const allowed = "caf\u{00E9} na\u{00EF}ve \u{03B1}\u{03B2} \u{2192} \u{2500} \u{2014} \u{2013}";
    expect(findNonEnglish(allowed)).toEqual([]);
  });

  it("allows a middle dot, which a script extension would otherwise name as Han", () => {
    expect(findNonEnglish("alpha \u{00B7} beta")).toEqual([]);
  });

  it("still flags Han that sits next to a middle dot", () => {
    expect(findNonEnglish("a\u{00B7}\u{4E2D}")).toEqual([
      { line: 1, column: 3, codePoint: "U+4E2D", script: "Han" },
    ]);
  });

  it("reports line and column, counting an astral character once", () => {
    const text = "first\r\nsecond \u{20BB7}\u{3042}\nthird";
    expect(findNonEnglish(text)).toEqual([
      { line: 2, column: 8, codePoint: "U+20BB7", script: "Han" },
      { line: 2, column: 9, codePoint: "U+3042", script: "Hiragana" },
    ]);
  });
});

describe("check-repository-language.mjs", () => {
  it("passes over this repository", () => {
    const child = spawnSync("node", [SCRIPT], { cwd: repoRoot, encoding: "utf-8" });
    expect(child.stderr).toBe("");
    expect(child.status).toBe(0);
  });

  it.each([
    { name: "a fullwidth question mark", codePoint: 0xff1f, code: "U+FF1F" },
    { name: "an astral Han character", codePoint: 0x20bb7, code: "U+20BB7" },
  ])(
    "gives an ASCII repair for $name while rejecting its stored literal",
    ({ name, codePoint, code }) => {
      const root = mkdtempSync(path.join(os.tmpdir(), "repository-language-repair-"));
      const fixture = path.join(root, "fixture.js");
      try {
        execFileSync("git", ["init", "-q", root]);
        writeFileSync(
          fixture,
          `// A fixture for ${name}.\nconst sample = "${String.fromCodePoint(codePoint)}";\n`,
        );
        execFileSync("git", ["add", "--", "fixture.js"], { cwd: root });

        const rejected = spawnSync("node", [SCRIPT], { cwd: root, encoding: "utf-8" });
        expect(rejected.status).toBe(1);
        expect(rejected.stderr).toContain(code);
        expect(rejected.stderr).toContain("String.fromCodePoint(0xFF1F)");
        expect(rejected.stderr).toMatch(/if[^\n]*edit[^\n]*decod[^\n]*escapes?/i);

        const hexadecimal = codePoint.toString(16).toUpperCase();
        writeFileSync(
          fixture,
          `// A fixture for ${name}.\nconst sample = String.fromCodePoint(0x${hexadecimal});\n`,
        );
        const repaired = spawnSync("node", [SCRIPT], { cwd: root, encoding: "utf-8" });
        expect(repaired.status).toBe(0);
        expect(repaired.stderr).toBe("");
        expect(repaired.stdout).toContain("No non-English characters found (1 tracked paths).");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
});
