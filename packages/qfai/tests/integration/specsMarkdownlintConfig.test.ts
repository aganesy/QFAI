/**
 * Regression guard: `.qfai/spec/.markdownlint.jsonc` is actually picked up
 * by `markdownlint-cli2` when linting files under `.qfai/spec/`.
 *
 * Rationale: if `markdownlint-cli2` stops merging the per-directory config, every
 * spec-pack MD013 threshold regressions would start firing again and CI
 * `pnpm ci:lint` would flake on content that has been intentionally exempted.
 *
 * We run the linter programmatically against a temp directory that mirrors
 * the repo-root config layout, drop a file that would be flagged without the
 * nested override, and assert zero violations.
 */

import { mkdtemp, mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { main as markdownlintCli2Main } from "markdownlint-cli2";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const rootCli2Config = path.join(repoRoot, ".markdownlint-cli2.jsonc");
const specsDirConfig = path.join(repoRoot, ".qfai", "spec", ".markdownlint.jsonc");
const deliberationDirConfig = path.join(repoRoot, ".qfai", "deliberation", ".markdownlint.jsonc");

/** Lint `pattern` under `directory` with markdownlint-cli2 and return its exit code and output. */
async function lintUnder(
  directory: string,
  pattern: string,
): Promise<{ exitCode: number; output: string }> {
  const outputLog: string[] = [];
  const log = (...args: unknown[]) => outputLog.push(args.map((x) => String(x)).join(" "));
  const exitCode = await markdownlintCli2Main({
    directory,
    argv: [pattern],
    logMessage: log,
    logError: log,
    noRequire: true,
  });
  return { exitCode, output: outputLog.join("\n") };
}

describe("nested markdownlint config under .qfai/spec/", () => {
  it("relaxes MD013 for story-tree files via the per-directory .markdownlint.jsonc", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-md-cfg-"));
    try {
      await copyFile(rootCli2Config, path.join(tempRoot, ".markdownlint-cli2.jsonc"));
      const specsDir = path.join(tempRoot, ".qfai", "spec");
      await mkdir(specsDir, { recursive: true });
      await copyFile(specsDirConfig, path.join(specsDir, ".markdownlint.jsonc"));

      const specPackDir = path.join(specsDir, "01_policy");
      await mkdir(specPackDir, { recursive: true });
      const overLongLine = "decision: " + "x".repeat(150);
      const markdownBody = ["# 07 Decisions", "", "## DR-0001", "", `- ${overLongLine}`, ""].join(
        "\n",
      );
      await writeFile(path.join(specPackDir, "decision.md"), markdownBody, "utf-8");

      const outputLog: string[] = [];
      const logger = {
        info: (...args: unknown[]) => outputLog.push(args.map((x) => String(x)).join(" ")),
        error: (...args: unknown[]) => outputLog.push(args.map((x) => String(x)).join(" ")),
      };

      const exitCode = await markdownlintCli2Main({
        directory: tempRoot,
        argv: [".qfai/spec/**/*.md"],
        logMessage: logger.info,
        logError: logger.error,
        noRequire: true,
      });

      expect(exitCode, outputLog.join("\n")).toBe(0);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

describe("nested markdownlint config under .qfai/deliberation/", () => {
  // A deliberation record passes QFAI-DELIB-001 on its layout alone, and once
  // committed its prose may not be edited, so a long Subject line must not fail
  // the lint.
  const overLongSubject = "The run was asked to settle" + " the subject".repeat(20) + ".";
  const record = (subject: string) =>
    ["# Deliberation record: lint", "", "## Subject", "", subject, ""].join("\n");

  it("exempts a record's long prose line from MD013", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-md-delib-"));
    try {
      await copyFile(rootCli2Config, path.join(tempRoot, ".markdownlint-cli2.jsonc"));
      const recordsDir = path.join(tempRoot, ".qfai", "deliberation");
      await mkdir(recordsDir, { recursive: true });
      await copyFile(deliberationDirConfig, path.join(recordsDir, ".markdownlint.jsonc"));
      await writeFile(
        path.join(recordsDir, "20261113000000-lint.md"),
        record(overLongSubject),
        "utf-8",
      );

      const { exitCode, output } = await lintUnder(tempRoot, ".qfai/deliberation/**/*.md");

      expect(exitCode, output).toBe(0);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("still reports the same line outside the records directory", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-md-delib-"));
    try {
      await copyFile(rootCli2Config, path.join(tempRoot, ".markdownlint-cli2.jsonc"));
      const otherDir = path.join(tempRoot, "docs");
      await mkdir(otherDir, { recursive: true });
      await writeFile(path.join(otherDir, "note.md"), record(overLongSubject), "utf-8");

      const { exitCode, output } = await lintUnder(tempRoot, "docs/**/*.md");

      expect(exitCode).not.toBe(0);
      expect(output).toMatch(/MD013/);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
