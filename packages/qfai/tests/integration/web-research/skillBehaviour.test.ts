import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const skillPath = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skill",
  "web-research",
  "SKILL.md",
);

/** The lines under the heading that starts with `title`, up to the next heading of the same or a higher level. */
function sectionLines(markdown: string, title: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => /^#{2,3} /.test(line) && line.includes(title));
  expect(start, `heading containing "${title}" not found`).toBeGreaterThanOrEqual(0);
  const level = (lines[start] ?? "").indexOf(" ");
  const end = lines.findIndex(
    (line, index) => index > start && /^#{1,3} /.test(line) && line.indexOf(" ") <= level,
  );
  return lines.slice(start + 1, end === -1 ? lines.length : end);
}

/** Bullet items of a section, each wrapped continuation line folded into its item. */
function bullets(lines: string[]): string[] {
  const items: string[] = [];
  for (const line of lines) {
    if (line.startsWith("- ")) {
      items.push(line.slice(2).trim());
    } else if (/^\s+\S/.test(line) && items.length > 0) {
      items[items.length - 1] += ` ${line.trim()}`;
    }
  }
  return items;
}

/** Paragraph text of a section with line breaks folded to single spaces. */
function flatten(lines: string[]): string {
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

/** Rows of the first table in a section as first cell to second cell, header and rule rows dropped. */
function tableRows(lines: string[]): Map<string, string> {
  const rows = new Map<string, string>();
  for (const line of lines.filter((l) => l.startsWith("|")).slice(2)) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    rows.set((cells[0] ?? "").replaceAll("`", ""), cells[1] ?? "");
  }
  return rows;
}

let skill = "";

beforeAll(async () => {
  skill = await readFile(skillPath, "utf-8");
});

describe("web-research skill behaviour", () => {
  // QFAI:AC-0001-0176-03
  it("when every fetch fails the skill reports each failure and runs no extract stage", () => {
    const stages = flatten(sectionLines(skill, "1. Pipeline Definition"));
    expect(stages).toContain("**extract**");

    const text = flatten(sectionLines(skill, "9.2 Fetch Failure Isolation"));
    expect(text).toContain("When every fetch fails, no partial result exists.");
    expect(text).toContain("Report that every fetch failed, with the failure reason");
    expect(text).toContain("for each URL");
    expect(text).toContain("do not run the extract stage");
  });

  // QFAI:AC-0001-0177-02
  it("an MCP crash is noticed within 10 seconds, falls back to built-in tools and is reported", () => {
    const items = bullets(sectionLines(skill, "2.4 MCP Failure Recovery"));
    const detection = items.find((item) => item.startsWith("Crash detection"));
    expect(detection).toContain("crash or a dropped connection within **10 seconds**");

    const fallback = items.find((item) => item.startsWith("On MCP server crash"));
    expect(fallback).toContain("fallback to built-in tools (WebSearch / WebFetch)");

    const report = items.find((item) => item.startsWith("Tell the user"));
    expect(report).toContain("MCP server is unavailable");
  });

  // QFAI:AC-0001-0181-01
  it("the session log holds queries, URLs, content hashes, sanitization events, verification results and citations", () => {
    const fields = tableRows(sectionLines(skill, "4.1 Research Session Log"));
    expect([...fields.keys()]).toEqual([
      "session_id",
      "query",
      "timestamp",
      "stages",
      "sources",
      "citations",
    ]);
    expect(fields.get("query")).toContain("every search query issued");
    expect(fields.get("sources")).toContain("fetched URLs");
    expect(fields.get("sources")).toContain("content hashes");
    expect(fields.get("stages")).toContain("sanitization events");
    expect(fields.get("stages")).toContain("verification results");
    expect(fields.get("citations")).toContain("citation entries");

    const hygiene = flatten(sectionLines(skill, "12. Secret Exclusion and Log Hygiene"));
    expect(hygiene).toContain("Session logs must contain **no secrets**");
    expect(hygiene).toContain(
      "(tokens, passwords, OAuth secrets) are never written to the session log",
    );
  });

  // QFAI:AC-0001-0183-01
  it("a high-risk conclusion is blocked until a human reviews the diff and its citations", () => {
    const items = bullets(sectionLines(skill, "6. HITL (Human-in-the-Loop) Gates"));
    const conclusion = items.find((item) => item.startsWith("**A high-risk conclusion**"));
    expect(conclusion).toContain("is not applied to code until a human has reviewed it");
    expect(conclusion).toContain("The gate blocks");
    expect(conclusion).toContain(
      "the diff the conclusion would produce together with its citations",
    );
    expect(conclusion).toContain("A low-risk conclusion is applied without blocking");
  });

  // QFAI:AC-0001-0180-03
  it("a redirect to a non-allowlisted domain is blocked at the target and the chain is logged", () => {
    const items = bullets(sectionLines(skill, "3.2 Domain / URL Allowlist"));
    const redirect = items.find((item) => item.startsWith("Redirect chains"));
    expect(redirect).toContain("followed only while all hops remain on allowlisted domains");
    expect(redirect).toContain("blocked at that target");
    expect(redirect).toContain("the redirect chain up to the blocked target is logged");
  });

  // QFAI:EX-0001-0180-03
  it("a fetch to a domain outside the allowlist is blocked and the blocked domain is logged", () => {
    const text = flatten(sectionLines(skill, "3.2 Domain / URL Allowlist"));
    expect(text).toContain("Default policy: **default-deny**");
    expect(text).toContain("Only domains listed in the project allowlist may be fetched");
    expect(text).toContain("Unknown domains are logged with the blocked domain and skipped");
  });
});
