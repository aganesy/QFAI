/**
 * E2E: the discussion skill `qfai init` installs keeps discussion planner-first.
 *
 * An adopter who runs init gets a discussion stage that carries the screen explorations unranked,
 * finalizes no design system, and records only the brand direction the user chose.
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";

const DISCUSSION_SKILL = path.join(".qfai", "assistant", "skills", "qfai-discussion");

function section(markdown: string, heading: string): string {
  return markdown.split(/^## /m).find((part) => part.startsWith(heading)) ?? "";
}

// QFAI:SPEC-0002:US-0002-0005
describe("E2E: planner-first design authoring (US-0002-0005)", () => {
  it("US-0002-0005: the installed discussion skill carries explorations unranked and records the user's brand direction", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-planner-first-"));
    try {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
      const skillDir = path.join(root, DISCUSSION_SKILL);
      const skill = await readFile(path.join(skillDir, "SKILL.md"), "utf-8");
      const matrix = await readFile(
        path.join(skillDir, "references", "discussion-completion-matrix.md"),
        "utf-8",
      );
      const uiBearing = section(matrix, "UI-bearing Packs");

      expect(uiBearing).toMatch(/^Completion is blocked until all are true:$/m);
      expect(uiBearing).toMatch(/carried\s+unranked\s+—\s+no\s+single\s+screen\s+exploration/);
      expect(uiBearing).toMatch(/design\s+system\s+is\s+not\s+finalized\s+here/);
      expect(uiBearing).toMatch(/01_Context\.md#Design Direction/);
      expect(uiBearing).toMatch(/taken\s+without\s+the\s+user\s+carries\s+`chosen_by: assumption`/);
      expect(skill).toMatch(/Discussion is planner-first/);
      expect(skill).toMatch(/published theme the product is built on is the user's decision/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
