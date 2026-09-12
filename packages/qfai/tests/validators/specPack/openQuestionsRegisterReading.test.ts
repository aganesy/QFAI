/**
 * Which registers the open-question gate opens, and what it says when it cannot.
 *
 * Two ways a blocking decision went unseen. The shared policy register was
 * found through a layered spec entry, so a tree being established policy-first
 * — a register written, no spec beside it yet — returned on the missing pack
 * before the register was read. And every read failure was folded into
 * absence, so a name that could not be opened reported nothing at all, which
 * reads exactly like a pack with no questions in it.
 */

import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateSpecPacks } from "../../../src/core/validators/specPack.js";

const REGISTER = "09_Open-questions.md";

const UNADJUDICATED = [
  "# 09 Open Questions",
  "",
  "## Open Questions",
  "",
  "### OQ-0007: which retention window applies",
  "",
  "- Status: unadjudicated",
  "",
].join("\n");

async function withTree<T>(
  build: (specsRoot: string) => Promise<void>,
  fn: (root: string) => Promise<T>,
): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-register-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specsRoot = path.join(root, ".qfai", "specs");
  await mkdir(specsRoot, { recursive: true });
  try {
    await build(specsRoot);
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = async (root: string): Promise<string[]> =>
  (await validateSpecPacks(root, defaultConfig)).map((found) => found.code);

describe("the shared register is read before the tree is called empty", () => {
  it("reports a policy decision nobody took, with no spec pack beside it", async () => {
    await withTree(
      async (specsRoot) => {
        const policies = path.join(specsRoot, "_policies");
        await mkdir(policies, { recursive: true });
        await writeFile(path.join(policies, REGISTER), UNADJUDICATED, "utf-8");
      },
      async (root) => {
        expect(await codes(root)).toContain("QFAI-SPACK-102");
      },
    );
  });

  it("says only that there is no pack when there is no register either", async () => {
    await withTree(
      () => Promise.resolve(),
      async (root) => {
        expect(await codes(root)).toEqual(["QFAI-SPACK-000"]);
      },
    );
  });
});

describe("a register that is there and cannot be read", () => {
  it("is reported rather than read as absent", async () => {
    // A directory at the name stands for every object that is not a regular
    // file: a device, a pipe, a link that resolves to one. Each was silently
    // the same as a pack with no questions in it.
    await withTree(
      async (specsRoot) => {
        await mkdir(path.join(specsRoot, "_policies", REGISTER), { recursive: true });
      },
      async (root) => {
        expect(await codes(root)).toContain("QFAI-SPACK-103");
      },
    );
  });

  it("still reads a register reached through a link", async () => {
    await withTree(
      async (specsRoot) => {
        const policies = path.join(specsRoot, "_policies");
        await mkdir(policies, { recursive: true });
        await writeFile(path.join(specsRoot, "shared-register.md"), UNADJUDICATED, "utf-8");
        await symlink(path.join("..", "shared-register.md"), path.join(policies, REGISTER), "file");
      },
      async (root) => {
        expect(await codes(root)).toContain("QFAI-SPACK-102");
      },
    );
  });
});
