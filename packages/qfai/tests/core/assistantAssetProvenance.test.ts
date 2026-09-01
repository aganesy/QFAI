import { execFile, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import {
  displaceUnreadableGovernedAsset,
  makeGovernedContainmentGuard,
  replaceGovernedAsset,
  retireVerifiedGovernedAsset,
  runInit,
  SHIPPED_WORKFLOW_NAMES,
} from "../../src/cli/commands/init.js";
import { defaultConfig } from "../../src/core/config.js";
import {
  ASSISTANT_ASSETS_LOCK_BASENAME,
  ASSISTANT_STAGING_PREFIX,
  buildShippedAssistantHashes,
  hashAssistantAssetFile,
  hashAssistantAssetText,
  isGovernedAssistantLockKey,
  readAssistantAssetsLock,
  writeAssistantAssetsLock,
} from "../../src/core/assistantAssetProvenance.js";
import { QFAI_GITIGNORE_BLOCK } from "../../src/core/gitignore.js";
import { newRuleSeverity, RULE_PROMOTIONS } from "../../src/core/sunset.js";
import { validateAssistantAssets } from "../../src/core/validators/assistantAssets.js";
import { resolveToolVersion } from "../../src/core/version.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { captureStdout } from "../helpers/stdout.js";

/**
 * The five provenance codes ship behind
 * `RULE_PROMOTIONS.assistantAssetProvenance`, so the severity is whatever the
 * pin says at the version under test — `warning` inside the window, `error`
 * from the promotion release onwards. Derived from the pin rather than written
 * as a literal so this file does not have to be edited on the release that
 * closes the window, and so a severity that stops following the pin is caught
 * here and not only by `sunsetLedger.test.ts`.
 */
const assetProvenancePromotion = RULE_PROMOTIONS.assistantAssetProvenance.promoteAt;

/** The family the pin governs — not the two existence probes above it. */
const PROVENANCE_CODES = new Set([
  "QFAI-ASSETS-003",
  "QFAI-ASSETS-004",
  "QFAI-ASSETS-005",
  "QFAI-ASSETS-006",
  "QFAI-ASSETS-007",
]);

async function expectedProvenanceSeverity(): Promise<"warning" | "error"> {
  return newRuleSeverity(await resolveToolVersion(), assetProvenancePromotion);
}

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
    expect(forked[0]?.severity).toBe(await expectedProvenanceSeverity());
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

  it("takes every provenance code's severity from the promotion pin, not a literal", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    const catalogDir = path.join(assistantDir, "catalog");
    // One project carrying all four classifications at once: a fork, a stale
    // copy, an unshipped addition and a deletion.
    const forked = path.join(catalogDir, "test-layers.md");
    await writeFile(forked, `${await readFile(forked, "utf-8")}\n- project-only rule\n`, "utf-8");
    await writeFile(path.join(catalogDir, "project-layers.md"), "# not an overlay\n", "utf-8");
    const stale = path.join(assistantDir, "constitution", "quality.md");
    const olderRelease = "# Quality\n\nWhat an older release shipped.\n";
    await writeFile(stale, olderRelease, "utf-8");
    const lock = await readAssistantAssetsLock(assistantDir);
    await writeAssistantAssetsLock(assistantDir, {
      files: {
        ...(lock?.files ?? {}),
        "constitution/quality.md": hashAssistantAssetText(olderRelease),
      },
    });
    // Not `drift-protocol.md` / `test-layers.md`: their absence belongs to the
    // existence probes (QFAI-ASSETS-001/002), which are not part of this
    // family's window.
    await rm(path.join(assistantDir, "constitution", "communication.md"));

    const issues = (await validateAssistantAssets(root, defaultConfig)).filter((found) =>
      PROVENANCE_CODES.has(found.code),
    );

    // Nothing compared the governed layers before this check existed, so its
    // first run meets every edit a project ever made to them at once. P7
    // (docs/design-principles.md) requires that to arrive behind a window
    // rather than as a hard error on upgrade — a literal severity beside each
    // `issue(...)` call is what latched a consuming repository's gate.
    const expected = await expectedProvenanceSeverity();
    expect(codesOf(issues)).toEqual(
      expect.arrayContaining([
        "QFAI-ASSETS-003",
        "QFAI-ASSETS-004",
        "QFAI-ASSETS-005",
        "QFAI-ASSETS-006",
      ]),
    );
    expect(issues.map((found) => found.severity)).toEqual(issues.map(() => expected));

    // And inside the window every finding says so, naming the release that
    // ends it — an operator running `--fail-on error` has to be able to see
    // the debt they are about to owe.
    if (expected === "warning") {
      for (const found of issues) {
        expect(found.message).toContain(assetProvenancePromotion);
      }
    }
  });

  it("reports a deleted governed file instead of passing it in silence", async () => {
    const root = await makeProject();
    const target = path.join(root, ".qfai", "assistant", "constitution", "quality.md");
    await rm(target);

    const issues = await validateAssistantAssets(root, defaultConfig);
    const missing = issues.filter((found) => found.code === "QFAI-ASSETS-006");
    expect(missing).toHaveLength(1);
    expect(missing[0]?.severity).toBe(await expectedProvenanceSeverity());
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

  // The containment walk started at the assistant root, and `lstat` declines to
  // resolve only the *last* component it is given: with `.qfai` itself a link
  // out of the repository, `lstat(.qfai/assistant)` reported the external
  // directory as real and every write and retire went through it.
  it("never writes or retires through a .qfai that leaves the project", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    const outsideQfai = path.join(root, "outside-qfai");

    // Move the whole governed tree out of the project, then link `.qfai` at it.
    const lock = await readAssistantAssetsLock(assistantDir);
    await rename(path.join(root, ".qfai"), outsideQfai);
    await symlink(outsideQfai, path.join(root, ".qfai"), "junction");

    // The shipped workflows are put on disk first, so this run has none to
    // write. `.qfai` being a link is refused by the install-provenance writer
    // too, and that refusal THROWS — deliberately, so the workflow copy it
    // belongs to is rolled back rather than left unrecorded. Reached here it
    // would end the run before the governed-asset sync below ever executes,
    // and this test would then pass without exercising the guard it exists
    // for. A shipped workflow already present on disk is not `absent`, so no
    // entry is added, and the record write is never attempted.
    await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
    for (const name of SHIPPED_WORKFLOW_NAMES) {
      await writeFile(path.join(root, ".github", "workflows", name), "on: push\n", "utf-8");
    }

    const outsideAssistant = path.join(outsideQfai, "assistant");
    const refreshVictim = path.join(outsideAssistant, "catalog", "test-layers.md");
    const refreshVictimBody = "# an older release wrote this, outside the project\n";
    await writeFile(refreshVictim, refreshVictimBody, "utf-8");
    const retireVictim = path.join(outsideAssistant, "catalog", "withdrawn.md");
    const retireVictimBody = "# also not qfai's to delete\n";
    await writeFile(retireVictim, retireVictimBody, "utf-8");
    // Recorded as qfai's own writes, which is what makes `--force` willing to
    // refresh the first and retire the second.
    await writeAssistantAssetsLock(outsideAssistant, {
      files: {
        ...(lock?.files ?? {}),
        "catalog/test-layers.md": hashAssistantAssetText(refreshVictimBody),
        "catalog/withdrawn.md": hashAssistantAssetText(retireVictimBody),
      },
    });

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    expect(await readFile(refreshVictim, "utf-8")).toBe(refreshVictimBody);
    expect(await readFile(retireVictim, "utf-8")).toBe(retireVictimBody);
    // The record is a governed write too, so it is left exactly as planted.
    const after = await readAssistantAssetsLock(outsideAssistant);
    expect(after?.files["catalog/test-layers.md"]).toBe(hashAssistantAssetText(refreshVictimBody));
    expect(after?.files["catalog/withdrawn.md"]).toBe(hashAssistantAssetText(retireVictimBody));
  }, 120000);

  // `runUpgradeAssistantTree` deliberately leaves the legacy file in place, so
  // a part-way-through-the-recut project has both layouts at once. The
  // existence probe was then satisfied by the legacy copy while the exclusion
  // below silenced the provenance check — deleting a normative rule was
  // reportable in every layout except the one the upgrade path creates.
  it("reports a deleted canonical rule when the legacy fallback still stands", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    await mkdir(path.join(assistantDir, "instructions"), { recursive: true });
    await cp(
      path.join(assistantDir, "constitution", "drift-protocol.md"),
      path.join(assistantDir, "instructions", "drift-protocol.md"),
    );
    await rm(path.join(assistantDir, "constitution", "drift-protocol.md"));

    const issues = await validateAssistantAssets(root, defaultConfig);
    // The probe found the legacy copy, so it says nothing — and that is exactly
    // why the absence has to be reported here.
    expect(codesOf(issues)).not.toContain("QFAI-ASSETS-001");
    const missing = issues.filter((found) => found.code === "QFAI-ASSETS-006");
    expect(missing).toHaveLength(1);
    expect(missing[0]?.file).toContain(path.join("constitution", "drift-protocol.md"));
  });

  // `readdir` resolves a symlinked scan root like any other path, so `validate`
  // walked and hashed whatever was on the other side — passing in silence when
  // the external tree happened to match the release.
  it("refuses to walk a governed layer that is a symlink, and says so", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    const outside = path.join(root, "outside-catalog");
    // Identical content, so a validator that followed the link found nothing to
    // report and the escape stayed invisible.
    await cp(path.join(shippedAssistantDir, "catalog"), outside, { recursive: true });
    await rm(path.join(assistantDir, "catalog"), { recursive: true, force: true });
    await symlink(outside, path.join(assistantDir, "catalog"), "junction");

    const issues = await validateAssistantAssets(root, defaultConfig);
    const unverifiable = issues.filter((found) => found.code === "QFAI-ASSETS-007");
    expect(unverifiable).toHaveLength(1);
    expect(unverifiable[0]?.severity).toBe(await expectedProvenanceSeverity());
    // Silence was the bug: an inability to compare is not a clean tree.
    expect(issues.length).toBeGreaterThan(0);
  });

  // Matching the staging prefix alone let any name that merely starts with it
  // pass as qfai's own scaffolding — a normative addition the record never saw.
  it("excludes only a real staging file, not every name that opens with the prefix", async () => {
    const root = await makeProject();
    const constitutionDir = path.join(root, ".qfai", "assistant", "constitution");
    await writeFile(
      path.join(constitutionDir, `${ASSISTANT_STAGING_PREFIX}project-rule.md`),
      "# a rule wearing qfai's scaffolding\n",
      "utf-8",
    );
    await writeFile(
      path.join(constitutionDir, `${ASSISTANT_STAGING_PREFIX}${randomUUID()}.tmp`),
      "# a genuine in-flight staging file\n",
      "utf-8",
    );

    const issues = await validateAssistantAssets(root, defaultConfig);
    const unshipped = issues.filter((found) => found.code === "QFAI-ASSETS-005");
    expect(unshipped).toHaveLength(1);
    expect(unshipped[0]?.file).toContain(`${ASSISTANT_STAGING_PREFIX}project-rule.md`);
  });

  // `randomUUID()` only ever emits RFC 4122 version 4, so the nil UUID is a
  // name qfai cannot produce — and accepting it as scaffolding was a permanent
  // normative file the record never saw.
  it("rejects a staging name whose version and variant nibbles qfai never emits", async () => {
    const root = await makeProject();
    const constitutionDir = path.join(root, ".qfai", "assistant", "constitution");
    const nilUuidName = `${ASSISTANT_STAGING_PREFIX}00000000-0000-0000-0000-000000000000.tmp`;
    await writeFile(path.join(constitutionDir, nilUuidName), "# not scaffolding\n", "utf-8");

    const issues = await validateAssistantAssets(root, defaultConfig);
    const unshipped = issues.filter((found) => found.code === "QFAI-ASSETS-005");
    expect(unshipped).toHaveLength(1);
    expect(unshipped[0]?.file).toContain(nilUuidName);
  });

  // `open` and the handle's `stat` both resolve through a link, so a governed
  // filename pointing at an external file with the shipped bytes read as
  // `shipped` — the rule qfai vouched for living outside the checkout entirely.
  it.skipIf(process.platform === "win32")(
    "does not accept a governed filename that is a symlink to shipped bytes",
    async () => {
      const root = await makeProject();
      const relative = path.join("catalog", "test-layers.md");
      const target = path.join(root, ".qfai", "assistant", relative);
      const outside = path.join(root, "outside-test-layers.md");
      await cp(path.join(shippedAssistantDir, "catalog", "test-layers.md"), outside);
      await rm(target);
      await symlink(outside, target);

      // The bytes match the release exactly, so a follow-the-link implementation
      // reports nothing at all.
      expect(await hashAssistantAssetFile(target)).toBeNull();
      const issues = await validateAssistantAssets(root, defaultConfig);
      const missing = issues.filter((found) => found.code === "QFAI-ASSETS-006");
      expect(missing).toHaveLength(1);
      expect(missing[0]?.file).toContain("test-layers.md");
    },
  );

  // `runUpgradeAssistantTree` leaves the legacy file behind on purpose, so a
  // migrated project has both layouts — and deleting the canonical layer there
  // satisfied QFAI-ASSETS-001 from the legacy copy while the per-file loop
  // skipped every shipped rule for want of a layer to report it in.
  it("reports a governed layer the record says qfai wrote and the project deleted", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    await mkdir(path.join(assistantDir, "instructions"), { recursive: true });
    await cp(
      path.join(assistantDir, "constitution", "drift-protocol.md"),
      path.join(assistantDir, "instructions", "drift-protocol.md"),
    );
    await rm(path.join(assistantDir, "constitution"), { recursive: true, force: true });

    const issues = await validateAssistantAssets(root, defaultConfig);
    expect(codesOf(issues)).not.toContain("QFAI-ASSETS-001");
    const missing = issues.filter((found) => found.code === "QFAI-ASSETS-006");
    // Once, against the layer — not once per shipped rule it used to hold.
    expect(missing).toHaveLength(1);
    expect(missing[0]?.rule).toBe("assistantAssets.missingVendoredLayer");
    expect(missing[0]?.severity).toBe(await expectedProvenanceSeverity());
  });

  // A project that never had the layer is still not missing anything: the
  // record is what separates "never received it" from "deleted it".
  it("says nothing about an absent layer when the record never named one", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-"));
    tempRoots.push(root);
    const assistantDir = path.join(root, ".qfai", "assistant");
    await mkdir(path.join(assistantDir, "skills"), { recursive: true });

    const issues = await validateAssistantAssets(root, defaultConfig);
    expect(codesOf(issues)).not.toContain("QFAI-ASSETS-006");
  });

  // A shipped file the install lost is not a rule the release withdrew. The
  // walk could not tell them apart — the path simply failed to appear, and
  // `--force` retires every recorded path the shipped set omits.
  it("refuses a shipped set that is missing a file the release ships", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-"));
    tempRoots.push(root);
    const install = path.join(root, "assets", "init", ".qfai", "assistant");
    await mkdir(path.dirname(install), { recursive: true });
    await cp(shippedAssistantDir, install, { recursive: true });
    // One file gone from an otherwise intact layer: the exact shape a truncated
    // extraction leaves, and the one the layer-root check cannot see.
    await rm(path.join(install, "catalog", "product.md"));

    await expect(buildShippedAssistantHashes(install)).rejects.toThrow(/product\.md/);
  });

  // The compiled manifest is the whole basis for the paragraph above, so it has
  // to still describe the tree that ships.
  it("keeps the compiled shipped manifest in step with the asset tree", () => {
    const script = path.resolve(
      import.meta.dirname,
      "../../scripts/generate-governed-assistant-manifest.mjs",
    );
    const child = spawnSync("node", [script, "--check"], { encoding: "utf-8" });
    expect(`${child.stdout ?? ""}${child.stderr ?? ""}`).toContain("in sync");
    expect(child.status).toBe(0);
  });

  // The refresh decides from a hash read earlier; the atomic staging protects
  // the OLD content from a failed copy and says nothing about a target rewritten
  // in between, which the unconditional rename then discarded.
  it("declines to refresh a governed path that changed after it was hashed", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-"));
    tempRoots.push(root);
    const source = path.join(root, "shipped.md");
    const dest = path.join(root, "vendored.md");
    await writeFile(source, "# the release\n", "utf-8");
    await writeFile(dest, "# what the concurrent writer put here\n", "utf-8");

    const outcome = await replaceGovernedAsset(source, dest, hashAssistantAssetText("# stale\n"));

    expect(outcome).toBe("target-changed");
    expect(await readFile(dest, "utf-8")).toBe("# what the concurrent writer put here\n");
    expect(await readdir(root)).toEqual(
      expect.not.arrayContaining([expect.stringContaining(ASSISTANT_STAGING_PREFIX)]),
    );
  });

  // `rm` acts on a pathname, not on the inode the hash came from: a file that
  // replaced the path between the two was deleted on somebody else's bytes.
  it("never retires a governed path whose content changed after it was hashed", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-"));
    tempRoots.push(root);
    const dest = path.join(root, "withdrawn.md");
    const replacement = "# a new project-owned file at the same path\n";
    await writeFile(dest, replacement, "utf-8");

    const outcome = await retireVerifiedGovernedAsset(
      dest,
      hashAssistantAssetText("# what qfai recorded writing\n"),
    );

    expect(outcome).toBe("changed");
    expect(await readFile(dest, "utf-8")).toBe(replacement);
    expect(await readdir(root)).toEqual(
      expect.not.arrayContaining([expect.stringContaining(ASSISTANT_STAGING_PREFIX)]),
    );
  });

  // …and still retires the file it did verify.
  it("retires a governed path that still holds exactly what qfai recorded", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-"));
    tempRoots.push(root);
    const dest = path.join(root, "withdrawn.md");
    const body = "# what qfai recorded writing\n";
    await writeFile(dest, body, "utf-8");

    expect(await retireVerifiedGovernedAsset(dest, hashAssistantAssetText(body))).toBe("removed");
    expect(await readdir(root)).toEqual([]);
  });

  // The preview must not report a repair that has not happened.
  it("previews the occupied-path repair as pending under --dry-run", async () => {
    const root = await makeProject();
    const target = path.join(root, ".qfai", "assistant", "catalog", "test-layers.md");
    await rm(target);
    await mkdir(target, { recursive: true });

    const output = await captureStdout(() =>
      runInit({ dir: root, force: true, dryRun: true, yes: true }),
    );

    expect(output).toContain("--dry-run");
    expect(output).not.toContain("出荷ファイルで置き換えました");
    expect(output).toContain("出荷ファイルで置き換えます");
  });

  // Without the record in version control a fresh clone reads every untouched
  // copy from an older release as a local fork that `--force` will not refresh.
  it("keeps the provenance record out of a broad .qfai ignore rule", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-"));
    tempRoots.push(root);
    const run = promisify(execFile);
    await run("git", ["init", "-q", root], { cwd: root });
    await writeFile(path.join(root, ".gitignore"), `.qfai/*\n${QFAI_GITIGNORE_BLOCK}`, "utf-8");
    const lockRel = path.posix.join(".qfai", "assistant", ASSISTANT_ASSETS_LOCK_BASENAME);
    await mkdir(path.join(root, ".qfai", "assistant"), { recursive: true });
    await writeFile(path.join(root, lockRel), '{ "files": {} }\n', "utf-8");

    // Without `-v`, `check-ignore` exits 1 for a path that is not ignored; with
    // it, a matching *negation* also exits 0, which would pass either way.
    await expect(run("git", ["check-ignore", lockRel], { cwd: root })).rejects.toMatchObject({
      code: 1,
    });
  });

  // `.qfai/**` matches every descendant in its own right, so re-including the
  // directory re-includes nothing inside it: the record reached a fresh clone
  // through its leaf negation while the rules it vouches for did not.
  it("keeps the governed tree out of a recursive .qfai ignore rule", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-"));
    tempRoots.push(root);
    const run = promisify(execFile);
    await run("git", ["init", "-q", root], { cwd: root });
    await writeFile(path.join(root, ".gitignore"), `.qfai/**\n${QFAI_GITIGNORE_BLOCK}`, "utf-8");
    const governedRel = path.posix.join(".qfai", "assistant", "catalog", "test-layers.md");
    await mkdir(path.join(root, ".qfai", "assistant", "catalog"), { recursive: true });
    await writeFile(path.join(root, governedRel), "# Test Layers\n", "utf-8");

    await expect(run("git", ["check-ignore", governedRel], { cwd: root })).rejects.toMatchObject({
      code: 1,
    });
  });

  // `lstat` refuses to resolve only the path it is handed, so checking the layer
  // alone left every component above it resolved: an external tree matching the
  // release passed in silence, and a big one was walked in full.
  it.skipIf(process.platform === "win32")(
    "refuses to compare through a .qfai that leaves the project",
    async () => {
      const root = await makeProject();
      const outside = path.join(root, "outside-qfai");
      await rename(path.join(root, ".qfai"), outside);
      await symlink(outside, path.join(root, ".qfai"));

      const issues = await validateAssistantAssets(root, defaultConfig);
      const unverifiable = issues.filter((found) => found.code === "QFAI-ASSETS-007");
      expect(unverifiable).toHaveLength(1);
      expect(unverifiable[0]?.severity).toBe(await expectedProvenanceSeverity());
    },
  );

  // A record that is present and unusable read as "never initialised", which
  // silenced every absence the record is what makes reportable.
  it("reports an unusable provenance record instead of reading it as none", async () => {
    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    await writeFile(
      path.join(assistantDir, ASSISTANT_ASSETS_LOCK_BASENAME),
      "{ this is not json",
      "utf-8",
    );
    // The state the silence needed: a migrated tree whose legacy fallback
    // satisfies QFAI-ASSETS-001, with the canonical layer deleted.
    await mkdir(path.join(assistantDir, "instructions"), { recursive: true });
    await cp(
      path.join(shippedAssistantDir, "constitution", "drift-protocol.md"),
      path.join(assistantDir, "instructions", "drift-protocol.md"),
    );
    await rm(path.join(assistantDir, "constitution"), { recursive: true, force: true });

    const issues = await validateAssistantAssets(root, defaultConfig);
    expect(codesOf(issues)).not.toContain("QFAI-ASSETS-001");
    expect(codesOf(issues)).toContain("QFAI-ASSETS-007");
  });

  // …and a project that genuinely has no record is still not reported for it.
  it("says nothing about a project that never had a provenance record", async () => {
    const root = await makeProject();
    await rm(path.join(root, ".qfai", "assistant", ASSISTANT_ASSETS_LOCK_BASENAME));

    const issues = await validateAssistantAssets(root, defaultConfig);
    expect(codesOf(issues).filter((code) => code.startsWith("QFAI-ASSETS-"))).toEqual([]);
  });

  // A lock key inside the tree is not the same as a path qfai owns. An overlay
  // recorded in the lock is absent from every shipped set, so `--force` retired
  // the one extension point the protocol sanctions.
  it("never lets a lock claim ownership of a project overlay", async () => {
    expect(isGovernedAssistantLockKey("catalog/test-layers.local.md")).toBe(false);
    expect(isGovernedAssistantLockKey("constitution/.gitignore")).toBe(false);
    // Over-correction pin: the paths qfai does own are still keys.
    expect(isGovernedAssistantLockKey("catalog/test-layers.md")).toBe(true);
    expect(isGovernedAssistantLockKey("constitution/custom/rule.md")).toBe(true);

    const root = await makeProject();
    const assistantDir = path.join(root, ".qfai", "assistant");
    const overlay = path.join(assistantDir, "catalog", "test-layers.local.md");
    const body = "# L1/L2, this project's own\n";
    await writeFile(overlay, body, "utf-8");
    const lock = await readAssistantAssetsLock(assistantDir);
    await writeAssistantAssetsLock(assistantDir, {
      files: {
        ...(lock?.files ?? {}),
        "catalog/test-layers.local.md": hashAssistantAssetText(body),
      },
    });

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    expect(await readFile(overlay, "utf-8")).toBe(body);
  });

  // The third path that decided from a probe and then acted on the pathname.
  it("does not clobber a governed path that became a regular file mid-repair", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-"));
    tempRoots.push(root);
    const dest = path.join(root, "occupied.md");
    const arrived = "# a project file that arrived after the probe\n";
    await writeFile(dest, arrived, "utf-8");

    expect(await displaceUnreadableGovernedAsset(dest)).toBe("regular-file");
    expect(await readFile(dest, "utf-8")).toBe(arrived);
    expect(await readdir(root)).toEqual(
      expect.not.arrayContaining([expect.stringContaining(ASSISTANT_STAGING_PREFIX)]),
    );
  });

  // …and still clears the occupant it was entered for.
  it("displaces a governed path a directory occupies", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-"));
    tempRoots.push(root);
    const dest = path.join(root, "occupied.md");
    await mkdir(path.join(dest, "nested"), { recursive: true });

    expect(await displaceUnreadableGovernedAsset(dest)).toBe("displaced");
    expect(await readdir(root)).toEqual([]);
  });

  // The guard answered once per containing directory, so its answer was as old
  // as the run: a layer swapped for a link after the first file in it cleared
  // took every later write and retire in that layer with it.
  it.skipIf(process.platform === "win32")(
    "asks the containment guard again rather than reusing an answer",
    async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-provenance-"));
      tempRoots.push(root);
      const assistantDir = path.join(root, ".qfai", "assistant");
      await mkdir(path.join(assistantDir, "catalog"), { recursive: true });
      const outside = path.join(root, "outside-catalog");
      await mkdir(outside, { recursive: true });

      const isContained = makeGovernedContainmentGuard(root);
      expect(await isContained("catalog/first.md")).toBe(true);

      await rm(path.join(assistantDir, "catalog"), { recursive: true, force: true });
      await symlink(outside, path.join(assistantDir, "catalog"));

      expect(await isContained("catalog/second.md")).toBe(false);
    },
  );
});
