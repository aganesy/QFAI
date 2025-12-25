import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";

describe("init", () => {
  it("fails with guidance when conflicts exist and --force is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    await expect(
      runInit({ dir: root, force: false, dryRun: false, yes: true }),
    ).rejects.toThrow(/--force/);
  });
});
