/**
 * Integration: the provenance lock records the package version that wrote it.
 */
// QFAI:SPEC-0003:TC-0003-0078
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { initQuietly, readLock, withEmptyRepo, withInstall } from "./upgradeStates.js";

async function runningVersion(): Promise<unknown> {
  const manifest = path.resolve(import.meta.dirname, "../../../package.json");
  const parsed: unknown = JSON.parse(await readFile(manifest, "utf-8"));
  return typeof parsed === "object" && parsed !== null && "version" in parsed
    ? parsed.version
    : undefined;
}

describe("the upgrade record", () => {
  it("TC-0003-0078: The lock records the running package version", async () => {
    const version = await runningVersion();
    expect(typeof version).toBe("string");

    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      expect((await readLock(root)).lock.packageVersion).toBe(version);
    });
    await withInstall(["older-lock"], async (root) => {
      await initQuietly(root);
      expect((await readLock(root)).lock.packageVersion).toBe(version);
    });
  });
});
