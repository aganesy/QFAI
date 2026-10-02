/**
 * The precedence between `--strict` and `--fail-on` can be read from the CLI surface.
 *
 * `--fail-on` takes precedence over `--strict`. The precedence itself is
 * specified, but without a diagnostic the effective threshold appears neither
 * in the default `text` output nor in the run-log. Adding `--fail-on error` to
 * an existing `--strict` lane silently drops the warning gate, while the diff
 * looks like a tightening.
 */

import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runValidate } from "../../../../src/cli/commands/validate.js";

type Streams = { stdout: string; stderr: string };

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-strict-failon-"));
  try {
    await mkdir(path.join(root, ".qfai", "specs"), { recursive: true });
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Run `validate` while capturing both streams, restoring them on any outcome. */
async function captureRun(run: () => Promise<number>): Promise<{ exitCode: number } & Streams> {
  const chunks: Streams = { stdout: "", stderr: "" };
  const collect =
    (key: keyof Streams) =>
    (chunk: string | Uint8Array): boolean => {
      chunks[key] += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8");
      return true;
    };
  const outSpy = vi.spyOn(process.stdout, "write").mockImplementation(collect("stdout"));
  const errSpy = vi.spyOn(process.stderr, "write").mockImplementation(collect("stderr"));
  try {
    const exitCode = await run();
    return { exitCode, ...chunks };
  } finally {
    outSpy.mockRestore();
    errSpy.mockRestore();
  }
}

async function readRunJsonFailOn(root: string): Promise<unknown> {
  const reportDir = path.join(root, ".qfai", "report");
  const entries = await readdir(reportDir);
  const runDirs = entries.filter((entry) => entry.startsWith("run-")).sort();
  const latest = runDirs.at(-1);
  expect(latest).toBeDefined();
  const body: unknown = JSON.parse(
    await readFile(path.join(reportDir, latest ?? "", "run.json"), "utf-8"),
  );
  if (typeof body !== "object" || body === null || !("result" in body)) {
    throw new Error("run.json has no result object");
  }
  const { result } = body;
  if (typeof result !== "object" || result === null || !("fail_on" in result)) {
    throw new Error("run.json result has no fail_on field");
  }
  return result.fail_on;
}

describe("--strict / --fail-on precedence is visible on the CLI surface", () => {
  it("names the winner on stderr when --fail-on supersedes --strict", async () => {
    await withProject(async (root) => {
      const captured = await captureRun(() =>
        runValidate({ root, strict: true, failOn: "error", toolVersionOverride: "1.9.2" }),
      );

      expect(captured.stderr).toContain(
        "qfai validate: --strict is superseded by --fail-on error (effective failOn=error)",
      );
    });
  });

  it("names the winner for the directly contradictory --strict --fail-on never", async () => {
    await withProject(async (root) => {
      const captured = await captureRun(() =>
        runValidate({ root, strict: true, failOn: "never", toolVersionOverride: "1.9.2" }),
      );

      expect(captured.stderr).toContain("--strict is superseded by --fail-on never");
      expect(captured.exitCode).toBe(0);
    });
  });

  it("stays silent when --strict and --fail-on agree on the same threshold", async () => {
    await withProject(async (root) => {
      const captured = await captureRun(() =>
        runValidate({ root, strict: true, failOn: "warning", toolVersionOverride: "1.9.2" }),
      );

      expect(captured.stderr).not.toContain("superseded");
    });
  });

  it("stays silent when --strict is the only policy flag", async () => {
    await withProject(async (root) => {
      const captured = await captureRun(() =>
        runValidate({ root, strict: true, toolVersionOverride: "1.9.2" }),
      );

      expect(captured.stderr).not.toContain("superseded");
      expect(captured.stdout).toContain("fail-on: warning");
    });
  });

  it("prints the effective failOn in the default text output", async () => {
    await withProject(async (root) => {
      const captured = await captureRun(() =>
        runValidate({ root, strict: true, failOn: "error", toolVersionOverride: "1.9.2" }),
      );

      expect(captured.stdout).toContain("fail-on: error");
      expect(captured.stdout).not.toContain("fail-on: warning");
    });
  });

  it("records the effective failOn in the run-log run.json", async () => {
    await withProject(async (root) => {
      await captureRun(() =>
        runValidate({ root, strict: true, failOn: "error", toolVersionOverride: "1.9.2" }),
      );

      expect(await readRunJsonFailOn(root)).toBe("error");
    });
  });
});
