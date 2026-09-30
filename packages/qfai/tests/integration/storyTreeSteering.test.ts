import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { validateStorySteeringPlaceholders } from "../../src/core/validators/assistantAssets.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-steering-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function put(file: string, content: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

describe("story-tree steering placeholders", () => {
  it("reads Standard commands in the contract layer and ignores the old catalog copy", async () => {
    const contracts = path.join(root, ".qfai", "spec", "03_contract");
    await put(".qfai/spec/03_contract/tech.md", "# Tech\n## Standard commands\n- Build: TBD\n");
    await put(".qfai/assistant/catalog/tech.md", "# Old copy\n- Build: TBD\n");
    const { config } = await loadConfig(root);
    const findings = await validateStorySteeringPlaceholders(root, config);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.file).toBe(path.join(contracts, "tech.md"));
    expect(findings[0]?.message).toContain("Standard commands");

    await put(
      ".qfai/spec/03_contract/tech.md",
      "# Tech\n## Standard commands\n- Build: pnpm build\n",
    );
    expect(await validateStorySteeringPlaceholders(root, config)).toEqual([]);
  });
});
