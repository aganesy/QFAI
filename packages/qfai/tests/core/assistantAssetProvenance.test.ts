import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { defaultConfig } from "../../src/core/config.js";
import {
  ASSISTANT_ASSETS_LOCK_BASENAME,
  buildShippedAssistantHashes,
  hashAssistantAssetFile,
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

  it("reports a deleted governed file instead of passing it in silence", async () => {
    const root = await makeProject();
    const target = path.join(root, ".qfai", "assistant", "constitution", "quality.md");
    await rm(target);

    const issues = await validateAssistantAssets(root, defaultConfig);
    const missing = issues.filter((found) => found.code === "QFAI-ASSETS-006");
    expect(missing).toHaveLength(1);
    expect(missing[0]?.severity).toBe("warning");
    expect(missing[0]?.file).toContain("quality.md");
  });

  it("does not report absences at a project that has no governed layer at all", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-bare-"));
    tempRoots.push(root);
    await mkdir(path.join(root, ".qfai", "assistant", "skills"), { recursive: true });

    const issues = await validateAssistantAssets(root, defaultConfig);
    expect(codesOf(issues)).not.toContain("QFAI-ASSETS-006");
  });

  it("does not double-report the two files the existence probes already own", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    await rm(path.join(assistantDir, "constitution", "drift-protocol.md"));
    await rm(path.join(assistantDir, "catalog", "test-layers.md"));

    const issues = await validateAssistantAssets(root, defaultConfig);
    expect(codesOf(issues)).toContain("QFAI-ASSETS-001");
    expect(codesOf(issues)).toContain("QFAI-ASSETS-002");
    expect(codesOf(issues)).not.toContain("QFAI-ASSETS-006");
  });

  it("treats only *.local.md as an overlay, not every *.local.* sibling", async () => {
    const root = await makeProject();
    const catalogDir = path.join(root, ".qfai", "assistant", "catalog");
    await writeFile(path.join(catalogDir, "review-gate.local.yml"), "rules: []\n", "utf-8");

    const issues = await validateAssistantAssets(root, defaultConfig);
    const unshipped = issues.filter((found) => found.code === "QFAI-ASSETS-005");
    expect(unshipped).toHaveLength(1);
    expect(unshipped[0]?.file).toContain("review-gate.local.yml");
  });

  it("checks a dotted filename too, and still ignores known housekeeping dotfiles", async () => {
    const root = await makeProject();
    const constitutionDir = path.join(root, ".qfai", "assistant", "constitution");
    await writeFile(path.join(constitutionDir, ".gitkeep"), "", "utf-8");
    await writeFile(path.join(constitutionDir, ".policy.md"), "# hidden rule\n", "utf-8");

    const issues = await validateAssistantAssets(root, defaultConfig);
    const unshipped = issues.filter((found) => found.code === "QFAI-ASSETS-005");
    expect(unshipped).toHaveLength(1);
    expect(unshipped[0]?.file).toContain(".policy.md");
  });

  it("refuses to build a shipped set from an incompletely extracted install", async () => {
    const broken = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-broken-"));
    tempRoots.push(broken);
    // `catalog/` never extracted. Reporting an empty layer here would make
    // every catalog entry in a project's lock look like a withdrawn rule.
    await cp(path.join(shippedAssistantDir, "constitution"), path.join(broken, "constitution"), {
      recursive: true,
    });

    await expect(buildShippedAssistantHashes(broken)).rejects.toThrow();
  });

  it("drops a lock key that points outside the governed layers", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    const outside = path.join(root, "outside-victim.json");
    const outsideBody = '{ "name": "victim" }\n';
    await writeFile(outside, outsideBody, "utf-8");

    const lock = await readAssistantAssetsLock(assistantDir);
    await writeFile(
      path.join(assistantDir, ASSISTANT_ASSETS_LOCK_BASENAME),
      `${JSON.stringify(
        {
          files: {
            ...(lock?.files ?? {}),
            "../../outside-victim.json": hashAssistantAssetText(outsideBody),
            "catalog/../../../escape.md": "deadbeef",
            "catalog/nested/deep.md": "deadbeef",
            "catalog/test-layers.md.": "deadbeef",
          },
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    const parsed = await readAssistantAssetsLock(assistantDir);
    expect(parsed?.files["../../outside-victim.json"]).toBeUndefined();
    expect(parsed?.files["catalog/../../../escape.md"]).toBeUndefined();
    // Windows drops a trailing dot, so this key opens the shipped
    // `test-layers.md` while recording under a key that is not the shipped one.
    expect(parsed?.files["catalog/test-layers.md."]).toBeUndefined();
    // A governed layer is `catalog/**`, so a nested key is one qfai could have
    // written and is kept.
    expect(parsed?.files["catalog/nested/deep.md"]).toBe("deadbeef");

    // The retire pass deletes any recorded path whose content still matches
    // its recorded hash: an honoured traversal key would take this file with it.
    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    expect(await readFile(outside, "utf-8")).toBe(outsideBody);
  }, 120000);

  it("repairs a governed path occupied by a directory, and never calls it shipped", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    const governed = path.join(assistantDir, "constitution", "quality.md");
    await rm(path.join(assistantDir, ASSISTANT_ASSETS_LOCK_BASENAME), { force: true });
    await rm(governed);
    await mkdir(governed);
    await writeFile(path.join(governed, "inner.md"), "# project content\n", "utf-8");

    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

    // Nothing was written there, so nothing may be recorded as if it had been.
    const plainLock = await readAssistantAssetsLock(assistantDir);
    expect(plainLock?.files["constitution/quality.md"]).toBeUndefined();
    expect(codesOf(await validateAssistantAssets(root, defaultConfig))).toContain(
      "QFAI-ASSETS-006",
    );

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    const shipped = await buildShippedAssistantHashes(shippedAssistantDir);
    expect(hashAssistantAssetText(await readFile(governed, "utf-8"))).toBe(
      shipped["constitution/quality.md"],
    );
    const forcedLock = await readAssistantAssetsLock(assistantDir);
    expect(forcedLock?.files["constitution/quality.md"]).toBe(shipped["constitution/quality.md"]);
  }, 120000);

  it("reports each governed path once, with the governed outcome", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    const shipped = await buildShippedAssistantHashes(shippedAssistantDir);
    const stalePath = path.join(assistantDir, "catalog", "test-layers.md");
    const forkedPath = path.join(assistantDir, "constitution", "quality.md");
    const staleBody = "# Test Layers\n\nOlder release.\n";
    await writeFile(stalePath, staleBody, "utf-8");
    await writeFile(
      forkedPath,
      `${await readFile(forkedPath, "utf-8")}\n- project rule\n`,
      "utf-8",
    );
    await writeAssistantAssetsLock(assistantDir, {
      files: { ...shipped, "catalog/test-layers.md": hashAssistantAssetText(staleBody) },
    });

    const output = await captureStdout(() =>
      runInit({ dir: root, force: true, dryRun: false, yes: true }),
    );
    const listedTimes = (needle: string): number =>
      output.split("\n").filter((line) => line.trim().startsWith("- ") && line.includes(needle))
        .length;

    // Refreshed by the governed sync, so the generic create-only skip for the
    // same path must not survive into the report.
    expect(listedTimes(path.join("catalog", "test-layers.md"))).toBe(0);
    expect(listedTimes(path.join("constitution", "quality.md"))).toBe(1);
    // No staging file is left behind by the atomic refresh.
    const catalogEntries = await readdir(path.join(assistantDir, "catalog"));
    expect(catalogEntries.filter((entry) => entry.includes("qfai-staging"))).toEqual([]);
  }, 120000);

  it.skipIf(process.platform === "win32")(
    "answers for a FIFO at the lock path instead of waiting for a writer",
    async () => {
      const root = await makeProject();
      const assistantDir = path.join(root, ".qfai", "assistant");
      const lockPath = path.join(assistantDir, ASSISTANT_ASSETS_LOCK_BASENAME);
      await rm(lockPath, { force: true });
      await promisify(execFile)("mkfifo", [lockPath]);

      // A plain `readFile` here blocks until a writer appears, hanging both
      // `qfai init` and `qfai validate` with no diagnostic.
      expect(await readAssistantAssetsLock(assistantDir)).toBeNull();
      expect(Array.isArray(await validateAssistantAssets(root, defaultConfig))).toBe(true);
    },
    15000,
  );

  it("retires a governed file the installed release no longer ships", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    const withdrawnBody = "# Withdrawn\n\nShipped by an older release.\n";
    const untouched = path.join(assistantDir, "catalog", "withdrawn.md");
    const edited = path.join(assistantDir, "catalog", "withdrawn-edited.md");
    await writeFile(untouched, withdrawnBody, "utf-8");
    await writeFile(edited, `${withdrawnBody}- project rule\n`, "utf-8");
    const lock = await readAssistantAssetsLock(assistantDir);
    await writeAssistantAssetsLock(assistantDir, {
      files: {
        ...(lock?.files ?? {}),
        "catalog/withdrawn.md": hashAssistantAssetText(withdrawnBody),
        "catalog/withdrawn-edited.md": hashAssistantAssetText(withdrawnBody),
      },
    });

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    await expect(readFile(untouched, "utf-8")).rejects.toThrow();
    expect(await readFile(edited, "utf-8")).toContain("- project rule");
    const refreshed = await readAssistantAssetsLock(assistantDir);
    expect(refreshed?.files["catalog/withdrawn.md"]).toBeUndefined();
    // The edited one stays classifiable so a later --force can still retire it.
    expect(refreshed?.files["catalog/withdrawn-edited.md"]).toBe(
      hashAssistantAssetText(withdrawnBody),
    );
  }, 120000);

  it.skipIf(process.platform === "win32")(
    "answers for a FIFO at a governed path instead of waiting for a writer",
    async () => {
      const root = await makeProject();
      const governed = path.join(root, ".qfai", "assistant", "constitution", "quality.md");
      await rm(governed);
      await promisify(execFile)("mkfifo", [governed]);

      // Without the non-blocking pinned read this never returns: `readFile` on
      // a FIFO blocks until a writer appears, hanging `validate` outright.
      expect(await hashAssistantAssetFile(governed)).toBeNull();
      expect(codesOf(await validateAssistantAssets(root, defaultConfig))).toContain(
        "QFAI-ASSETS-006",
      );
    },
    15000,
  );

  it.skipIf(process.platform === "win32")(
    "never writes the provenance record through a symlink",
    async () => {
      const root = await makeProject();
      const assistantDir = path.join(root, ".qfai", "assistant");
      const outside = path.join(root, "outside.json");
      await writeFile(outside, "{}\n", "utf-8");
      await rm(path.join(assistantDir, ASSISTANT_ASSETS_LOCK_BASENAME), { force: true });
      await symlink(outside, path.join(assistantDir, ASSISTANT_ASSETS_LOCK_BASENAME));

      await writeAssistantAssetsLock(assistantDir, { files: { "catalog/a.md": "deadbeef" } });

      expect(await readFile(outside, "utf-8")).toBe("{}\n");
      expect(await readAssistantAssetsLock(assistantDir)).toEqual({
        files: { "catalog/a.md": "deadbeef" },
      });
    },
  );

  it.skipIf(process.platform === "win32")(
    "refreshes the governed path itself, never a symlink's target",
    async () => {
      const root = await makeProject();
      const assistantDir = path.join(root, ".qfai", "assistant");
      const victim = path.join(root, "victim.json");
      const victimBody = '{ "name": "victim" }\n';
      await writeFile(victim, victimBody, "utf-8");

      const governed = path.join(assistantDir, "constitution", "quality.md");
      await rm(governed);
      await symlink(victim, governed);
      const lock = await readAssistantAssetsLock(assistantDir);
      await writeAssistantAssetsLock(assistantDir, {
        files: {
          ...(lock?.files ?? {}),
          "constitution/quality.md": hashAssistantAssetText(victimBody),
        },
      });

      await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

      expect(await readFile(victim, "utf-8")).toBe(victimBody);
      const shipped = await buildShippedAssistantHashes(shippedAssistantDir);
      expect(hashAssistantAssetText(await readFile(governed, "utf-8"))).toBe(
        shipped["constitution/quality.md"],
      );
    },
    120000,
  );

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

  it("reports a normative file added inside a governed subdirectory", async () => {
    const root = await makeProject();
    const nested = path.join(root, ".qfai", "assistant", "constitution", "custom");
    await mkdir(nested, { recursive: true });
    await writeFile(path.join(nested, "rule.md"), "# project rule\n", "utf-8");
    // The overlay stays exempt at any depth.
    await writeFile(path.join(nested, "note.local.md"), "# overlay\n", "utf-8");

    const issues = await validateAssistantAssets(root, defaultConfig);
    const unshipped = issues.filter((found) => found.code === "QFAI-ASSETS-005");
    expect(unshipped).toHaveLength(1);
    expect(unshipped[0]?.file).toContain("rule.md");
  });

  it("never retires a shipped rule through a case-variant lock key", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    const governed = path.join(assistantDir, "catalog", "test-layers.md");
    const body = await readFile(governed, "utf-8");
    const lock = await readAssistantAssetsLock(assistantDir);
    // On a case-insensitive filesystem this key opens the shipped file itself,
    // so retiring it as "withdrawn" would delete a rule the release still ships.
    await writeAssistantAssetsLock(assistantDir, {
      files: { ...(lock?.files ?? {}), "catalog/TEST-LAYERS.MD": hashAssistantAssetText(body) },
    });

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    expect(await readFile(governed, "utf-8")).toBe(body);
    const refreshed = await readAssistantAssetsLock(assistantDir);
    expect(refreshed?.files["catalog/TEST-LAYERS.MD"]).toBeUndefined();
    expect(refreshed?.files["catalog/test-layers.md"]).toBe(hashAssistantAssetText(body));
  }, 120000);

  it("hashes a governed file in chunks, agreeing with the whole-string form", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-large-"));
    tempRoots.push(root);
    const chunk = 64 * 1024;

    // The `\r\n` straddles the read boundary: the `\r` is the last byte of one
    // chunk and the `\n` the first byte of the next.
    const straddling = `${"a".repeat(chunk - 1)}\r\n${"b".repeat(chunk)}\r\n`;
    const straddlingPath = path.join(root, "straddling.md");
    await writeFile(straddlingPath, straddling, "utf-8");
    expect(await hashAssistantAssetFile(straddlingPath)).toBe(hashAssistantAssetText(straddling));

    // A lone `\r` at the same boundary, and another at EOF, must survive: only
    // a `\r` that opens a `\r\n` pair is dropped.
    const lone = `${"a".repeat(chunk - 1)}\rx\r`;
    const lonePath = path.join(root, "lone.md");
    await writeFile(lonePath, lone, "utf-8");
    expect(await hashAssistantAssetFile(lonePath)).toBe(hashAssistantAssetText(lone));
  }, 30000);

  it("never writes or retires through a governed layer that leaves the project", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    const outside = path.join(root, "outside-catalog");
    await mkdir(outside, { recursive: true });
    const refreshVictim = path.join(outside, "test-layers.md");
    const refreshVictimBody = "# not qfai's\n";
    await writeFile(refreshVictim, refreshVictimBody, "utf-8");
    const retireVictimBody = "# also not qfai's\n";
    const retireVictim = path.join(outside, "withdrawn.md");
    await writeFile(retireVictim, retireVictimBody, "utf-8");

    const lock = await readAssistantAssetsLock(assistantDir);
    await rm(path.join(assistantDir, "catalog"), { recursive: true, force: true });
    // `junction` is ignored off Windows, where a plain directory symlink is made.
    await symlink(outside, path.join(assistantDir, "catalog"), "junction");
    await writeAssistantAssetsLock(assistantDir, {
      files: {
        ...(lock?.files ?? {}),
        "catalog/withdrawn.md": hashAssistantAssetText(retireVictimBody),
      },
    });

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    // `rename` and `rm` replace the entry they are given, but the entry itself
    // was already outside the project: only the parent check keeps them out.
    expect(await readFile(refreshVictim, "utf-8")).toBe(refreshVictimBody);
    expect(await readFile(retireVictim, "utf-8")).toBe(retireVictimBody);
    const refreshed = await readAssistantAssetsLock(assistantDir);
    expect(refreshed?.files["catalog/test-layers.md"]).toBeUndefined();
    expect(refreshed?.files["catalog/withdrawn.md"]).toBeUndefined();
  }, 120000);
});
