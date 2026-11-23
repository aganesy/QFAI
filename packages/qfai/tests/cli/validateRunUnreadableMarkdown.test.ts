/**
 * `qfai validate` records a story-tree Markdown file it cannot read as an unfinished run.
 *
 * A file under `paths.specsDir` that the run may not read stops validation, and `runValidate`
 * turns the failure into one `QFAI-SCAN-002` naming the file and the errno.
 *
 * The first read to reach the file is the story-tree read, which reads every file under
 * `paths.specsDir` before any profile check runs. The shared Markdown read of the HTML mock,
 * Mermaid screen flow and UI definition checks never reaches the file here, so it is guarded only
 * by the cases in `tests/core/markdownFiles.test.ts`.
 *
 * The file is made unreadable with `chmod`, so the case is skipped on Windows and as root, where
 * a mode bit does not stop the read.
 */
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { graphProcessFixture } from "../helpers/graphProcess.js";

const dirs: string[] = [];

afterEach(async () => {
  for (const dir of dirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

type Finding = { code: string; severity: string; message: string };

/** The findings `qfai validate` writes to `validate.json`. */
async function validateFindings(root: string): Promise<Finding[]> {
  const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  try {
    await runValidate({
      root,
      strict: false,
      format: "text",
      failOn: "never",
    });
  } finally {
    write.mockRestore();
    stderr.mockRestore();
  }
  const raw = await readFile(path.join(root, ".qfai", "report", "validate.json"), "utf-8");
  const parsed: { issues: Finding[] } = JSON.parse(raw);
  return parsed.issues;
}

describe("validate on a story-tree Markdown file it cannot read", () => {
  it.skipIf(process.platform === "win32" || process.geteuid?.() === 0)(
    "records the run as incomplete with one QFAI-SCAN-002 naming the file and EACCES",
    async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-unreadable-md-"));
      dirs.push(root);
      await runInit(
        { dir: root, force: false, dryRun: false, yes: true },
        undefined,
        graphProcessFixture().run,
      );
      const screens = path.join(root, ".qfai", "spec", "screens.md");
      await writeFile(
        screens,
        ["# Screens", "", "```mermaid", "stateDiagram-v2", "  home --> detail", "```", ""].join(
          "\n",
        ),
        "utf-8",
      );

      // The control: while the file is readable, the run finishes.
      const readable = await validateFindings(root);
      expect(readable.map((entry) => entry.code)).not.toContain("QFAI-SCAN-002");

      await chmod(screens, 0o000);
      try {
        const denied = await validateFindings(root);
        const incomplete = denied.filter((entry) => entry.code === "QFAI-SCAN-002");
        expect(incomplete).toHaveLength(1);
        expect(incomplete[0]?.severity).toBe("error");
        expect(incomplete[0]?.message).toContain("EACCES");
        expect(incomplete[0]?.message).toContain(path.join(".qfai", "spec", "screens.md"));
      } finally {
        await chmod(screens, 0o644);
      }
    },
  );
});
