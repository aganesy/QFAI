import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { readStoryTreeModel } from "../../src/core/storyTree/tree.js";
import { validateStoryTreeContractReferences } from "../../src/core/validators/contractReferences.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-index-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function put(file: string, content: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

describe("story-tree contract index", () => {
  it("keys an unlisted declared contract by ID and an unlisted CLI file by path", async () => {
    const config = structuredClone(defaultConfig);
    config.paths.specsDir = ".qfai/spec";
    config.paths.contractsDir = ".qfai/spec/03_contract";
    const base = config.paths.contractsDir;
    await put(
      `${base}/contracts.md`,
      "| Short ID | Entity | Declared ID | File | Depends On | Reconciled With | Purpose |\n| --- | --- | --- | --- | --- | --- | --- |\n",
    );
    await put(`${base}/api/orders.yaml`, "# QFAI-CONTRACT-ID: CON-API-0001\nopenapi: 3.1.0\n");
    await put(`${base}/cli/new-command.md`, "# New command\n");
    const model = await readStoryTreeModel(root, config);
    const findings = await validateStoryTreeContractReferences(root, config, model);
    expect(findings.filter((item) => item.code === "QFAI-CONTRACT-034")).toHaveLength(2);
    expect(findings.some((item) => item.refs?.includes("CON-API-0001"))).toBe(true);
    expect(
      findings.some((item) => item.refs?.some((ref) => ref.endsWith("cli/new-command.md"))),
    ).toBe(true);

    await put(
      `${base}/contracts.md`,
      "| Short ID | Entity | Declared ID | File | Depends On | Reconciled With | Purpose |\n| --- | --- | --- | --- | --- | --- | --- |\n| API-001 | Orders | CON-API-0001 | api/orders.yaml | - | - | Orders |\n| CLI | Command | - | .qfai/spec/03_contract/cli/new-command.md | - | - | Command |\n",
    );
    expect(await validateStoryTreeContractReferences(root, config, model)).toEqual([]);
  });
});
