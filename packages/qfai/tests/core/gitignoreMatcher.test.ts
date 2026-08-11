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
    ["!implement-*.md", "implement-spec-0001.md"],
    ["!atdd-*.md", "atdd-spec-0001.md"],
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

  it("rejects an evidence negation followed by a canonical-name re-ignore", () => {
    const lines = ["!implement-*.md", "implement-spec-*.md"];
    expect(negationsOutrankLaterIgnores(lines, ["!implement-*.md"])).toBe(false);
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
