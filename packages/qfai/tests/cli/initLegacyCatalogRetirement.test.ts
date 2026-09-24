import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { retireWithdrawnGovernedAssets } from "../../src/cli/commands/init.js";
import { hashAssistantAssetText } from "../../src/core/assistantAssetProvenance.js";

describe("withdrawn assistant assets", () => {
  it("keeps the four adopter-owned catalog inputs even when their old receipt matches", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-retire-catalog-"));
    const assistant = path.join(root, ".qfai", "assistant");
    const catalog = path.join(assistant, "catalog");
    const names = ["product.md", "manifest.md", "tech.md", "structure.md"];
    const previous: Record<string, string> = {};
    const recorded: Record<string, string> = {};
    const out = {
      removed: [] as string[],
      skipped: [] as string[],
      manualMergeNotes: [] as string[],
    };
    try {
      await mkdir(catalog, { recursive: true });
      for (const name of names) {
        const content = `# Project ${name}\n`;
        await writeFile(path.join(catalog, name), content, "utf-8");
        previous[`catalog/${name}`] = hashAssistantAssetText(content);
      }

      await retireWithdrawnGovernedAssets(
        assistant,
        {},
        previous,
        recorded,
        { force: true, dryRun: false },
        () => Promise.resolve(true),
        out,
      );

      expect(out.removed).toEqual([]);
      expect(out.skipped).toHaveLength(4);
      expect(recorded).toEqual(previous);
      for (const name of names) {
        expect(await readFile(path.join(catalog, name), "utf-8")).toBe(`# Project ${name}\n`);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
