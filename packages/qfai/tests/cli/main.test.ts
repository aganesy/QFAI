import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { run } from "../../src/cli/main.js";

describe("cli root discovery", () => {
  it("finds config in parent when --root is omitted", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-root-"));
    const cwd = path.join(root, "packages", "app");
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await mkdir(cwd, { recursive: true });

      const previousExitCode = process.exitCode;
      process.exitCode = undefined;
      try {
        await run(["validate", "--fail-on", "never"], cwd);
      } finally {
        process.exitCode = previousExitCode;
      }

      const validatePath = path.join(root, ".qfai", "out", "validate.json");
      await expect(readFile(validatePath, "utf-8")).resolves.toContain(
        '"toolVersion"',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
