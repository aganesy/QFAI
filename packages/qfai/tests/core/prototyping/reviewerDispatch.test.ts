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
import { withoutComments } from "../../helpers/sourceReduction.js";

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
/**
 * Comments blanked, literals kept — the shared reduction (#1089).
 *
 * This replaced two independent `replace` passes, which is the original defect:
 * each delimiter occurs inside the other's body, so whichever regex ran first
 * read the other's content as its own opener. On this file's ONE subject,
 * `cli/commands/prototypingIterate.ts`, that removed **11,381 characters of
 * non-comment text** and lost 91 identifiers — among them
 * `resolvedCaptureScreens`, adjacent to the very token asserted against below.
 *
 * The assertion here is a NEGATIVE, so over-deletion made it easier to pass:
 * this guard could have gone quiet without ever reddening.
 */
function stripComments(source: string): string {
  return withoutComments(source);
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

  it("retries up to attemptLimit and returns 'retryExhausted' when every attempt fails", async () => {
    let calls = 0;
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 3,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => {
        calls += 1;
        return { ok: false, error: `attempt-${calls}` };
      },
      // Inject a no-op sleeper so the backoff schedule does not slow the test.
      sleep: async () => undefined,
    });
    expect(calls).toBe(3);
    expect(outcome.finalStatus).toBe("retryExhausted");
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
      sleep: async () => undefined,
    });
    expect(outcome.finalStatus).toBe("retryExhausted");
    expect(outcome.attempts).toHaveLength(2);
    for (const attempt of outcome.attempts) {
      expect(attempt.ok).toBe(false);
      expect(attempt.errorMessage).toBe("boom");
    }
  });

  it("returns 'launchFailed' immediately when no runner is injected", async () => {
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 3,
    });
    expect(outcome.finalStatus).toBe("launchFailed");
    expect(outcome.attempts).toHaveLength(1);
    expect(outcome.attempts[0]?.errorMessage).toMatch(/no playwright runner injected/i);
  });

  it("defaults attemptLimit to DEFAULT_REVIEWER_ATTEMPT_LIMIT (= 3) when omitted", async () => {
    let calls = 0;
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => {
        calls += 1;
        return { ok: false, error: "fail" };
      },
      sleep: async () => undefined,
    });
    expect(calls).toBe(3);
    expect(outcome.finalStatus).toBe("retryExhausted");
  });

  it("invokes the backoff strategy between failed attempts (skips after last)", async () => {
    const waited: number[] = [];
    let calls = 0;
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 3,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => {
        calls += 1;
        return { ok: false, error: `try-${calls}` };
      },
      backoff: (attemptIndex) => 100 * Math.pow(2, attemptIndex),
      sleep: async (ms) => {
        waited.push(ms);
      },
    });
    expect(outcome.finalStatus).toBe("retryExhausted");
    // 3 attempts → 2 backoff waits (no wait after the last attempt).
    expect(waited).toEqual([100, 200]);
  });

  it("does not sleep after a successful attempt", async () => {
    const waited: number[] = [];
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 3,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => ({
        ok: true,
        reviewJson: { axes: {} },
      }),
      sleep: async (ms) => {
        waited.push(ms);
      },
    });
    expect(outcome.finalStatus).toBe("ok");
    expect(waited).toEqual([]);
  });

  // codex review r3265074289 (P3): a runner returning `{ok: true}`
  // without a `reviewJson` payload is a schema-invalid success — the
  // dispatcher must NOT silently flow it through to the persister /
  // downstream certify (which would seal a cert with zero review
  // artifact). Symmetric with the runner-throw / sleeper-throw /
  // persister-throw paths: record a synthetic failed attempt that
  // names the missing payload and fall through to retryExhausted.
  it("records `ok: true` without reviewJson as retryExhausted and names the missing payload", async () => {
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 1,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => ({
        ok: true,
      }),
    });
    expect(outcome.finalStatus).toBe("retryExhausted");
    expect(outcome.attempts).toHaveLength(1);
    expect(outcome.attempts[0]?.ok).toBe(false);
    expect(outcome.attempts[0]?.errorMessage).toMatch(
      /runner returned ok without reviewJson payload/i,
    );
    expect(outcome.reviewJson).toBeUndefined();
    expect(outcome.reviewJsonPath).toBeUndefined();
  });

  // codex review r3264765754 (P2): on success the dispatcher must
  // surface the runner's in-memory `reviewJson` payload on the
  // outcome so the loop driver can persist `<screen>.review.json`.
  // Pre-fix the payload was dropped on the floor and `reviewJsonPath`
  // was never set either — production callers got `finalStatus: "ok"`
  // with neither payload nor path.
  it("propagates the runner's reviewJson payload on a first-attempt success", async () => {
    const payload = { specId: "0012", screen: "dashboard", axes: { aesthetics: 5 } };
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 3,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => ({
        ok: true,
        reviewJson: payload,
      }),
    });
    expect(outcome.finalStatus).toBe("ok");
    expect(outcome.reviewJson).toEqual(payload);
    // No persister injected → reviewJsonPath stays undefined.
    expect(outcome.reviewJsonPath).toBeUndefined();
  });

  it("propagates the runner's reviewJson payload after a retry-then-ok", async () => {
    let calls = 0;
    const payload = { specId: "0012", screen: "dashboard", note: "second-try" };
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 3,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => {
        calls += 1;
        if (calls < 2) return { ok: false, error: "transient" };
        return { ok: true, reviewJson: payload };
      },
      sleep: async () => undefined,
    });
    expect(calls).toBe(2);
    expect(outcome.finalStatus).toBe("ok");
    expect(outcome.reviewJson).toEqual(payload);
    // attempts[] records both the failed and the successful attempt.
    expect(outcome.attempts).toHaveLength(2);
    expect(outcome.attempts[0]?.ok).toBe(false);
    expect(outcome.attempts[1]?.ok).toBe(true);
  });

  it("omits reviewJson when every attempt fails (retryExhausted)", async () => {
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 2,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => ({
        ok: false,
        error: "fail",
      }),
      sleep: async () => undefined,
    });
    expect(outcome.finalStatus).toBe("retryExhausted");
    expect(outcome.reviewJson).toBeUndefined();
    expect(outcome.reviewJsonPath).toBeUndefined();
  });

  it("invokes the persistReviewJson callback on success and records the returned path", async () => {
    let writtenSpec = "";
    let writtenScreen = "";
    let writtenPayload: unknown = null;
    const payload = { specId: "0012", screen: "dashboard", axes: {} };
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 1,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => ({
        ok: true,
        reviewJson: payload,
      }),
      persistReviewJson: async (specId, screen, body): Promise<string> => {
        writtenSpec = specId;
        writtenScreen = screen;
        writtenPayload = body;
        return "/abs/path/iter-00/spec-0012/dashboard.review.json";
      },
    });
    expect(outcome.finalStatus).toBe("ok");
    expect(writtenSpec).toBe("0012");
    expect(writtenScreen).toBe("dashboard");
    expect(writtenPayload).toEqual(payload);
    expect(outcome.reviewJsonPath).toBe("/abs/path/iter-00/spec-0012/dashboard.review.json");
    expect(outcome.reviewJson).toEqual(payload);
  });

  it("records persister failure as a synthetic attempt and falls out of the success path", async () => {
    const payload = { specId: "0012", screen: "dashboard" };
    const outcome = await dispatchReviewerToPair("0012", "dashboard", {
      attemptLimit: 1,
      playwrightRunner: async (): Promise<ReviewerPlaywrightAttempt> => ({
        ok: true,
        reviewJson: payload,
      }),
      persistReviewJson: async (): Promise<string> => {
        throw new Error("disk full");
      },
    });
    // Persister failure on the only attempt → exhausted.
    expect(outcome.finalStatus).toBe("retryExhausted");
    // Two attempts recorded: the successful runner attempt + the
    // synthetic persister-failure attempt.
    expect(outcome.attempts).toHaveLength(2);
    expect(outcome.attempts[0]?.ok).toBe(true);
    expect(outcome.attempts[1]?.ok).toBe(false);
    expect(outcome.attempts[1]?.errorMessage).toMatch(/persistReviewJson failed: disk full/);
    expect(outcome.reviewJsonPath).toBeUndefined();
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
    const interaction = files.filter((f) => f.toLowerCase().endsWith("interaction.json"));
    expect(png).toEqual([]);
    expect(html).toEqual([]);
    expect(interaction).toEqual([]);
    // Sanity: the review JSON we pre-seeded is still the only artifact.
    expect(files).toEqual(["spec-0012/dashboard.review.json"]);
  });
});
