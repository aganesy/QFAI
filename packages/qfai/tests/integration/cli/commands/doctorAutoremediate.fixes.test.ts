// QFAI:SPEC-0006:TC-0006-0021
//
// Integration: `qfai doctor --autoremediate --yes` orchestrates three
// remediations: install missing runtimeDependencies, archive stale
// review packs (--clean behavior), and write missing default-keyed
// config fields. The npm install side effect is routed through a test
// runner so the test never touches the network.

import { access, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runAutoremediate } from "../../../../src/core/doctor/autoremediate.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-autoremediate-${label}-`));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function fileExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

describe("doctor --autoremediate fixes install + clean + config", () => {
  it("invokes install runner for missing deps, archives stale packs, writes default-keyed config fields", async () => {
    const root = await newTempDir("fixes");

    // Seed skill manifest with one declared runtime dep, none installed.
    const manifestDir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: ["playwright"] }, null, 2),
      "utf-8",
    );

    // Seed a stale review pack.
    const oldTs = "20260401120000222";
    const oldDir = path.join(root, ".qfai", "review", `review-${oldTs}`);
    await mkdir(oldDir, { recursive: true });
    const mtime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await utimes(oldDir, mtime, mtime);

    // Seed minimal qfai.config.yaml WITHOUT a `review:` section (default-keyed gap).
    const configPath = path.join(root, "qfai.config.yaml");
    await writeFile(configPath, "# user-authored\npaths:\n  specsDir: .qfai/specs\n", "utf-8");

    const installCalls: string[] = [];
    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: false,
      skill: "qfai-prototyping",
      installRunner: async (name) => {
        installCalls.push(name);
        // Simulate the install by seeding the package dir.
        await mkdir(path.join(root, "node_modules", name), { recursive: true });
      },
    });

    expect(summary.disabledInCi).toBe(false);
    // (1) install ran.
    expect(installCalls).toEqual(["playwright"]);
    expect(summary.installed).toContain("playwright");
    // (2) stale pack moved to _archive/.
    expect(await fileExists(oldDir)).toBe(false);
    expect(
      await fileExists(path.join(root, ".qfai", "review", "_archive", `review-${oldTs}`)),
    ).toBe(true);
    expect(summary.archived).toContain(`review-${oldTs}`);
    // (3) default-keyed `review:` was appended; user-authored content preserved.
    const updated = await readFile(configPath, "utf-8");
    expect(updated).toContain("# user-authored");
    expect(updated).toContain("specsDir: .qfai/specs");
    expect(updated).toMatch(/review:\s*\n\s*staleTtlDays:\s*14/u);
    expect(summary.configFieldsWritten).toContain("review");
  });

  it("does NOT overwrite a user-authored review.staleTtlDays value", async () => {
    const root = await newTempDir("no-overwrite");
    const configPath = path.join(root, "qfai.config.yaml");
    await writeFile(configPath, "review:\n  staleTtlDays: 30\n", "utf-8");

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: false,
      skipInstall: true,
    });

    const updated = await readFile(configPath, "utf-8");
    expect(updated).toContain("staleTtlDays: 30");
    expect(summary.configFieldsWritten).not.toContain("review");
  });
});
