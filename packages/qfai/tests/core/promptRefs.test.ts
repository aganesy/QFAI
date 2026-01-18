import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { collectFiles } from "../../src/core/fs.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

const PROMPT_REF_PATTERN = /\/qfai-[a-z0-9-]+/g;

function toRel(base: string, abs: string): string {
  const rel = path.relative(base, abs);
  return rel.replace(/[\\/]+/g, "/");
}

describe("prompt references", () => {
  it("fails when prompt bodies reference missing commands", async () => {
    const promptsDir = path.join(
      getInitAssetsDir(),
      ".qfai",
      "assistant",
      "prompts",
    );
    const promptFiles = (await collectFiles(promptsDir, { extensions: [".md"] }))
      .sort((a, b) => a.localeCompare(b));
    const promptNames = new Set(promptFiles.map((file) => path.basename(file)));
    const missingRefs = new Set<string>();

    for (const file of promptFiles) {
      const content = await readFile(file, "utf-8");
      const matches = content.match(PROMPT_REF_PATTERN);
      if (!matches) {
        continue;
      }
      for (const ref of matches) {
        const expected = `${ref.slice(1)}.md`;
        if (!promptNames.has(expected)) {
          missingRefs.add(`${toRel(promptsDir, file)} -> ${ref}`);
        }
      }
    }

    expect(Array.from(missingRefs)).toEqual([]);
  });
});
