/**
 * The skill gate on file systems that answer differently.
 *
 * Two answers no test directory can produce everywhere: a volume that reports
 * no inode numbers, and a directory this process may not list. Both are made
 * here by the file system module itself, so the cases run on every platform.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

// The module is mocked below, and its TYPE comes from a namespace import:
// `consistent-type-imports` forbids the inline form.
import type * as FsPromises from "node:fs/promises";

import { defaultConfig } from "../../src/core/config.js";
import { validateAssistantAssets } from "../../src/core/validators/assistantAssets.js";

const fault = vi.hoisted((): { zeroInode: boolean; deniedDirectory: string | null } => ({
  zeroInode: false,
  deniedDirectory: null,
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    stat: async (...args: Parameters<typeof actual.stat>) => {
      const stats = await actual.stat(...args);
      return fault.zeroInode && typeof stats.ino === "bigint"
        ? Object.assign(stats, { ino: 0n })
        : stats;
    },
    readdir: async (...args: Parameters<typeof actual.readdir>) => {
      if (
        fault.deniedDirectory !== null &&
        path.resolve(String(args[0])) === fault.deniedDirectory
      ) {
        throw Object.assign(new Error("EACCES: permission denied, scandir"), { code: "EACCES" });
      }
      return actual.readdir(...args);
    },
  };
});

const tempDirs: string[] = [];

afterEach(async () => {
  fault.zeroInode = false;
  fault.deniedDirectory = null;
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/** A project whose skills tree holds these skills, each with the given front matter. */
async function projectWithSkills(
  skills: Readonly<Record<string, readonly string[]>>,
): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-skill-fs-"));
  tempDirs.push(root);
  for (const [name, frontMatter] of Object.entries(skills)) {
    const skillDir = path.join(root, ".qfai", "assistant", "skills", name);
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, "SKILL.md"),
      ["---", `name: ${name}`, ...frontMatter, "---", "", `## ${name}`, ""].join("\n"),
      "utf-8",
    );
  }
  return root;
}

describe("the skill gate on file systems that answer differently", () => {
  it("reads each skill as itself on a volume that reports no inode numbers", async () => {
    // Every file there reports the same inode, so each entry point is told apart
    // by its path and read as itself.
    const root = await projectWithSkills({
      "qfai-a": ['description: "Does the thing."'],
      "qfai-b": [],
    });
    fault.zeroInode = true;

    const missing = (await validateAssistantAssets(root, defaultConfig)).filter(
      (item) => item.code === "QFAI-SKILLS-015" && item.message.includes("description"),
    );
    expect(missing.map((item) => path.basename(path.dirname(item.file ?? "")))).toEqual(["qfai-b"]);
  });

  it("reports an unreadable entry point once, whatever its case, with no inode numbers", async () => {
    // Where the volume folds case, the crawl's `skill.md` and the probe's
    // `SKILL.md` are one file, and the canonical path names them as one.
    const root = await projectWithSkills({ "qfai-a": ['description: "Does the thing."'] });
    const skillDir = path.join(root, ".qfai", "assistant", "skills", "qfai-a");
    await rm(path.join(skillDir, "SKILL.md"));
    const file = path.join(skillDir, "skill.md");
    await writeFile(file, Buffer.concat([Buffer.from("# skill\n"), Buffer.from([0xff])]));
    fault.zeroInode = true;

    const unreadable = (await validateAssistantAssets(root, defaultConfig)).filter(
      (item) => item.code === "QFAI-SKILLS-014" && item.file?.toLowerCase() === file.toLowerCase(),
    );
    expect(unreadable).toHaveLength(1);
  });

  it("reports a directory it cannot list inside a skill, and finishes", async () => {
    // A `tmp` inside a skill is read like any other directory, so one this
    // process may not list is a finding rather than the end of the run.
    const root = await projectWithSkills({ "qfai-a": ['description: "Does the thing."'] });
    const locked = path.join(root, ".qfai", "assistant", "skills", "qfai-a", "tmp");
    await mkdir(locked, { recursive: true });
    // An uncited reference beside it stays undecided: the directory may hold the
    // document that cites it.
    const references = path.join(root, ".qfai", "assistant", "skills", "qfai-a", "references");
    await mkdir(references, { recursive: true });
    await writeFile(path.join(references, "orphan.md"), "# orphan\n", "utf-8");
    fault.deniedDirectory = locked;

    const found = await validateAssistantAssets(root, defaultConfig);
    expect(found.some((item) => item.code === "QFAI-SKILLS-014" && item.file === locked)).toBe(
      true,
    );
    expect(found.map((item) => item.code)).not.toContain("QFAI-SKILLS-013");
  });
});
