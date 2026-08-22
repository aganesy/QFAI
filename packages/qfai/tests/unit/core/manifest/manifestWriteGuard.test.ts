import { mkdir, mkdtemp, rename, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  directoryPinIntact,
  pinDirectory,
  resolvesInsideRoot,
} from "../../../../src/core/manifest/manifestWriteGuard.js";

const roots: string[] = [];

async function makeRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("manifest write guard", () => {
  it("holds while the pinned directory is unchanged", async () => {
    const root = await makeRoot("qfai-guard-stable-");
    const manifest = path.join(root, "manifest");
    await mkdir(manifest);

    const pin = await pinDirectory(manifest);

    expect(pin).not.toBeNull();
    expect(await directoryPinIntact(root, pin)).toBe(true);
  });

  // Nothing to write into, so there is nothing to authorise: a caller handed
  // `null` must not treat "no directory" as "the directory is fine".
  it("refuses a path that is not a directory", async () => {
    const root = await makeRoot("qfai-guard-absent-");

    expect(await pinDirectory(path.join(root, "manifest"))).toBeNull();
    expect(await directoryPinIntact(root, null)).toBe(false);
  });

  // The whole point of the pin: the name still resolves, but to a different
  // inode than the one the write-safety check cleared.
  it("breaks when the directory is swapped for another one", async () => {
    const root = await makeRoot("qfai-guard-swap-");
    const manifest = path.join(root, "manifest");
    await mkdir(manifest);
    const pin = await pinDirectory(manifest);

    await rename(manifest, path.join(root, "manifest.moved"));
    await mkdir(manifest);

    expect(await directoryPinIntact(root, pin)).toBe(false);
  });

  // The harm the guard exists to prevent: between the check and the `rename`,
  // `manifest/` becomes a link into another tree and the replacement lands
  // outside the project.
  it("breaks when the directory is swapped for a link out of the project", async () => {
    const root = await makeRoot("qfai-guard-escape-");
    const outside = await makeRoot("qfai-guard-outside-");
    const manifest = path.join(root, "manifest");
    await mkdir(manifest);
    const pin = await pinDirectory(manifest);

    await rm(manifest, { recursive: true, force: true });
    try {
      await symlink(outside, manifest, "dir");
    } catch {
      return; // No symlinks here (Windows without Developer Mode).
    }

    expect(await resolvesInsideRoot(root, manifest)).toBe(false);
    expect(await directoryPinIntact(root, pin)).toBe(false);
  });

  // Deletion is not "unchanged" either — the next `rename` would recreate the
  // entry somewhere nobody checked.
  it("breaks when the pinned directory is removed", async () => {
    const root = await makeRoot("qfai-guard-removed-");
    const manifest = path.join(root, "manifest");
    await mkdir(manifest);
    const pin = await pinDirectory(manifest);

    await rm(manifest, { recursive: true, force: true });

    expect(await directoryPinIntact(root, pin)).toBe(false);
  });

  // An absent path is not an unsafe one: `--dry-run` reaches the containment
  // check before the create-only copy has made the manifest layer at all.
  it("treats an absent directory as inside the root", async () => {
    const root = await makeRoot("qfai-guard-missing-");

    expect(await resolvesInsideRoot(root, path.join(root, "manifest"))).toBe(true);
    expect(await resolvesInsideRoot(root, root)).toBe(true);
  });
});
