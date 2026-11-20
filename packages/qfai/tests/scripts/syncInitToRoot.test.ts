/**
 * Seeding a project-owned file never replaces one that is already there.
 *
 * `sync-init-to-root.mjs` seeds `qfai.config.yaml` and `.qfai/waivers.yml` only
 * when they are absent. The absence is checked first and the copy runs after,
 * so a file another process creates in between used to be overwritten by a
 * plain copy. These cases call the copy step directly with the target already
 * present: that is the state the step meets when it loses that race.
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { seedAbsent } from "../../../../scripts/sync-init-to-root.mjs";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "qfai-seed-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("seeding a project-owned file", () => {
  it("keeps a file created after the existence check", async () => {
    const from = path.join(dir, "template.yaml");
    const to = path.join(dir, "qfai.config.yaml");
    await writeFile(from, "template\n", "utf-8");
    await writeFile(to, "project answer\n", "utf-8");

    const outcome = seedAbsent(from, to);

    expect(outcome).toBe("present");
    expect(await readFile(to, "utf-8")).toBe("project answer\n");
  });

  it("copies the template when the target is still absent", async () => {
    const from = path.join(dir, "template.yaml");
    const to = path.join(dir, "waivers.yml");
    await writeFile(from, "template\n", "utf-8");

    const outcome = seedAbsent(from, to);

    expect(outcome).toBe("seeded");
    expect(await readFile(to, "utf-8")).toBe("template\n");
  });
});
