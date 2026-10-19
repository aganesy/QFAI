/**
 * Acceptance test for the path states a forced `qfai init --dry-run` reports.
 *
 * A dry run listed every path it would write without saying which already exist, so a project
 * could not tell what an upgrade would overwrite before running it for real.
 */
// QFAI:AC-0001-0023-02
import { appendFile, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../helpers/legacyInit.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

const newTempDir = useTempDirPool("qfai-init-states-");

describe("qfai init --force --dry-run path states", () => {
  // QFAI:EX-0001-0023-02
  it("marks each path new, changed, identical or kept and writes nothing", async () => {
    const root = await newTempDir();
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    const edited = path.join(root, ".agents", "rules", "api-budget.md");
    await writeFile(edited, "edited by the project\n", "utf-8");
    await unlink(path.join(root, ".qfai", "assistant", "rule", "constitution.md"));
    await appendFile(path.join(root, "qfai.config.yaml"), "# tuned by the project\n", "utf-8");

    const lines = (
      await captureStdout(() =>
        runInit({ dir: root, force: true, dryRun: true, yes: true, verbose: true }),
      )
    ).split("\n");

    expect(lines).toContain("    - changed .agents/rules/api-budget.md");
    expect(lines).toContain("    - new     .qfai/assistant/rule/constitution.md");
    expect(lines).toContain("    - identical .agents/rules/action-reversibility.md");
    expect(lines).toContain("    - kept      qfai.config.yaml");
    expect(await readFile(edited, "utf-8")).toBe("edited by the project\n");
    await expect(
      readFile(path.join(root, ".qfai", "assistant", "rule", "constitution.md")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
