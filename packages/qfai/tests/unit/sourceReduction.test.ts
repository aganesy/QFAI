/**
 * The shared source reduction's own spec (#1089).
 *
 * Four guards used to hold four reductions of one rule, and all four were wrong
 * in different ways. These rows are the contract they now share, written as the
 * cases that broke each generation — so a fifth hand-rolled attempt has
 * something to fail against rather than a paragraph to read.
 *
 * Each row states which direction a wrong answer breaks, because the two
 * directions cost different things: prose leaking in makes a guard call
 * something present when it is absent, and real code being deleted makes it
 * call something absent when it is present.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { withoutComments, withoutCommentsOrLiterals } from "../helpers/sourceReduction.js";

const SRC_ROOT = path.resolve(import.meta.dirname, "../../src");

/** Spelled from pieces so this file is never its own trap. */
const BACKTICK = "`";
const STAR = "*";
const SLASH = "/";

describe("the shared source reduction", () => {
  it("removes comments and keeps the code around them", () => {
    const source = [
      "/" + STAR + STAR,
      " " + STAR + " prose mentioning aVanishedName",
      " " + STAR + SLASH,
      "const kept = aRealName;",
      "// trailing prose mentioning anotherVanishedName",
    ].join("\n");

    const reduced = withoutComments(source);
    expect(reduced).toContain("const kept = aRealName;");
    expect(reduced).not.toContain("aVanishedName");
    expect(reduced).not.toContain("anotherVanishedName");
  });

  it("keeps line structure, so line-anchored patterns downstream still work", () => {
    // `codeOnly`'s import stripper is `^`-anchored under /gm, and
    // `ruleCodeUniqueness` reads `issue(` call sites the same way. A reduction
    // that collapsed a multi-line comment would merge the line after it onto
    // the comment's line and those patterns would stop matching.
    const source = [
      "/" + STAR,
      " " + STAR + " two",
      " " + STAR + " lines",
      " " + STAR + SLASH,
      "const x = 1;",
    ].join("\n");
    const reduced = withoutComments(source);
    expect(reduced.split("\n")).toHaveLength(source.split("\n").length);
    expect(reduced.split("\n")[4]).toBe("const x = 1;");
  });

  describe("a delimiter inside another construct's body", () => {
    it("does not let a line comment's block opener swallow the code below", () => {
      // Generation 1's defect: two `replace` passes, so a `/*` inside a line
      // comment became a real opener and the block pass ran to the next real
      // closer. Wrong answer here => real code deleted.
      const source = [
        "// a glob like references" + SLASH + STAR + ".md in prose",
        "const survives = aRealName;",
        "/" + STAR + STAR + " a JSDoc below, which supplies the closer " + STAR + SLASH,
      ].join("\n");
      expect(withoutComments(source)).toContain("const survives = aRealName;");
    });

    it("does not let a string's comment marker open a comment", () => {
      // Generation 2's defect. Wrong answer => real code deleted.
      const source = [
        'const url = "https:' + SLASH + SLASH + 'x";',
        "const survives = aRealName;",
      ].join("\n");
      expect(withoutComments(source)).toContain("const survives = aRealName;");
    });

    it("does not let a REGEX's backtick open a phantom template", () => {
      // Generation 3's defect, and the one that was live: the CommonMark fence
      // matcher in `core/specPackParsers.ts` carries a run of backticks, and
      // the phantom ran forty-six lines into a JSDoc, taking that JSDoc's own
      // opener with it. Both directions break at once — code below is eaten
      // AND the JSDoc's prose starts reading as code.
      const source = [
        "const FENCE = " + SLASH + "^ {0,3}(" + BACKTICK + "{3,}|~{3,})" + SLASH + ";",
        "/" + STAR + STAR,
        " " + STAR + " prose naming " + BACKTICK + "aVanishedName" + BACKTICK + " inside backticks",
        " " + STAR + SLASH,
        "const survives = aRealName;",
      ].join("\n");

      const reduced = withoutCommentsOrLiterals(source);
      expect(reduced).toContain("const survives = aRealName;");
      expect(reduced).not.toContain("aVanishedName");
    });
  });

  describe("literals", () => {
    it("keeps them verbatim for the module-edge walk", () => {
      // `stripComments` feeds a `from "…"` matcher, so the specifier text has
      // to survive. Wrong answer => import edges dropped, and the reachable
      // set shrinks into validators that read as uncalled.
      const source = ['import { a } from "./foo.js";'].join("\n");
      expect(withoutComments(source)).toContain('"./foo.js"');
    });

    it("blanks them for a call-site scan, so prose in a literal is not a use", () => {
      // Wrong answer => prose counts as wiring, and the guard misses the
      // regression it exists to catch.
      const source = ['const message = "we no longer call aVanishedName here";'].join("\n");
      expect(withoutCommentsOrLiterals(source)).not.toContain("aVanishedName");
    });

    it("keeps a template substitution, which is executable code", () => {
      // The distinction none of the four generations drew. Wrong answer => a
      // real call site erased.
      const source = ["const s = " + BACKTICK + "n=${aRealName(root)}" + BACKTICK + ";"].join("\n");
      expect(withoutCommentsOrLiterals(source)).toContain("aRealName");
    });

    it("blanks a template's literal text while keeping its substitution", () => {
      const source = [
        "const s = " + BACKTICK + "we dropped aVanishedName ${aRealName}" + BACKTICK + ";",
      ].join("\n");
      const reduced = withoutCommentsOrLiterals(source);
      expect(reduced).not.toContain("aVanishedName");
      expect(reduced).toContain("aRealName");
    });

    it("handles a nested template in both directions", () => {
      // The scan this replaced mis-terminated at the first inner delimiter,
      // which made the depth-2 call survive for the wrong reason and let
      // depth-2 prose leak out as code.
      const call = [
        "const s = " +
          BACKTICK +
          "a${" +
          BACKTICK +
          "b${aRealName(r)}c" +
          BACKTICK +
          "}d" +
          BACKTICK +
          ";",
      ].join("\n");
      expect(withoutCommentsOrLiterals(call)).toContain("aRealName");

      const prose = [
        "const s = " +
          BACKTICK +
          "a${" +
          BACKTICK +
          "dropped aVanishedName " +
          BACKTICK +
          "}d" +
          BACKTICK +
          ";",
      ].join("\n");
      expect(withoutCommentsOrLiterals(prose)).not.toContain("aVanishedName");
    });
  });

  it("agrees with the tree on the module that broke the last generation", async () => {
    // A regression pin on the measured file rather than on the mechanism, so
    // it keeps its meaning if the reduction is ever rewritten again.
    // `validateTddList` occurs in `core/specPackParsers.ts` exactly once, in a
    // JSDoc, and the previous reduction reported it as executable text.
    const source = await readFile(path.join(SRC_ROOT, "core/specPackParsers.ts"), "utf-8");
    expect(source.match(/validateTddList/g)).toHaveLength(1);
    expect(withoutCommentsOrLiterals(source)).not.toContain("validateTddList");

    // And the mirror: a module's own declaration must survive its reduction.
    // The previous reduction erased this one, having re-framed the file from a
    // regex some lines above it.
    const depth = await readFile(
      path.join(SRC_ROOT, "core/validators/atddCoverageDepth.ts"),
      "utf-8",
    );
    expect(withoutCommentsOrLiterals(depth)).toContain("validateAtddCoverageDepth");
  });

  it("returns the same string for a repeated call, since the parse is memoised", () => {
    const source = ["/" + STAR + STAR + " doc " + STAR + SLASH, "const x = 1;"].join("\n");
    expect(withoutComments(source)).toBe(withoutComments(source));
    // And the two reductions of one module stay distinct — one cache per shape.
    const withLiteral = 'const s = "text"; const x = 1;';
    expect(withoutComments(withLiteral)).not.toBe(withoutCommentsOrLiterals(withLiteral));
  });
});
