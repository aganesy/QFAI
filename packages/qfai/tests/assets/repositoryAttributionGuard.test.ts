import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  findRepositoryAttribution,
  listShippedAssistantFiles,
  matchRepositoryAttribution,
  normalizeSoftWraps,
} from "../helpers/repositoryAttribution.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const assistantDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
);

/**
 * Behaviour of the matcher behind the "never attributes a concrete artifact id
 * to this repository" guard in `assets.test.ts`.
 *
 * That guard asserts an empty offender list over a clean tree, so on its own it
 * cannot tell a matcher that finds nothing from a matcher that *can* find
 * nothing. These cases are the other half: each one is a spelling the guard
 * used to miss, or a legitimate spelling it must never flag.
 */
describe("repository attribution matcher", () => {
  describe("finds an attribution", () => {
    it("when the artifact is named by path", () => {
      // `[^.\n]` treated the leading dot of `.qfai` as a sentence end and
      // stopped before ever reaching the id. `.qfai/specs/spec-NNNN` is the
      // form the shipped skills actually use to point at a spec.
      expect(
        matchRepositoryAttribution("this repository's `.qfai/specs/spec-0006` is current"),
      ).toBe("this repository's `.qfai/specs/spec-0006`");
      expect(
        matchRepositoryAttribution("`.qfai/specs/spec-0003` is tracked in this repository"),
      ).toBe("spec-0003` is tracked in this repository");
    });

    it("when the artifact is a contract id", () => {
      // The old branch spelled contracts `CON-NNNN-NNNN`, a form that exists
      // nowhere. `contract-artifact-rules.md` defines `CON-API-*` / `CON-DB-*`
      // / `CON-UI-*`, so every real contract misattribution walked past.
      expect(matchRepositoryAttribution("this repository's CON-DB-0007 owns the write path")).toBe(
        "this repository's CON-DB-0007",
      );
      expect(matchRepositoryAttribution("`CON-API-0001` belongs to this repository")).toBe(
        "`CON-API-0001` belongs to this repository",
      );
      expect(matchRepositoryAttribution("this repository's `CON-UI-0003` is frozen")).toBe(
        "this repository's `CON-UI-0003`",
      );
    });

    it("when an abbreviation period sits between the phrase and the id", () => {
      // `e.g.` and `i.e.` are ordinary prose in the shipped tree (37 and 4
      // occurrences). Ending the search at their first period let an author
      // launder an attribution through a parenthetical.
      expect(matchRepositoryAttribution("this repository's active spec (e.g., spec-0006)")).toBe(
        "this repository's active spec (e.g., spec-0006",
      );
      expect(
        matchRepositoryAttribution("this repository's API obligation (i.e., TC-0006-0001)"),
      ).toBe("this repository's API obligation (i.e., TC-0006-0001");
      expect(matchRepositoryAttribution("this repository's rules, etc. see `AC-0006-0002`")).toBe(
        "this repository's rules, etc. see `AC-0006-0002`",
      );
    });

    it("when the item id carries a single number", () => {
      // `spec-traceability-rules.md` defines item ids as `US-0001` / `AC-0001`
      // / `BR-0001` / `TC-0001`. Requiring `NNNN-NNNN` matched only the wider
      // spelling, so every attribution written in the shipped form walked past.
      expect(matchRepositoryAttribution("this repository's TC-0001 covers the parser")).toBe(
        "this repository's TC-0001",
      );
      expect(matchRepositoryAttribution("`AC-0001` belongs to this repository")).toBe(
        "`AC-0001` belongs to this repository",
      );
      expect(matchRepositoryAttribution("this repository's US-0001 is the entry point")).toBe(
        "this repository's US-0001",
      );
      expect(matchRepositoryAttribution("this repository's `BR-0001` is frozen")).toBe(
        "this repository's `BR-0001`",
      );
      // …and the two-number spelling still matches, whole rather than clipped.
      expect(matchRepositoryAttribution("this repository's TC-0001-0001 is current")).toBe(
        "this repository's TC-0001-0001",
      );
    });

    it("when a long qualifier separates the phrase from the id", () => {
      // The gap was capped at 80 characters on top of the sentence and block
      // boundaries that already bound it, so a single sentence could outrun the
      // cap and carry the attribution out unmatched. This one is 131.
      const long =
        "this repository's currently active and authoritative acceptance-test " +
        "specification that every implementation agent must follow without " +
        "exception is spec-0006";
      expect(matchRepositoryAttribution(long)).toBe(long);
    });

    it("across a soft wrap, in either order", () => {
      expect(findRepositoryAttribution("this repository's active\nspec-0006 is the sample\n")).toBe(
        "this repository's active spec-0006",
      );
      expect(findRepositoryAttribution("`TC-0006-0001` belongs to\nthis repository\n")).toBe(
        "`TC-0006-0001` belongs to this repository",
      );
    });
  });

  describe("leaves legitimate prose alone", () => {
    it("for the bare phrase", () => {
      // qfai-atdd / qfai-configure / qfai-verify all say this correctly.
      expect(matchRepositoryAttribution("run the relevant test suite for this repository")).toBe(
        null,
      );
    });

    it("for a standalone sample id", () => {
      expect(matchRepositoryAttribution("`spec-0006` covers the parser")).toBe(null);
    });

    it("across a real sentence boundary", () => {
      expect(matchRepositoryAttribution("Configure this repository. Then read `spec-0006`.")).toBe(
        null,
      );
    });

    it("across a markdown block boundary", () => {
      // Collapsing every newline welded a heading onto the next block, so a
      // heading that merely says "this repository" plus an unrelated list item
      // holding a sample id read as one attribution. Headings and list items
      // rarely end in a period, so nothing downstream separated them again.
      expect(
        findRepositoryAttribution("# Configure this repository\n\n- Use spec-0006 as a sample\n"),
      ).toBe(null);
      expect(
        findRepositoryAttribution("# Configure this repository\n- Use spec-0006 as a sample\n"),
      ).toBe(null);
      expect(
        findRepositoryAttribution("Set up this repository\n\n| Spec | Note |\n| spec-0006 | x |\n"),
      ).toBe(null);
    });

    it("when a heading is followed straight by prose", () => {
      // The block check read only the *incoming* line, so a heading stayed open
      // and absorbed the plain paragraph under it. A heading is complete at its
      // newline, whatever follows.
      expect(
        findRepositoryAttribution("# Configure this repository\nUse spec-0006 as a sample\n"),
      ).toBe(null);
      expect(
        findRepositoryAttribution("| this repository | note |\nspec-0006 is the sample\n"),
      ).toBe(null);
    });
  });

  it("keeps blocks apart while still joining soft wraps", () => {
    expect(normalizeSoftWraps("alpha\nbeta\n\n- gamma\ndelta")).toBe("alpha beta\n\n- gamma delta");
    // A heading ends at its newline; a list item takes lazy continuation, so
    // `- gamma\ndelta` above stays one item while this stays two blocks.
    expect(normalizeSoftWraps("# heading\nprose")).toBe("# heading\nprose");
    expect(normalizeSoftWraps("> quoted\n1. first\n2. second")).toBe(
      "> quoted\n1. first\n2. second",
    );
  });

  it("scans every shipped assistant file, whatever its extension", async () => {
    // `qfai init` copies the tree with no extension filter, so a guard scoped
    // to `.md` / `.yml` / `.yaml` contradicted its own premise.
    const files = (await listShippedAssistantFiles(assistantDir)).map((filePath) =>
      path.relative(assistantDir, filePath).split(path.sep).join("/"),
    );

    expect(files).toContain("skills/qfai-prototyping/templates/DESIGN.md.sample");
    expect(files).toContain("skills/qfai-sdd/templates/contracts/db-contract.sample.sql");
    expect(files).toContain("catalog/spec_required_files.json");
    expect(files).toContain("skills/qfai-discussion/templates/review/summary.json");
    // And the markdown the narrower glob already covered.
    expect(files).toContain("skills/qfai-sdd/references/contract-artifact-rules.md");
  });
});
