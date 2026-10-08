/**
 * The suggested action of `QFAI-LINK-001` lists only the repairs for the kinds
 * of damage the finding names. Each case damages a project that `qfai init`
 * just wrote and reads the finding the validator reports for it.
 */

import { mkdir, mkdtemp, readdir, readlink, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { validateIntegrationSurface } from "../../src/core/validators/integrationSurface.js";
import { captureStdout } from "../helpers/stdout.js";

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined) await rm(root, { recursive: true, force: true });
  }
});

/** A freshly initialised project, or `null` where the platform refuses symlinks. */
async function initialisedProject(): Promise<string | null> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-link-remedy-"));
  roots.push(root);
  try {
    await symlink(root, path.join(root, "probe-link"), "dir");
    await rm(path.join(root, "probe-link"), { force: true });
  } catch {
    return null;
  }
  await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
  return root;
}

async function firstWrapper(root: string): Promise<string> {
  const names = await readdir(path.join(root, ".claude", "skills"));
  const name = names.sort()[0];
  if (name === undefined) throw new Error("init wrote no skill wrapper");
  return path.join(root, ".claude", "skills", name);
}

async function remedy(root: string): Promise<string> {
  const issues = await validateIntegrationSurface(root);
  const found = issues.find((entry) => entry.code === "QFAI-LINK-001");
  if (found?.suggested_action === undefined) throw new Error("no QFAI-LINK-001 finding");
  return found.suggested_action;
}

describe("the QFAI-LINK-001 suggested action names the repairs that apply", () => {
  // QFAI:EX-0001-0039-16
  it("gives only the rerun of init for a deleted wrapper", async () => {
    const root = await initialisedProject();
    if (root === null) return;
    await rm(await firstWrapper(root), { force: true });

    const action = await remedy(root);

    expect(action).toContain("Rerun `qfai init`");
    expect(action).not.toContain("integration directory itself");
    expect(action).not.toContain("is not fixed by init");
    expect(action).not.toContain("permissions problem");
    expect(action).not.toContain("core.symlinks");
    expect(action.length).toBeLessThan(400);
  });

  // QFAI:EX-0001-0039-16
  it("gives the replacement of a linked integration directory and no repair for a special file", async () => {
    const root = await initialisedProject();
    if (root === null) return;
    const outside = path.join(root, "elsewhere");
    await mkdir(outside, { recursive: true });
    await rm(path.join(root, ".claude", "skills"), { recursive: true, force: true });
    await symlink(outside, path.join(root, ".claude", "skills"), "dir");

    const action = await remedy(root);

    expect(action).toContain("A linked or broken integration directory itself");
    expect(action).not.toContain("A wrapper that is not a symlink");
    expect(action).not.toContain("permissions problem");
    expect(action).not.toContain("canonical side");
  });

  // QFAI:EX-0001-0039-16
  it("gives the repairs for a directory and a flattened wrapper, and no others", async () => {
    const root = await initialisedProject();
    if (root === null) return;
    const skills = path.join(root, ".claude", "skills");
    const [first, second] = (await readdir(skills)).sort();
    if (first === undefined || second === undefined) throw new Error("init wrote one wrapper");
    const target = await readlink(path.join(skills, second));
    await rm(path.join(skills, first), { force: true });
    await mkdir(path.join(skills, first));
    await rm(path.join(skills, second), { force: true });
    await writeFile(path.join(skills, second), target, "utf-8");

    const action = await remedy(root);

    expect(action).toContain("A wrapper that is not a symlink");
    expect(action).toContain("git config --global core.symlinks true");
    expect(action).not.toContain("integration directory itself");
    expect(action).not.toContain("permissions problem");
    expect(action).not.toContain("canonical side");
  });
});
