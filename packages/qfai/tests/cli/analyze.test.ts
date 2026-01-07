import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runAnalyze } from "../../src/cli/commands/analyze.js";

import { captureStderr } from "../helpers/stderr.js";
import { captureStdout } from "../helpers/stdout.js";

describe("analyze", () => {
  it("lists prompts including custom ones", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-analyze-"));
    try {
      const standardDir = path.join(root, ".qfai", "prompts", "analyze");
      const localDir = path.join(root, ".qfai", "prompts.local", "analyze");
      await mkdir(standardDir, { recursive: true });
      await mkdir(localDir, { recursive: true });

      await writeFile(
        path.join(standardDir, "spec_to_scenario.md"),
        "# standard\n\nhello\n",
        "utf-8",
      );
      await writeFile(
        path.join(localDir, "custom_prompt.md"),
        "# custom\n\nhello\n",
        "utf-8",
      );
      await writeFile(
        path.join(standardDir, "old_deprecated.md"),
        "# Deprecated\n\nUse something else\n",
        "utf-8",
      );

      const out = await captureStdout(async () => {
        const code = await runAnalyze({ root, list: true });
        expect(code).toBe(0);
      });

      expect(out).toContain("- spec_to_scenario");
      expect(out).toContain("- custom_prompt");
      expect(out).not.toContain("old_deprecated");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("prefers prompts.local over prompts for the same name", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-analyze-"));
    try {
      const standardDir = path.join(root, ".qfai", "prompts", "analyze");
      const localDir = path.join(root, ".qfai", "prompts.local", "analyze");
      await mkdir(standardDir, { recursive: true });
      await mkdir(localDir, { recursive: true });

      await writeFile(
        path.join(standardDir, "spec_to_scenario.md"),
        "# standard\nstandard\n",
        "utf-8",
      );
      await writeFile(
        path.join(localDir, "spec_to_scenario.md"),
        "# local\nlocal\n",
        "utf-8",
      );

      const out = await captureStdout(async () => {
        const code = await runAnalyze({
          root,
          list: false,
          prompt: "spec_to_scenario",
        });
        expect(code).toBe(0);
      });

      expect(out).toContain("# local");
      expect(out).not.toContain("# standard");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns non-zero and shows candidates when prompt is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-analyze-"));
    try {
      const standardDir = path.join(root, ".qfai", "prompts", "analyze");
      await mkdir(standardDir, { recursive: true });
      await writeFile(
        path.join(standardDir, "spec_to_scenario.md"),
        "# standard\n",
        "utf-8",
      );

      const err = await captureStderr(async () => {
        const code = await runAnalyze({ root, list: false, prompt: "nope" });
        expect(code).toBe(1);
      });

      expect(err).toContain("prompt not found");
      expect(err).toContain("candidates");
      expect(err).toContain("spec_to_scenario");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
