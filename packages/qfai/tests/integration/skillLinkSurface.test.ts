import { lstat, readFile, readdir, readlink, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");

// Every assistant surface links the same skill set out of a master directory
// (`.agents/skills/` for the repo-local ones, `.qfai/assistant/skills/` for the
// installed ones). The links are committed as git symlinks.
const SURFACES = [".claude/skills", ".codex/skills", ".github/skills"] as const;

/**
 * The relative target a skill link points at, however the checkout
 * materialised it.
 *
 * On a checkout with `core.symlinks=true` that is the symlink target. On
 * Windows without it, git writes a regular file whose content is the same
 * relative path string — the documented platform fallback the rules surface
 * test (agentsRulesSurface.test.ts) also accommodates.
 */
async function readLinkTarget(linkPath: string): Promise<string> {
  const info = await lstat(linkPath);
  if (info.isSymbolicLink()) return readlink(linkPath);
  if (info.isDirectory()) return "";
  return readFile(linkPath, "utf-8");
}

async function listLinks(surface: string): Promise<string[]> {
  return (await readdir(path.join(ROOT, surface))).sort();
}

describe("skill link surface", () => {
  it("every surface links the same skill set", async () => {
    const [first, ...rest] = await Promise.all(SURFACES.map(listLinks));
    expect(first.length).toBeGreaterThan(0);
    for (const other of rest) expect(other).toEqual(first);
  });

  describe.each(SURFACES)("%s", (surface) => {
    it("every link resolves to a directory holding SKILL.md", async () => {
      const names = await listLinks(surface);
      const broken: string[] = [];
      for (const name of names) {
        const link = path.join(ROOT, surface, name);
        const target = await readLinkTarget(link);
        // A dangling symlink is invisible to `readdir` and to any test that
        // only inspects the link itself — the skill silently stops loading.
        // Resolve the target by hand so the fallback checkout is checked by
        // the same rule as the symlink one.
        const resolved = target ? path.resolve(path.dirname(link), target) : link;
        const skill = path.join(resolved, "SKILL.md");
        const found = await stat(skill).then(
          (s) => s.isFile(),
          () => false,
        );
        if (!found) broken.push(`${name} -> ${target || "(directory)"}`);
      }
      expect(broken).toEqual([]);
    });

    it("no link target carries stray whitespace", async () => {
      // A target committed as `../../.agents/skills/conflict-resolve\r\n`
      // resolves to nothing on every platform, but reads correctly in every
      // diff and in every test that trims before comparing. Assert the raw
      // bytes so the newline cannot come back.
      const names = await listLinks(surface);
      const dirty: string[] = [];
      for (const name of names) {
        const target = await readLinkTarget(link(surface, name));
        if (target !== target.trim()) dirty.push(`${name} -> ${JSON.stringify(target)}`);
      }
      expect(dirty).toEqual([]);
    });
  });
});

function link(surface: string, name: string): string {
  return path.join(ROOT, surface, name);
}
