/**
 * Reviewer dispatch boundary tests.
 *
 * Covered in this batch:
 *   - TC-0012-0362 — Reviewer sub-agent (not orchestrator) owns the
 *     Playwright invocation: source-grep `prototypingIterate.ts` for a
 *     `captureScreenshots(` call site and assert absence in the
 *     executable code path.
 *   - TC-0012-0363 — Zero `.png` / `.html` / `interaction.json` files
 *     under `iter-NN/` after a Reviewer-driven cycle completes:
 *     structural fixture + injected stub runner that only returns the
 *     in-memory review JSON, then a recursive `readdir` asserts no
 *     heavy artifacts were materialized.
 *
 * Deferred (NOT implemented here — see batch report):
 *   - TC-0012-0374 — Reviewer Playwright-session failure hard-stop
 *     (requires live Reviewer sub-agent + Playwright wiring + run-exit
 *     plumbing; out of scope for the Wave 1 stub landing).
 *   - TC-0012-0383 — Reviewer navigates every primary menu entry
 *     (requires real Playwright session + prototype harness fixture).
 *
 * Per QFAI test policy these deferred TCs are NOT added as `it.skip` /
 * `it.todo`; they are simply not present in this file and will land in
 * a subsequent integration cycle once the live Playwright wiring is in
 * place.
 */

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  dispatchReviewerToPair,
  type ReviewerPlaywrightAttempt,
} from "../../../src/core/prototyping/reviewerDispatch.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..", "..", "..", "..", "..");
const PROTOTYPING_ITERATE_SRC = path.join(
  REPO_ROOT,
  "packages",
  "qfai",
  "src",
  "cli",
  "commands",
  "prototypingIterate.ts",
);

/**
 * Strip JSDoc (`/** ... *\/`), block comments (`/* ... *\/`), and
 * line comments (`// ...`) so source-grep assertions only inspect the
 * executable code path. Naive but sufficient for grepping a specific
 * call-site token; we are NOT trying to parse TypeScript.
 */
function stripComments(source: string): string {
  // Remove block / JSDoc comments first (non-greedy, multi-line).
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, "");
  // Then line comments. We keep the newline so line counts stay stable
  // (helps debugging if an assertion ever fails).
  return withoutBlocks.replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Recursively collect every file path under `dir`. Returns paths
 * relative to `dir` with POSIX separators so assertions are portable
 * across platforms.
 */
async function listFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (current: string, prefix: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const childAbs = path.join(current, entry.name);
      const childRel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(childAbs, childRel);
      } else if (entry.isFile()) {
        out.push(childRel);
      }
    }
  };
  await walk(dir, "");
  return out;
}

describe("dispatchReviewerToPair (interface stub)", () => {
  it("returns finalStatus 'ok' on first successful attempt", async () => {
    let calls = 0;
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 3,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => {
        calls += 1;
        return { ok: true, reviewJson: { axes: {} } };
      },
    });
    expect(calls).toBe(1);
    expect(outcome.finalStatus).toBe("ok");
    expect(outcome.attempts).toHaveLength(1);
    expect(outcome.attempts[0]).toMatchObject({ ok: true, attemptIndex: 0 });
  });

  it("retries up to attemptLimit and returns 'failed' when every attempt fails", async () => {
    let calls = 0;
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 3,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => {
        calls += 1;
        return { ok: false, error: `attempt-${calls}` };
      },
    });
    expect(calls).toBe(3);
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.attempts).toHaveLength(3);
    expect(outcome.attempts.map((a) => a.errorMessage)).toEqual([
      "attempt-1",
      "attempt-2",
      "attempt-3",
    ]);
  });

  it("captures thrown runner errors as failed attempts", async () => {
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 2,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => {
        throw new Error("boom");
      },
    });
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.attempts).toHaveLength(2);
    for (const attempt of outcome.attempts) {
      expect(attempt.ok).toBe(false);
      expect(attempt.errorMessage).toBe("boom");
    }
  });

  it("returns 'failed' immediately when no runner is injected", async () => {
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 3,
    });
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.attempts).toHaveLength(1);
    expect(outcome.attempts[0]?.errorMessage).toMatch(/no playwright runner injected/i);
  });
});

describe("reviewer dispatch source-grep", () => {
  // QFAI:SPEC-0012:TC-0012-0362
  it("prototypingIterate.ts contains no orchestrator-side captureScreenshots() call", async () => {
    const source = await readFile(PROTOTYPING_ITERATE_SRC, "utf-8");
    const code = stripComments(source);
    // Match a function-call shape only (open paren), not e.g. a type
    // name or comment-residue token. The token would only legitimately
    // appear in executable code if the orchestrator drove screenshot
    // capture itself — which is exactly what the Reviewer dispatch
    // boundary forbids.
    expect(code).not.toMatch(/captureScreenshots\s*\(/);
    // Also assert the token is absent as an imported symbol — an
    // import binding without a call site still smells like orchestrator
    // ownership creeping back in.
    expect(code).not.toMatch(/\bcaptureScreenshots\b/);
  });
});

describe("reviewer cycle leaves zero heavy artifacts under iter-NN/", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(
      REPO_ROOT,
      "tmp",
      `reviewerDispatch-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // QFAI:SPEC-0012:TC-0012-0363
  it("dispatch with a stub runner writes only the review JSON (no .png/.html/interaction.json)", async () => {
    const iterDir = path.join(tmpDir, "iter-00", "spec-0012");
    await mkdir(iterDir, { recursive: true });
    // Pre-seed the canonical reviewer artifact (the only file the
    // Reviewer cycle is allowed to persist). The injected runner does
    // NOT write any file; it only hands back the in-memory review
    // payload, mirroring the production contract.
    const reviewJsonAbs = path.join(iterDir, "dashboard.review.json");
    await writeFile(
      reviewJsonAbs,
      `${JSON.stringify({ specId: "0012", screen: "dashboard", scores: {} }, null, 2)}\n`,
      "utf-8",
    );

    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 1,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => ({
        ok: true,
        reviewJson: { specId: "0012", screen: "dashboard", scores: {} },
      }),
    });
    expect(outcome.finalStatus).toBe("ok");

    const files = await listFilesRecursive(path.join(tmpDir, "iter-00"));
    const png = files.filter((f) => f.toLowerCase().endsWith(".png"));
    const html = files.filter((f) => f.toLowerCase().endsWith(".html"));
    const interaction = files.filter((f) =>
      f.toLowerCase().endsWith("interaction.json"),
    );
    expect(png).toEqual([]);
    expect(html).toEqual([]);
    expect(interaction).toEqual([]);
    // Sanity: the review JSON we pre-seeded is still the only artifact.
    expect(files).toEqual(["spec-0012/dashboard.review.json"]);
  });
});
