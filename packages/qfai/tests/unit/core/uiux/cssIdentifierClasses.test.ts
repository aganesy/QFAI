/**
 * The CSS identifier character classes end their non-ASCII range in an escape, not in a raw
 * U+FFFF that an editor or an encoding pass could change without any diff showing it.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { IDENT_CHAR_RE, IDENT_START_RE } from "../../../../src/core/uiux/cssUrlReferences.js";

describe("the CSS identifier character classes are written with escapes", () => {
  it("pins the identifier character class", () => {
    expect(IDENT_CHAR_RE.source).toBe(String.raw`^[a-z0-9_\u0080-\uFFFF-]$`);
    for (const char of ["a", "Z", "0", "_", "-", "\u0080", String.fromCharCode(0xffff)]) {
      expect(IDENT_CHAR_RE.test(char)).toBe(true);
    }
    for (const char of ["\u007F", " ", "(", "'", ""]) {
      expect(IDENT_CHAR_RE.test(char)).toBe(false);
    }
  });

  it("pins the identifier start class", () => {
    expect(IDENT_START_RE.source).toBe(String.raw`^[a-z_\u0080-\uFFFF-]$`);
    for (const char of ["a", "Z", "_", "-", "\u0080", String.fromCharCode(0xffff)]) {
      expect(IDENT_START_RE.test(char)).toBe(true);
    }
    for (const char of ["0", "\u007F", " ", "("]) {
      expect(IDENT_START_RE.test(char)).toBe(false);
    }
  });

  it("leaves no raw U+FFFF in the module source", async () => {
    const source = await readFile(
      fileURLToPath(new URL("../../../../src/core/uiux/cssUrlReferences.ts", import.meta.url)),
      "utf-8",
    );
    expect(source).not.toContain(String.fromCharCode(0xffff));
  });
});
