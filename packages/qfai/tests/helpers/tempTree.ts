import { rm } from "node:fs/promises";

/**
 * Remove a temporary tree that a spawned process used, on an operating system that may not have
 * released it yet.
 *
 * **This is not a retry that masks a race between tests.** `vitest.knobs.ts` states, correctly, that
 * this suite declares no test-level retries because re-running a failing test hides the collisions
 * that more workers surface. This is a different thing: Windows releases a child process's handle on
 * its working directory **asynchronously after the child has already exited**, so `execFile`'s promise
 * can resolve while the directory is still locked. `rm` then fails with `EBUSY`, and no amount of
 * correctness in the test can prevent it — the contract Node offers for exactly this case is
 * `maxRetries` / `retryDelay`, and using it is honouring the platform rather than papering over a bug.
 *
 * Round 20 of `spec-0017` observed it: `EBUSY: resource busy or locked, rmdir
 * 'C:\\…\\qfai-spec0010-e2e-PRnKEm'` in a full-suite run at ten workers, in a test that had already
 * passed its assertions. Twenty-one test files spawn a process and then remove a tree; they call this
 * so there is one copy of the rule rather than twenty-one.
 *
 * **`EBUSY` is not the only code this covers, and Windows is not the only platform.** `rm` unlinks a
 * directory's contents and then removes the directory, so a writer that puts a file back between
 * those two steps fails the second with `ENOTEMPTY` — on Linux as readily as anywhere else. Node
 * lists both codes, with `EMFILE`, `ENFILE` and `EPERM`, as what `maxRetries` is for.
 *
 * The suite's own such writer was git: `git commit` starts a detached `git maintenance run --auto`
 * that keeps writing into `.git/objects/pack` after the commit has returned. That one is removed at
 * the source by `tests/setup/disableGitAutoMaintenance.ts`, because a retry budget still leaves a
 * window and a fixture repository has no use for maintenance. This helper covers the writers that
 * cannot be removed that way.
 *
 * `force: true` keeps an already-absent directory from being an error, which is what every caller
 * wanted from the plain `rm` this replaces. It does not cover either code above: it suppresses a
 * directory that is gone, not one that has been refilled.
 */
export async function removeTempTree(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
}
