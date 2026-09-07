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

/**
 * Discriminator for the Reviewer dispatch outcome.
 *
 * Mirrors the per-`<screen>.review.json#sessionStatus` enum in the
 * shipped reference
 * (`.qfai/assistant/skills/qfai-prototyping/references/review-payload-schema.md`):
 *
 *   - `ok`             — Reviewer Playwright session completed.
 *   - `retryExhausted` — every attempt in the bounded retry budget
 *                        returned `{ok: false}` (typically transient
 *                        Reviewer-side failures: timeouts, evaluation
 *                        errors, etc).
 *   - `launchFailed`   — the dispatcher could not even start the
 *                        Reviewer (no runner injected). Distinct from
 *                        `retryExhausted` so the orchestrator can
 *                        distinguish "we never tried" from "we tried N
 *                        times and gave up".
 *
 * Used together with the contract hard-stop class (2) discriminator so
 * exit 64 can be disambiguated from convergence-exit-64 by reading the
 * persisted `sessionStatus` on the review payload.
 */
export type ReviewerSessionStatus = "ok" | "retryExhausted" | "launchFailed";

export type ReviewerOutcome = {
  readonly specId: string;
  readonly screen: string;
  readonly attempts: readonly ReviewerAttemptResult[];
  readonly finalStatus: ReviewerSessionStatus;
  readonly reviewJsonPath?: string;
  /**
   * In-memory review payload returned by the successful Reviewer
   * Playwright attempt. Surfaced on `finalStatus: "ok"` outcomes so the
   * loop driver can persist it (the file header contract states that
   * the runner returns the review JSON in-memory and the driver writes
   * `<screen>.review.json`). Omitted on `retryExhausted` /
   * `launchFailed` outcomes because no attempt produced a payload.
   *
   * codex review r3264765754 (P2): pre-fix the dispatcher dropped the
   * runner's `reviewJson` on the floor and never set `reviewJsonPath`
   * either, so production callers got `finalStatus: "ok"` with neither
   * payload nor path — making the success state operationally useless.
   */
  readonly reviewJson?: unknown;
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

/**
 * Backoff function: receives the zero-based attempt index that just
 * failed and returns the number of milliseconds to wait before the
 * next attempt. Returning a non-positive number skips the wait.
 *
 * The retry policy documented in the shipped reference
 * (`.qfai/assistant/skills/qfai-prototyping/references/review-payload-schema.md`
 * §`sessionStatus` and the retry policy) is `N = 3` with
 * exponential backoff. The default backoff
 * ({@link defaultExponentialBackoff}) realises that policy as `base *
 * 2^attemptIndex` ms with `base = 250`.
 */
export type ReviewerBackoffStrategy = (attemptIndex: number) => number;

/**
 * Default contract retry budget: N = 3 attempts per `(specId, screen)`
 * pair. Callers can override via {@link ReviewerDispatchOptions.attemptLimit}.
 */
export const DEFAULT_REVIEWER_ATTEMPT_LIMIT = 3;

/**
 * Default exponential backoff function: 250 ms * 2^attemptIndex.
 *
 * Attempt 0 failure → wait 250 ms
 * Attempt 1 failure → wait 500 ms
 * Attempt 2 failure → wait 1000 ms (terminal under N = 3, so unused)
 *
 * Pure function exposed for tests so the dispatcher's wait schedule is
 * verifiable without a real clock. Production callers pass a real
 * sleeper into {@link ReviewerDispatchOptions.sleep} if they want to
 * actually wait; the dispatcher never reaches for `setTimeout` itself.
 */
export const defaultExponentialBackoff: ReviewerBackoffStrategy = (attemptIndex) =>
  250 * Math.pow(2, attemptIndex);

export type ReviewerDispatchOptions = {
  /**
   * Maximum number of Playwright attempts per `(specId, screen)` pair.
   * The dispatcher returns on the first successful attempt; if every
   * attempt fails, the outcome is `retryExhausted` and the caller is
   * expected to treat the pair as a hard-stop (do not declare
   * convergence). Defaults to {@link DEFAULT_REVIEWER_ATTEMPT_LIMIT}
   * (= N from the prototyping CLI contract) when omitted.
   */
  readonly attemptLimit?: number;
  /**
   * Injectable Playwright runner. Production passes the real launcher
   * (which spawns Playwright inside the Reviewer sub-agent boundary);
   * tests pass a deterministic stub. Required — see file header.
   */
  readonly playwrightRunner?: ReviewerPlaywrightRunner;
  /**
   * Backoff strategy between failed attempts. Defaults to
   * {@link defaultExponentialBackoff} (contract: exponential backoff).
   * Pass a custom strategy (or `() => 0`) to override; the dispatcher
   * itself does no clock IO — the wait actually happens via {@link sleep}.
   */
  readonly backoff?: ReviewerBackoffStrategy;
  /**
   * Sleep function used to honour the backoff schedule. Defaults to a
   * `setTimeout`-based promise. Tests inject a no-op sleeper so the
   * dispatcher resolves immediately while still recording attempt
   * order. Returning a settled promise from the sleeper is sufficient
   * — the dispatcher never inspects the return value.
   */
  readonly sleep?: (ms: number) => Promise<void>;
  /**
   * Optional persistence callback invoked exactly once on a successful
   * Reviewer attempt with the in-memory `reviewJson` payload returned
   * by the runner. Must return the absolute on-disk path of the written
   * `<screen>.review.json` file; the dispatcher records the returned
   * path on the outcome's `reviewJsonPath`.
   *
   * codex review r3264765754 (P2): kept optional so existing test stubs
   * (which only need to assert payload propagation) do not have to
   * wire a writer. Production callers inject a real writer; persistence
   * failures propagate as thrown errors and the dispatcher records the
   * failure as another attempt (consistent with the runner-throw path).
   */
  readonly persistReviewJson?: (
    specId: string,
    screen: string,
    payload: unknown,
  ) => Promise<string>;
};

const NO_RUNNER_MESSAGE =
  "reviewerDispatch: no playwright runner injected; the Reviewer sub-agent " +
  "cannot drive Playwright. Production callers must inject options.playwrightRunner.";

const SILENT_FAIL_MESSAGE = "reviewerDispatch: playwright attempt failed without error message";

function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dispatch the Reviewer sub-agent against a single `(specId, screen)`
 * pair, retrying up to `options.attemptLimit` times with the configured
 * backoff between attempts.
 *
 * Contract:
 *   - `attemptLimit` defaults to {@link DEFAULT_REVIEWER_ATTEMPT_LIMIT}
 *     (N = 3 per the prototyping CLI contract) when omitted; explicit
 *     non-positive values produce a `retryExhausted` outcome with zero
 *     attempts so the caller never has to second-guess the loop bound.
 *   - The runner is awaited sequentially (no parallel attempts) so the
 *     attempt index in the outcome reflects causal order.
 *   - On the first `ok` runner result, dispatch returns immediately
 *     with `finalStatus: "ok"`; remaining attempts are not consumed.
 *   - Between failed attempts the dispatcher awaits
 *     `sleep(backoff(attemptIndex))` so retries honour the contract
 *     exponential-backoff policy without coupling the dispatcher to a
 *     real clock. The wait is skipped after the final attempt (no
 *     point sleeping when the outcome is sealed).
 *   - After `attemptLimit` failed attempts the outcome is
 *     `finalStatus: "retryExhausted"`; an absent runner short-circuits
 *     to `"launchFailed"`. `attempts[]` carries one entry per
 *     attempted call (or a single synthetic entry when the runner was
 *     missing) so callers can name the pair in stderr.
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
      finalStatus: "launchFailed",
    };
  }

  const rawLimit = options.attemptLimit ?? DEFAULT_REVIEWER_ATTEMPT_LIMIT;
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : 0;
  if (limit === 0) {
    return {
      specId,
      screen,
      attempts: [],
      finalStatus: "retryExhausted",
    };
  }

  const backoff = options.backoff ?? defaultExponentialBackoff;
  const sleep = options.sleep ?? defaultSleep;

  const attempts: ReviewerAttemptResult[] = [];
  for (let i = 0; i < limit; i += 1) {
    let result: ReviewerPlaywrightAttempt;
    try {
      result = await runner(specId, screen);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      attempts.push({ ok: false, attemptIndex: i, errorMessage: message });
      if (i < limit - 1) {
        try {
          await sleep(backoff(i));
        } catch (sleepErr) {
          // A misbehaving sleeper must not corrupt the outcome — record
          // it as another failed attempt and treat the schedule as
          // exhausted. The caller already gates on `finalStatus`.
          const sleepMsg = sleepErr instanceof Error ? sleepErr.message : String(sleepErr);
          attempts.push({
            ok: false,
            attemptIndex: i,
            errorMessage: `reviewerDispatch: backoff sleep failed: ${sleepMsg}`,
          });
          break;
        }
      }
      continue;
    }
    if (result.ok) {
      // codex review r3265074289 (P3): a runner returning
      // `{ok: true}` without a `reviewJson` payload is a schema-invalid
      // success — there is nothing for the persister to write, and
      // letting it flow through silently would seal a downstream
      // certificate with no review artifact. Symmetric with the
      // runner-throw / sleeper-throw / persister-throw paths: record
      // the synthetic failed attempt, break, and fall through to
      // `retryExhausted` so the caller treats the pair as
      // uncompleted. The error message names the missing payload so
      // operators can diagnose the runner contract violation.
      if (result.reviewJson === undefined) {
        attempts.push({
          ok: false,
          attemptIndex: i,
          errorMessage: "reviewerDispatch: runner returned ok without reviewJson payload",
        });
        break;
      }
      attempts.push({ ok: true, attemptIndex: i });
      // codex review r3264765754 (P2): propagate the in-memory
      // `reviewJson` payload to the outcome and (optionally) call the
      // injected persister to write the `<screen>.review.json` file.
      // The persister is invoked exactly once on the FIRST successful
      // attempt; persistence failures are recorded as a synthetic
      // failed attempt (symmetric with the runner-throw + sleeper-throw
      // paths above) so the outcome's `finalStatus` remains the source
      // of truth for the operator-facing gate.
      const successPayload = result.reviewJson;
      if (options.persistReviewJson !== undefined) {
        try {
          const writtenPath = await options.persistReviewJson(specId, screen, successPayload);
          return {
            specId,
            screen,
            attempts,
            finalStatus: "ok",
            reviewJsonPath: writtenPath,
            reviewJson: successPayload,
          };
        } catch (persistErr) {
          const persistMsg = persistErr instanceof Error ? persistErr.message : String(persistErr);
          attempts.push({
            ok: false,
            attemptIndex: i,
            errorMessage: `reviewerDispatch: persistReviewJson failed: ${persistMsg}`,
          });
          // Persistence failure is treated as an exhausted schedule:
          // the runner succeeded but the driver could not record the
          // payload, so the caller cannot treat the pair as completed.
          break;
        }
      }
      return {
        specId,
        screen,
        attempts,
        finalStatus: "ok",
        reviewJson: successPayload,
      };
    }
    attempts.push({
      ok: false,
      attemptIndex: i,
      errorMessage: result.error ?? SILENT_FAIL_MESSAGE,
    });
    if (i < limit - 1) {
      try {
        await sleep(backoff(i));
      } catch (sleepErr) {
        const sleepMsg = sleepErr instanceof Error ? sleepErr.message : String(sleepErr);
        attempts.push({
          ok: false,
          attemptIndex: i,
          errorMessage: `reviewerDispatch: backoff sleep failed: ${sleepMsg}`,
        });
        break;
      }
    }
  }

  return {
    specId,
    screen,
    attempts,
    finalStatus: "retryExhausted",
  };
}
