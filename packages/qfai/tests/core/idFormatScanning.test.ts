import { describe, expect, it } from "vitest";

import {
  AC_GHERKIN_SECTION,
  extractInvalidIdOccurrences,
  extractInvalidIds,
  maskFencedCodeBlocks,
} from "../../src/core/ids.js";

/** How `validateLayeredIdFormat` calls the scan for `03_Acceptance-Criteria.md`. */
const AC_FILE = { scannedSection: AC_GHERKIN_SECTION };

describe("extractInvalidIds", () => {
  it("does not report a truncation of a prose wildcard", () => {
    // `US-0006` is also the prefix of every valid US-0006-NNNN ID in the spec,
    // so reporting it gives the operator nothing to search for.
    expect(extractInvalidIds("Parent: US-0006-*", ["US"])).toEqual([]);
    expect(extractInvalidIds("Parent: US-0006-?", ["US"])).toEqual([]);
    expect(extractInvalidIds("see AC-0001-* for details", ["AC"])).toEqual([]);
  });

  it("still reports a genuinely malformed ID", () => {
    expect(extractInvalidIds("Parent: US-6", ["US"])).toEqual(["US-6"]);
    expect(extractInvalidIds("Parent: US-0006-1", ["US"])).toEqual(["US-0006-1"]);
  });

  it("suppresses only a wildcard segment, not ordinary trailing punctuation", () => {
    // `?` as sentence punctuation and a stray separator left by a typo are
    // malformed IDs, not prose wildcards.
    expect(extractInvalidIds("Is it US-6?", ["US"])).toEqual(["US-6"]);
    expect(extractInvalidIds("Parent: US-6-", ["US"])).toEqual(["US-6"]);
    expect(extractInvalidIds("Parent: US-0006-0001-", ["US"])).toEqual([]);
    expect(extractInvalidIds("Parent: US-0006-1-", ["US"])).toEqual(["US-0006-1"]);
  });

  it("suppresses a wildcard only when its base is a canonical namespace", () => {
    // A blanket "followed by -*" rule discarded the only candidate before the
    // format check ran, so a wrong digit count in front of a wildcard escaped
    // E_ID_INVALID_FORMAT entirely.
    expect(extractInvalidIds("Parent: US-6-*", ["US"])).toEqual(["US-6"]);
    expect(extractInvalidIds("see AC-1-* for details", ["AC"])).toEqual(["AC-1"]);
    expect(extractInvalidIds("Parent: US-00006-*", ["US"])).toEqual(["US-00006"]);
    // The well-formed namespace is still suppressed.
    expect(extractInvalidIds("Parent: US-0006-*", ["US"])).toEqual([]);
  });

  it("accepts canonical IDs", () => {
    expect(extractInvalidIds("Parent: US-0006-0001", ["US"])).toEqual([]);
    expect(extractInvalidIds("Parent: CAP-0001", ["CAP"])).toEqual([]);
  });

  it("ignores ID-shaped tokens inside fenced code blocks", () => {
    const text = ["Prose is scanned.", "", "```text", "US-6 sample output", "```", ""].join("\n");
    expect(extractInvalidIds(text, ["US"])).toEqual([]);
  });

  it("still scans the required AC Gherkin, which the template puts in a fence", () => {
    // `03_Acceptance-Criteria.md` (v1421) defines the required ACs inside a
    // ```gherkin fence, so masking it would let a typo in a primary definition
    // pass validation.
    const text = [
      "## AC Gherkin (required)",
      "",
      "```gherkin",
      "# AC-0001-1",
      "Scenario: broken id",
      "```",
      "",
    ].join("\n");
    expect(extractInvalidIds(text, ["AC"], AC_FILE)).toEqual(["AC-0001-1"]);
  });

  it("masks an illustrative gherkin fence outside the required section", () => {
    // Keying the exemption on the language alone re-exposed every sample in
    // every layered file — the case the mask exists for.
    const text = [
      "## Purpose",
      "",
      "For example:",
      "",
      "```gherkin",
      "# AC-1",
      "Scenario: placeholder",
      "```",
      "",
      "## AC Gherkin (required)",
      "",
      "```gherkin",
      "# AC-0001-0001",
      "```",
      "",
    ].join("\n");
    expect(extractInvalidIds(text, ["AC"], AC_FILE)).toEqual([]);
  });

  it("masks a gherkin fence in a file that has no required-AC section", () => {
    // `validateLayeredIdFormat` passes the option only for the AC file, so a
    // sample in 02_User-stories.md or 04_Business-Rules.md stays masked.
    const text = ["## US Catalog", "", "```gherkin", "# US-1", "```", ""].join("\n");
    expect(extractInvalidIds(text, ["US"])).toEqual([]);
  });
});

describe("extractInvalidIdOccurrences", () => {
  it("reports the 1-based line of the first occurrence", () => {
    const text = ["# Title", "", "Parent: US-6", "", "Parent: US-6", "Parent: BR-7"].join("\n");
    expect(extractInvalidIdOccurrences(text, ["US", "BR"])).toEqual([
      { id: "US-6", line: 3 },
      { id: "BR-7", line: 6 },
    ]);
  });

  it("keeps line numbers aligned with the original text when a fence is masked", () => {
    const text = ["```text", "US-6", "```", "Parent: US-7"].join("\n");
    expect(extractInvalidIdOccurrences(text, ["US"])).toEqual([{ id: "US-7", line: 4 }]);
  });
});

describe("maskFencedCodeBlocks", () => {
  it("blanks fence bodies while preserving the line count", () => {
    const text = ["a", "```", "b", "```", "c"].join("\n");
    expect(maskFencedCodeBlocks(text).split("\n")).toEqual(["a", "", "", "", "c"]);
  });

  it("handles tilde fences and CRLF input", () => {
    const text = "a\r\n~~~\r\nb\r\n~~~\r\nc";
    expect(maskFencedCodeBlocks(text).split("\n")).toEqual(["a", "", "", "", "c"]);
  });

  it("closes only on the opening marker at the opening length or longer", () => {
    // A 4-backtick block quoting a 3-backtick sample is legal markdown; a
    // toggle-on-any-fence scan ends the outer block at the inner opener and
    // re-exposes the sample it was meant to hide.
    const text = ["a", "````markdown", "```text", "US-6", "```", "````", "US-7"].join("\n");
    expect(maskFencedCodeBlocks(text).split("\n")).toEqual(["a", "", "", "", "", "", "US-7"]);
    expect(extractInvalidIds(text, ["US"])).toEqual(["US-7"]);
  });

  it("does not close a backtick fence on a tilde fence", () => {
    const text = ["```", "~~~", "US-6", "```", "US-7"].join("\n");
    expect(extractInvalidIds(text, ["US"])).toEqual(["US-7"]);
  });

  it("does not close on a marker line that carries an info string", () => {
    const text = ["```", "```js", "US-6", "```", "US-7"].join("\n");
    expect(extractInvalidIds(text, ["US"])).toEqual(["US-7"]);
  });

  it("does not treat a 4-space-indented fence line as a fence opener", () => {
    // Four or more spaces makes it an indented code block, not a fence; taking
    // it as an opener would blank the rest of the document.
    const text = ["a", "    ```text", "US-6", "Parent: US-7"].join("\n");
    expect(extractInvalidIds(text, ["US"]).sort()).toEqual(["US-6", "US-7"]);
  });

  it("keeps a gherkin fence body inside the scanned section, blanking the fence lines", () => {
    const text = ["## AC Gherkin (required)", "```gherkin", "# AC-0001", "```", "b"].join("\n");
    expect(maskFencedCodeBlocks(text, AC_FILE).split("\n")).toEqual([
      "## AC Gherkin (required)",
      "",
      "# AC-0001",
      "",
      "b",
    ]);
  });

  it("masks the same fence when no section is named", () => {
    const text = ["## AC Gherkin (required)", "```gherkin", "# AC-0001", "```", "b"].join("\n");
    expect(maskFencedCodeBlocks(text).split("\n")).toEqual([
      "## AC Gherkin (required)",
      "",
      "",
      "",
      "b",
    ]);
  });

  it("keeps the scanned section open across its subsections", () => {
    const text = [
      "## AC Gherkin (required)",
      "### AC-0001-0001",
      "```gherkin",
      "# AC-0001-1",
      "```",
      "## AC Catalog (optional)",
      "```gherkin",
      "# AC-0002-1",
      "```",
    ].join("\n");
    // The H3 stays inside the section; the following H2 closes it.
    expect(extractInvalidIds(text, ["AC"], AC_FILE)).toEqual(["AC-0001-1"]);
  });
});
