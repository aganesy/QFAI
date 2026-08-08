/**
 * `qfai init` is the one command that can repair a flattened integration link,
 * and it declined to.
 *
 * `ensureSymlink` returned `"skipped"` for any existing non-symlink unless
 * `--force` was passed, and the skipped paths are printed as a plain list —
 * indistinguishable from "already correct". So an operator who suspected
 * something, re-ran `qfai init` and read a clean exit had been told nothing,
 * and recovery required knowing about a flag no message named.
 *
 * The path is one qfai created and owns, and its content is the link target, so
 * there is no user content to preserve.
 */

import { lstat, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-repair-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const LINK = path.join(".claude", "skills", "qfai-atdd");

describe("qfai init repairs a link a checkout flattened", () => {
  it("replaces the regular file without --force, and says so", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Simulate the flattened checkout: replace the link with the text file
      // git writes when core.symlinks is false.
      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, "../../.qfai/assistant/skills/qfai-atdd", "utf-8");
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(false);

      const stdout = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      );

      expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
      expect(await readlink(linkPath)).toContain("qfai-atdd");
      // Silence is what hid the problem; the repair is announced.
      expect(stdout).toContain("was a flattened symlink");
    });
  });

  it("reports a dry run as a repair it would make, and makes none", async () => {
    // Both the removal and the recreate are behind `!options.dryRun`, so the
    // unconditional "repaired" line told the one invocation whose whole purpose
    // is to preview that a broken file had been fixed.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, "../../.qfai/assistant/skills/qfai-atdd", "utf-8");

      const stdout = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: true, yes: true }),
      );

      expect(stdout).toContain("would repair");
      expect(stdout).not.toContain("  repaired:");
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(false);
    });
  });

  it("leaves a healthy link alone and does not announce a repair", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const stdout = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      );

      expect((await lstat(path.join(root, LINK))).isSymbolicLink()).toBe(true);
      expect(stdout).not.toContain("was a flattened symlink");
    });
  });

  it("preserves a file whose content is not the link target", async () => {
    // A team that customised `.claude/agents/qa-gatekeeper.md`, or replaced a
    // generated skill link with a real directory, has content of its own there.
    // Auto-repair is scoped to the flattened-link signature — the target path
    // and nothing else — and `--force` stays the documented overwrite path.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const customised = path.join(root, ".claude", "agents", "qa-gatekeeper.md");
      await rm(customised, { force: true });
      await writeFile(customised, "# our own gatekeeper\n", "utf-8");

      const stdout = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      );

      expect(await readFile(customised, "utf-8")).toBe("# our own gatekeeper\n");
      expect((await lstat(customised)).isSymbolicLink()).toBe(false);
      expect(stdout).not.toContain("was a flattened symlink");
    });
  });

  it("still overwrites a customised wrapper under --force", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const customised = path.join(root, ".claude", "agents", "qa-gatekeeper.md");
      await rm(customised, { force: true });
      await writeFile(customised, "# our own gatekeeper\n", "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect((await lstat(customised)).isSymbolicLink()).toBe(true);
    });
  });

  it("does not touch a file the project owns", async () => {
    // The repair is scoped to paths qfai creates; a project's own skill in the
    // same directory is not qfai's to rewrite.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const mine = path.join(root, ".claude", "skills", "my-own-skill.md");
      await writeFile(mine, "# mine\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readFile(mine, "utf-8")).toBe("# mine\n");
    });
  });
});
