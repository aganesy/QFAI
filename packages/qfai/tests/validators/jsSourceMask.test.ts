/**
 * `maskJsNonCode` is the lexer `testTodoStubs.ts` puts in front of its JS/TS
 * pattern so a construct written as fixture data or spelled out in a comment
 * is not reported as a parked test.
 *
 * Two properties everything downstream depends on are pinned here: the mask
 * preserves offsets and line breaks (the line a finding carries is derived
 * from the match offset in the masked text), and it only ever *removes* — it
 * introduces no character other than a space, so it cannot invent a match.
 */

import { describe, expect, it } from "vitest";

import { maskJsNonCode } from "../../src/core/validators/jsSourceMask.js";

/** Split at the source level, as the stub suites do: this file is scanned too. */
const SKIP = ".skip";

const lines = (...rows: string[]): string => rows.join("\n");

/**
 * `source` with each named span replaced by as many spaces, which is exactly
 * what the mask is supposed to return — written out rather than counted, so
 * the expectation says which span was blanked instead of how wide it was.
 */
const blanked = (source: string, ...spans: string[]): string =>
  spans.reduce((acc, span) => acc.replace(span, " ".repeat(span.length)), source);

describe("maskJsNonCode", () => {
  it("keeps length and line breaks so offsets still name the right line", () => {
    const source = lines("// header", "const a = 1;", "/* two", "   lines */", "const b = 2;", "");
    const masked = maskJsNonCode(source);
    expect(masked).toHaveLength(source.length);
    expect(masked.split("\n")).toHaveLength(source.split("\n").length);
  });

  it("introduces no character other than a space", () => {
    const source = lines(`const s = "it${SKIP}(x)";`, "// and a comment", "");
    const masked = maskJsNonCode(source);
    for (let i = 0; i < source.length; i += 1) {
      const before = source[i];
      const after = masked[i];
      expect(after === before || after === " ").toBe(true);
    }
  });

  it("blanks a line comment, leaving the code around it", () => {
    const comment = `// describe${SKIP}("example");`;
    const source = lines(comment, "const kept = 1;", "");
    expect(maskJsNonCode(source)).toBe(blanked(source, comment));
  });

  it("blanks a block comment across lines without eating the newlines", () => {
    const source = lines("/*", ` * it${SKIP}("documented");`, " */", "const kept = 1;", "");
    // Blanked one row at a time on purpose: the newlines between them are the
    // thing under test, and they must come through untouched.
    const rows = ["/*", ` * it${SKIP}("documented");`, " */"];
    expect(maskJsNonCode(source)).toBe(blanked(source, ...rows));
    expect(maskJsNonCode(source)).toContain("const kept = 1;");
  });

  it("blanks quoted strings, honouring an escaped quote", () => {
    const source = `const s = "a\\"b" + 'c';\n`;
    expect(maskJsNonCode(source)).toBe(blanked(source, `"a\\"b"`, "'c'"));
  });

  it("stops an unterminated quote at the newline instead of the file", () => {
    // A stray quote — inside a construct this lexer misreads, say — must cost
    // one line, never the rest of the scan.
    const stub = `it${SKIP}("still seen", () => {});`;
    const source = lines("const broken = 'oops;", stub, "");
    expect(maskJsNonCode(source).split("\n")[1]).toBe(blanked(stub, `"still seen"`));
  });

  it("blanks a template literal, substitutions and all", () => {
    const template = "`a${it" + SKIP + "(x)}b`";
    const source = `const t = ${template};\n`;
    expect(maskJsNonCode(source)).toBe(blanked(source, template));
  });

  it("blanks a regex literal but leaves a division alone", () => {
    const literal = `/it${SKIP}(pending)/`;
    const source = lines(`const re = ${literal};`, "const half = total / 2 / rest;", "");
    const masked = maskJsNonCode(source);
    expect(masked.split("\n")[0]).toBe(blanked(`const re = ${literal};`, literal));
    expect(masked.split("\n")[1]).toBe("const half = total / 2 / rest;");
  });

  it("does not let a regex literal holding a quote swallow the next line", () => {
    // The bound that makes the regex-vs-division heuristic safe to get wrong:
    // a regex literal cannot carry a newline, so neither can this misread.
    const stub = `it${SKIP}("still seen", () => {});`;
    const source = lines("const q = /['\"`]/;", stub, "");
    expect(maskJsNonCode(source).split("\n")[1]).toBe(blanked(stub, `"still seen"`));
  });
});
