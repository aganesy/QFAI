import { mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
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
  // QFAI:EX-0001-0006-03
  // QFAI:EX-0001-0006-04
  it("keys an unlisted declared contract by ID and an unlisted CLI file by path", async () => {
    const config = structuredClone(defaultConfig);
    config.paths.specsDir = ".qfai/spec";
    config.paths.contractsDir = ".qfai/spec/03_contract";
    const base = config.paths.contractsDir;
    const header =
      "# Contracts\n\n## Contract Index\n\n| ID | Title | File | Depends On | Reconciled With | Purpose |\n| --- | --- | --- | --- | --- | --- |\n";
    await put(`${base}/contracts.md`, header);
    await put(`${base}/api/api-0001-orders.yaml`, "# QFAI-CONTRACT-ID: API-0001\nopenapi: 3.1.0\n");
    await put(`${base}/cli/new-command.md`, "# New command\n");
    await put(`${base}/design/screen.md`, "# Design contract\n");
    const model = await readStoryTreeModel(root, config);
    const findings = await validateStoryTreeContractReferences(root, config, model);
    expect(findings.filter((item) => item.code === "QFAI-CONTRACT-034")).toHaveLength(3);
    expect(findings.some((item) => item.refs?.includes("API-0001"))).toBe(true);
    expect(
      findings.some((item) => item.refs?.some((ref) => ref.endsWith("cli/new-command.md"))),
    ).toBe(true);
    expect(
      findings.some((item) => item.refs?.some((ref) => ref.endsWith("design/screen.md"))),
    ).toBe(true);

    await unlink(path.join(root, base, "cli/new-command.md"));
    await unlink(path.join(root, base, "design/screen.md"));
    await put(`${base}/cli/cli-0002-new-command.md`, "# CLI-0002: New command\n");
    await put(`${base}/design/design-0003-screen.md`, "# DESIGN-0003: Screen\n");
    await put(
      `${base}/contracts.md`,
      `${header}| API-0001 | Orders | api/api-0001-orders.yaml | - | - | Orders |\n| CLI-0002 | New command | .qfai/spec/03_contract/cli/cli-0002-new-command.md | - | - | Command |\n| DESIGN-0003 | Screen | design/design-0003-screen.md | - | - | Screen |\n`,
    );
    const listed = await readStoryTreeModel(root, config);
    expect(await validateStoryTreeContractReferences(root, config, listed)).toEqual([]);
  });
});
