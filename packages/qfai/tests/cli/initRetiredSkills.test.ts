import { lstat, mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { keepRetiredAssistantDirs } from "../../src/cli/commands/init.js";
import { SHIPPED_RETIRED_SKILLS, digestOfText } from "../../src/core/init/shippedRetiredSkills.js";
import { removeTempTree } from "../helpers/tempTree.js";

const SKILL_TEXT = "# retired skill\n";
const REFERENCE_TEXT = "reference\n";

/** What a release shipped for `qfai-atdd`, as the test's own manifest names it. */
const SHIPPED = {
  "qfai-atdd": {
    "SKILL.md": [digestOfText(SKILL_TEXT), digestOfText("# an earlier release\n")],
    "references/notes.md": [digestOfText(REFERENCE_TEXT)],
  },
};

async function writeSkill(root: string, files: Record<string, string>): Promise<string> {
  const dir = path.join(root, ".qfai", "assistant", "skill", "qfai-atdd");
  for (const [relative, text] of Object.entries(files)) {
    const file = path.join(dir, ...relative.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, text, "utf-8");
  }
  return dir;
}

async function exists(p: string): Promise<boolean> {
  return (await lstat(p).catch(() => null)) !== null;
}

async function inTempProject(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-retired-skill-"));
  try {
    await run(root);
  } finally {
    await removeTempTree(root);
  }
}

describe("a retired skill on --force", () => {
  it("is removed, not copied into skill.local, when it holds what a release shipped", async () => {
    await inTempProject(async (root) => {
      const dir = await writeSkill(root, {
        "SKILL.md": SKILL_TEXT,
        "references/notes.md": REFERENCE_TEXT,
      });

      const notes = await keepRetiredAssistantDirs(root, false, SHIPPED);

      expect(await exists(dir)).toBe(false);
      expect(await exists(path.join(root, ".qfai", "assistant", "skill.local"))).toBe(false);
      expect(notes).toEqual(["  removed retired skill: .qfai/assistant/skill/qfai-atdd"]);
    });
  });

  it("matches a file written with CRLF line endings", async () => {
    await inTempProject(async (root) => {
      const dir = await writeSkill(root, {
        "SKILL.md": SKILL_TEXT.replace(/\n/g, "\r\n"),
        "references/notes.md": REFERENCE_TEXT,
      });

      await keepRetiredAssistantDirs(root, false, SHIPPED);

      expect(await exists(dir)).toBe(false);
    });
  });

  it("is only reported by a dry run", async () => {
    await inTempProject(async (root) => {
      const dir = await writeSkill(root, {
        "SKILL.md": SKILL_TEXT,
        "references/notes.md": REFERENCE_TEXT,
      });

      const notes = await keepRetiredAssistantDirs(root, true, SHIPPED);

      expect(await exists(path.join(dir, "SKILL.md"))).toBe(true);
      expect(notes).toEqual(["  would remove retired skill: .qfai/assistant/skill/qfai-atdd"]);
    });
  });

  it.each([
    [
      "a file the project edited",
      { "SKILL.md": "# edited\n", "references/notes.md": REFERENCE_TEXT },
    ],
    [
      "a file the project added",
      { "SKILL.md": SKILL_TEXT, "references/notes.md": REFERENCE_TEXT, "mine.md": "mine\n" },
    ],
    ["a file the project deleted", { "SKILL.md": SKILL_TEXT }],
  ])("is moved to skill.local with %s", async (_label, files) => {
    await inTempProject(async (root) => {
      const dir = await writeSkill(root, files);

      const notes = await keepRetiredAssistantDirs(root, false, SHIPPED);

      expect(await exists(dir)).toBe(false);
      const kept = path.join(root, ".qfai", "assistant", "skill.local", "qfai-atdd");
      expect(await readFile(path.join(kept, "SKILL.md"), "utf-8")).toBe(files["SKILL.md"]);
      expect(notes).toEqual([
        "  moved retired skill: .qfai/assistant/skill/qfai-atdd → .qfai/assistant/skill.local/qfai-atdd",
      ]);
    });
  });

  it("is moved when a link sits inside it", async () => {
    await inTempProject(async (root) => {
      const dir = await writeSkill(root, {
        "SKILL.md": SKILL_TEXT,
        "references/notes.md": REFERENCE_TEXT,
      });
      await writeFile(path.join(root, "outside.md"), "outside\n", "utf-8");
      await symlink(path.join(root, "outside.md"), path.join(dir, "link.md"), "file");

      await keepRetiredAssistantDirs(root, false, SHIPPED);

      expect(await exists(dir)).toBe(false);
      const kept = path.join(root, ".qfai", "assistant", "skill.local", "qfai-atdd");
      expect(await exists(path.join(kept, "SKILL.md"))).toBe(true);
      expect(await readFile(path.join(root, "outside.md"), "utf-8")).toBe("outside\n");
    });
  });
});

describe("the digests of the retired qfai-atdd skill", () => {
  it("name the nine shipped files, each by one or two SHA-256 digests", () => {
    const files = SHIPPED_RETIRED_SKILLS["qfai-atdd"];
    expect(files).toBeDefined();
    expect(Object.keys(files ?? {})).toHaveLength(9);
    for (const digests of Object.values(files ?? {})) {
      expect(digests.length).toBeGreaterThanOrEqual(1);
      for (const digest of digests) expect(digest).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
