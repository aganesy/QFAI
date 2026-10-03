/**
 * E2E: profile-suffixed validate output. Exercises the user-story surface
 * end-to-end against tmpdir fixtures.
 */
// QFAI:BF-0001
// QFAI:BF-0002

import { mkdtemp, readFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runValidate } from "../../src/cli/commands/validate.js";
import { removeTempTree } from "../helpers/tempTree.js";

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function newRoot(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `qfai-spec0004-chg005-e2e-${prefix}-`));
}

let root: string;

beforeEach(async () => {
  root = await newRoot("base");
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("US-0004-0034: profile-suffixed validate output + always-latest validate.json", () => {
  it("writes .qfai/report/validate-<profile>.json per invocation and refreshes always-latest validate.json with profile field", async () => {
    await runValidate({ root, strict: false, profile: "prototyping" });
    await runValidate({ root, strict: false, profile: "tdd" });

    expect(await pathExists(path.join(root, ".qfai/report/validate-prototyping.json"))).toBe(true);
    expect(await pathExists(path.join(root, ".qfai/report/validate-tdd.json"))).toBe(true);

    const latest = JSON.parse(
      await readFile(path.join(root, ".qfai/report/validate.json"), "utf-8"),
    ) as { profile?: string };
    expect(latest.profile).toBe("tdd");
  });
});
