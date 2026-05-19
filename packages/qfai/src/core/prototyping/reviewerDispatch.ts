/**
 * Reviewer sub-agent dispatch boundary.
 *
 * The prototyping evolution loop dispatches a Reviewer sub-agent per
 * `(specId, screen)` pair. The Reviewer is the role that drives
 * Playwright (loads the prototype, navigates menu entries, inspects DOM /
 * a11y) and emits the `iter-NN/spec-NNNN/<screen>.review.json` payload
 * that downstream `iterate` / `certify` steps consume.
 *
 * Two structural invariants this module exists to enforce:
 *
 *   1. Playwright is invoked **inside** the Reviewer sub-agent boundary
 *      — not by an orchestrator-side `captureScreenshots()` step. The
 *      orchestrator only dispatches; the Reviewer owns the browser.
 *   2. The Reviewer cycle does NOT persist raw `.png` / `.html` /
 *      `interaction.json` artifacts under `iter-NN/`. Only the review
 *      JSON survives. Heavy artifacts are inspected in-memory inside the
 *      Reviewer's Playwright session and discarded.
 *
 * This file ships a minimal interface + a single dispatch entry point.
 * The actual Playwright runner is injected via `options.playwrightRunner`
 * so the loop driver can swap real Playwright at production runtime and
 * tests can inject a deterministic stub. Production callers MUST inject a
 * runner; an absent runner is a programmer error and the dispatch
 * returns `finalStatus: "failed"` with a clear `errorMessage` rather
 * than silently using an internal default.
 */

export type ReviewerAttemptResult = {
  readonly ok: boolean;
  readonly attemptIndex: number;
  readonly errorMessage?: string;
};

export type ReviewerOutcome = {
  readonly specId: string;
  readonly screen: string;
  readonly attempts: readonly ReviewerAttemptResult[];
  readonly finalStatus: "ok" | "failed";
  readonly reviewJsonPath?: string;
};

/**
 * Result of a single Reviewer-driven Playwright session attempt.
 *
 * `reviewJson` is the in-memory review payload the Reviewer would
 * normally hand back to the loop driver (which then writes
 * `<screen>.review.json`). It is intentionally typed as `unknown`
 * because the schema lives in `evaluatorReview.ts` and this dispatch
 * boundary stays schema-agnostic.
 */
export type ReviewerPlaywrightAttempt = {
  readonly ok: boolean;
  readonly reviewJson?: unknown;
  readonly error?: string;
};

export type ReviewerPlaywrightRunner = (
  specId: string,
  screen: string,
) => Promise<ReviewerPlaywrightAttempt>;

export type ReviewerDispatchOptions = {
  /**
   * Maximum number of Playwright attempts per `(specId, screen)` pair.
   * The dispatcher returns on the first successful attempt; if every
   * attempt fails, the outcome is `failed` and the caller is expected
   * to treat the pair as a hard-stop (do not declare convergence).
   */
  readonly attemptLimit: number;
  /**
   * Injectable Playwright runner. Production passes the real launcher
   * (which spawns Playwright inside the Reviewer sub-agent boundary);
   * tests pass a deterministic stub. Required — see file header.
   */
  readonly playwrightRunner?: ReviewerPlaywrightRunner;
};

const NO_RUNNER_MESSAGE =
  "reviewerDispatch: no playwright runner injected; the Reviewer sub-agent " +
  "cannot drive Playwright. Production callers must inject options.playwrightRunner.";

const SILENT_FAIL_MESSAGE =
  "reviewerDispatch: playwright attempt failed without error message";

/**
 * Dispatch the Reviewer sub-agent against a single `(specId, screen)`
 * pair, retrying up to `options.attemptLimit` times.
 *
 * Contract:
 *   - `attemptLimit` is clamped to a positive integer; non-positive
 *     values produce a `failed` outcome with zero attempts so the
 *     caller never has to second-guess the loop bound.
 *   - The runner is awaited sequentially (no parallel attempts) so the
 *     attempt index in the outcome reflects causal order.
 *   - On the first `ok` runner result, dispatch returns immediately
 *     with `finalStatus: "ok"`; remaining attempts are not consumed.
 *   - After `attemptLimit` failed attempts (or an absent runner), the
 *     outcome is `finalStatus: "failed"` and `attempts[]` carries one
 *     entry per attempted call (or a single synthetic entry when the
 *     runner was missing) so callers can name the pair in stderr.
 */
export async function dispatchReviewerToPair(
  specId: string,
  screen: string,
  options: ReviewerDispatchOptions,
): Promise<ReviewerOutcome> {
  const runner = options.playwrightRunner;
  if (!runner) {
    return {
      specId,
      screen,
      attempts: [
        {
          ok: false,
          attemptIndex: 0,
          errorMessage: NO_RUNNER_MESSAGE,
        },
      ],
      finalStatus: "failed",
    };
  }

  const limit =
    Number.isInteger(options.attemptLimit) && options.attemptLimit > 0
      ? options.attemptLimit
      : 0;
  if (limit === 0) {
    return {
      specId,
      screen,
      attempts: [],
      finalStatus: "failed",
    };
  }

  const attempts: ReviewerAttemptResult[] = [];
  for (let i = 0; i < limit; i += 1) {
    let result: ReviewerPlaywrightAttempt;
    try {
      result = await runner(specId, screen);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      attempts.push({ ok: false, attemptIndex: i, errorMessage: message });
      continue;
    }
    if (result.ok) {
      attempts.push({ ok: true, attemptIndex: i });
      return {
        specId,
        screen,
        attempts,
        finalStatus: "ok",
      };
    }
    attempts.push({
      ok: false,
      attemptIndex: i,
      errorMessage: result.error ?? SILENT_FAIL_MESSAGE,
    });
  }

  return {
    specId,
    screen,
    attempts,
    finalStatus: "failed",
  };
}
