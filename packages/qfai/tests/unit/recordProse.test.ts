/**
 * The heading scanner the shipped-document suites cut sections with treats a fenced block as one
 * unit: a fence ends only at a closing line of its own character and at least its own length, so a
 * heading-shaped line inside a nested or mixed example is never a heading.
 */
import { describe, expect, it } from "vitest";

import { nextHeadingAt } from "../helpers/recordProse.js";

/** The heading line `nextHeadingAt` finds after the first line, or `undefined` when it finds none. */
function nextHeading(lines: string[]): string | undefined {
  const text = lines.join("\n");
  const at = nextHeadingAt(text, 0);
  return at === -1 ? undefined : text.slice(at).split("\n")[0];
}

describe("nextHeadingAt", () => {
  it("skips a heading-shaped line inside a fence", () => {
    expect(nextHeading(["## Start", "```text", "# comment", "```", "## Next"])).toBe("## Next");
  });

  it("keeps a four-backtick fence open across a triple-backtick example", () => {
    expect(
      nextHeading([
        "## Start",
        "````md",
        "```",
        "# fake",
        "```",
        "## also fake",
        "````",
        "## Next",
      ]),
    ).toBe("## Next");
  });

  it("keeps a backtick fence open across a tilde line", () => {
    expect(nextHeading(["## Start", "```", "~~~", "# fake", "~~~", "```", "## Next"])).toBe(
      "## Next",
    );
  });

  it("keeps a tilde fence open across a backtick line", () => {
    expect(nextHeading(["## Start", "~~~", "```", "# fake", "~~~", "## Next"])).toBe("## Next");
  });

  it("does not close a fence on a line carrying an info string", () => {
    expect(nextHeading(["## Start", "```", "```text", "# fake", "```", "## Next"])).toBe("## Next");
  });

  it("closes a fence on a longer run of its own character", () => {
    expect(nextHeading(["## Start", "```", "# fake", "`````", "## Next"])).toBe("## Next");
  });

  it("closes a fence on a CRLF line", () => {
    expect(nextHeading(["## Start\r", "```\r", "# fake\r", "```\r", "## Next\r"])).toBe(
      "## Next\r",
    );
  });

  it("treats a backtick run with a backtick after it as inline code, not a fence", () => {
    expect(nextHeading(["## Start", "```inline``` text", "## Next"])).toBe("## Next");
  });

  it("finds no heading after a fence that never closes", () => {
    expect(nextHeading(["## Start", "````", "```", "## fake", "```"])).toBeUndefined();
  });
});
