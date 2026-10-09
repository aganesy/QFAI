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

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { collectTemplateFiles } from "../../src/core/fs/templateCopy.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
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

/** The `N` on a `  <heading>: N` count line; 0 when the line is absent. */
function reportedCount(output: string, heading: string): number {
  const prefix = `  ${heading}: `;
  const line = output.split("\n").find((entry) => entry.startsWith(prefix));
  return line === undefined ? 0 : Number(line.slice(prefix.length));
}

describe("qfai init run report", () => {
  it.each([false, true])(
    "lists every shipped rule on a no-op verbose rerun with dryRun=%s",
    async (dryRun) => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
      try {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
        const ruleAssets = path.join(getInitAssetsDir(), ".qfai", "assistant", "rule");
        const shipped = (await collectTemplateFiles(ruleAssets)).map(
          (file) => `rule/${path.relative(ruleAssets, file).split(path.sep).join("/")}`,
        );
        expect(shipped.length).toBeGreaterThan(0);
        const output = await captureStdout(() =>
          runInit({ dir: root, force: false, dryRun, yes: true, verbose: true }),
        );
        const skipped = pathsUnder(output, "  skipped paths:");
        for (const relative of shipped) {
          expect(skipped).toContain(`.qfai/assistant/${relative}`);
        }
        expect(new Set(skipped).size).toBe(skipped.length);
        expect(reportedCount(output, "skipped")).toBe(skipped.length);
        expect(pathsUnder(output, "  written paths:")).toEqual([]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

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

  // The destination is operator-supplied through `--dir` and echoed in the
  // report's own header. Escaping only the listings left the one line above
  // them forgeable, in the report whose purpose is reviewing changes first.
  // Same fixture limitation as the row above.
  it.skipIf(process.platform === "win32")(
    "escapes a control character in the destination it announces",
    async () => {
      const parent = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
      const hostile = "dest\n  would write paths:\n    - forged-entry.md\u001b[31mx";
      const root = path.join(parent, hostile);
      try {
        await mkdir(root, { recursive: true });

        const output = await captureStdout(async () => {
          await runInit({ dir: root, force: false, dryRun: true, yes: true });
        });

        expect(output).not.toContain(hostile);
        expect(output).not.toContain("\u001b[31m");
        expect(output).toContain("\\x0a");
        expect(output).toContain("\\x1b");
      } finally {
        await rm(parent, { recursive: true, force: true });
      }
    },
  );

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

  // Over-correction pin: only paths that were actually written leave the skip
  // set. A no-op re-run writes nothing, so every skip must survive.
  it("keeps genuinely skipped paths in the skipped list", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const secondRun = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true, verbose: true });
      });

      const written = pathsUnder(secondRun, "  written paths:");
      const skipped = pathsUnder(secondRun, "  skipped paths:");
      // A create-only root file the first run wrote: the second run has to
      // report it as skipped rather than written.
      expect(skipped).toContain("qfai.config.yaml");
      expect(written).not.toContain("qfai.config.yaml");
      expect(skipped.length).toBeGreaterThan(1);
      expect(reportedCount(secondRun, "skipped")).toBe(skipped.length);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // `--force` rewrote every distributed path and reported all of them as written,
  // so the count said nothing about what the upgrade changed.
  it("reports only the paths whose content changed under --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const edited = path.join(root, ".agents", "rules", "api-budget.md");
      await writeFile(edited, "edited by the project\n", "utf-8");

      const forced = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true, verbose: true });
      });

      const written = pathsUnder(forced, "  written paths:");
      const skipped = pathsUnder(forced, "  skipped paths:");
      expect(written).toContain(".agents/rules/api-budget.md");
      expect(await readFile(edited, "utf-8")).not.toBe("edited by the project\n");
      // Unchanged rule masters and the symlinked wrappers are not written again.
      expect(written).not.toContain(".agents/rules/action-reversibility.md");
      expect(skipped).toContain(".agents/rules/action-reversibility.md");
      expect(written.filter((entry) => entry.startsWith(".claude/agents/"))).toEqual([]);
      expect(written.filter((entry) => entry.startsWith(".codex/agents/"))).toEqual([]);
      expect(reportedCount(forced, "written")).toBe(written.length);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports no distributed file as written on a --force rerun over an unchanged tree", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-report-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true });
      });

      const secondForced = await captureStdout(async () => {
        await runInit({ dir: root, force: true, dryRun: false, yes: true, verbose: true });
      });

      const distributed = [
        ".agents/",
        ".claude/",
        ".codex/agents/",
        ".github/instructions/",
        ".github/copilot-instructions.md",
        ".qfai/assistant/",
      ];
      const written = pathsUnder(secondForced, "  written paths:");
      expect(
        written.filter((entry) => distributed.some((prefix) => entry.startsWith(prefix))),
      ).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
