/**
 * E2E: a maintainer's pull request that breaks Windows parity is caught on that pull request.
 *
 * The journey, read from the repository's own CI and package script as a pull request meets
 * them: a code-path change selects the Windows job, the job runs the list a developer can run
 * locally, a failure there turns the aggregate verdict red, and a documentation-only change skips
 * the job under its declared name while the verdict stays green.
 */
import { describe, expect, it } from "vitest";

import {
  WINDOWS_JOB,
  job,
  needsOf,
  suiteList,
  testCommands,
  verdictExit,
} from "../integration/windowsParity/ownCi.js";

type Needs = Record<string, { result: string }>;

/** The verdict's needs map when every lane concluded `lanes`, and the Windows job `windows`. */
function needsWith(lanes: string, windows: string): Needs {
  return Object.fromEntries(
    needsOf(job("ci-pass")).map((name) => [
      name,
      { result: name === WINDOWS_JOB ? windows : name === "detect" ? "success" : lanes },
    ]),
  );
}

// QFAI:SPEC-0017:US-0017-0016
describe("E2E: the control-core and init suites run on Windows (US-0017-0016)", () => {
  it("US-0017-0016: a Windows regression fails the verdict on the pull request that causes it", () => {
    const windows = job(WINDOWS_JOB);

    // Selected exactly when the test lanes are, and so skipped on a documentation-only change.
    expect(windows["runs-on"]).toBe("windows-latest");
    expect(windows.if).toBe(job("test").if);

    // It runs the one list a developer runs locally, and that list is not empty.
    expect(testCommands(windows)).toEqual(["pnpm -C packages/qfai test:windows-parity"]);
    expect(suiteList().length).toBeGreaterThan(0);

    // A code-path pull request: every lane green but Windows, and the verdict is red.
    expect(verdictExit(needsWith("success", "failure"))).toBe(1);
    // The fix lands: the verdict is green again.
    expect(verdictExit(needsWith("success", "success"))).toBe(0);
    // A documentation-only pull request: the gated lanes, Windows among them, report skipped.
    expect(verdictExit(needsWith("skipped", "skipped"))).toBe(0);
  });
});
