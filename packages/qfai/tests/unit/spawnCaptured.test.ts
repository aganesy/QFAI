/**
 * The spawn helper keeps the cause of a child's ending, and the assertions read it.
 *
 * The defect this covers produced `AssertionError: expected null to be +0` and nothing
 * else: a child was killed, the helper discarded the signal, and the run reported the
 * kill as an exit code that happened to be `null`. The rows below are the two claims
 * that stops — a kill is named, and a kill satisfies neither direction of the exit-code
 * assertion those tests actually make.
 */
import { execPath } from "node:process";

import { describe, expect, it } from "vitest";

import {
  EXIT_NONZERO,
  EXIT_ZERO,
  type Spawned,
  outcomeOf,
  spawnCaptured,
} from "../helpers/spawnCaptured.js";

/** A child that does what the argument says, in the runtime this suite already runs on. */
async function node(source: string): Promise<Spawned> {
  return await spawnCaptured(execPath, ["-e", source]);
}

describe("outcomeOf names what ended the child", () => {
  it("reads a signal as a kill and an exit code as an exit", () => {
    expect(outcomeOf(0, null), "a clean exit").toBe(EXIT_ZERO);
    expect(outcomeOf(1, null), "a rejecting exit").toBe("exit 1");
    expect(outcomeOf(null, "SIGKILL"), "a kill names its signal").toBe("killed by SIGKILL");
  });

  it("gives a kill an outcome neither direction of the exit assertion accepts", () => {
    // The whole point. `expect(code).toBe(0)` and `expect(code).not.toBe(0)` are the two
    // shapes the spawning suites use, and `code: null` fails the first with no cause and
    // PASSES the second while proving nothing.
    const killed = outcomeOf(null, "SIGTERM");
    expect(killed, "a kill is not a clean exit").not.toBe(EXIT_ZERO);
    expect(killed, "and a kill is not the script rejecting its input").not.toMatch(EXIT_NONZERO);
  });

  it("says so when the runtime reports neither", () => {
    // Not reachable through Node's own `close`, which always supplies one of the two.
    // Named rather than defaulted, because a silent `exit null` would read as a code.
    expect(outcomeOf(null, null)).toBe("closed with neither an exit code nor a signal");
  });
});

describe("spawnCaptured reports what the child did", () => {
  it("captures a clean exit with its output", async () => {
    const result = await node("process.stdout.write('ok')");
    expect(result.outcome, result.stderr).toBe(EXIT_ZERO);
    expect(result.stdout).toBe("ok");
    expect(result.signal, "a child that exited was not killed").toBeNull();
  });

  it("captures a rejecting exit with its stderr", async () => {
    const result = await node("process.stderr.write('why'); process.exit(3)");
    expect(result.outcome, result.stderr).toMatch(EXIT_NONZERO);
    expect(result.outcome).toBe("exit 3");
    // The run that fails is the run that explains itself: every assertion above passes
    // this string as its message, so the child's own account reaches the report.
    expect(result.stderr).toBe("why");
  });

  it("writes the input it is given and closes the stream", async () => {
    const result = await spawnCaptured(
      execPath,
      ["-e", "let s='';process.stdin.on('data',(d)=>{s+=d}).on('end',()=>process.stdout.write(s))"],
      { input: "through stdin" },
    );
    expect(result.outcome, result.stderr).toBe(EXIT_ZERO);
    expect(result.stdout).toBe("through stdin");
  });

  it("leaves a program that ignores its input alone", async () => {
    // The write fails against a closed pipe, and that is the program finishing rather
    // than the program failing. Without the error listener it is an unhandled EPIPE.
    const result = await spawnCaptured(execPath, ["-e", "process.exit(0)"], { input: "ignored" });
    expect(result.outcome, result.stderr).toBe(EXIT_ZERO);
  });

  // Windows has no real signals: a terminated child there reports an exit code, so the
  // row would assert the opposite of what the platform does. CI runs on Linux, which is
  // where the kill this helper exists for was observed.
  it.skipIf(process.platform === "win32")("names the signal that killed a child", async () => {
    const result = await node("process.kill(process.pid, 'SIGKILL')");
    expect(result.signal, "the signal must survive the close listener").toBe("SIGKILL");
    expect(result.outcome).toBe("killed by SIGKILL");
    expect(result.code, "a killed child reports no exit code").toBeNull();
  });
});
