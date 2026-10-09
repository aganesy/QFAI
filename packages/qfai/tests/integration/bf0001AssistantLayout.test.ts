import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAssistantTreeMigration } from "../../src/core/validators/assistantTreeMigration.js";

const SRC_ROOT = path.resolve(__dirname, "..", "..", "src");

// QFAI:EX-0001-0012-01
// QFAI:EX-0001-0012-02
it("accepts the four assistant layers and names an added catalog without parsing its files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-assistant-"));
  try {
    const assistant = path.join(root, ".qfai", "assistant");
    for (const layer of ["rule", "skill", "agent", "prompt", "skill.local"]) {
      await mkdir(path.join(assistant, layer), { recursive: true });
    }
    const valid = await validateAssistantTreeMigration(root, defaultConfig);
    expect(valid.some((finding) => finding.code === "QFAI-ASSISTANT-001")).toBe(false);

    const catalog = path.join(assistant, "catalog");
    await mkdir(catalog);
    await writeFile(path.join(catalog, "unreadable.md"), Buffer.from([0xff, 0xfe]));
    const invalid = await validateAssistantTreeMigration(root, defaultConfig);
    expect(invalid.filter((finding) => finding.code === "QFAI-ASSISTANT-001")).toEqual([
      expect.objectContaining({ file: ".qfai/assistant/catalog/" }),
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:AC-0001-0036-01
// QFAI:EX-0001-0036-01
it("keeps quoted assistant-tree path literals out of the source apart from the migration code", async () => {
  const files = (await readdir(SRC_ROOT, { recursive: true }))
    .map((entry) => entry.split(path.sep).join("/"))
    .filter((entry) => /\.[cm]?[jt]sx?$/.test(entry) && !entry.startsWith("migration/"));
  expect(files).toContain("core/paths/assistantPaths.ts");
  const retiredLayers = /"\.qfai\/assistant\/(constitution|manifest|catalog|process)/;
  const currentLayers = /"\.qfai\/assistant\/(rule|skill|agent|prompt)\//;
  const matches: string[] = [];
  for (const file of files) {
    const text = await readFile(path.join(SRC_ROOT, file), "utf8");
    if (retiredLayers.test(text) || currentLayers.test(text)) matches.push(file);
  }
  expect(matches).toEqual([]);
});
