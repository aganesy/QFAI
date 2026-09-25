import { describe, expect, it } from "vitest";
import { parseAllMarkdownTables } from "../../src/core/specPackParsers.js";
import { renderTriageMarkdown } from "../../src/core/sddTriage.js";

function renderAndParse(
  subject: string,
  rationale: string,
): {
  markdown: string;
  cells: string[];
} {
  const markdown = renderTriageMarkdown([
    {
      source: "REQ-roundtrip",
      subject,
      existingSpec: "spec-0013",
      op: { update: "APPEND" },
      rationale,
    },
  ]);
  const tables = parseAllMarkdownTables(markdown);
  expect(tables).toHaveLength(1);
  expect(tables[0]?.headers).toHaveLength(7);
  expect(tables[0]?.rows).toHaveLength(1);
  const cells = tables[0]?.rows[0];
  expect(cells).toHaveLength(7);
  if (!cells) throw new Error("expected one parsed triage row");
  return { markdown, cells };
}

// QFAI:SPEC-0013:TC-0013-0018
describe("TC-0013-0018: triage cell render-parse identity at escape boundaries", () => {
  it("TDD-0050 preserves literal backslashes in path and regex cells", () => {
    const { cells } = renderAndParse("C:\\Users\\spec.md", "matches \\d+ pattern");
    expect(cells[1]).toBe("C:\\Users\\spec.md");
    expect(cells[6]).toBe("matches \\d+ pattern");
  });

  it("TDD-0051 preserves a literal pipe as one table cell", () => {
    const { markdown, cells } = renderAndParse("--mode=a|b", "select a|b");
    expect(markdown).toContain("--mode=a\\|b");
    expect(cells[1]).toBe("--mode=a|b");
    expect(cells[6]).toBe("select a|b");
  });

  it("TDD-0052 preserves a backslash followed by a pipe", () => {
    const { cells } = renderAndParse("a\\|b", "path\\\\|file");
    expect(cells[1]).toBe("a\\|b");
    expect(cells[6]).toBe("path\\\\|file");
  });

  it("TDD-0053 normalizes CRLF to one space", () => {
    const { cells } = renderAndParse("subject", "first\r\nsecond");
    expect(cells[6]).toBe("first second");
  });

  it("TDD-0054 normalizes CR to one space", () => {
    const { cells } = renderAndParse("subject", "first\rsecond");
    expect(cells[6]).toBe("first second");
  });

  it("TDD-0055 normalizes LF to one space", () => {
    const { cells } = renderAndParse("subject", "first\nsecond");
    expect(cells[6]).toBe("first second");
  });
});

// QFAI:SPEC-0013:TC-0013-0019
describe("TC-0013-0019: plain triage cells render-parse identity", () => {
  it("TDD-0056 preserves plain ASCII subject and rationale", () => {
    const { cells } = renderAndParse("hello world", "see related discussion");
    expect(cells[1]).toBe("hello world");
    expect(cells[6]).toBe("see related discussion");
  });
});
