/**
 * E2E: the discussion stage an adopter installs with `qfai init` picks no early winner, and hands
 * the brand direction the user chose to `/qfai-sdd` Phase 0.
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";

let root = "";

async function installed(relative: string): Promise<string> {
  const skill = path.join(root, ".qfai", "assistant", "skills", "qfai-discussion");
  return await readFile(path.join(skill, ...relative.split("/")), "utf-8");
}

function section(markdown: string, heading: string): string {
  return markdown.split(/^## /m).find((part) => part.startsWith(heading)) ?? "";
}

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-design-direction-"));
  await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

// QFAI:SPEC-0010:US-0010-0008
describe("E2E: No Early Winner (US-0010-0008)", () => {
  it("US-0010-0008: the installed discussion stage carries the screen explorations unranked", async () => {
    const matrix = section(
      await installed("references/discussion-completion-matrix.md"),
      "UI-bearing Packs",
    );
    const contracts = await installed("templates/uiux/40_screen_contracts.md");

    expect(matrix).toMatch(/^Completion is blocked until all are true:$/m);
    expect(matrix).toMatch(/carried\s+unranked\s+—\s+no\s+single\s+screen\s+exploration/);
    expect(matrix).toMatch(/design\s+system\s+is\s+not\s+finalized\s+here/);
    expect(contracts).not.toMatch(/\b(selected|winner|finali[sz]ed?)\b/i);
    expect(contracts).toMatch(
      /^- Brand direction the user chose: `\.\.\/01_Context\.md#Design Direction`/m,
    );
  });
});

// QFAI:SPEC-0010:US-0010-0009
describe("E2E: Design Direction Handoff (US-0010-0009)", () => {
  it("US-0010-0009: the installed stage records the user's direction for /qfai-sdd Phase 0 to author DESIGN.md", async () => {
    const skill = await installed("SKILL.md");
    const direction = section(await installed("templates/01_Context.md"), "Design Direction");

    expect(direction).toMatch(/^- chosen_by: \[user\|assumption\]$/m);
    expect(direction).toMatch(/`\/qfai-sdd` Phase 0 authors root `DESIGN\.md` from it/);
    expect(skill).toMatch(/Record the design direction settled in step 2's session/);
    expect(skill).toMatch(
      /Root DESIGN\.md is not a discussion output: \/qfai-sdd Phase 0 authors it/,
    );
  });
});
