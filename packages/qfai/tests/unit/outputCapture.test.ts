/**
 * The output-capture helpers put back the stream's own `write`, not a copy of it.
 *
 * A bound copy is a new function: after a capture, `process.stdout.write` no longer equals what
 * was there before, each further capture stacks another wrapper, and a property set on the
 * original (the workflow-command suppressor's marker) is gone. The rows hold identity after a
 * capture that resolves and after one that rejects.
 *
 * Two captures that overlap and finish out of nesting order each get only their own output, and
 * the original function is back once both are done.
 */
import { describe, expect, it } from "vitest";

import { captureStderr } from "../helpers/stderr.js";
import { captureStdout } from "../helpers/stdout.js";

describe("output capture helpers", () => {
  it("captureStdout restores the original process.stdout.write function", async () => {
    const before = process.stdout.write;
    const captured = await captureStdout(() => {
      process.stdout.write("captured line\n");
      return Promise.resolve();
    });
    expect(captured).toBe("captured line\n");
    expect(process.stdout.write).toBe(before);
  });

  it("captureStdout restores the original function when the task rejects", async () => {
    const before = process.stdout.write;
    await expect(captureStdout(() => Promise.reject(new Error("task failed")))).rejects.toThrow(
      "task failed",
    );
    expect(process.stdout.write).toBe(before);
  });

  it("captureStderr restores the original process.stderr.write function", async () => {
    const before = process.stderr.write;
    const captured = await captureStderr(() => {
      process.stderr.write("captured line\n");
      return Promise.resolve();
    });
    expect(captured).toBe("captured line\n");
    expect(process.stderr.write).toBe(before);
  });

  it("captureStderr restores the original function when the task rejects", async () => {
    const before = process.stderr.write;
    await expect(captureStderr(() => Promise.reject(new Error("task failed")))).rejects.toThrow(
      "task failed",
    );
    expect(process.stderr.write).toBe(before);
  });

  it.each([
    { name: "captureStdout", capture: captureStdout, stream: process.stdout },
    { name: "captureStderr", capture: captureStderr, stream: process.stderr },
  ])(
    "$name keeps two overlapping captures apart when the first one finishes first",
    async ({ capture, stream }) => {
      const before = stream.write;
      const firstGate = deferred();
      const secondGate = deferred();
      const secondWroteFirstLine = deferred();

      const first = capture(async () => {
        stream.write("first: before\n");
        await firstGate.promise;
        stream.write("first: after\n");
      });
      const second = capture(async () => {
        stream.write("second: before\n");
        secondWroteFirstLine.resolve();
        await secondGate.promise;
        stream.write("second: after\n");
      });

      await secondWroteFirstLine.promise;
      firstGate.resolve();
      expect(await first).toBe("first: before\nfirst: after\n");

      secondGate.resolve();
      expect(await second).toBe("second: before\nsecond: after\n");
      expect(stream.write).toBe(before);
    },
  );
});

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
