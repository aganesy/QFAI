/**
 * Integration: `qfai init` writes no `agents/openai.yaml` for any skill, plain or under `--force`.
 */
// QFAI:SPEC-0003:TC-0003-0065
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { initQuietly, withEmptyRepo } from "./upgradeStates.js";

const HOST_SKILL_DIRS = [".agents/skills", ".claude/skills", ".codex/skills", ".github/skills"];

/** Every `agents/openai.yaml` reachable through a host skill directory. */
async function openaiYamls(root: string): Promise<string[]> {
  const found: string[] = [];
  for (const host of HOST_SKILL_DIRS) {
    const dir = path.join(root, host);
    if (!existsSync(dir)) continue;
    for (const skill of await readdir(dir)) {
      const candidate = path.join(host, skill, "agents", "openai.yaml");
      if (existsSync(path.join(root, candidate))) found.push(candidate);
    }
  }
  return found;
}

describe("no agents/openai.yaml", () => {
  it("TC-0003-0065: No agents/openai.yaml after init and after --force", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      expect(await openaiYamls(root), "after init").toEqual([]);
      await initQuietly(root, true);
      expect(await openaiYamls(root), "after --force").toEqual([]);
    });
  });
});
