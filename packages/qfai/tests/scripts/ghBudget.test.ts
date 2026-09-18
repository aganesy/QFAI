/**
 * The command that asks GitHub the cheap way.
 *
 * Nothing here makes a call. What the cases hold is the reading of a response
 * and the shape of the answer, because those are where a silent mistake costs
 * the thing the command exists to protect: a header name compared with the wrong
 * case leaves the budget unreported, and a run kept for a commit the branch has
 * moved past reports a result that is not the branch's.
 *
 * The reserve is pinned against the reason stated beside it. A number whose
 * justification has drifted away from it cannot be reviewed, and the next reader
 * has no way to tell a considered floor from one somebody typed.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  RESERVE,
  branchRows,
  describeReading,
  formatRows,
  readingFrom,
  repoSlug,
  run,
  splitResponse,
  statusCode,
} from "../../../../scripts/gh-budget.mjs";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCRIPT_REL = "scripts/gh-budget.mjs";

/** A `gh api -i` response: a bare newline after the status line, CRLF after that. */
function response(headers: readonly string[], body: string): string {
  return `HTTP/2.0 200 OK\n${headers.join("\r\n")}\r\n\r\n${body}`;
}

const HEADERS = [
  "Content-Type: application/json; charset=utf-8",
  "X-Ratelimit-Limit: 5000",
  "X-Ratelimit-Remaining: 2785",
  "X-Ratelimit-Reset: 1789723893",
  "X-Ratelimit-Resource: core",
];

describe("the origin remote names the repository", () => {
  it.each([
    "https://github.com/owner/repo.git",
    "https://github.com/owner/repo",
    "git@github.com:owner/repo.git",
    "ssh://git@github.com/owner/repo",
  ])("%s is owner/repo", (url) => {
    expect(repoSlug(url)).toBe("owner/repo");
  });

  it("answers nothing for a remote that is not on GitHub", () => {
    expect(repoSlug("https://gitlab.com/owner/repo.git")).toBeUndefined();
  });
});

describe("reading one response", () => {
  it("splits the head from the body at the blank line", () => {
    const { head, body } = splitResponse(response(HEADERS, '{"total_count":1}'));
    expect(head).toContain("X-Ratelimit-Remaining: 2785");
    expect(body).toBe('{"total_count":1}');
  });

  it("splits a response that uses bare newlines throughout", () => {
    const { head, body } = splitResponse("HTTP/1.1 200 OK\nX-Ratelimit-Remaining: 1\n\nbody");
    expect(head).toBe("HTTP/1.1 200 OK\nX-Ratelimit-Remaining: 1");
    expect(body).toBe("body");
  });

  it("reads the status code off the status line", () => {
    expect(statusCode(splitResponse(response(HEADERS, "{}")).head)).toBe(200);
    expect(statusCode("HTTP/2.0 404 Not Found")).toBe(404);
    expect(statusCode("not a response")).toBeUndefined();
  });

  // The wire spells them `X-Ratelimit-Remaining` today. A comparison that
  // depended on that spelling would report no budget at all the day it changes,
  // which reads exactly like a response that carries none.
  it("reads the budget whatever case the header names use", () => {
    const reading = readingFrom(
      "HTTP/2.0 200 OK\nx-rateLIMIT-remaining: 12\r\nX-RATELIMIT-RESET: 99\r\nx-ratelimit-limit: 5000\r\nX-Ratelimit-Resource: graphql",
    );
    expect(reading).toEqual({ remaining: 12, limit: 5000, reset: 99, resource: "graphql" });
  });

  it("answers nothing when the headers carry no budget", () => {
    expect(readingFrom("HTTP/2.0 200 OK\nContent-Type: text/plain")).toBeUndefined();
  });

  it("names the remaining count, the allowance and the reset", () => {
    const line = describeReading({
      remaining: 2785,
      limit: 5000,
      reset: 1789723893,
      resource: "core",
    });
    expect(line).toContain("2785 of 5000");
    expect(line).toContain("(core)");
    expect(line).toMatch(/resets \d\d:\d\d UTC/);
  });
});

describe("one row per branch", () => {
  const run1 = { head_branch: "main", head_sha: "aaaaaaaaaa", status: "completed" };

  it("takes every workflow on the branch's newest head as one answer", () => {
    expect(
      branchRows([
        { ...run1, conclusion: "success" },
        { ...run1, conclusion: "failure" },
      ]),
    ).toEqual([{ branch: "main", head: "aaaaaaa", state: "done", result: "failure" }]);
  });

  // A green row beside a red one is how a caller reads a branch as passing. The
  // answer the caller has to act on is the failure.
  it("reports success only when every workflow on that head succeeded", () => {
    expect(branchRows([{ ...run1, conclusion: "success" }])[0]?.result).toBe("success");
  });

  it("marks a branch with an unfinished run as running", () => {
    expect(
      branchRows([
        { ...run1, status: "in_progress", conclusion: null },
        { ...run1, conclusion: "success" },
      ]),
    ).toEqual([{ branch: "main", head: "aaaaaaa", state: "running", result: "-" }]);
  });

  // A result for a commit the branch has moved past answers nothing about the
  // branch, and mixed in with the current head's runs it answers it wrongly.
  it("drops a run for an older head", () => {
    expect(
      branchRows([
        { ...run1, conclusion: "success" },
        { ...run1, head_sha: "bbbbbbbbbb", conclusion: "failure" },
      ]),
    ).toEqual([{ branch: "main", head: "aaaaaaa", state: "done", result: "success" }]);
  });

  it("keeps one row for each branch", () => {
    const rows = branchRows([
      { ...run1, conclusion: "success" },
      { head_branch: "topic", head_sha: "cccccccccc", status: "completed", conclusion: "failure" },
    ]);
    expect(rows.map((row) => row.branch)).toEqual(["main", "topic"]);
  });

  it("ignores a run that names no branch", () => {
    expect(branchRows([{ head_sha: "aaaaaaaaaa" }, null, "not a run"])).toEqual([]);
  });

  it("prints the rows under a header, in aligned columns", () => {
    const text = formatRows([
      { branch: "main", head: "aaaaaaa", state: "done", result: "success" },
      { branch: "a-much-longer-branch", head: "bbbbbbb", state: "running", result: "-" },
    ]);
    const [header, first, second] = text.split("\n");
    expect(header).toContain("branch");
    expect(header?.indexOf("head")).toBe(first?.indexOf("aaaaaaa"));
    expect(header?.indexOf("head")).toBe(second?.indexOf("bbbbbbb"));
  });
});

describe("the arguments", () => {
  it("refuses an unknown command with the usage, and calls nothing", () => {
    expect(run([])).toBe(2);
    expect(run(["checks"])).toBe(2);
  });

  it("refuses a job id that is not a number", () => {
    expect(run(["log", "abc"])).toBe(2);
    expect(run(["log"])).toBe(2);
  });
});

describe("the reserve", () => {
  it("is the number the script's own reasoning gives", async () => {
    expect(RESERVE).toBe(500);
    const source = await readFile(path.join(repoRoot, SCRIPT_REL), "utf-8");
    expect(source).toContain("500 of the 5000 calls");
  });
});
