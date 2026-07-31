/**
 * The root `.qfai/` tree is a generated mirror of
 * `packages/qfai/assets/init/.qfai/`, produced by
 * `scripts/sync-init-to-root.mjs` (`pnpm sync:ssot`).
 *
 * Until now the only thing holding the two halves together was `pnpm ci:gate`,
 * which runs `sync:ssot` and then `git diff --exit-code .qfai/`. CI does not run
 * `ci:gate` — it runs `ci:lint`, the type checks, the test projects,
 * `ci:coverage`, `ci:build-verify` and `qfai validate`. So a change that edited
 * one half and forgot the other reached main with the trees diverged, and the
 * next contributor to run `sync:ssot` picked up an unrelated diff.
 *
 * This test applies the same rule the sync script does: every file under the
 * init assets must exist at the mirrored root path with identical bytes. Root-
 * only files are ignored, exactly as `sync-init-to-root.mjs` ignores them — it
 * copies init -> root and never deletes.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const initQfaiDir = path.join(repoRoot, "packages", "qfai", "assets", "init", ".qfai");
const rootQfaiDir = path.join(repoRoot, ".qfai");
const initRootConfig = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  "root",
  "qfai.config.yaml",
);
const rootConfig = path.join(repoRoot, "qfai.config.yaml");

/** Every file under `dir`, as paths relative to `dir`, with `/` separators. */
async function collectFiles(dir: string, base: string = dir): Promise<string[]> {
  const collected: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return collected;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await collectFiles(full, base)));
    } else {
      collected.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return collected;
}

async function readOrNull(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

describe("init assets root mirror", () => {
  it("mirrors every init .qfai file to the repo root byte-for-byte", async () => {
    const initFiles = await collectFiles(initQfaiDir);
    expect(initFiles.length).toBeGreaterThan(0);

    const missing: string[] = [];
    const differing: string[] = [];
    for (const relative of initFiles) {
      const [source, mirrored] = await Promise.all([
        readOrNull(path.join(initQfaiDir, relative)),
        readOrNull(path.join(rootQfaiDir, relative)),
      ]);
      if (mirrored === null) {
        missing.push(`.qfai/${relative}`);
      } else if (source !== null && !source.equals(mirrored)) {
        differing.push(`.qfai/${relative}`);
      }
    }

    expect(
      { missing, differing },
      "root .qfai/ is out of sync with packages/qfai/assets/init/.qfai/ — run `pnpm sync:ssot`",
    ).toEqual({ missing: [], differing: [] });
  });

  it("mirrors the init root qfai.config.yaml to the repo root", async () => {
    const [source, mirrored] = await Promise.all([
      readOrNull(initRootConfig),
      readOrNull(rootConfig),
    ]);
    expect(source, "packages/qfai/assets/init/root/qfai.config.yaml is missing").not.toBeNull();
    expect(mirrored, "qfai.config.yaml is missing at the repo root").not.toBeNull();
    if (source === null || mirrored === null) {
      return;
    }
    expect(
      source.equals(mirrored),
      "qfai.config.yaml differs from its init asset — run `pnpm sync:ssot`",
    ).toBe(true);
  });
});
