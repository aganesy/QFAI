/**
 * A negation is only effective when no later ignore line matches the same
 * path, and deciding that needs gitignore glob semantics.
 *
 * The first attempt compared string prefixes: it saw `*` and
 * `.qfai/evidence/*`, and did not see `*.md`, `**` + `/*.md` or `evidence/`,
 * every one of which re-ignores what the governance negations re-include. The
 * root check had the mirror gap — it read the managed block only, so a project
 * rule appended after the block won under git's last-match rule while the
 * check called the negation effective.
 */

import { describe, expect, it } from "vitest";

import {
  gitignorePatternMatches,
  negationSamplePath,
  negationsOutrankLaterIgnores,
} from "../../src/core/gitignore.js";

describe("gitignorePatternMatches", () => {
  it.each([
    ["*", ".qfai/evidence/coverage-depth-spec-0001.md"],
    ["*.md", ".qfai/evidence/coverage-depth-spec-0001.md"],
    ["**/*.md", ".qfai/evidence/coverage-depth-spec-0001.md"],
    [".qfai/evidence/*", ".qfai/evidence/decision-a.md"],
    [".qfai/evidence/*.md", ".qfai/evidence/decision-a.md"],
    ["evidence/", ".qfai/evidence/decisions/sample/leaf"],
    ["coverage-depth-?.md", "coverage-depth-a.md"],
    [".qfai/**/decisions/", ".qfai/evidence/decisions/sample"],
  ])("%s matches %s", (pattern, sample) => {
    expect(gitignorePatternMatches(pattern, sample)).toBe(true);
  });

  it.each([
    // `*` does not cross a separator, so an anchored one-segment glob cannot
    // reach into a subdirectory.
    [".qfai/evidence/*.md", ".qfai/evidence/decisions/a.md"],
    ["*.json", ".qfai/evidence/decision-a.md"],
    // A leading slash anchors: this is `<root>/evidence`, not `.qfai/evidence`.
    ["/evidence/", ".qfai/evidence/decisions/sample"],
    // Comments, blanks and negations are not ignore lines.
    ["# *.md", ".qfai/evidence/a.md"],
    ["", ".qfai/evidence/a.md"],
    ["!*.md", ".qfai/evidence/a.md"],
  ])("%s does not match %s", (pattern, sample) => {
    expect(gitignorePatternMatches(pattern, sample)).toBe(false);
  });
});

describe("negationSamplePath", () => {
  it.each([
    ["!coverage-depth-*.md", "coverage-depth-sample.md"],
    ["!decisions/", "decisions/sample"],
    ["!decisions/**", "decisions/sample/leaf"],
    ["!.qfai/evidence/decision-*.md", ".qfai/evidence/decision-sample.md"],
  ])("%s -> %s", (negation, expected) => {
    expect(negationSamplePath(negation)).toBe(expected);
  });
});

describe("negationsOutrankLaterIgnores", () => {
  it("rejects a negation a later broad glob re-ignores", () => {
    const lines = ["*", "!coverage-depth-*.md", "*.md"];
    expect(negationsOutrankLaterIgnores(lines, ["!coverage-depth-*.md"])).toBe(false);
  });

  it("rejects one a later double-star glob re-ignores", () => {
    const lines = ["!decision-*.md", "**/*.md"];
    expect(negationsOutrankLaterIgnores(lines, ["!decision-*.md"])).toBe(false);
  });

  it("accepts a negation that is genuinely last", () => {
    const lines = ["*", "*.md", "!coverage-depth-*.md"];
    expect(negationsOutrankLaterIgnores(lines, ["!coverage-depth-*.md"])).toBe(true);
  });

  it("rejects an absent negation", () => {
    expect(negationsOutrankLaterIgnores(["*"], ["!coverage-depth-*.md"])).toBe(false);
  });

  it("is not fooled by a non-matching later rule", () => {
    const lines = ["!coverage-depth-*.md", "*.json", "node_modules/"];
    expect(negationsOutrankLaterIgnores(lines, ["!coverage-depth-*.md"])).toBe(true);
  });
});

describe("a bracket expression is a character class, not five literal characters", () => {
  // Review finding [E2]. The translation escaped `[` and `]` into literals, so a project line
  // like `.qfai/install-provenance.[j]son` — an ordinary class that git honours — matched
  // nothing here. Git ignores the provenance record; this matcher says nothing conflicts;
  // `ensureRootGitignoreEntries` returns early; the record stays ignored. A fresh clone then has
  // no record at all, so the next `qfai init` reads a declined workflow as never-installed and
  // writes it back — the one outcome that record exists to stop.

  it("matches through a class the way git does", () => {
    expect(
      gitignorePatternMatches(".qfai/install-provenance.[j]son", ".qfai/install-provenance.json"),
      "the reviewer's pattern: a one-member class still selects that member",
    ).toBe(true);
    expect(
      gitignorePatternMatches("build.[oa]", "build.o"),
      "and a multi-member class selects each of them",
    ).toBe(true);
    expect(gitignorePatternMatches("build.[oa]", "build.a")).toBe(true);
    expect(gitignorePatternMatches("build.[oa]", "build.c"), "and nothing outside it").toBe(false);
  });

  it("reads a range, and a negated class", () => {
    expect(gitignorePatternMatches("log[0-9].txt", "log7.txt")).toBe(true);
    expect(gitignorePatternMatches("log[0-9].txt", "logx.txt")).toBe(false);
    // git spells negation `[!…]`; `[^…]` is accepted too.
    expect(gitignorePatternMatches("log[!0-9].txt", "logx.txt")).toBe(true);
    expect(gitignorePatternMatches("log[!0-9].txt", "log7.txt")).toBe(false);
    expect(gitignorePatternMatches("log[^0-9].txt", "logx.txt")).toBe(true);
  });

  it("treats an unterminated bracket as the literal character git treats it as", () => {
    // An opening bracket with no partner is not a class, and reading it as one would throw on a
    // malformed regular expression — which in this matcher means a crash on a project file
    // nobody said was invalid.
    expect(() => gitignorePatternMatches("weird[name", "weird[name")).not.toThrow();
    expect(gitignorePatternMatches("weird[name", "weird[name")).toBe(true);
  });

  it("keeps a class from spanning a directory separator", () => {
    // The rest of the translation is careful that `*` and `?` stop at a `/`. A class that
    // silently crossed one would make an unrelated deep path look like a conflict.
    expect(
      gitignorePatternMatches("a[b]c/leaf", "abc/leaf"),
      "the class itself still matches inside one segment",
    ).toBe(true);
  });
});

describe("glob overlap is decided from both patterns, not from one instance of one", () => {
  // Review finding [E1]. The check instantiated the NEGATION and asked whether each later
  // ignore matched that one instance — and two globs can overlap without that instance being in
  // the intersection.
  //
  // The measured case: `!.qfai/evidence/coverage-depth-*.md` instantiates as
  // `coverage-depth-sample.md`, and a project line `.qfai/evidence/coverage-depth-spec-*.md`
  // does not match it — while the file that actually exists, `coverage-depth-spec-0017.md`, is
  // matched by both. The conflict went unseen, the managed block was left where it was, and the
  // Coverage Depth Matrix stayed ignored: a governance record this repository requires in
  // version control, silently absent from every clone.
  //
  // The two directions of error are not symmetric, which is what makes over-reporting the right
  // bias: a false conflict only re-appends a negation that was already last, while a missed one
  // leaves a required file outside version control with nothing to notice it afterwards.

  const MANAGED = "!.qfai/evidence/coverage-depth-*.md";

  it("finds a later ignore that overlaps without covering the negation's own instance", () => {
    const lines = [".qfai/evidence/*", MANAGED, ".qfai/evidence/coverage-depth-spec-*.md"];
    expect(
      negationsOutrankLaterIgnores(lines, [MANAGED]),
      "the real file coverage-depth-spec-0017.md is matched by both patterns, so the negation " +
        "is not the last word on it",
    ).toBe(false);
  });

  it("still finds the plain case, where the later ignore covers the instance directly", () => {
    const lines = [MANAGED, ".qfai/evidence/*.md"];
    expect(negationsOutrankLaterIgnores(lines, [MANAGED])).toBe(false);
  });

  it("finds a later ignore written as a character class", () => {
    // The sibling finding, from this side: the class has to translate for the overlap to be
    // visible at all.
    const negation = "!.qfai/install-provenance.json";
    const lines = [negation, ".qfai/install-provenance.[j]son"];
    expect(negationsOutrankLaterIgnores(lines, [negation])).toBe(false);
  });

  it("reports no conflict when the later ignores genuinely do not overlap", () => {
    // The direction that decides whether this is a check or a permanent `false`. Over-reporting
    // is cheap but not free: a rule that always relocates says nothing, and would hide the day
    // an actual conflict appears.
    const lines = [
      ".qfai/evidence/*",
      MANAGED,
      "node_modules/",
      "dist/",
      ".qfai/report/*",
      "*.log",
    ];
    expect(
      negationsOutrankLaterIgnores(lines, [MANAGED]),
      "none of these can match a coverage-depth matrix, so the negation is still the last word",
    ).toBe(true);
  });

  it("ignores comments, blanks and other negations when looking for a conflict", () => {
    const lines = [
      MANAGED,
      "",
      "# a comment mentioning .qfai/evidence/coverage-depth-anything.md",
      "!.qfai/evidence/decisions/",
    ];
    expect(
      negationsOutrankLaterIgnores(lines, [MANAGED]),
      "a comment is not a rule, and a later negation does not re-ignore anything",
    ).toBe(true);
  });

  it("reports a missing negation rather than calling it effective", () => {
    expect(negationsOutrankLaterIgnores([".qfai/evidence/*"], [MANAGED])).toBe(false);
  });
});
