import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { collectFiles } from "../../src/core/fs.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

const PROMPT_REF_PATTERN = /\/qfai-[a-z0-9-]+/g;

function toRel(base: string, abs: string): string {
  const rel = path.relative(base, abs);
  return rel.replace(/[\\/]+/g, "/");
}

describe("skill references", () => {
  it("fails when skill workflows reference missing /qfai-* commands", async () => {
    const skillsDir = path.join(
      getInitAssetsDir(),
      ".qfai",
      "assistant",
      "skills",
    );
    const skillDirs = (await readdir(skillsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const workflowFiles = (
      await collectFiles(skillsDir, { extensions: [".md"] })
    ).sort((a, b) => a.localeCompare(b));
    const commandNames = new Set(skillDirs);
    const missingRefs = new Set<string>();

    for (const file of workflowFiles) {
      if (!file.endsWith(`${path.sep}SKILL.md`)) {
        continue;
      }
      const content = await readFile(file, "utf-8");
      const matches = content.match(PROMPT_REF_PATTERN);
      if (!matches) {
        continue;
      }
      for (const ref of matches) {
        const expected = ref.slice(1);
        if (!commandNames.has(expected)) {
          missingRefs.add(`${toRel(skillsDir, file)} -> ${ref}`);
        }
      }
    }

    expect(Array.from(missingRefs)).toEqual([]);
  });
});
