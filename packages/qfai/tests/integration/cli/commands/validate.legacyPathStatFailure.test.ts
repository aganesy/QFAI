/**
 * The legacy `.qfai/output/validate.json` gate decides "stale file on disk"
 * with a `stat`. Only a missing path may read as absent; any other failure is
 * not evidence the file is missing and must reach the caller unchanged.
 *
 * `vi.mock` is hoisted to module scope, so this lives apart from the suites
 * that need the real filesystem calls.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { statSpy } = vi.hoisted(() => ({
  statSpy: vi.fn<(actual: FsPromises, target: string) => Promise<unknown>>(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    stat: (target: string) => statSpy(actual, target),
  };
});

const { evaluateLegacyValidateJsonGate } = await import("../../../../src/cli/commands/validate.js");

const LEGACY_REL = path.join(".qfai", "output", "validate.json");
const CURRENT_CONFIG_PATH = ".qfai/report/validate.json";
const LEGACY_CONFIG_PATH = ".qfai/output/validate.json";

function errnoError(code: string, filePath: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`${code}: simulated failure, stat '${filePath}'`);
  error.code = code;
  error.path = filePath;
  error.syscall = "stat";
  return error;
}

describe("legacy validate path lookup", () => {
  let root: string;
  let legacyPath: string;

  /** `stat` of the legacy path answers `onLegacy`; every other path is the real call. */
  function stubLegacyStat(onLegacy: (actual: FsPromises) => Promise<unknown>): void {
    statSpy.mockImplementation((actual, target) =>
      target === legacyPath ? onLegacy(actual) : actual.stat(target),
    );
  }

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "qfai-legacy-stat-"));
    legacyPath = path.join(root, LEGACY_REL);
    statSpy.mockReset();
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("reads a missing legacy file as absent, with no finding", async () => {
    stubLegacyStat(async () => {
      throw errnoError("ENOENT", legacyPath);
    });

    const gate = await evaluateLegacyValidateJsonGate({
      root,
      configuredValidateJsonPath: CURRENT_CONFIG_PATH,
    });

    expect(gate.issue).toBeNull();
    expect(gate.refuseConfiguredLegacyWrite).toBe(false);
  });

  it("reports a present legacy file", async () => {
    stubLegacyStat((actual) => actual.stat(root));

    const gate = await evaluateLegacyValidateJsonGate({
      root,
      configuredValidateJsonPath: CURRENT_CONFIG_PATH,
    });

    expect(gate.issue?.code).toBe("D-DEPRECATED-PATH");
    expect(gate.refuseConfiguredLegacyWrite).toBe(false);
  });

  it.each(["EACCES", "EIO"])("rethrows the same %s error unchanged", async (code) => {
    const failure = errnoError(code, legacyPath);
    stubLegacyStat(async () => {
      throw failure;
    });

    await expect(
      evaluateLegacyValidateJsonGate({
        root,
        configuredValidateJsonPath: CURRENT_CONFIG_PATH,
      }),
    ).rejects.toBe(failure);
  });

  it("rethrows an unexpected failure when the config names the legacy path", async () => {
    const failure = errnoError("EACCES", legacyPath);
    stubLegacyStat(async () => {
      throw failure;
    });

    await expect(
      evaluateLegacyValidateJsonGate({
        root,
        configuredValidateJsonPath: LEGACY_CONFIG_PATH,
      }),
    ).rejects.toBe(failure);
  });
});
