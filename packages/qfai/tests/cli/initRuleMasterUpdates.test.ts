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

import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import {
  hashAssistantAssetText,
  readAssistantAssetsLock,
  writeAssistantAssetsLock,
} from "../../src/core/assistantAssetProvenance.js";
import { RULE_LOCK_BASENAME, readRuleLock } from "../../src/core/ruleMasterUpdates.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const RULES_REL = path.join(".agents", "rules");
/** One master every shipped tree has, so no case depends on a rule's subject. */
const MASTER = "documentation-clarity.md";

let root: string;

const masterPath = (): string => path.join(root, RULES_REL, MASTER);
const lockPath = (): string => path.join(root, RULES_REL, RULE_LOCK_BASENAME);

async function init(): Promise<void> {
  await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
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

describe("the constitution and its safety floor upgrade together", () => {
  const minimumPath = (): string => path.join(root, RULES_REL, "minimal-implementation.md");
  const assistantPath = (): string => path.join(root, ".qfai", "assistant");
  const constitutionPath = (): string =>
    path.join(assistantPath(), "constitution", "constitution.md");

  async function olderConstitution(): Promise<string> {
    const text = "# Constitution\n\nThe previous release protects its required gates.\n";
    await writeFile(constitutionPath(), text, "utf-8");
    const lock = await readAssistantAssetsLock(assistantPath());
    if (lock === null) throw new Error("The first init must record its governed assets.");
    await writeAssistantAssetsLock(assistantPath(), {
      files: { ...lock.files, "constitution/constitution.md": hashAssistantAssetText(text) },
    });
    return text;
  }

  function olderFloor(text: string): string {
    expect(text).toContain("- Required traceability annotations.");
    expect(text).toContain("- Repository quality gates and their verification evidence.");
    return text
      .replace("- Required traceability annotations.\n", "")
      .replace("- Repository quality gates and their verification evidence.\n", "");
  }

  it("keeps the old constitution when an edited master lacks the shipped floor", async () => {
    const edited = olderFloor(await readFile(minimumPath(), "utf-8")) + "\nOur own rule wording.\n";
    await writeFile(minimumPath(), edited, "utf-8");
    const previous = await olderConstitution();

    const output = await captureStdout(() =>
      runInit({ dir: root, force: true, dryRun: false, yes: true }),
    );

    expect(await readFile(constitutionPath(), "utf-8")).toBe(previous);
    expect(await readFile(minimumPath(), "utf-8")).toBe(edited);
    expect(output).toContain("safety floor");
    expect(output).toContain("manual merge");
    const lock = await readAssistantAssetsLock(assistantPath());
    expect(lock?.files["constitution/constitution.md"]).toBe(hashAssistantAssetText(previous));
  });

  it("refreshes both when the old master still matches its write receipt", async () => {
    const shippedMaster = await readFile(minimumPath(), "utf-8");
    const shippedConstitution = await readFile(constitutionPath(), "utf-8");
    await writeFile(minimumPath(), olderFloor(shippedMaster), "utf-8");
    const rules = await readRuleLock(path.join(root, RULES_REL));
    await writeFile(
      lockPath(),
      JSON.stringify({ ...rules, "minimal-implementation.md": await hashOf(minimumPath()) }),
      "utf-8",
    );
    await olderConstitution();

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    expect(await readFile(minimumPath(), "utf-8")).toBe(shippedMaster);
    expect(await readFile(constitutionPath(), "utf-8")).toBe(shippedConstitution);
  });

  it("keeps edits outside the compatible floor while refreshing the constitution", async () => {
    const shippedConstitution = await readFile(constitutionPath(), "utf-8");
    const edited = (await readFile(minimumPath(), "utf-8")) + "\nOur own related guidance.\n";
    await writeFile(minimumPath(), edited, "utf-8");
    await olderConstitution();

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    expect(await readFile(minimumPath(), "utf-8")).toBe(edited);
    expect(await readFile(constitutionPath(), "utf-8")).toBe(shippedConstitution);
  });

  it("previews the paired upgrade without writing either file", async () => {
    const older = olderFloor(await readFile(minimumPath(), "utf-8"));
    await writeFile(minimumPath(), older, "utf-8");
    const rules = await readRuleLock(path.join(root, RULES_REL));
    await writeFile(
      lockPath(),
      JSON.stringify({ ...rules, "minimal-implementation.md": await hashOf(minimumPath()) }),
      "utf-8",
    );
    const previous = await olderConstitution();

    const output = await captureStdout(() =>
      runInit({ dir: root, force: true, dryRun: true, yes: true }),
    );

    expect(output).toMatch(/^ {4}- \.qfai\/assistant\/constitution\/constitution\.md$/m);
    expect(await readFile(minimumPath(), "utf-8")).toBe(older);
    expect(await readFile(constitutionPath(), "utf-8")).toBe(previous);
  });

  it("previews a fresh constitution alongside its new floor", async () => {
    const fresh = await mkdtemp(path.join(os.tmpdir(), "qfai-floor-preview-"));
    try {
      const output = await captureStdout(() =>
        runInit({ dir: fresh, force: false, dryRun: true, yes: true }),
      );
      expect(output).toMatch(/^ {4}- \.agents\/rules\/minimal-implementation\.md$/m);
      expect(output).toMatch(/^ {4}- \.qfai\/assistant\/constitution\/constitution\.md$/m);
      await expect(access(path.join(fresh, ".agents"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await removeTempTree(fresh);
    }
  });

  it("does not seed a new constitution over an incompatible pre-existing master", async () => {
    const fresh = await mkdtemp(path.join(os.tmpdir(), "qfai-floor-pair-"));
    try {
      await mkdir(path.join(fresh, RULES_REL), { recursive: true });
      const edited = olderFloor(await readFile(minimumPath(), "utf-8"));
      await writeFile(path.join(fresh, RULES_REL, "minimal-implementation.md"), edited, "utf-8");

      await captureStdout(() => runInit({ dir: fresh, force: false, dryRun: false, yes: true }));

      const assistant = path.join(fresh, ".qfai", "assistant");
      await expect(
        access(path.join(assistant, "constitution", "constitution.md")),
      ).rejects.toMatchObject({
        code: "ENOENT",
      });
      const lock = await readAssistantAssetsLock(assistant);
      expect(lock).not.toBeNull();
      expect(lock?.files).not.toHaveProperty("constitution/constitution.md");
    } finally {
      await removeTempTree(fresh);
    }
  });
});

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
