/** Private case selected only by the profiling controller's exact-file config. */
import childProcess, { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { PassThrough } from "node:stream";
import { promisify } from "node:util";

import { describe, expect, it, vi } from "vitest";

import * as validation from "../../src/core/validate.js";
import * as htmlMock from "../../src/core/validators/htmlMock.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { loadConfig } from "../../src/core/config.js";
import type { ValidationResult } from "../../src/core/types.js";
import { validationInputManifest, coldValidationCli } from "./validationInputManifest.js";
import { withValidatorMeasurements } from "./validationProfileRun.js";
import type { ValidatorMeasurement } from "./validationProfile.js";
import { assertBuiltCliFresh } from "./builtCli.js";
import { DECLARED_TEST_TIMEOUT } from "../../vitest.knobs.js";
import {
  runControlledProfile,
  removeBaselineSource,
  retainedProfileFailure,
  saveProfileArtifact,
  ProfileArtifactError,
  withProfileFixture,
  comparableValidation,
} from "./controlledProfile.js";

const CLI = path.resolve(import.meta.dirname, "../../dist/cli/index.mjs");
assertBuiltCliFresh(CLI);
const execFile = promisify(execFileCallback);

/** Controlled events exercise capture only; native cases retain process-ownership proof. */
async function controlledOutput(
  chunks: readonly { stream: "stdout" | "stderr"; text: string }[],
  code = 7,
) {
  const child = new childProcess.ChildProcess();
  const streams = { stdout: new PassThrough(), stderr: new PassThrough() };
  child.stdout = streams.stdout;
  child.stderr = streams.stderr;
  const spawn = vi.spyOn(childProcess, "spawn").mockImplementation(() => {
    queueMicrotask(() => {
      for (const chunk of chunks) streams[chunk.stream].emit("data", chunk.text);
      child.emit("close", code, null);
    });
    return child;
  });
  syncBuiltinESMExports();
  try {
    const result = await runControlledProfile("controlled-output-fixture", [], {
      cwd: process.cwd(),
      timeoutMs: 5_000,
      ownGroup: false,
    });
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(result.closed).toBe(true);
    expect(result.code).toBe(code);
    return result;
  } finally {
    spawn.mockRestore();
    syncBuiltinESMExports();
    streams.stdout.destroy();
    streams.stderr.destroy();
  }
}

describe("controlled profiling output events", () => {
  const limit = 32 * 1024 * 1024;
  const digest = (text: string) => createHash("sha256").update(text).digest("hex");

  it("retains the exact bounded prefix of an initial oversized stdout event", async () => {
    const result = await controlledOutput([{ stream: "stdout", text: "x".repeat(limit + 1) }]);
    expect(result.stdout.length).toBe(limit);
    expect(digest(result.stdout)).toBe(digest("x".repeat(limit)));
    expect(result.stderr).toBe("");
    expect(result.pid).toBeNull();
    expect(result.closed).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.error).toMatchObject({ name: "ProfileOutputLimit" });
    expect(result.outcome).toBe("exit 7");
    expect(result.signal).toBeNull();
    expect(result.terminationErrors).toEqual([]);
  });

  it("shares the byte budget between stdout and stderr without moving retained bytes", async () => {
    const prefix = "retained error";
    const result = await controlledOutput([
      { stream: "stderr", text: prefix },
      { stream: "stdout", text: "x".repeat(limit) },
    ]);
    expect(result.stderr).toBe(prefix);
    expect(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr)).toBe(limit);
    expect(digest(result.stdout)).toBe(digest("x".repeat(limit - Buffer.byteLength(prefix))));
    expect(result.error).toMatchObject({ name: "ProfileOutputLimit" });
    expect(result.outcome).toBe("exit 7");
  });

  it("retains complete actual UTF-8 characters without adding boundary replacement bytes", async () => {
    const prefix = "x".repeat(limit - 5);
    const symbol = String.fromCodePoint(0x1f600);
    const result = await controlledOutput([
      { stream: "stdout", text: prefix },
      { stream: "stdout", text: symbol + symbol },
      { stream: "stderr", text: "z" },
      { stream: "stdout", text: "later output" },
    ]);
    expect(Buffer.byteLength(result.stdout)).toBe(limit - 1);
    expect(result.stderr).toBe("");
    expect(digest(result.stdout)).toBe(digest(prefix + symbol));
    expect(result.stdout.endsWith(symbol)).toBe(true);
    expect(result.stdout.includes(String.fromCodePoint(0xfffd))).toBe(false);
    expect(result.error).toMatchObject({ name: "ProfileOutputLimit" });
    expect(result.outcome).toBe("exit 7");
  });

  it("preserves normal completion at exactly the shared output limit", async () => {
    const result = await controlledOutput([{ stream: "stdout", text: "x".repeat(limit) }], 0);
    expect(Buffer.byteLength(result.stdout)).toBe(limit);
    expect(digest(result.stdout)).toBe(digest("x".repeat(limit)));
    expect(result.stderr).toBe("");
    expect(result.closed).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.error).toBeNull();
    expect(result.outcome).toBe("exit 0");
  });

  it("keeps later events out of the retained streams after the output limit", async () => {
    const result = await controlledOutput([
      { stream: "stdout", text: "x".repeat(limit + 1) },
      { stream: "stderr", text: "later error" },
      { stream: "stdout", text: "later output" },
    ]);
    expect(result.stdout.length).toBe(limit);
    expect(digest(result.stdout)).toBe(digest("x".repeat(limit)));
    expect(result.stderr).toBe("");
    expect(result.error).toMatchObject({ name: "ProfileOutputLimit" });
    expect(result.outcome).toBe("exit 7");
  });
});

describe("retained profiling failures", () => {
  it("terminates a hanging measurement and preserves its checkpoint and partial output", async () => {
    let retainedRoot = "";
    await withProfileFixture(async (root, profile, retain) => {
      const checkpoint = path.join(root, "checkpoint.json");
      const program = `require("node:fs").writeFileSync(${JSON.stringify(checkpoint)}, JSON.stringify({ phase: "measured-validation", retained: true })); process.stdout.write("partial measurement"); setInterval(() => {}, 1000);`;
      const result = await profile(process.execPath, ["-e", program], {
        cwd: root,
        timeoutMs: 2_000,
        ownGroup: false,
      });
      expect(result.closed).toBe(true);
      expect(result.timedOut).toBe(true);
      expect(result.stdout).toBe("partial measurement");
      const artifact = JSON.parse(
        await readFile(await saveProfileArtifact(root, result, checkpoint), "utf8"),
      ) as unknown;
      expect(artifact).toMatchObject({
        process: { timedOut: true, closed: true, stdout: "partial measurement" },
        checkpoint: { phase: "measured-validation", retained: true },
        checkpointError: null,
      });
      const sidecar = path.join(root, "baseline-source");
      await mkdir(sidecar);
      await writeFile(path.join(sidecar, "keep.txt"), "retained sidecar");
      // Inject an unconfirmed receipt without claiming that the completed fixture is still live.
      retain();
      retainedRoot = root;
      await expect(removeBaselineSource(root, undefined)).rejects.toThrow(/closure is unconfirmed/);
      for (const uncertain of [
        { ...result, closed: false },
        { ...result, terminationErrors: ["owned tree termination unconfirmed"] },
      ]) {
        const failure = await removeBaselineSource(root, uncertain).catch(
          (error: unknown) => error,
        );
        expect(failure).toMatchObject({ name: "ProfileCleanupUnconfirmed" });
        expect(
          JSON.parse(
            await readFile(await saveProfileArtifact(root, uncertain, checkpoint, failure), "utf8"),
          ) as unknown,
        ).toMatchObject({
          process: { closed: uncertain.closed, terminationErrors: uncertain.terminationErrors },
          cleanup: { retained: { phase: "cleanup-unconfirmed", control: root, sidecar } },
        });
      }
    });
    expect(await readFile(path.join(retainedRoot, "baseline-source", "keep.txt"), "utf8")).toBe(
      "retained sidecar",
    );
  });

  it("bounds runaway output without losing the retained output or termination cause", async () => {
    await withProfileFixture(async (root, profile) => {
      const result = await profile(
        process.execPath,
        [
          "-e",
          "process.stdout.write(Buffer.alloc(33 * 1024 * 1024, 120)); setInterval(() => {}, 1000);",
        ],
        { cwd: root, timeoutMs: 5_000, ownGroup: false },
      );
      expect(result.closed).toBe(true);
      expect(result.timedOut).toBe(false);
      expect(result.error).toMatchObject({ name: "ProfileOutputLimit" });
      expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(32 * 1024 * 1024);
      expect(result.stdout.length).toBeGreaterThan(0);
      expect(result.outcome).not.toBe("exit 0");
    });
  });

  it("retains an unavailable executable and malformed checkpoint bytes", async () => {
    await withProfileFixture(async (root, profile) => {
      const result = await profile(path.join(root, "missing executable"), [], {
        cwd: root,
        timeoutMs: 2_000,
        ownGroup: false,
      });
      expect(result.closed).toBe(true);
      expect(result.error).not.toBeNull();
      expect(result.stdout).toBe("");
      const checkpoint = path.join(root, "partial.json");
      await writeFile(checkpoint, '{"phase":', "utf8");
      const artifact = JSON.parse(
        await readFile(await saveProfileArtifact(root, result, checkpoint), "utf8"),
      ) as { checkpointError: unknown };
      expect(artifact).toMatchObject({
        process: { error: result.error },
        checkpoint: null,
        checkpointRaw: '{"phase":',
      });
      expect(artifact.checkpointError).toEqual(expect.any(String));
      const ordinary = retainedProfileFailure(new Error("worker unavailable"));
      expect(ordinary).not.toHaveProperty("retained");
      await writeFile(
        checkpoint,
        JSON.stringify({ phase: "worker-unavailable", failure: ordinary }),
        "utf8",
      );
      expect(
        JSON.parse(
          await readFile(await saveProfileArtifact(root, result, checkpoint), "utf8"),
        ) as unknown,
      ).toMatchObject({ checkpoint: { phase: "worker-unavailable", failure: ordinary } });
    });
  });

  it("keeps the completed nonzero child result when artifact writing fails", async () => {
    await withProfileFixture(async (root, profile) => {
      const result = await profile(
        process.execPath,
        ["-e", 'process.stderr.write("failed validation"); process.exitCode = 7;'],
        { cwd: root, timeoutMs: 5_000, ownGroup: false },
      );
      const sidecar = path.join(root, "baseline-source");
      await mkdir(sidecar);
      await writeFile(path.join(sidecar, "keep.txt"), "completed sidecar");
      await removeBaselineSource(root, result);
      await expect(readFile(path.join(sidecar, "keep.txt"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      expect(result.code).toBe(7);
      expect(result.signal).toBeNull();
      const blocked = path.join(root, "blocked directory");
      await writeFile(blocked, "existing file", "utf8");
      const failure = await saveProfileArtifact(blocked, result).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(ProfileArtifactError);
      if (!(failure instanceof ProfileArtifactError))
        throw new Error("Artifact failure lost its original process result");
      expect(failure.result).toBe(result);
      expect(failure.result.stderr).toBe("failed validation");
      expect(failure.cause).toMatchObject({ code: expect.stringMatching(/^(?:EEXIST|ENOTDIR)$/) });
    });
  });

  it.each(["measurement", "recording", "both"] as const)(
    "restores real exports after %s failure and keeps each cause",
    async (where) => {
      const original = htmlMock.validateHtmlMock;
      const measuredFailure = new Error("measurement failure");
      const recordingFailure = new Error("checkpoint writing failure");
      let recorded = false;
      const result = await withValidatorMeasurements(
        () => {
          expect(htmlMock.validateHtmlMock).not.toBe(original);
          return where !== "recording"
            ? Promise.reject(measuredFailure)
            : Promise.resolve("real callback completed");
        },
        (entries) => {
          recorded = true;
          expect(htmlMock.validateHtmlMock).toBe(original);
          expect(
            entries.some((entry) => entry.capture === "uncaptured" && entry.invokedCalls === 0),
          ).toBe(true);
          return where !== "measurement" ? Promise.reject(recordingFailure) : Promise.resolve();
        },
      ).catch((error: unknown) => error);
      expect(recorded).toBe(true);
      expect(htmlMock.validateHtmlMock).toBe(original);
      if (where === "both") {
        expect(result).toBeInstanceOf(AggregateError);
        if (!(result instanceof AggregateError))
          throw new Error("Both failures must remain available");
        expect(result.errors).toEqual([measuredFailure, recordingFailure]);
      } else expect(result).toBe(where === "measurement" ? measuredFailure : recordingFailure);
    },
  );
});

describe("full validation profiling", () => {
  it("keeps real findings unchanged while timing the tracked repository corpus and a cold CLI", async () => {
    const started = performance.now();
    const root = path.resolve(import.meta.dirname, "../../../..");
    const artifact: Record<string, unknown> = {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      runnerJob: process.env.GITHUB_JOB ?? null,
      measurementCeiling:
        "Zero calls means uncaptured at a namespace export boundary. A validator may be unreached or called through internal or saved imported references; zero is not evidence that it is unused.",
      timingMeaning:
        "Validator export boundaries include I/O and nested work; parallel times overlap and must not be summed. In-process runs are warm relative to imported modules. The fresh CLI is process-cold, not an OS disk-cache cold run.",
    };
    const checkpointFile = process.env.QFAI_VALIDATION_PROFILE_CHECKPOINT;
    if (!checkpointFile)
      throw new Error("The profiling controller did not supply a checkpoint path");
    const checkpoint = async (phase: string) => {
      artifact.phase = phase;
      const temporary = `${checkpointFile}.writing`;
      await writeFile(temporary, JSON.stringify(artifact, null, 2) + "\n", "utf8");
      await rename(temporary, checkpointFile);
    };
    let failure: unknown;
    let failed = false;
    let checkpointFailure: unknown;
    let checkpointFailed = false;
    try {
      await checkpoint("input-before");
      const head = (await execFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
      artifact.head = head;
      artifact.trackedWorktreeStatus = (
        await execFile("git", ["status", "--porcelain=v1", "--untracked-files=no"], { cwd: root })
      ).stdout;
      await checkpoint("input-manifest");
      const before = await validationInputManifest(root);
      artifact.inputBefore = before;
      expect(before.counts.storyInputs.files).toBeGreaterThan(0);
      expect(before.counts.testScanInputs.files).toBeGreaterThan(0);
      const { config } = await loadConfig(root);
      const reportFile = path.resolve(root, config.output.validateJsonPath);
      await checkpoint("baseline-validation");
      const original = validation.validateProject;
      const coreResults: ValidationResult[] = [];
      const capture = vi
        .spyOn(validation, "validateProject")
        .mockImplementation(async (...args) => {
          const coreStarted = performance.now();
          try {
            const result = await original(...args);
            coreResults.push(result);
            return result;
          } finally {
            artifact.unmeasuredCoreWallMs = performance.now() - coreStarted;
          }
        });
      let baselineExit: number;
      const baselineStart = performance.now();
      try {
        baselineExit = await runValidate({
          root,
          strict: false,
          profile: "full",
          failOn: "error",
          format: "text",
        });
      } finally {
        capture.mockRestore();
        artifact.unmeasuredCommandWallMs = performance.now() - baselineStart;
      }
      artifact.unmeasuredExit = baselineExit;
      const baselineCli = JSON.parse(await readFile(reportFile, "utf8")) as ValidationResult;
      artifact.unmeasuredCliResult = baselineCli;
      expect(coreResults).toHaveLength(1);
      const baseline = coreResults[0];
      if (baseline === undefined)
        throw new Error("The real baseline validation did not return a result");
      artifact.unmeasuredCoreResult = baseline;
      await checkpoint("measured-validation");
      let observed: ValidatorMeasurement[] = [];
      const measuredStart = performance.now();
      const measured = await withValidatorMeasurements(
        () => validation.validateProject(root, undefined, { profile: "full" }),
        async (entries) => {
          observed = entries;
          artifact.validators = entries;
          artifact.measuredWallMs = performance.now() - measuredStart;
          artifact.spiesRestored = true;
          await checkpoint("measured-complete");
        },
      );
      artifact.measuredCoreResult = measured;
      expect(comparableValidation(measured)).toEqual(comparableValidation(baseline));
      expect(measured.profileValidatorsRan).toBe(true);
      expect(observed.filter((entry) => entry.invokedCalls > 0).length).toBeGreaterThan(20);
      expect(
        observed.some(
          (entry) =>
            entry.name.endsWith(":validateStoryTreeObligations") && entry.invokedCalls === 2,
        ),
      ).toBe(true);
      expect(
        observed.some(
          (entry) => entry.name.endsWith(":validateHtmlMock") && entry.recordedCalls > 0,
        ),
      ).toBe(true);
      const afterMeasured = await validationInputManifest(root);
      artifact.inputAfterMeasured = afterMeasured;
      expect(afterMeasured).toEqual(before);
      const remaining = Math.floor(DECLARED_TEST_TIMEOUT - (performance.now() - started) - 5_000);
      if (remaining <= 0)
        throw new Error("No time remains in the declared test budget for cold CLI validation");
      await checkpoint("cold-cli");
      const cold = await coldValidationCli(CLI, root, remaining, false);
      artifact.coldCli = cold;
      await checkpoint("cold-cli-complete");
      expect(cold.closed, cold.stderr).toBe(true);
      expect(cold.timedOut, cold.stderr).toBe(false);
      expect(cold.error, cold.stderr).toBeNull();
      expect(cold.terminationErrors, cold.stderr).toEqual([]);
      expect(cold.signal, cold.stderr).toBeNull();
      expect(cold.code, cold.stderr).toBe(baselineExit);
      const coldResult = JSON.parse(await readFile(reportFile, "utf8")) as ValidationResult;
      artifact.coldCliResult = coldResult;
      expect(Date.parse(coldResult.generatedAt ?? "")).toBeGreaterThanOrEqual(cold.startedAt);
      expect(comparableValidation(coldResult)).toEqual(comparableValidation(baselineCli));
      const after = await validationInputManifest(root);
      artifact.inputAfter = after;
      await checkpoint("complete");
      expect(after).toEqual(before);
      expect((await execFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim()).toBe(
        head,
      );
    } catch (error: unknown) {
      failed = true;
      failure = error;
      artifact.failure =
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : { value: String(error) };
    } finally {
      if (failed) {
        try {
          artifact.inputAfterFailure = await validationInputManifest(root);
        } catch (error: unknown) {
          artifact.inputAfterFailureError =
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : { value: String(error) };
        }
      }
      artifact.totalWallMs = performance.now() - started;
      try {
        await checkpoint(failed ? "failed" : "complete");
      } catch (error: unknown) {
        checkpointFailed = true;
        checkpointFailure = error;
      }
    }
    if (failed && checkpointFailed)
      throw new AggregateError(
        [failure, checkpointFailure],
        "Validation and checkpoint writing both failed",
      );
    if (checkpointFailed) throw checkpointFailure;
    if (failed) throw failure;
  });
});
