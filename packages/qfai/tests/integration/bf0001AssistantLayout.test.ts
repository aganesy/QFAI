import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAssistantTreeMigration } from "../../src/core/validators/assistantTreeMigration.js";

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
    expect(valid.some((finding) => finding.code === "W-ASSISTANT-LAYOUT")).toBe(false);

    const catalog = path.join(assistant, "catalog");
    await mkdir(catalog);
    await writeFile(path.join(catalog, "unreadable.md"), Buffer.from([0xff, 0xfe]));
    const invalid = await validateAssistantTreeMigration(root, defaultConfig);
    expect(invalid.filter((finding) => finding.code === "W-ASSISTANT-LAYOUT")).toEqual([
      expect.objectContaining({ file: ".qfai/assistant/catalog/" }),
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
