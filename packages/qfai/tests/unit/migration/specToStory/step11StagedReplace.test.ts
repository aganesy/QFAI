/**
 * Step 11 replaces a shipped skill that differs from the package's copy. The
 * package's copy is staged and checked before the project's copy is moved, so a
 * failed copy or a failed switch leaves the project's copy in place.
 *
 * `vi.mock` is hoisted to module scope, so this lives apart from the step 11
 * integration tests, where the real `rename` and template copy must work.
 */

import type * as fsPromises from "node:fs/promises";
import { appendFile, cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as templateCopyModule from "../../../../src/core/fs/templateCopy.js";

type FsPromises = typeof fsPromises;
type TemplateCopy = typeof templateCopyModule;
type CopyArgs = Parameters<TemplateCopy["copyTemplatePaths"]>;

const { renameSpy, copySpy } = vi.hoisted(() => ({ renameSpy: vi.fn(), copySpy: vi.fn() }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    rename: (from: string, to: string): unknown => renameSpy(actual, from, to),
  };
});

vi.mock("../../../../src/core/fs/templateCopy.js", async () => {
  const actual = await vi.importActual<TemplateCopy>("../../../../src/core/fs/templateCopy.js");
  return {
    ...actual,
    copyTemplatePaths: (...args: CopyArgs): unknown => copySpy(actual, ...args),
  };
});

const { defaultConfig } = await import("../../../../src/core/config.js");
const { getInitAssetsDir } = await import("../../../../src/shared/assets.js");
const { step11 } = await import("../../../../src/migration/specToStory/step11InstallEntry.js");

const SKILL = "qfai-sdd";
const SKILL_DIR = path.join(".qfai", "assistant", "skill", SKILL);
const ADDED = "\nA line the project added.\n";
const roots: string[] = [];

beforeEach(() => {
  renameSpy.mockImplementation((actual: FsPromises, from: string, to: string) =>
    actual.rename(from, to),
  );
  copySpy.mockImplementation((actual: TemplateCopy, ...args: CopyArgs) =>
    actual.copyTemplatePaths(...args),
  );
});

afterEach(async () => {
  vi.clearAllMocks();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

/** A project holding the package's `qfai-sdd` skill with one line the project added. */
async function customisedProject(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "qfai-step11-replace-"));
  roots.push(root);
  await cp(
    path.join(getInitAssetsDir(), ".qfai", "assistant", "skill", SKILL),
    path.join(root, SKILL_DIR),
    { recursive: true, dereference: true },
  );
  await appendFile(path.join(root, SKILL_DIR, "SKILL.md"), ADDED);
  return root;
}

async function replaceSkill(root: string): Promise<void> {
  const plan = await step11.plan({
    root,
    specsDir: path.join(root, ".qfai", "spec"),
    contractsDir: path.join(root, ".qfai", "spec", "03_contract"),
    config: defaultConfig,
  });
  const shown = SKILL_DIR.split(path.sep).join("/");
  // Every operation that touches the skill, in plan order, as the harness applies them.
  for (const operation of plan.operations) {
    if (operation.kind !== "delegate") continue;
    if (!(operation.targets ?? [operation.target]).some((each) => each.startsWith(shown))) {
      continue;
    }
    await operation.apply();
  }
}

async function skillText(root: string): Promise<string> {
  return readFile(path.join(root, SKILL_DIR, "SKILL.md"), "utf8");
}

async function skillParent(root: string): Promise<string[]> {
  return (await readdir(path.dirname(path.join(root, SKILL_DIR)))).sort();
}

function simulatedFault(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`simulated ${code}`), { code });
}

describe("step 11 stages a replacement before it moves the project's copy", () => {
  it("keeps the project's copy when the package's copy fails partway", async () => {
    const root = await customisedProject();
    copySpy.mockImplementation(async (actual: TemplateCopy, ...args: CopyArgs) => {
      // Write the files first, then fail: a mock that only rejects proves no cleanup.
      await actual.copyTemplatePaths(...args);
      throw simulatedFault("ENOSPC");
    });
    await expect(replaceSkill(root)).rejects.toThrow("ENOSPC");
    expect(await skillText(root)).toContain(ADDED.trim());
    expect(await skillParent(root)).toEqual([SKILL]);
  });

  it("restores the project's copy when the staged copy cannot be switched in", async () => {
    const root = await customisedProject();
    const target = path.join(root, SKILL_DIR);
    renameSpy.mockImplementation(async (actual: FsPromises, from: string, to: string) => {
      if (to === target && from !== target) {
        if (from.endsWith(`${path.sep}previous`)) return actual.rename(from, to);
        throw simulatedFault("EBUSY");
      }
      return actual.rename(from, to);
    });
    await expect(replaceSkill(root)).rejects.toThrow("EBUSY");
    expect(await skillText(root)).toContain(ADDED.trim());
    expect(await skillParent(root)).toEqual([SKILL]);
  });

  it("puts the package's copy in place and leaves nothing beside it", async () => {
    const root = await customisedProject();
    await replaceSkill(root);
    const shipped = await readFile(
      path.join(getInitAssetsDir(), ".qfai", "assistant", "skill", SKILL, "SKILL.md"),
      "utf8",
    );
    expect(await skillText(root)).toBe(shipped);
    expect(await skillParent(root)).toEqual([SKILL]);
  });
});
