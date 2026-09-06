/**
 * Stops the suite emitting real GitHub workflow commands.
 *
 * `qfai validate --format github` writes `::error file=…::message` straight to
 * `process.stdout`, and `issue.file` is relative to the tree being VALIDATED. A
 * test validates a `mkdtemp` fixture, so the path it emits is
 * `.qfai/specs/_policies/03_Capabilities.md` — and the runner resolves a
 * relative path against the REPOSITORY. The fixture's findings then annotate
 * this repository's own files, saying a file that plainly exists is missing.
 *
 * The damage is not cosmetic. GitHub caps annotations at **ten per level per
 * step**, so a lane whose fixtures emit ten `error` commands has no room left
 * for a real one — the cap was measured at `{"warning":10,"failure":10,
 * "notice":10}` on the `test (cli)` lane, all three saturated by fixtures
 * (#1160). And a green job carrying `failure` annotations teaches every reader
 * to distrust the annotation surface.
 *
 * Two tests already captured stdout with `vi.spyOn` and did not leak. The
 * discipline existed and did not scale: a new test that calls `qfai init` and
 * validates it re-opens the hole with nothing to notice. This closes it once,
 * for every project, so no future test has to remember.
 *
 * **Suppressed, not silenced.** The line is dropped from the runner's stdout
 * and counted, and the count is printed on exit as ordinary text. A filter
 * nobody can see is the next version of this defect.
 *
 * A `vi.spyOn(process.stdout, "write")` in a test replaces this wrapper for the
 * duration, so a test that ASSERTS on the emitted command still sees it — the
 * spy sits above this, not below it.
 */

/**
 * A GitHub workflow command: `::name key=value,key=value::value`, or the
 * parameterless `::name::value` / `::endgroup::` forms.
 *
 * Anchored, and the name is `[a-z][a-z-]*` rather than anything: a test that
 * prints a captured string beginning with `::` is data, not a command, and
 * dropping it would hide the very output a row is asserting on.
 */
const WORKFLOW_COMMAND = /^::[a-z][a-z-]*(?:\s[^\n]*?)?::/;

let suppressed = 0;

const originalWrite = process.stdout.write.bind(process.stdout);

type WriteArgs = Parameters<typeof process.stdout.write>;

process.stdout.write = ((...args: WriteArgs): boolean => {
  const [chunk] = args;
  const text =
    typeof chunk === "string"
      ? chunk
      : chunk instanceof Uint8Array
        ? Buffer.from(chunk).toString("utf-8")
        : null;

  if (text === null || !text.includes("::")) {
    return originalWrite(...args);
  }

  // Line by line: one `write` can carry several, and a chunk that mixes a
  // command with ordinary output must keep the ordinary half.
  const lines = text.split("\n");
  const kept = lines.filter((line) => {
    if (!WORKFLOW_COMMAND.test(line)) {
      return true;
    }
    suppressed += 1;
    report(line);
    return false;
  });
  if (kept.length === lines.length) {
    return originalWrite(...args);
  }
  const rebuilt = kept.join("\n");
  if (rebuilt.trim().length === 0) {
    // Nothing but commands: report the write as accepted without making one.
    const callback = args.find((argument) => typeof argument === "function");
    if (typeof callback === "function") {
      (callback as () => void)();
    }
    return true;
  }
  return originalWrite(rebuilt);
}) as typeof process.stdout.write;

// A marker the probe row reads: "the wrapper is installed" has to be
// checkable from inside a test, or a green run cannot tell it apart from
// a setup that never loaded.
(process.stdout.write as unknown as { qfaiSuppressor?: boolean }).qfaiSuppressor = true;

/**
 * Reports a drop the moment it happens, on STDERR.
 *
 * Not on `exit`: each test file runs in its own fork, and a worker's `exit`
 * handler does not reach the runner's output — measured, by watching a summary
 * written there fail to appear. A report nobody receives is the same silence
 * this exists to avoid.
 *
 * Stderr, because GitHub parses workflow commands out of stdout only, so a
 * report ABOUT a dropped command must not be able to become one.
 *
 * Bounded: the first few in full, so the offending test is identifiable, then a
 * running count. A lane leaking 138 of these should be legible, not a wall.
 */
function report(line: string): void {
  if (suppressed <= 3) {
    process.stderr.write(`[test setup] dropped a GitHub workflow command (#1160): ${line}\n`);
    return;
  }
  if (suppressed % 20 === 0) {
    process.stderr.write(
      `[test setup] dropped ${String(suppressed)} GitHub workflow commands so far (#1160)\n`,
    );
  }
}
