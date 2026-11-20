// The project wiring that both the wrapper repair and doctor's
// `integration.links` check are exercised against, so a detection case and a
// repair case read the same tree.

import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  AGENT_INTEGRATION_CONFIGS,
  SKILL_INTEGRATION_DIRS,
} from "../../src/core/init/integrationDirs.js";

/** A skill the shipped roster carries, so its wrapper is one init would write. */
export const SHIPPED_SKILL = "qfai-implement";

/**
 * Whether this machine can create a symlink at all.
 *
 * Windows refuses without Developer Mode or elevation, and every fixture built
 * on `wireProject` is made of symlinks — so without this probe a suite fails on
 * the platform whose behaviour it exists to describe.
 */
export async function canCreateSymlink(root: string): Promise<boolean> {
  const probe = path.join(root, "probe-link");
  try {
    await symlink(".qfai", probe, "dir");
    await rm(probe, { force: true });
    return true;
  } catch {
    return false;
  }
}

/** The canonical tree the wrappers point at, plus every wrapper init writes. */
export async function wireProject(root: string): Promise<void> {
  const canonical = path.join(root, ".qfai", "assistant", "skill", SHIPPED_SKILL);
  await mkdir(canonical, { recursive: true });
  await writeFile(path.join(canonical, "SKILL.md"), "# skill\n", "utf-8");
  await mkdir(path.join(root, ".qfai", "assistant", "agent"), { recursive: true });

  for (const dir of SKILL_INTEGRATION_DIRS) {
    const absolute = path.join(root, ...dir.split("/"));
    await mkdir(absolute, { recursive: true });
    const target = path.join(
      ...dir.split("/").map(() => ".."),
      ".qfai",
      "assistant",
      "skill",
      SHIPPED_SKILL,
    );
    await symlink(target, path.join(absolute, SHIPPED_SKILL), "dir");
  }
  for (const { dir } of AGENT_INTEGRATION_CONFIGS) {
    await mkdir(path.join(root, ...dir.split("/")), { recursive: true });
  }
}
