import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { defaultConfig } from "../../src/core/config.js";
import {
  ASSISTANT_ASSETS_LOCK_BASENAME,
  buildShippedAssistantHashes,
  hashAssistantAssetText,
  readAssistantAssetsLock,
  writeAssistantAssetsLock,
} from "../../src/core/assistantAssetProvenance.js";
import { validateAssistantAssets } from "../../src/core/validators/assistantAssets.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { captureStdout } from "../helpers/stdout.js";

const shippedAssistantDir = path.join(getInitAssetsDir(), ".qfai", "assistant");
const tempRoots: string[] = [];

async function makeProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-"));
  tempRoots.push(root);
  const assistantDir = path.join(root, ".qfai", "assistant");
  await mkdir(assistantDir, { recursive: true });
  for (const layer of ["constitution", "catalog"]) {
    await cp(path.join(shippedAssistantDir, layer), path.join(assistantDir, layer), {
      recursive: true,
    });
  }
  await writeAssistantAssetsLock(assistantDir, {
    files: await buildShippedAssistantHashes(shippedAssistantDir),
  });
  return root;
}

function codesOf(issues: { code: string }[]): string[] {
  return issues.map((found) => found.code);
}

afterEach(async () => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  }
});

describe("assistant asset provenance", () => {
  it("reports nothing when the vendored tree matches the installed release", async () => {
    const root = await makeProject();
    const issues = await validateAssistantAssets(root, defaultConfig);
    expect(codesOf(issues)).not.toContain("QFAI-ASSETS-003");
    expect(codesOf(issues)).not.toContain("QFAI-ASSETS-004");
    expect(codesOf(issues)).not.toContain("QFAI-ASSETS-005");
  });

  it("flags a locally edited catalog file as a fork", async () => {
    const root = await makeProject();
    const target = path.join(root, ".qfai", "assistant", "catalog", "test-layers.md");
    await writeFile(target, `${await readFile(target, "utf-8")}\n- project-only rule\n`, "utf-8");

    const issues = await validateAssistantAssets(root, defaultConfig);
    const forked = issues.filter((found) => found.code === "QFAI-ASSETS-004");
    expect(forked).toHaveLength(1);
    expect(forked[0]?.severity).toBe("warning");
    expect(forked[0]?.file).toContain("test-layers.md");
  });

  it("separates a stale copy from a fork by what qfai recorded writing", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    const target = path.join(assistantDir, "catalog", "test-layers.md");
    const olderRelease = "# Test Layers\n\nWhat an older release shipped.\n";
    await writeFile(target, olderRelease, "utf-8");
    const lock = await readAssistantAssetsLock(assistantDir);
    expect(lock).not.toBeNull();
    await writeAssistantAssetsLock(assistantDir, {
      files: {
        ...(lock?.files ?? {}),
        "catalog/test-layers.md": hashAssistantAssetText(olderRelease),
      },
    });

    const issues = await validateAssistantAssets(root, defaultConfig);
    expect(codesOf(issues)).toContain("QFAI-ASSETS-003");
    expect(codesOf(issues)).not.toContain("QFAI-ASSETS-004");
  });

  it("never reports a *.local.md overlay, and does report an unshipped sibling", async () => {
    const root = await makeProject();
    const catalogDir = path.join(root, ".qfai", "assistant", "catalog");
    await writeFile(path.join(catalogDir, "test-layers.local.md"), "# L1/L2 overlay\n", "utf-8");

    let issues = await validateAssistantAssets(root, defaultConfig);
    expect(codesOf(issues)).not.toContain("QFAI-ASSETS-005");

    await writeFile(path.join(catalogDir, "project-layers.md"), "# not an overlay\n", "utf-8");
    issues = await validateAssistantAssets(root, defaultConfig);
    const unshipped = issues.filter((found) => found.code === "QFAI-ASSETS-005");
    expect(unshipped).toHaveLength(1);
    expect(unshipped[0]?.file).toContain("project-layers.md");
  });

  it("records provenance at init and refreshes only what qfai still owns", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-init-"));
    tempRoots.push(root);

    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

    const assistantDir = path.join(root, ".qfai", "assistant");
    const lock = await readAssistantAssetsLock(assistantDir);
    const shipped = await buildShippedAssistantHashes(shippedAssistantDir);
    expect(lock?.files["constitution/drift-protocol.md"]).toBe(
      shipped["constitution/drift-protocol.md"],
    );
    expect(lock?.files["catalog/test-layers.md"]).toBe(shipped["catalog/test-layers.md"]);

    // One file goes stale (still exactly what an older qfai wrote), one is forked.
    const stalePath = path.join(assistantDir, "catalog", "test-layers.md");
    const forkedPath = path.join(assistantDir, "constitution", "drift-protocol.md");
    const staleBody = "# Test Layers\n\nOlder release.\n";
    const forkedBody = `${await readFile(forkedPath, "utf-8")}\n- project rule\n`;
    await writeFile(stalePath, staleBody, "utf-8");
    await writeFile(forkedPath, forkedBody, "utf-8");
    await writeAssistantAssetsLock(assistantDir, {
      files: { ...shipped, "catalog/test-layers.md": hashAssistantAssetText(staleBody) },
    });

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    expect(hashAssistantAssetText(await readFile(stalePath, "utf-8"))).toBe(
      shipped["catalog/test-layers.md"],
    );
    expect(await readFile(forkedPath, "utf-8")).toBe(forkedBody);
    const refreshedLock = await readAssistantAssetsLock(assistantDir);
    expect(refreshedLock?.files["catalog/test-layers.md"]).toBe(shipped["catalog/test-layers.md"]);
    // The fork keeps the hash qfai last wrote, so it stays classifiable.
    expect(refreshedLock?.files["constitution/drift-protocol.md"]).toBe(
      shipped["constitution/drift-protocol.md"],
    );
    expect(ASSISTANT_ASSETS_LOCK_BASENAME).toBe(".assets.lock.json");
  }, 120000);
});
