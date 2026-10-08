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

const INDEX_HEADER =
  "# Contracts\n\n## Contract Index\n\n| ID | Title | File | Depends On | Reconciled With | Purpose |\n| --- | --- | --- | --- | --- | --- |\n";

function storyTreeConfig() {
  const config = structuredClone(defaultConfig);
  config.paths.specsDir = ".qfai/spec";
  config.paths.contractsDir = ".qfai/spec/03_contract";
  return config;
}

describe("story-tree contract index", () => {
  // QFAI:AC-0001-0052-01
  // QFAI:EX-0001-0006-03
  // QFAI:EX-0001-0006-04
  // QFAI:EX-0001-0052-01
  it("keys an unlisted declared contract by ID and an unlisted CLI file by path", async () => {
    const config = storyTreeConfig();
    const base = config.paths.contractsDir;
    await put(`${base}/contracts.md`, INDEX_HEADER);
    await put(`${base}/api/api-0001-orders.yaml`, "# QFAI-CONTRACT-ID: API-0001\nopenapi: 3.1.0\n");
    await put(`${base}/cli/new-command.md`, "# New command\n");
    const model = await readStoryTreeModel(root, config);
    const findings = await validateStoryTreeContractReferences(root, config, model);
    const unlisted = findings.filter((item) => item.code === "QFAI-CONTRACT-034");
    expect(unlisted).toHaveLength(2);
    expect(unlisted.map((item) => item.severity)).toEqual(["error", "error"]);
    expect(findings.some((item) => item.refs?.includes("API-0001"))).toBe(true);
    expect(
      findings.some((item) => item.refs?.some((ref) => ref.endsWith("cli/new-command.md"))),
    ).toBe(true);

    await put(
      `${base}/contracts.md`,
      `${INDEX_HEADER}| API-0001 | Orders | api/api-0001-orders.yaml | - | - | Orders |\n`,
    );
    const apiListed = await validateStoryTreeContractReferences(
      root,
      config,
      await readStoryTreeModel(root, config),
    );
    const stillUnlisted = apiListed.filter((item) => item.code === "QFAI-CONTRACT-034");
    expect(stillUnlisted).toHaveLength(1);
    expect(stillUnlisted[0]?.refs?.some((ref) => ref.endsWith("cli/new-command.md"))).toBe(true);

    await unlink(path.join(root, base, "cli/new-command.md"));
    await put(`${base}/cli/cli-0002-new-command.md`, "# CLI-0002: New command\n");
    await put(
      `${base}/contracts.md`,
      `${INDEX_HEADER}| API-0001 | Orders | api/api-0001-orders.yaml | - | - | Orders |\n| CLI-0002 | New command | .qfai/spec/03_contract/cli/cli-0002-new-command.md | - | - | Command |\n`,
    );
    const listed = await readStoryTreeModel(root, config);
    expect(await validateStoryTreeContractReferences(root, config, listed)).toEqual([]);
  });

  // QFAI:AC-0001-0052-06
  // QFAI:EX-0001-0052-10
  it("reports a file outside the contract kind directories once, as not a contract", async () => {
    const config = storyTreeConfig();
    const base = config.paths.contractsDir;
    await put(
      `${base}/contracts.md`,
      `${INDEX_HEADER}| UI-0001 | Tokens | design/ui-0001-tokens.md | - | - | Tokens |\n`,
    );
    await put(
      `${base}/design/ui-0001-tokens.md`,
      "# UI-0001: Tokens\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001-0001 | Tokens | EX-0001-0001-01 |\n",
    );
    const model = await readStoryTreeModel(root, config);
    const findings = await validateStoryTreeContractReferences(root, config, model);
    const outside = findings.filter((item) =>
      item.message.includes("which is not a contract kind"),
    );
    expect(outside).toHaveLength(1);
    expect(outside[0]?.code).toBe("QFAI-CONTRACT-034");
    expect(outside[0]?.message).toContain("is under design/");
    expect(outside[0]?.message).toContain("api/, db/, ui/, cli/");
    expect(model.contracts).toEqual([]);
    expect(model.rules).toEqual([]);
    expect(findings.filter((item) => item.code === "QFAI-CONTRACT-034")).toEqual(outside);
  });
});
