/**
 * The spawn helper keeps the cause of a child's ending, and the assertions read it.
 *
 * Two failures on CI reported nothing a reader could act on, and each was an absence the
 * helper designed in:
 *
 * - `expected null to be +0` — a child was killed, the helper discarded the signal, and the
 *   run reported the kill as an exit code that happened to be `null`.
 * - `expected '' to contain '<a phrase>'` — a child wrote nothing, and the message reads as
 *   the script under test printing the wrong thing.
 *
 * Both are the same shape: an assertion about one thing failing over a defect in another. The
 * rows below hold what each now says instead, including that a kill satisfies NEITHER
 * direction of the exit-code assertion those suites actually make.
 */
import { execPath } from "node:process";

import { describe, expect, it } from "vitest";

import {
  EXIT_NONZERO,
  EXIT_ZERO,
  type Spawned,
  cpuModel,
  HOST_CRASH_LIMIT,
  hostCrashRetry,
  hostCrashed,
  outcomeOf,
  outputContext,
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

describe("outputContext tells silence apart from wrong output", () => {
  it("names silence as silence, and attributes it to the child's ending", async () => {
    // The failure this exists for reported `expected '' to contain '<a phrase>'` and nothing
    // else, which reads as the script under test printing the wrong thing. It meant the script
    // printed nothing at all, and no rerun of that assertion can tell the two apart: the
    // assertion is about the text, and the defect is about the child.
    const silent = await node("process.exit(1)");
    expect(silent.stdout + silent.stderr, "the fixture must produce no bytes").toBe("");
    expect(outputContext(silent)).toContain("exit 1");
    expect(outputContext(silent)).toContain("wrote nothing on either stream");
  });

  it("hands the reader the stderr a child that spoke produced", async () => {
    // The other half, and the part `toContain` never shows: the child's own account of why its
    // output is not what the row expected.
    const spoke = await node("process.stderr.write('the reason'); process.exit(2)");
    expect(outputContext(spoke)).toContain("exit 2");
    expect(outputContext(spoke)).toContain("the reason");
    expect(outputContext(spoke), "a child that spoke is not reported as silent").not.toContain(
      "wrote nothing",
    );
  });

  it("names a runtime that aborted before the script wrote anything", async () => {
    // The third case, and the one a leg touching no PowerShell kept hitting: the child spoke,
    // and what it said was its runtime dying rather than the script answering. Read as output,
    // `System.IO.FileLoadException: The given assembly name was invalid.` is a script printing
    // the wrong thing — and the reader's next move is then to look for a script that does not
    // exist.
    const aborted = await node(
      [
        "process.stderr.write('Unhandled exception.');",
        "process.stderr.write(String.fromCharCode(10));",
        "process.stderr.write('System.IO.FileLoadException: The given assembly name was invalid.');",
        "process.exit(134);",
      ].join(""),
    );

    expect(aborted.stdout, "the fixture must write nothing to stdout").toBe("");
    const context = outputContext(aborted);
    expect(context).toContain("runtime aborted before the script wrote anything");
    expect(context, "the runtime's own report still reaches the reader").toContain(
      "FileLoadException",
    );
    expect(context, "a dead runtime is not silence").not.toContain("wrote nothing");
  });

  it("leaves a script that reports an exception of its own as the script's answer", async () => {
    // The discriminating control. Without it the clause above would be satisfied by any stderr
    // mentioning an exception, and a script whose JOB is to report one would be blamed on the
    // harness — which is the same misattribution, pointed the other way.
    const reported = await node(
      [
        "process.stdout.write('checked');",
        "process.stderr.write('Unhandled exception.');",
        "process.exit(1);",
      ].join(""),
    );

    expect(
      outputContext(reported),
      "a child that wrote to stdout ran, whatever its stderr says",
    ).not.toContain("runtime aborted");
  });

  it("reports a silent kill as both, because either alone is half the diagnosis", () => {
    // A killed child that wrote nothing is the shape the original failure most likely had. The
    // signal says the environment removed it; the silence says not to look for wrong output.
    const killed = { code: null, signal: "SIGKILL", stdout: "", stderr: "", outcome: "" } as const;
    const context = outputContext({ ...killed, outcome: outcomeOf(killed.code, killed.signal) });
    expect(context).toContain("killed by SIGKILL");
    expect(context).toContain("wrote nothing on either stream");
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

describe("a crashed runtime reruns the case once, and a script's own answer never does", () => {
  /** A finished child with the given ending, as the case runners report it. */
  function ended(signal: NodeJS.Signals | null, code: number | null = null): Spawned {
    return {
      code,
      signal,
      stdout: "",
      stderr: "Unhandled exception.",
      outcome: outcomeOf(code, signal),
    };
  }

  it("reads the crash signals as the runtime's and every exit as the script's", () => {
    for (const signal of ["SIGABRT", "SIGBUS", "SIGSEGV"] as const) {
      expect(hostCrashed(ended(signal)), signal).toBe(true);
    }
    // A timeout's kill is the harness ending the child, and an exit is the script answering.
    expect(hostCrashed(ended("SIGKILL")), "a kill is not a crash").toBe(false);
    expect(hostCrashed(ended("SIGTERM")), "nor is a termination").toBe(false);
    expect(hostCrashed(ended(null, 1)), "a rejecting exit is the script's answer").toBe(false);
  });

  it("runs the case a second time after a crash, says so, and returns the second answer", async () => {
    const answers = [ended("SIGABRT"), ended(null, 0)];
    const warnings: string[] = [];
    let attempts = 0;
    const result = await hostCrashRetry((message) => warnings.push(message))(() =>
      Promise.resolve(answers[attempts++] ?? ended(null, 9)),
    );
    expect(attempts).toBe(2);
    expect(result.outcome).toBe(EXIT_ZERO);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("killed by SIGABRT");
    // The processor is named, so a crash can be read against the runner it happened on.
    expect(warnings[0]).toContain(` on ${cpuModel()} `);
  });

  it("reports a second crash as it happened rather than retrying again", async () => {
    let attempts = 0;
    const result = await hostCrashRetry(() => {})(() => {
      attempts += 1;
      return Promise.resolve(ended("SIGSEGV"));
    });
    expect(attempts).toBe(2);
    expect(result.outcome).toBe("killed by SIGSEGV");
  });

  it("never reruns a case whose script answered, whatever it answered", async () => {
    let attempts = 0;
    const result = await hostCrashRetry(() => {
      throw new Error("no warning is due for a script's own exit");
    })(() => {
      attempts += 1;
      return Promise.resolve(ended(null, 1));
    });
    expect(attempts).toBe(1);
    expect(result.outcome).toBe("exit 1");
  });

  it("stops rerunning once a runner has seen more crashes than the limit, and says so once", async () => {
    // A host that crashes on nearly every case fails every rerun too. Past the limit the cases
    // report their crash straight away, and one line says the job needs another runner.
    const warnings: string[] = [];
    const retry = hostCrashRetry((message) => warnings.push(message));
    let attempts = 0;
    const crash = (): Promise<Spawned> => {
      attempts += 1;
      return Promise.resolve(ended("SIGSEGV"));
    };
    for (let crashCase = 0; crashCase < HOST_CRASH_LIMIT + 3; crashCase += 1) {
      expect((await retry(crash)).outcome).toBe("killed by SIGSEGV");
    }
    // Two attempts for each case up to the limit, one for each case past it.
    expect(attempts).toBe(HOST_CRASH_LIMIT * 2 + 3);
    const brokenHost = warnings.filter((message) =>
      message.includes("the runner's host is broken"),
    );
    expect(brokenHost).toHaveLength(1);
    expect(brokenHost[0]).toContain("Rerun the job on another runner");
  });
});

describe("cpuModel names the processor a crash happened on", () => {
  it("answers with a non-empty name on any host", () => {
    expect(cpuModel().length).toBeGreaterThan(0);
  });
});
