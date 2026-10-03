/**
 * `--format github` writes workflow commands, and a workflow command is a line protocol.
 *
 * Every field in `::error file=...::message` is parsed by position and by separator, so any value
 * interpolated into the location metadata that carries a newline, a `%`, a `:` or a `,` is not
 * data — it is syntax. `Issue.file` can name a path a pull request chose, so a `file` of
 * `x\n::stop-commands::<token>` must not split the command in two.
 */
import { describe, expect, it } from "vitest";

import { escapeGitHubCommandProperty } from "../../src/cli/commands/validate.js";

/** The command a hostile `file` would open if the metadata were interpolated raw. */
const INJECTED_COMMAND = "::stop-commands::7f3a9c";

describe("a workflow command's location metadata is escaped, not interpolated", () => {
  it("does not let a `file` open a command of its own", () => {
    const escaped = escapeGitHubCommandProperty(`x\n${INJECTED_COMMAND}`);
    expect(escaped).not.toContain("\n");
    expect(escaped.split(/\r?\n/)).toHaveLength(1);
    expect(escaped).not.toContain(INJECTED_COMMAND);
  });

  it("escapes the separators a property value is parsed with, and keeps the path readable", () => {
    // `:` and `,` are how GitHub splits the metadata block into properties, so a `file` carrying
    // either one changes which properties the command appears to set — `file=a,line=9` names a
    // line the finding never reported.
    const escaped = escapeGitHubCommandProperty("pkg:one,two/ci.yml");
    expect(escaped).not.toContain("pkg:one");
    expect(escaped).not.toContain("one,two");
    expect(escaped).toBe("pkg%3Aone%2Ctwo/ci.yml");
  });

  it("escapes `%` first, so the escapes that follow are not encoded twice", () => {
    expect(escapeGitHubCommandProperty("100%:a")).toBe("100%25%3Aa");
  });
});
