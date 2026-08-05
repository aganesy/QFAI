/**
 * Shared fixtures for the shipped GitHub Actions workflow-set suites
 * (ownership / topology / pins): the packaged shipped-tree locations, a
 * per-suite temp-directory pool, and the common type guard. Pure test
 * plumbing — no assertions live here.
 */
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

/** The real shipped `.github/` tree inside the packaged init assets. */
export const shippedGithubDir = (): string => path.join(getInitAssetsDir(), "root", ".github");

/** The real shipped workflows directory inside the packaged init assets. */
export const shippedWorkflowsDir = (): string => path.join(shippedGithubDir(), "workflows");

/** Absolute path of one packaged shipped workflow file. */
export const shippedWorkflowPath = (name: string): string => path.join(shippedWorkflowsDir(), name);

/** Reads every shipped workflow as `[fileName, body]`, sorted by name. */
export async function loadShippedWorkflows(): Promise<Array<[string, string]>> {
  const names = (await readdir(shippedWorkflowsDir())).sort();
  const files: Array<[string, string]> = [];
  for (const name of names) {
    files.push([name, await readFile(shippedWorkflowPath(name), "utf-8")]);
  }
  return files;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Registers an afterEach-scoped temp-directory pool for the calling suite
 * and returns its allocator. Cleanup drains the whole pool at once
 * (splice) and removes the directories in parallel via allSettled, so a
 * failed removal neither aborts the remaining removals nor drops a pool
 * entry mid-loop.
 */
export function useTempDirPool(prefix: string): () => Promise<string> {
  const tempDirs: string[] = [];
  afterEach(async () => {
    const dirs = tempDirs.splice(0, tempDirs.length);
    await Promise.allSettled(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  });
  return async (): Promise<string> => {
    const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  };
}
