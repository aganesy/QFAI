/**
 * `qfai init` refuses a destination that resolves into the assets it copies.
 *
 * The repository that builds the package vendors its assistant tree by link, so
 * `.qfai/assistant/**` there IS `assets/init/.qfai/assistant/**`. A run in that
 * tree would write the shipped documents through the link — an edit to the
 * package's own assets, made by the command whose job is to install a copy of
 * them, and afterwards indistinguishable from an ordinary asset change.
 *
 * The check is by resolution, not by a path or a repository name, so these
 * cases build both shapes rather than pointing at this checkout.
 */
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { getInitAssetsDir } from "../../src/cli/lib/assets.js";
import { captureStdout } from "../helpers/stdout.js";

const created: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-self-write-"));
  created.push(root);
  return root;
}

/** Whether this filesystem lets the test create the link the case is about. */
async function canSymlink(root: string): Promise<boolean> {
  try {
    await mkdir(path.join(root, "probe-target"), { recursive: true });
    await symlink(path.join(root, "probe-target"), path.join(root, "probe-link"), "dir");
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  for (const root of created.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("qfai init refuses to write through to the assets it ships", () => {
  it("stops when the destination assistant tree resolves inside the init assets", async () => {
    const root = await tempRoot();
    if (!(await canSymlink(root))) return;
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    // The shape the building repository has: the destination tree is the source.
    await symlink(
      path.join(getInitAssetsDir(), ".qfai", "assistant"),
      path.join(root, ".qfai", "assistant"),
      "dir",
    );

    const restore = captureStdout();
    try {
      await expect(runInit({ dir: root })).rejects.toThrow(
        /inside the assets this command copies from/,
      );
    } finally {
      restore();
    }
  });

  it("runs normally for a project whose assistant tree is its own", async () => {
    // The ordinary case: a destination that resolves nowhere near the package.
    // Anything but the refusal above is a pass here — the rest of `init` has
    // its own suites, and this case exists to show the guard fails open.
    const root = await tempRoot();
    await mkdir(path.join(root, ".qfai", "assistant"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "assistant", "kept.md"), "# kept", "utf-8");

    const restore = captureStdout();
    try {
      await expect(runInit({ dir: root })).resolves.not.toThrow();
    } finally {
      restore();
    }
  });
});
