/**
 * Regression guard: `.qfai/specs/.markdownlint.jsonc` is actually picked up
 * by `markdownlint-cli2` when linting files under `.qfai/specs/`.
 *
 * Rationale (addresses PR #196 review thread on `.qfai/specs/.markdownlint.jsonc`):
 * if `markdownlint-cli2` stops merging the per-directory config, every
 * spec-pack MD013/MD024/etc. violation would start firing again and CI
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
const specsDirConfig = path.join(repoRoot, ".qfai", "specs", ".markdownlint.jsonc");

describe("nested markdownlint config under .qfai/specs/", () => {
  it("disables MD013 for spec-pack files via the per-directory .markdownlint.jsonc", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-md-cfg-"));
    try {
      await copyFile(rootCli2Config, path.join(tempRoot, ".markdownlint-cli2.jsonc"));
      const specsDir = path.join(tempRoot, ".qfai", "specs");
      await mkdir(specsDir, { recursive: true });
      await copyFile(specsDirConfig, path.join(specsDir, ".markdownlint.jsonc"));

      const specPackDir = path.join(specsDir, "spec-9999");
      await mkdir(specPackDir, { recursive: true });
      const overLongLine = "decision: " + "x".repeat(400);
      const markdownBody = ["# 07 Decisions", "", "### DR-0001", "", `- ${overLongLine}`, ""].join(
        "\n",
      );
      await writeFile(path.join(specPackDir, "07_Decisions.md"), markdownBody, "utf-8");

      const outputLog: string[] = [];
      const logger = {
        info: (...args: unknown[]) => outputLog.push(args.map((x) => String(x)).join(" ")),
        error: (...args: unknown[]) => outputLog.push(args.map((x) => String(x)).join(" ")),
      };

      await markdownlintCli2Main({
        directory: tempRoot,
        argv: [".qfai/specs/**/*.md"],
        logMessage: logger.info,
        logError: logger.error,
        noRequire: true,
      });

      const md013Hits = outputLog.filter((line) => /MD013/.test(line));
      expect(md013Hits, outputLog.join("\n")).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
