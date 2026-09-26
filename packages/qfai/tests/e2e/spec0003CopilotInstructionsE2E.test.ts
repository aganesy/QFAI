/**
 * E2E: the Copilot review instructions `qfai init` distributes (spec-0003).
 *
 * Covers the three stories about that surface: the files are written
 * create-only, `--force` restores them from the shipped templates, and the run
 * that creates them tells the operator how to switch the review on.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const shippedInstructionsDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".github",
  "instructions",
);

const INSTRUCTION_FILES = ["code-review.instructions.md", "principles.instructions.md"] as const;

async function createTempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "qfai-e2e-instructions-"));
}

function instructionPath(root: string, name: string): string {
  return path.join(root, ".github", "instructions", name);
}

// QFAI:BF-0001
describe("E2E: Copilot review instructions are distributed create-only (US-0003-0011)", () => {
  it("writes both instruction files on a first init", async () => {
    const tmpDir = await createTempDir();
    try {
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      for (const name of INSTRUCTION_FILES) {
        const written = await readFile(instructionPath(tmpDir, name), "utf-8");
        const shipped = await readFile(path.join(shippedInstructionsDir, name), "utf-8");

        // The template's first line survives the write; the slot it carries for
        // the project's own language rules does not. An unfilled slot in the
        // project is the template leaking rather than being applied.
        expect(written, `${name} must come from the shipped template`).toContain(
          shipped.split("\n")[0],
        );
        expect(written, `${name} must not keep the template's language slot`).not.toContain(
          "<!-- qfai:language-rules -->",
        );
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("leaves a project's own edit to those files alone on a re-run", async () => {
    const tmpDir = await createTempDir();
    try {
      // The story's whole claim is create-only: without a first init the files
      // would simply be written, and the second run is what distinguishes
      // create-only from an unconditional copy.
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const edited = "# Edited by the project\n";
      for (const name of INSTRUCTION_FILES) {
        await writeFile(instructionPath(tmpDir, name), edited, "utf-8");
      }

      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      for (const name of INSTRUCTION_FILES) {
        expect(await readFile(instructionPath(tmpDir, name), "utf-8")).toBe(edited);
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// QFAI:BF-0001
describe("E2E: --force regenerates the instruction files (US-0003-0012)", () => {
  it("restores an edited file to what a fresh init writes", async () => {
    const tmpDir = await createTempDir();
    const pristineDir = await createTempDir();
    try {
      // The comparison is against a fresh init rather than the template on
      // disk, because the write fills the template's language slot: holding the
      // result against the template would pin the slot instead of the restore.
      await captureStdout(() =>
        runInit({ dir: pristineDir, force: false, dryRun: false, yes: true }),
      );
      await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

      const edited = "# Edited by the project\n";
      for (const name of INSTRUCTION_FILES) {
        await writeFile(instructionPath(tmpDir, name), edited, "utf-8");
      }

      await captureStdout(() => runInit({ dir: tmpDir, force: true, dryRun: false, yes: true }));

      for (const name of INSTRUCTION_FILES) {
        const written = await readFile(instructionPath(tmpDir, name), "utf-8");
        const pristine = await readFile(instructionPath(pristineDir, name), "utf-8");
        expect(written, `--force must rewrite ${name}`).toBe(pristine);
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
      await rm(pristineDir, { recursive: true, force: true });
    }
  });
});

// QFAI:BF-0001
describe("E2E: activation guidance for newly created instructions (US-0003-0013)", () => {
  it("names the comment and the workflow that switch the review on", async () => {
    const tmpDir = await createTempDir();
    try {
      const output = await captureStdout(() =>
        runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }),
      );

      expect(output).toContain("Created the instructions files for Copilot code review.");
      expect(output).toContain("@github-copilot review");
      expect(output).toContain("GitHub Actions workflow");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("stays silent when the files were already there", async () => {
    const tmpDir = await createTempDir();
    try {
      // Guidance about a file this run did not create is guidance the operator
      // has already read, and printing it every time is what makes it unread.
      await mkdir(path.join(tmpDir, ".github", "instructions"), { recursive: true });
      for (const name of INSTRUCTION_FILES) {
        await writeFile(instructionPath(tmpDir, name), "# Already here\n", "utf-8");
      }

      const output = await captureStdout(() =>
        runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }),
      );

      expect(output).not.toContain("Created the instructions files for Copilot code review.");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
