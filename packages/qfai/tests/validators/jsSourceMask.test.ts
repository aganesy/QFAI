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

  // ── the rule this function did not have, and the one it must not lose ──────
  //
  // #1154: this file and `atddTraceability.ts` each blanked JS literals, through two
  // implementations, and only the other one knew that a `)` closing a control statement's header
  // does not end a value. Two green branches composed into a real miss — a file holding a live
  // `it(` reported as an annotation-only carrier — because the reader wired to THIS function had
  // the older rule. The rule is here now and the other implementation is gone; these rows are
  // what stop it from being here in name only.

  it("reads a regex after a control statement's header as a literal, not as division", () => {
    // The failure in full: read as division, the backtick INSIDE the regex opens a template
    // literal, which spans lines — so the declaration two lines down is blanked and the file
    // reports as carrying no test at all.
    const stub = `it${SKIP}("still seen", () => {});`;
    const source = lines("if (enabled) /^\\s*```/.test(value);", stub, "");
    const masked = maskJsNonCode(source);
    expect(masked.split("\n")[0]).toBe(
      blanked("if (enabled) /^\\s*```/.test(value);", "/^\\s*```/"),
    );
    expect(
      masked.split("\n")[1],
      "and the line below it survives, which is the whole point of getting line one right",
    ).toBe(blanked(stub, `"still seen"`));
  });

  it("still divides after a call, which is the case the control rule must not swallow", () => {
    const source = "const rate = total(items) / count(items);";
    expect(
      maskJsNonCode(source),
      "`)` ending a CALL closes a value; only a control header does not",
      // Unchanged: nothing here is a literal, so a mask that blanked anything read a division as
      // a regex — the mistake in the opposite direction, and the one that hides real code.
    ).toBe(source);
  });

  it("pairs each `)` with its own `(`, so a nested call inside a header does not shift the rule", () => {
    const source = "if (allow(a, b)) /x/.test(c);";
    expect(
      maskJsNonCode(source),
      "the inner `)` closes a call and the outer one closes the header; a reader that matched " +
        "them the other way round would read `/x/` as division",
    ).toBe(blanked(source, "/x/"));
  });

  it("consumes a regex literal's flags, so they are not read as an identifier", () => {
    const source = "const re = /a/gi;";
    expect(
      maskJsNonCode(source),
      "flags left behind are read as a word, and a word sets the regex-vs-division state from " +
        "the keyword set — so a flag string spelling one would flip the next `/`",
    ).toBe(blanked(source, "/a/gi"));
  });
});

// ── the language dimension, which is why there are options and not one rule ───
//
// The merged tokenizer serves two callers with different alphabets: the ATDD carrier scan walks
// whatever a project puts under its test roots (Python, Ruby, Gherkin), and the annotation scan is
// gated to JS extensions. `#` is a comment in one and a private field in the other, so it cannot
// be a fixed rule — it is the option, and these rows pin both of its answers.
describe("maskJsNonCode: the multi-language spans", () => {
  it("leaves `#` alone by default, because in JavaScript it opens a private field", () => {
    const source = lines("class C { #count = 0; bump() { this.#count += 1; } }", "");
    expect(
      maskJsNonCode(source),
      "a hash-comment rule applied to JS loses the rest of every line holding a private field",
    ).toBe(source);
  });

  it("blanks a `#` comment when asked, and never a Rust attribute", () => {
    // `#[test]` is LOAD-BEARING: it is the pattern the carrier scan uses to recognise a Rust
    // test, so a hash rule that ate it would report every Rust suite as declaring nothing.
    const source = lines("#[test]", "fn works() {}", "value = 1  # trailing note", "");
    const masked = maskJsNonCode(source, { hashComments: true });
    expect(masked.split("\n")[0], "`#[test]` is a declaration, not a comment").toBe("#[test]");
    expect(masked.split("\n")[2]).toBe(blanked("value = 1  # trailing note", "# trailing note"));
  });

  it("keeps a `#` comment inside its own line", () => {
    // The bound that makes the hash rule safe: a `#` comment ends at the newline, so a `#` the
    // lexer misreads costs one line and never the declaration below it.
    const stub = "def test_still_seen(): pass";
    const source = lines("value = 1  # note about test_hidden()", stub, "");
    expect(maskJsNonCode(source, { hashComments: true }).split("\n")[1]).toBe(stub);
  });

  it("blanks a docstring whole when asked, rather than as three empty strings", () => {
    const stub = `def test_still_seen():`;
    const source = lines('"""', "def test_hidden(): pass", '"""', stub, "");
    const masked = maskJsNonCode(source, { tripleQuoted: true });
    expect(
      masked.split("\n")[1],
      "read as three empty strings, the docstring's body stays code — and a prose carrier " +
        "quoting a test declaration reports as executable",
    ).toBe(" ".repeat("def test_hidden(): pass".length));
    expect(masked.split("\n")[3], "and the real declaration after it survives").toBe(stub);
  });

  it("will not let a triple quote cross a line when not asked", () => {
    // Off by default, and this is the difference that matters rather than how one line lexes.
    // JavaScript has no docstring, so `"""` there is ordinary quoting and every quoted span
    // stops at the newline — a stray one costs its own line. Turned on, the same three
    // characters open a span that runs to the closing fence, which is what the row above wants
    // and what this row must not silently inherit.
    const stub = `it${SKIP}("still seen", () => {});`;
    const source = lines('const marker = """;', stub, "");
    expect(maskJsNonCode(source).split("\n")[1]).toBe(blanked(stub, `"still seen"`));
  });
});
