import { describe, expect, it } from "vitest";

import {
  extractInvalidIdOccurrences,
  extractInvalidIds,
  maskFencedCodeBlocks,
} from "../../src/core/ids.js";

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
    expect(extractInvalidIds(text, ["AC"])).toEqual(["AC-0001-1"]);
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

  it("keeps a gherkin fence body but still blanks the fence lines", () => {
    const text = ["a", "```gherkin", "# AC-0001", "```", "b"].join("\n");
    expect(maskFencedCodeBlocks(text).split("\n")).toEqual(["a", "", "# AC-0001", "", "b"]);
  });
});
