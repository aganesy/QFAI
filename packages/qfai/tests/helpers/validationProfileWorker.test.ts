import { execFile as execFileCallback } from "node:child_process";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import * as validation from "../../src/core/validate.js";
import * as htmlMock from "../../src/core/validators/htmlMock.js";
import * as storyTree from "../../src/core/validators/storyTreeObligations.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { loadConfig } from "../../src/core/config.js";
import type { ValidationResult } from "../../src/core/types.js";
import {
  validationInputManifest,
  coldValidationCli,
  pairedImplementation,
  requireOptimizationOnly,
  nativeRepositoryReceipt,
  prepareBaselineSource,
  archivedSourceReceipt,
  sourceTreeEntries,
  removeBaselineSource,
} from "./validationInputManifest.js";
import { withValidatorMeasurements } from "./validationProfileRun.js";
import type { ValidatorMeasurement } from "./validationProfile.js";
import { assertBuiltCliFresh } from "./builtCli.js";
import { DECLARED_TEST_TIMEOUT } from "../../vitest.knobs.js";
import {
  retainedProfileFailure,
  saveProfileArtifact,
  ProfileArtifactError,
  literalFileReceipt,
  withProfileFixture,
  comparableValidation,
} from "./controlledProfile.js";

const CLI = path.resolve(import.meta.dirname, "../../dist/cli/index.mjs");
assertBuiltCliFresh(CLI);
const execFile = promisify(execFileCallback);

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
      const validationRoot = path.resolve(import.meta.dirname, "../../../..");
      const sourceFailure = await pairedImplementation(validationRoot, root, "0".repeat(40)).catch(
        (error: unknown) => error,
      );
      expect(sourceFailure).toBeInstanceOf(Error);
      const retained = retainedProfileFailure(sourceFailure);
      expect(retained).toMatchObject({
        message: "The baseline source could not be verified",
        cause: { message: expect.any(String) },
      });
      await writeFile(
        checkpoint,
        JSON.stringify({ phase: "baseline-source-preflight", failure: retained }),
        "utf8",
      );
      expect(
        JSON.parse(
          await readFile(await saveProfileArtifact(root, result, checkpoint), "utf8"),
        ) as unknown,
      ).toMatchObject({ checkpoint: { phase: "baseline-source-preflight", failure: retained } });
      const modulePath = "packages/qfai/src/core/validators/storyTreeObligations.ts";
      expect(() => requireOptimizationOnly([modulePath])).not.toThrow();
      expect(() => requireOptimizationOnly([])).toThrow(/accepted validator/);
      expect(() => requireOptimizationOnly([modulePath, "packages/qfai/src/other.ts"])).toThrow(
        /accepted validator/,
      );
      const sourceBytes = Buffer.from("export const value = 1;\n");
      const entry = {
        file: "baseline.ts",
        mode: "100644",
        blob: createHash("sha1")
          .update(`blob ${sourceBytes.length}\0`)
          .update(sourceBytes)
          .digest("hex"),
      };
      expect(() => sourceTreeEntries(`120000 blob ${entry.blob}\tbaseline.ts\0`)).toThrow(
        /unsupported source/,
      );
      expect(() => sourceTreeEntries(`100644 blob ${entry.blob}\t../baseline.ts\0`)).toThrow(
        /unsupported source/,
      );
      await writeFile(path.join(root, entry.file), sourceBytes);
      expect((await archivedSourceReceipt(root, [entry])).files).toBe(1);
      await writeFile(path.join(root, entry.file), "export const value = 2;\n", "utf8");
      await expect(archivedSourceReceipt(root, [entry])).rejects.toThrow(
        /Archived Git blob changed/,
      );
      const current = path.join(root, "native-current");
      await mkdir(current);
      await writeFile(path.join(current, entry.file), "export const value = 1;\r\n");
      await writeFile(path.join(root, entry.file), "export const value = 1;\r\n");
      expect((await archivedSourceReceipt(root, [entry], current)).entries[0]?.nativeBlob).not.toBe(
        entry.blob,
      );
      await writeFile(path.join(root, entry.file), sourceBytes);
      await expect(archivedSourceReceipt(root, [entry], current)).rejects.toThrow(
        /Common native source/,
      );
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
        "Composite prior-condition and current source runs are warm in-process measurements; validator export times include I/O and overlap. The current normally built CLI is process-cold only. No historical full-source run, old CLI build, cold speedup or latency cause is proved.",
      baselineEnvelope:
        "Current CI core/assets with the actual prior validator through the current wrapper; a composite source and hybrid envelope, not a historical full-source or CLI build.",
      comparisonExcludedFields: ["generatedAt", "timings.uiuxMs", "timings.htmlMockMs"],
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
      const repositoryBefore = await nativeRepositoryReceipt(root);
      const head = repositoryBefore.head;
      artifact.head = head;
      artifact.repositoryBefore = repositoryBefore;
      await checkpoint("input-manifest");
      const before = await validationInputManifest(root);
      artifact.inputBefore = before;
      const requireUnchangedInput = async (phase: string) => {
        const input = await validationInputManifest(root);
        const repository = await nativeRepositoryReceipt(root);
        artifact[`input${phase}`] = input;
        artifact[`repository${phase}`] = repository;
        expect(input).toEqual(before);
        expect(repository).toEqual(repositoryBefore);
      };
      expect(before.counts.storyInputs.files).toBeGreaterThan(0);
      expect(before.counts.testScanInputs.files).toBeGreaterThan(0);
      const { config } = await loadConfig(root);
      const reportFile = path.resolve(root, config.output.validateJsonPath);
      await checkpoint("baseline-source-preflight");
      const implementation = await pairedImplementation(
        root,
        path.dirname(checkpointFile),
        undefined,
        checkpoint,
      );
      artifact.implementation = implementation;
      expect(implementation.receipt).toEqual(repositoryBefore);
      await checkpoint("baseline-source-archive");
      const source = await prepareBaselineSource(
        root,
        path.dirname(checkpointFile),
        implementation,
      );
      artifact.baselineSource = source;
      artifact.currentBuild = await literalFileReceipt(CLI);
      await checkpoint("baseline-source-load");
      const actualBaseline = await vi.importActual<typeof validation>(source.module);
      if (actualBaseline.validateProject === validation.validateProject)
        throw new Error("The baseline loader returned the current implementation");
      const baselineValidator = await vi.importActual<typeof storyTree>(
        path.join(source.sidecar, implementation.acceptedModule),
      );
      if (baselineValidator.validateStoryTreeObligations === storyTree.validateStoryTreeObligations)
        throw new Error("The baseline loader returned the current validator");
      artifact.loaderIdentity = {
        requestedRealPath: source.module,
        distinctCoreExport: true,
        distinctValidatorExport: true,
        baselineValidatorModelSha256: createHash("sha256")
          .update(baselineValidator.validateStoryTreeObligationsModel.toString())
          .digest("hex"),
        currentValidatorModelSha256: createHash("sha256")
          .update(storyTree.validateStoryTreeObligationsModel.toString())
          .digest("hex"),
      };
      await requireUnchangedInput("BeforeBaseline");
      await checkpoint("baseline-validation");
      const original = actualBaseline.validateProject;
      const coreResults: ValidationResult[] = [];
      const coreInvocations: Array<Parameters<typeof validation.validateProject>> = [];
      const capture = vi
        .spyOn(validation, "validateProject")
        .mockImplementation(async (...args) => {
          coreInvocations.push(args);
          const configuration = structuredClone(args[1]);
          const coreStarted = performance.now();
          const result = await original(...args).finally(() => {
            artifact.unmeasuredCoreWallMs = performance.now() - coreStarted;
          });
          expect(args[1]).toEqual(configuration);
          // Preserve the core result before the current wrapper normalizes or appends findings.
          coreResults.push(structuredClone(result));
          return result;
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
      await requireUnchangedInput("AfterBaseline");
      artifact.baselineSourceAfterRun = await archivedSourceReceipt(
        source.sidecar,
        implementation.entries,
        root,
      );
      expect(artifact.baselineSourceAfterRun).toEqual(source.native);
      const currentArguments = coreInvocations[0];
      if (currentArguments === undefined)
        throw new Error("The baseline invocation was not captured");
      artifact.sourceInvocation = {
        root: currentArguments[0],
        options: currentArguments[2],
        configuration: "Both full cores receive the same current command configuration object.",
      };
      await checkpoint("measured-validation");
      let observed: ValidatorMeasurement[] = [];
      const measuredStart = performance.now();
      const measured = await withValidatorMeasurements(
        () => validation.validateProject(...currentArguments),
        async (entries) => {
          observed = entries;
          artifact.validators = entries;
          artifact.measuredWallMs = performance.now() - measuredStart;
          artifact.spiesRestored = true;
          await checkpoint("measured-complete");
        },
      );
      artifact.measuredCoreResult = measured;
      artifact.warmSourcePair = {
        priorValidatorOrigin: implementation.baseline,
        commonContext: implementation.current,
        target: root,
        inputDigest: before.digest,
        baselineWallMs: artifact.unmeasuredCoreWallMs,
        currentWallMs: artifact.measuredWallMs,
        order: ["baseline", "current"],
        meaning:
          "One ordered warm condition pair in the current context; namespace timing instrumentation applies only to current source. This is not a repeated benchmark or a cold CLI speedup.",
      };
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
      await requireUnchangedInput("AfterMeasured");
      const remaining = Math.floor(DECLARED_TEST_TIMEOUT - (performance.now() - started) - 5_000);
      if (remaining <= 0)
        throw new Error("No time remains in the declared test budget for cold CLI validation");
      // No input writer occurs between this receipt and the cold process.
      artifact.inputBeforeColdCli = artifact.inputAfterMeasured;
      artifact.repositoryBeforeColdCli = artifact.repositoryAfterMeasured;
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
      await requireUnchangedInput("After");
      expect(await literalFileReceipt(CLI)).toEqual(artifact.currentBuild);
      await checkpoint("complete");
      expect((await execFile("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim()).toBe(
        head,
      );
    } catch (error: unknown) {
      failed = true;
      failure = error;
      artifact.failedPhase = artifact.phase;
      artifact.failure = retainedProfileFailure(error);
    } finally {
      if (failed) {
        try {
          artifact.inputAfterFailure = await validationInputManifest(root);
        } catch (error: unknown) {
          artifact.inputAfterFailureError = retainedProfileFailure(error);
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
