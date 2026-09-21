/**
 * A rule a project deleted stays deleted.
 *
 * `qfai init` decided which masters to cite from its own copy report, so a
 * master the project had removed on purpose looked exactly like a rule shipped
 * for the first time: the run wrote it again and added the bullet back. The
 * record of what an earlier run wrote is what separates the two, and these
 * cases hold that it does — in both directions, since a rule shipped today
 * still has to arrive.
 */
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { RULE_LOCK_BASENAME } from "../../src/core/ruleMasterUpdates.js";

const RULES_DIR = path.join(".agents", "rules");
/** The same directory as a citation spells it, which is POSIX on every host. */
const RULES_DIR_CITATION = ".agents/rules";
/** A shipped master with no special standing, so removing it proves the rule and not a case. */
const SUBJECT = "temporary-files.md";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function initialisedProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-deleted-rule-"));
  roots.push(root);
  await runInit({ dir: root, force: false, dryRun: false, yes: true });
  return root;
}

const masterPath = (root: string, name = SUBJECT): string => path.join(root, RULES_DIR, name);
const lockPath = (root: string): string => path.join(root, RULES_DIR, RULE_LOCK_BASENAME);

async function citesSubject(root: string): Promise<boolean> {
  const entryPoint = await readFile(path.join(root, "CLAUDE.md"), "utf-8");
  return entryPoint.includes(`${RULES_DIR_CITATION}/${SUBJECT}`);
}

describe("a rule master the project deleted", () => {
  it("is not written again, and its bullet is not added back", async () => {
    const root = await initialisedProject();
    expect(existsSync(masterPath(root))).toBe(true);
    expect(await citesSubject(root)).toBe(true);

    await rm(masterPath(root));
    const entryPointPath = path.join(root, "CLAUDE.md");
    const withoutBullet = (await readFile(entryPointPath, "utf-8"))
      .split("\n")
      .filter((line) => !line.includes(`/${SUBJECT}`))
      .join("\n");
    await writeFile(entryPointPath, withoutBullet, "utf-8");

    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    expect(existsSync(masterPath(root))).toBe(false);
    expect(await citesSubject(root)).toBe(false);
  });

  it("stays deleted under --force, which rewrites what is there rather than restoring what is not", async () => {
    const root = await initialisedProject();
    await rm(masterPath(root));

    await runInit({ dir: root, force: true, dryRun: false, yes: true });

    expect(existsSync(masterPath(root))).toBe(false);
  });

  it("keeps its record entry, so a second later run does not restore it either", async () => {
    const root = await initialisedProject();
    await rm(masterPath(root));

    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const lock = JSON.parse(await readFile(lockPath(root), "utf-8")) as Record<string, string>;
    expect(Object.keys(lock)).toContain(SUBJECT);

    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    expect(existsSync(masterPath(root))).toBe(false);
  });

  it("comes back when its entry is removed from the record", async () => {
    const root = await initialisedProject();
    await rm(masterPath(root));

    const lock = JSON.parse(await readFile(lockPath(root), "utf-8")) as Record<string, string>;
    const without = Object.fromEntries(Object.entries(lock).filter(([name]) => name !== SUBJECT));
    await writeFile(lockPath(root), `${JSON.stringify(without, null, 2)}\n`, "utf-8");

    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    expect(existsSync(masterPath(root))).toBe(true);
    expect(await citesSubject(root)).toBe(true);
  });

  it("does not hold back a master the project never had", async () => {
    // The other direction: a first run has no record at all, so every shipped
    // master arrives. Without this the exclusion could empty the directory and
    // every case above would still pass.
    const root = await initialisedProject();
    const installed = await readdir(path.join(root, RULES_DIR));

    expect(installed).toContain(SUBJECT);
    expect(installed.filter((name) => name.endsWith(".md")).length).toBeGreaterThan(1);
  });
});
