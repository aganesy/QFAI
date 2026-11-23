/**
 * A name that merely begins with two dots, such as `..notes`, sits under its
 * base: only a `..` segment leaves it.
 *
 * Several callers tested `relative.startsWith("..")` themselves rather than
 * asking the shared `isInside`, so a directory called `..fixtures` or
 * `..archive` read as outside the tree that holds it. Each row below goes
 * through one such caller's public surface, once with a `..name` path that is
 * inside and once with a real `../` path that is not.
 */
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { refuseWritingThroughToOwnAssets } from "../../src/cli/commands/init.js";
import {
  atddAcceptanceTestGlobs,
  resolveTestKind,
  type TestLayerRoots,
} from "../../src/core/atddTraceability.js";
import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import { createDoctorData } from "../../src/core/doctor.js";
import { validateAssistantAssets } from "../../src/core/validators/assistantAssets.js";

const created: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await realpath(await mkdtemp(path.join(os.tmpdir(), "qfai-dotdot-name-")));
  created.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of created.splice(0)) await rm(dir, { recursive: true, force: true });
});

function withPaths(paths: Partial<QfaiConfig["paths"]>): QfaiConfig {
  return { ...defaultConfig, paths: { ...defaultConfig.paths, ...paths } };
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

describe("ATDD acceptance globs", () => {
  const root = path.resolve("proj");

  it("spell a tests root named like ..suites relative to the project", () => {
    const globs = atddAcceptanceTestGlobs(root, withPaths({ testsDir: "..suites" }), "**/*.ts");
    expect(globs).toContain("..suites/e2e/**/*.ts");
  });

  it("spell a tests root above the project absolutely", () => {
    const globs = atddAcceptanceTestGlobs(root, withPaths({ testsDir: "../suites" }), "**/*.ts");
    expect(globs).toContain(`${toPosix(path.resolve(root, "..", "suites"))}/e2e/**/*.ts`);
  });
});

describe("ATDD test layer resolution", () => {
  const root = path.resolve("proj");
  const roots: TestLayerRoots = {
    root,
    testsDirName: "tests",
    e2eRoot: path.join(root, "acceptance"),
    apiRoot: path.join(root, "contract-suite"),
    integrationRoot: path.join(root, "wiring-suite"),
    isPackageRoot: () => false,
  };

  it("reads a file in a ..fixtures directory under the layer root as that layer", () => {
    expect(resolveTestKind(path.join(root, "acceptance", "..fixtures", "login.ts"), roots)).toBe(
      "e2e",
    );
  });

  it("reads a suite under a ..work directory in the project by its path", () => {
    expect(resolveTestKind(path.join(root, "..work", "tests", "e2e", "login.ts"), roots)).toBe(
      "e2e",
    );
  });

  it("answers no layer for a suite above the project", () => {
    expect(
      resolveTestKind(path.resolve(root, "..", "other", "tests", "e2e", "login.ts"), roots),
    ).toBe(null);
  });
});

describe("qfai init's write-through guard", () => {
  it("refuses a destination inside the assets under a ..vendored directory", async () => {
    const assets = path.join(await tempDir(), "assets");
    const destRoot = path.join(assets, "..vendored");
    await mkdir(path.join(destRoot, ".qfai", "assistant"), { recursive: true });

    await expect(refuseWritingThroughToOwnAssets(destRoot, assets)).rejects.toThrow(
      /inside the assets this command copies from/,
    );
  });

  it("lets a destination beside the assets through", async () => {
    const base = await tempDir();
    const assets = path.join(base, "assets");
    const destRoot = path.join(base, "project");
    await mkdir(assets, { recursive: true });
    await mkdir(path.join(destRoot, ".qfai", "assistant"), { recursive: true });

    await expect(refuseWritingThroughToOwnAssets(destRoot, assets)).resolves.toBeUndefined();
  });
});

describe("qfai doctor's output path alignment", () => {
  async function alignment(validateJsonPath: string): Promise<string | undefined> {
    const root = await tempDir();
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      ["output:", `  validateJsonPath: ${validateJsonPath}`, ""].join("\n"),
      "utf-8",
    );
    const data = await createDoctorData({ startDir: root, rootExplicit: true });
    return data.checks.find((check) => check.id === "output.pathAlignment")?.severity;
  }

  it("accepts validate.json under a ..archive directory in outDir", async () => {
    expect(await alignment(".qfai/report/..archive/validate.json")).toBe("ok");
  });

  it("warns for validate.json beside outDir", async () => {
    expect(await alignment(".qfai/elsewhere/validate.json")).toBe("warning");
  });
});

describe("assistant asset messages", () => {
  async function missingDriftProtocol(root: string, skillsDir: string): Promise<string> {
    const { message } =
      (await validateAssistantAssets(root, withPaths({ skillsDir }))).find(
        (entry) => entry.code === "QFAI-ASSETS-001",
      ) ?? {};
    return message ?? "";
  }

  it("name a file under a ..assistant directory by its repository-relative path", async () => {
    const root = await tempDir();
    await mkdir(path.join(root, "..assistant", "skill"), { recursive: true });
    expect(await missingDriftProtocol(root, "..assistant/skill")).toBe(
      "Required file ..assistant/rule/drift-protocol.md is missing.",
    );
  });

  it("name a file above the repository by its absolute path", async () => {
    const base = await tempDir();
    const root = path.join(base, "project");
    await mkdir(root, { recursive: true });
    await mkdir(path.join(base, "shared", "skill"), { recursive: true });
    expect(await missingDriftProtocol(root, "../shared/skill")).toBe(
      `Required file ${path.join(base, "shared", "rule", "drift-protocol.md")} is missing.`,
    );
  });
});
