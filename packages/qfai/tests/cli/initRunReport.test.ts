/**
 * `qfai init` allocated its verbosity to the wrong list.
 *
 * `report()` enumerated `skipped` in full and collapsed `copied` to a single
 * integer. In a dry run `skipped` is always empty — nothing can be skipped when
 * nothing is written — so `--dry-run`, the one mode whose whole purpose is to
 * answer "what is this about to touch", answered with a bare count. The
 * inverse, a no-op re-run over an already-initialized tree, dumped every
 * skipped path even though by definition nothing needed review.
 *
 * The heading also never adapted to `dryRun`, so a past-tense line sat
 * directly under the `dry-run` header while `removed` and `.gitignore` already
 * phrased both sides. It also said `created` for a list that carries
 * overwrites too (`--force` skills/agents, the `.gitignore` managed block),
 * which made a dry-run preview of a destructive re-run read as a fresh
 * install; the neutral `written` / `would write` covers both.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";

/** The `    - <relative path>` entries under a given report heading. */
function pathsUnder(output: string, heading: string): string[] {
  const lines = output.split("\n");
  const start = lines.indexOf(heading);
  if (start === -1) {
    return [];
  }
  const listed: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith("    - ")) {
      break;
    }
    listed.push(line.slice("    - ".length));
  }
  return listed;
}

describe("qfai init run report", { timeout: 60000 }, () => {
  it("enumerates the paths a --dry-run would write, in the future tense", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: true, yes: true });
      });

      expect(output).toMatch(/ {2}would write:\s*\d+/);
      expect(output).toContain("  would write paths:");
      expect(output).toContain("DESIGN.md");
      // The past-tense heading must not appear under a dry-run header.
      expect(output).not.toMatch(/ {2}written:\s*\d+/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("enumerates the paths a real run wrote, in the past tense", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      expect(output).toMatch(/ {2}written:\s*\d+/);
      expect(output).toContain("  written paths:");
      expect(output).toContain("DESIGN.md");
      expect(output).not.toContain("would write");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("collapses skipped to a count on a no-op re-run and points at --verbose", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const secondRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      expect(secondRun).toMatch(/ {2}skipped:\s*\d+/);
      expect(secondRun).not.toContain("skipped paths:");
      expect(secondRun).toContain("--verbose");
      // The no-op re-run must stay short: header + counts + hint, not 394 paths.
      expect(secondRun.split("\n").filter((line) => line.trim().startsWith("- "))).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("lists the skipped paths when --verbose is supplied", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const secondRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true, verbose: true });
      });

      expect(secondRun).toContain("  skipped paths:");
      expect(secondRun).toContain("DESIGN.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // `--upgrade-assistant-tree --dry-run` books the migration target into
  // `copied` without writing it, so the template copy that follows finds the
  // destination still missing and books the same path a second time. The
  // preview has to match the write set a real run would produce, so the
  // aggregated lists are de-duplicated before the count and the enumeration.
  it("does not list a migrated path twice in a --upgrade-assistant-tree dry run", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      const legacy = path.join(root, ".qfai", "assistant", "instructions");
      await mkdir(legacy, { recursive: true });
      await writeFile(path.join(legacy, "quality.md"), "# legacy quality\n", "utf-8");

      const output = await captureStdout(async () => {
        await runInit({
          dir: root,
          force: false,
          dryRun: true,
          yes: true,
          upgradeAssistantTree: true,
        });
      });

      const listed = pathsUnder(output, "  would write paths:");
      const migrated = path.join(".qfai", "assistant", "constitution", "quality.md");
      expect(listed.filter((entry) => entry === migrated)).toHaveLength(1);
      expect(new Set(listed).size).toBe(listed.length);
      expect(output).toContain(`  would write: ${listed.length}`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // `collectTemplateFiles()` accumulates `readdir()` results, whose order no
  // filesystem guarantees, so an unsorted list makes the preview undiffable
  // against another checkout and churns snapshots with no change in content.
  it("lists the written paths in a stable sorted order", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: true, yes: true });
      });

      const listed = pathsUnder(output, "  would write paths:");
      expect(listed.length).toBeGreaterThan(1);
      expect(listed).toEqual([...listed].sort());
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("sorts the skipped and removed lists too", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const secondRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true, verbose: true });
      });

      const skipped = pathsUnder(secondRun, "  skipped paths:");
      expect(skipped.length).toBeGreaterThan(1);
      expect(skipped).toEqual([...skipped].sort());
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // A migrated legacy file's name is chosen by the repository being upgraded,
  // not by qfai. Printed verbatim, a newline in it forges the report's own
  // headings and an ANSI escape drives the terminal — in the one mode whose
  // purpose is reviewing changes before they are made.
  it("escapes and quotes a control character in a migrated file name", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      const legacy = path.join(root, ".qfai", "assistant", "instructions");
      await mkdir(legacy, { recursive: true });
      const hostile = "spoof\n    - forged-entry.md\u001b[31m.md";
      await writeFile(path.join(legacy, hostile), "# hostile\n", "utf-8");

      const output = await captureStdout(async () => {
        await runInit({
          dir: root,
          force: false,
          dryRun: true,
          yes: true,
          upgradeAssistantTree: true,
        });
      });

      // Neither the raw newline nor the raw escape reaches stdout.
      expect(output).not.toContain(hostile);
      expect(output).not.toContain("\u001b[31m");
      expect(output).toContain("\\x0a");
      expect(output).toContain("\\x1b");
      // The forged bullet is not a list entry of its own.
      expect(pathsUnder(output, "  would write paths:")).not.toContain("forged-entry.md");
      // The escaped form is quoted, so the escapes read as one token.
      const quoted = pathsUnder(output, "  would write paths:").filter((entry) =>
        entry.startsWith('"'),
      );
      expect(quoted).toHaveLength(1);
      expect(quoted[0]?.endsWith('"')).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("leaves an ordinary path unquoted", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: true, yes: true });
      });

      const listed = pathsUnder(output, "  would write paths:");
      expect(listed.length).toBeGreaterThan(0);
      expect(listed.filter((entry) => entry.startsWith('"'))).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
