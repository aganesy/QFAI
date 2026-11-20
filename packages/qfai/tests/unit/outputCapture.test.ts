/**
 * The output-capture helpers put back the stream's own `write`, not a copy of it.
 *
 * A bound copy is a new function: after a capture, `process.stdout.write` no longer equals what
 * was there before, each further capture stacks another wrapper, and a property set on the
 * original (the workflow-command suppressor's marker) is gone. The rows hold identity after a
 * capture that resolves and after one that rejects.
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
});
