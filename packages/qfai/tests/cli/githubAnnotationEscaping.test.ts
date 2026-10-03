/**
 * `--format github` writes workflow commands, and a workflow command is a line protocol.
 *
 * Every field in `::error file=...::message` is parsed by position and by separator, so any value
 * interpolated into the location metadata that carries a newline, a `%`, a `:` or a `,` is not
 * data — it is syntax. `Issue.file` can name a path a pull request chose, so a `file` of
 * `x\n::stop-commands::<token>` must not split the command in two.
 *
 * The emitter is driven rather than the escaping helper, because the property is that the line
 * written to stdout carries `issue.file` escaped.
 */
import { describe, expect, it, vi } from "vitest";

import { emitGitHub } from "../../src/cli/commands/validate.js";
import type { Issue } from "../../src/core/types.js";

/** The command a hostile `file` would open if the metadata were interpolated raw. */
const INJECTED_COMMAND = "::stop-commands::7f3a9c";

/** The lines `emitGitHub` writes for one issue whose `file` is `file`. */
function emittedLines(file: string): string[] {
  const chunks: string[] = [];
  const writeSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    });
  try {
    const issue: Issue = {
      code: "QFAI-STORY-008",
      severity: "error",
      category: "canonical",
      message: "Undeclared annotation",
      file,
      rule: "storyTree.undeclaredAnnotation",
    };
    emitGitHub(issue, "error");
  } finally {
    writeSpy.mockRestore();
  }
  return chunks.join("").split(/\r?\n/).filter(Boolean);
}

describe("a workflow command's location metadata is escaped, not interpolated", () => {
  it("does not let an issue's `file` open a command of its own", () => {
    const lines = emittedLines(`x\n${INJECTED_COMMAND}`);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^::error file=x%0A/);
    expect(lines.filter((line) => line.startsWith(INJECTED_COMMAND))).toEqual([]);
  });

  it("escapes the separators a property value is parsed with, and keeps the path readable", () => {
    // `:` and `,` are how GitHub splits the metadata block into properties, so a `file` carrying
    // either one changes which properties the command appears to set — `file=a,line=9` names a
    // line the finding never reported.
    const [line = ""] = emittedLines("pkg:one,two/ci.yml");
    const metadata = line.slice(0, line.indexOf("::", 2));
    expect(metadata).not.toContain("pkg:one");
    expect(metadata).not.toContain("one,two");
    expect(metadata).toContain("file=pkg%3Aone%2Ctwo/ci.yml");
  });

  it("escapes `%` first, so the escapes that follow are not encoded twice", () => {
    const [line = ""] = emittedLines("100%:a");
    expect(line).toContain("file=100%25%3Aa");
  });
});
