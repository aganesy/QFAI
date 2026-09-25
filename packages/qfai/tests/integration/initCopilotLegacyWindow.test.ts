/**
 * Integration: what the generated Copilot instructions say about the legacy layout.
 *
 * `qfai init` writes `.github/copilot-instructions.md` into every project it
 * initializes. Its legacy-layout line has to describe the layout the way init
 * itself reports it: past the compatibility window, as an error on stderr.
 */
// QFAI:SPEC-0003:TC-0003-0059
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

describe("TC-0003-0059 (TDD-0094): generated Copilot instructions state the closed legacy window", () => {
  let dir = "";
  let text = "";
  let legacyItem = "";

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "qfai-init-tc0059-"));
    await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
    text = await readFile(path.join(dir, ".github", "copilot-instructions.md"), "utf-8");
    // The top-level list item that mentions the legacy finding, with its
    // continuation lines.
    legacyItem =
      text
        .split(/\n(?=- )/)
        .find((item) => item.includes("D-DEPRECATED-PATH"))
        ?.replace(/\s+/g, " ") ?? "";
  });

  afterAll(async () => {
    if (dir) await removeTempTree(dir);
  });

  it("names both legacy surfaces and says their compatibility window has closed", () => {
    expect(legacyItem).toContain("`.qfai/assistant/steering/`");
    expect(legacyItem).toContain("`.qfai/assistant/instructions/`");
    expect(legacyItem).toContain("past its compatibility window");
  });

  it("says qfai init reports the layout on stderr as a D-DEPRECATED-PATH error", () => {
    expect(legacyItem).toContain("`qfai init` reports it on stderr as a `D-DEPRECATED-PATH` error");
  });

  it("names the migration command", () => {
    expect(legacyItem).toContain("`qfai init --upgrade-assistant-tree`");
  });

  it("calls the layout neither read-compatible nor the finding a warning", () => {
    expect(text).not.toMatch(/read-compatible/i);
    expect(legacyItem).not.toMatch(/warning/i);
  });
});
