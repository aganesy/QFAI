/**
 * A rule master whose text moved in a release, reaching a project that already
 * ran `qfai init`.
 *
 * The root copy is create-only, so before this the answer was never. A rule is
 * QFAI's file, and the projects the change failed to reach were exactly the ones
 * running an agent against the superseded wording.
 *
 * What it must not do is overwrite an edit. The file alone cannot tell an
 * adopter's wording from an older release's, so the record of what `init` last
 * wrote is what decides, and every case here is a different answer to that one
 * question.
 */

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { RULE_LOCK_BASENAME, readRuleLock } from "../../src/core/ruleMasterUpdates.js";
import { removeTempTree } from "../helpers/tempTree.js";

const RULES_REL = path.join(".agents", "rules");
/** One master every shipped tree has, so no case depends on a rule's subject. */
const MASTER = "documentation-clarity.md";

let root: string;

const masterPath = (): string => path.join(root, RULES_REL, MASTER);
const lockPath = (): string => path.join(root, RULES_REL, RULE_LOCK_BASENAME);

async function init(): Promise<void> {
  await runInit({ dir: root, force: false, dryRun: false, yes: true });
}

/** The text this release ships, read off the project after a first init. */
async function shippedText(): Promise<string> {
  return readFile(masterPath(), "utf-8");
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-rule-master-"));
  await init();
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("a re-init and a rule master the project has", () => {
  it("records what the first run wrote", async () => {
    // Without the record there is nothing to compare a later file against, and
    // every master stays unreplaceable for ever.
    const recorded = await readRuleLock(path.join(root, RULES_REL));

    expect(Object.keys(recorded).length, "no master was recorded").toBeGreaterThan(0);
    expect(recorded[MASTER], `${MASTER} was written and not recorded`).toBeTypeOf("string");
  });

  it("replaces a master the project has not touched", async () => {
    // The case the whole pass exists for: the release moved and the project's
    // copy is still exactly what the last run left.
    const shipped = await shippedText();
    await writeFile(masterPath(), "# An older release's wording\n", "utf-8");
    // Recorded as though the older wording were what init wrote, which is the
    // state a project that ran an earlier release is actually in.
    const recorded = await readRuleLock(path.join(root, RULES_REL));
    await writeFile(
      lockPath(),
      JSON.stringify({ ...recorded, [MASTER]: await hashOf(masterPath()) }, null, 2),
      "utf-8",
    );

    await init();

    expect(await readFile(masterPath(), "utf-8")).toBe(shipped);
  });

  it("keeps a master the project edited, and says so", async () => {
    // The record holds this run's own write, and the bytes no longer match it,
    // so the difference is an edit rather than the release moving.
    const edited = "# Documentation Clarity\n\nOur own wording.\n";
    await writeFile(masterPath(), edited, "utf-8");

    await init();

    expect(await readFile(masterPath(), "utf-8")).toBe(edited);
  });

  it("keeps a master no record covers", async () => {
    // A project initialised before the record existed. Nothing distinguishes
    // its file from an edit, so the conservative side is the only safe one.
    const older = "# An older release's wording\n";
    await writeFile(masterPath(), older, "utf-8");
    await writeFile(lockPath(), "{}\n", "utf-8");

    await init();

    expect(await readFile(masterPath(), "utf-8")).toBe(older);
  });

  it("does not record a master it kept", async () => {
    // Recording the adopter's bytes would make the next release read them as
    // this run's write and replace them — the overwrite this pass refuses,
    // one release later.
    const edited = "# Documentation Clarity\n\nOur own wording.\n";
    await writeFile(masterPath(), edited, "utf-8");

    await init();

    const recorded = await readRuleLock(path.join(root, RULES_REL));
    expect(recorded[MASTER]).not.toBe(await hashOf(masterPath()));
  });

  it("writes nothing under --dry-run", async () => {
    const older = "# An older release's wording\n";
    await writeFile(masterPath(), older, "utf-8");
    const recorded = await readRuleLock(path.join(root, RULES_REL));
    await writeFile(
      lockPath(),
      JSON.stringify({ ...recorded, [MASTER]: await hashOf(masterPath()) }, null, 2),
      "utf-8",
    );

    await runInit({ dir: root, force: false, dryRun: true, yes: true });

    expect(await readFile(masterPath(), "utf-8")).toBe(older);
  });

  it("leaves a second run with nothing to do", async () => {
    // The record ends at the shipped hash, so the next run reads the file as
    // current rather than replacing it again.
    const before = await readFile(lockPath(), "utf-8");

    await init();

    expect(await readFile(lockPath(), "utf-8")).toBe(before);
  });
});

/** The same hash the pass compares with, so a case can plant a record. */
async function hashOf(filePath: string): Promise<string> {
  const { hashAssistantAssetText } = await import("../../src/core/assistantAssetProvenance.js");
  return hashAssistantAssetText(await readFile(filePath, "utf-8"));
}

describe("a project with no rules directory", () => {
  it("is left alone rather than failing the run", async () => {
    // `init` creates the directory, so this is the shape a checkout gets when
    // something removed it between runs. Nothing here is required for the run
    // to be correct, and a throw would take the whole command with it.
    const bare = await mkdtemp(path.join(os.tmpdir(), "qfai-rule-master-bare-"));
    try {
      await mkdir(path.join(bare, ".agents"), { recursive: true });
      await expect(
        runInit({ dir: bare, force: false, dryRun: false, yes: true }),
      ).resolves.not.toThrow();
    } finally {
      await removeTempTree(bare);
    }
  });
});
