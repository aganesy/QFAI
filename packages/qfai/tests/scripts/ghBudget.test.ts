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
import { spawnSync } from "node:child_process";
import type * as NodeFs from "node:fs";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Seams into the script's file calls, for the races and failures a real file
 * system does not produce on demand. Every call goes through to `node:fs`; a
 * hook only acts around it, and none is set outside the case that needs it.
 */
const fsHooks = vi.hoisted(() => {
  const hooks: {
    beforeOpen: ((file: string) => void) | undefined;
    afterOpen: ((file: string) => void) | undefined;
    closeFails: boolean;
    writes: number;
  } = { beforeOpen: undefined, afterOpen: undefined, closeFails: false, writes: 0 };
  return hooks;
});

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFs>();
  return {
    ...actual,
    openSync: (...args: Parameters<typeof NodeFs.openSync>) => {
      fsHooks.beforeOpen?.(String(args[0]));
      const fd: unknown = Reflect.apply(actual.openSync, actual, args);
      fsHooks.afterOpen?.(String(args[0]));
      return fd;
    },
    writeSync: (...args: Parameters<typeof NodeFs.writeSync>) => {
      fsHooks.writes += 1;
      const count: unknown = Reflect.apply(actual.writeSync, actual, args);
      return count;
    },
    closeSync: (fd: number) => {
      actual.closeSync(fd);
      if (fsHooks.closeFails) {
        throw Object.assign(new Error("EIO: i/o error, close"), { code: "EIO" });
      }
    },
  };
});

const {
  LOG_MAX_BYTES,
  MAX_RESPONSE_BYTES,
  RESERVE,
  branchRows,
  cacheDirectory,
  writeCacheEntry,
  describeReading,
  formatRows,
  ghApi,
  readingFrom,
  repoSlug,
  run,
  splitResponse,
  statusCode,
} = await import("../../../../scripts/gh-budget.mjs");

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

describe("receiving a GitHub response", () => {
  it("rejects a truncated job log even when stdout contains a successful response prefix", () => {
    const apiPath = "repos/owner/repo/actions/jobs/123/logs";
    const execute = vi.fn(() => {
      throw Object.assign(new Error("GitHub CLI output exceeded maxBuffer"), {
        code: "ENOBUFS",
        signal: "SIGTERM",
        stdout: response(HEADERS, "partial job log"),
      });
    });

    expect(ghApi(apiPath, execute)).toEqual({
      error: `The GitHub response is too large. The limit is ${String(MAX_RESPONSE_BYTES)} bytes.`,
      reading: { remaining: 2785, limit: 5000, reset: 1789723893, resource: "core" },
    });
    expect(execute).toHaveBeenCalledWith("gh", ["api", "-i", apiPath], {
      encoding: "utf-8",
      maxBuffer: MAX_RESPONSE_BYTES,
    });
  });

  it("discards an incomplete rate-limit header when the response overflows", () => {
    const execute = () => {
      throw Object.assign(new Error("GitHub CLI output exceeded maxBuffer"), {
        code: "ENOBUFS",
        stdout: `HTTP/2.0 200 OK\n${HEADERS.join("\r\n")}\r\n`,
      });
    };

    expect(ghApi("repos/owner/repo/actions/jobs/123/logs", execute)).toEqual({
      error: `The GitHub response is too large. The limit is ${String(MAX_RESPONSE_BYTES)} bytes.`,
      reading: undefined,
    });
  });

  it("rejects the partial output of an interrupted GitHub CLI", () => {
    const execute = () => {
      throw Object.assign(new Error("Command was interrupted"), {
        signal: "SIGTERM",
        status: null,
        stdout: response(HEADERS, "partial job log"),
      });
    };

    expect(ghApi("repos/owner/repo/actions/jobs/123/logs", execute)).toEqual({
      error: "The GitHub CLI was interrupted (SIGTERM).",
      reading: { remaining: 2785, limit: 5000, reset: 1789723893, resource: "core" },
    });
  });

  it("preserves the HTTP response returned with an ordinary nonzero exit", () => {
    const text = "HTTP/2.0 404 Not Found\n\n";
    const execute = () => {
      throw Object.assign(new Error("Not Found"), { signal: null, status: 1, stdout: text });
    };

    expect(ghApi("repos/owner/repo/actions/jobs/404/logs", execute)).toEqual({ text });
  });

  it("reports and saves the budget without saving a truncated job log", async () => {
    const root = await mkdtemp(path.join(await realpath(os.tmpdir()), "gh-budget-overflow-"));
    try {
      const libraryDirectory = path.join("scripts", "lib");
      await mkdir(path.join(root, "scripts"));
      await copyFile(path.join(repoRoot, SCRIPT_REL), path.join(root, SCRIPT_REL));
      await cp(path.join(repoRoot, libraryDirectory), path.join(root, libraryDirectory), {
        recursive: true,
      });

      // Inject the child error at the process boundary without a real call or a 64 MiB fixture.
      const preload = path.join(root, "overflow.cjs");
      await writeFile(
        preload,
        [
          'const childProcess = require("node:child_process");',
          "childProcess.execFileSync = (command, args) => {",
          '  if (command === "git" && args.join(" ") === "remote get-url origin") {',
          '    return "https://github.com/owner/repo.git\\n";',
          "  }",
          '  if (command !== "gh" || args.join(" ") !== "api -i repos/owner/repo/actions/jobs/123/logs") {',
          '    throw new Error("Unexpected command in the fixture.");',
          "  }",
          '  throw Object.assign(new Error("Output exceeded maxBuffer"), {',
          '    code: "ENOBUFS",',
          `    stdout: ${JSON.stringify(response(HEADERS, "partial job log"))},`,
          "  });",
          "};",
          'require("node:module").syncBuiltinESMExports();',
          "",
        ].join("\n"),
        "utf8",
      );

      const result = spawnSync(
        process.execPath,
        ["--require", preload, path.join(root, SCRIPT_REL), "log", "123"],
        { cwd: root, encoding: "utf8", timeout: 10000 },
      );
      expect(result).toMatchObject({
        status: 2,
        stdout: "REST calls left: 2785 of 5000 (core), resets 09:31 UTC\n",
        stderr: `The GitHub response is too large. The limit is ${String(MAX_RESPONSE_BYTES)} bytes.\n`,
      });
      const cache = path.join(root, "tmp", "gh-budget");
      expect(readdirSync(cache)).toEqual(["last-reading.json"]);
      expect(JSON.parse(await readFile(path.join(cache, "last-reading.json"), "utf8"))).toEqual({
        remaining: 2785,
        limit: 5000,
        reset: 1789723893,
        resource: "core",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
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

describe("branch overview conclusions are separate from gate receipts", () => {
  const shared = {
    head_branch: "topic",
    head_sha: "a".repeat(40),
    workflow_id: 41,
    name: "CI",
    event: "pull_request",
    status: "completed",
  };

  it("keeps a same-head cleanup skip in the overview beside a matching verification success", () => {
    // REST-shaped metadata has no confirmed action or job purpose. The overview
    // retains conclusions; it does not decide whether a skipped job is cleanup.
    const cleanup = {
      ...shared,
      id: 5102,
      run_attempt: 2,
      check_suite_id: 6102,
      created_at: "2026-01-02T10:01:00Z",
      conclusion: "skipped",
    };
    const verification = {
      ...shared,
      id: 5101,
      run_attempt: 1,
      check_suite_id: 6101,
      created_at: "2026-01-02T10:00:00Z",
      conclusion: "success",
    };
    const response = { total_count: 2, workflow_runs: [cleanup, verification] };
    expect(branchRows(response.workflow_runs)).toEqual([
      { branch: "topic", head: "aaaaaaa", state: "done", result: "skipped" },
    ]);
    expect(branchRows([verification, cleanup])).toEqual([
      { branch: "topic", head: "aaaaaaa", state: "done", result: "skipped" },
    ]);
  });

  it("keeps a later same-head failure and drops an older-head success", () => {
    const response = {
      total_count: 3,
      workflow_runs: [
        { ...shared, id: 5104, run_attempt: 2, conclusion: "failure" },
        { ...shared, id: 5103, run_attempt: 1, conclusion: "success" },
        { ...shared, id: 5100, run_attempt: 1, head_sha: "b".repeat(40), conclusion: "success" },
      ],
    };
    expect(branchRows(response.workflow_runs)).toEqual([
      { branch: "topic", head: "aaaaaaa", state: "done", result: "failure" },
    ]);
  });

  it("documents that the overview neither proves verification nor identifies cleanup", async () => {
    const source = await readFile(path.join(repoRoot, SCRIPT_REL), "utf-8");
    const declaration = source.indexOf("export function branchRows(runs)");
    const comment = source.slice(source.lastIndexOf("/**", declaration), declaration);
    expect(comment).toMatch(/overview/i);
    expect(comment).toMatch(/not.*formal verification/i);
    expect(comment).toMatch(
      /drops workflow,.*event, run attempt, job, check and purpose context/is,
    );
    expect(comment).toMatch(
      /closed cleanup SKIP.*share a head and check name.*without proving its behavior/is,
    );
    expect(comment).toMatch(/individual runs and logs.*required verification/is);
    expect(comment).toMatch(/check name or workflow event cannot establish cleanup purpose/i);
  });
});

// The cache lives in `tmp/`, which anything running in the checkout can write
// to. A component or an entry replaced by a link would otherwise carry a saved
// job log, megabytes of it, to wherever the link points.
describe("the cache writes only inside its own directory", () => {
  const PARTS = ["tmp", "gh-budget"];
  let base = "";
  let outside = "";

  beforeEach(async () => {
    base = await mkdtemp(path.join(os.tmpdir(), "gh-budget-cache-"));
    outside = await mkdtemp(path.join(os.tmpdir(), "gh-budget-outside-"));
  });

  afterEach(async () => {
    fsHooks.beforeOpen = undefined;
    fsHooks.afterOpen = undefined;
    fsHooks.closeFails = false;
    fsHooks.writes = 0;
    await rm(base, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });

  it("creates the directory, writes the entry and replaces it, leaving no temporary file", () => {
    const first = writeCacheEntry(base, PARTS, "job-1.log", "first", 64);
    expect(first.error).toBeUndefined();
    const second = writeCacheEntry(base, PARTS, "job-1.log", "second", 64);
    expect(second.path).toBe(path.join(base, ...PARTS, "job-1.log"));
    expect(readFileSync(path.join(base, ...PARTS, "job-1.log"), "utf-8")).toBe("second");
    expect(readdirSync(path.join(base, ...PARTS))).toEqual(["job-1.log"]);
  });

  // A junction needs no privilege on Windows and is a directory link elsewhere.
  it("refuses a cache directory that is a link, and writes nothing where it points", () => {
    mkdirSync(path.join(base, "tmp"));
    symlinkSync(outside, path.join(base, ...PARTS), "junction");
    const written = writeCacheEntry(base, PARTS, "job-1.log", "log", 64);
    expect(written.error).toMatch(/not a plain directory/);
    expect(readdirSync(outside)).toEqual([]);
  });

  it("refuses a parent of the cache directory that is a link", () => {
    symlinkSync(outside, path.join(base, "tmp"), "junction");
    const written = writeCacheEntry(base, PARTS, "job-1.log", "log", 64);
    expect(written.error).toMatch(/not a plain directory/);
    expect(readdirSync(outside)).toEqual([]);
  });

  it("refuses to replace an entry that is a link, and leaves both sides alone", () => {
    const directory = path.join(base, ...PARTS);
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(outside, "kept.txt"), "kept");
    symlinkSync(outside, path.join(directory, "job-1.log"), "junction");
    const written = writeCacheEntry(base, PARTS, "job-1.log", "log", 64);
    expect(written.error).toMatch(/not a regular file with one link/);
    expect(readdirSync(outside)).toEqual(["kept.txt"]);
    expect(readdirSync(directory)).toEqual(["job-1.log"]);
  });

  it.each(["../job-1.log", "a/b.log", "..", ".hidden", ""])("refuses the entry name %j", (name) => {
    expect(writeCacheEntry(base, PARTS, name, "log", 64).error).toMatch(/not a plain file name/);
    expect(existsSync(path.join(base, "tmp"))).toBe(false);
  });

  it("refuses text over the bound before creating anything", () => {
    const written = writeCacheEntry(base, PARTS, "job-1.log", "x".repeat(65), 64);
    expect(written.error).toMatch(/over 64/);
    expect(existsSync(path.join(base, "tmp"))).toBe(false);
  });

  // The open reaches the directory by name after it was verified, so a swap in
  // that gap would otherwise carry the whole log to the link's target.
  it("refuses a directory swapped for a link before the open, writing no byte", () => {
    const directory = path.join(base, ...PARTS);
    mkdirSync(directory, { recursive: true });
    fsHooks.beforeOpen = () => {
      fsHooks.beforeOpen = undefined;
      renameSync(directory, path.join(base, "tmp", "moved"));
      symlinkSync(outside, directory, "junction");
    };
    const written = writeCacheEntry(base, PARTS, "job-1.log", "log", 64);
    expect(written.error).toMatch(/changed before the entry was written/);
    expect(fsHooks.writes).toBe(0);
    expect(readdirSync(outside)).toEqual([]);
  });

  it("refuses a temporary name that no longer leads to the opened file, writing no byte", () => {
    const directory = path.join(base, ...PARTS);
    const moved = path.join(base, "moved.tmp");
    fsHooks.afterOpen = (file) => {
      fsHooks.afterOpen = undefined;
      renameSync(file, moved);
      writeFileSync(file, "planted");
    };
    const written = writeCacheEntry(base, PARTS, "job-1.log", "log", 64);
    expect(written.error).toMatch(/not the file that was opened/);
    expect(fsHooks.writes).toBe(0);
    expect(statSync(moved).size).toBe(0);
    expect(readdirSync(directory)).toEqual([]);
  });

  it("counts a failed close as a failed write and removes the temporary file", () => {
    fsHooks.closeFails = true;
    const written = writeCacheEntry(base, PARTS, "job-1.log", "log", 64);
    expect(written.error).toMatch(/could not be closed/);
    expect(readdirSync(path.join(base, ...PARTS))).toEqual([]);
  });

  // A log that fit the buffer it was received in must not be refused once its
  // invalid bytes have each become a three-byte replacement character.
  it("bounds a saved log above the most its received bytes can re-encode to", () => {
    const invalid = Buffer.alloc(16, 0xff);
    const reencoded = Buffer.byteLength(invalid.toString("utf-8"), "utf-8");
    expect(reencoded).toBe(3 * invalid.length);
    expect(LOG_MAX_BYTES).toBeGreaterThanOrEqual(3 * MAX_RESPONSE_BYTES);
  });

  it("verifies an existing directory without creating a missing one", () => {
    expect(cacheDirectory(base, PARTS, { create: false }).error).toMatch(/does not exist/);
    expect(existsSync(path.join(base, "tmp"))).toBe(false);
    mkdirSync(path.join(base, ...PARTS), { recursive: true });
    expect(cacheDirectory(base, PARTS, { create: false }).path).toBe(path.join(base, ...PARTS));
  });
});
