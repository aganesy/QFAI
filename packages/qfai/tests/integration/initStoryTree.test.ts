// QFAI:EX-0001-0038-01
// QFAI:EX-0001-0038-02
// QFAI:EX-0001-0038-03
// QFAI:EX-0001-0038-04
// QFAI:EX-0001-0038-05
// QFAI:EX-0001-0038-06
// QFAI:EX-0001-0038-07
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { validateProject } from "../../src/core/validate.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { captureStdout } from "../helpers/stdout.js";

const roots: string[] = [];
const execFileAsync = promisify(execFile);
const seedPaths = [
  "decisions.md",
  "open-questions.md",
  "01_policy/glossary.md",
  "01_policy/constraint.md",
  "02_business-flow/business-flows.md",
  "03_contract/contracts.md",
] as const;
const contractKinds = ["api", "db", "ui", "cli", "design"] as const;
const templateRoot = path.join(
  getInitAssetsDir(),
  ".qfai",
  "assistant",
  "skill",
  "qfai-sdd",
  "templates",
  "spec",
);

async function sandbox(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-story-tree-"));
  roots.push(root);
  return root;
}

async function isPresent(target: string): Promise<boolean> {
  return access(target).then(
    () => true,
    () => false,
  );
}

async function init(root: string, force = false): Promise<string> {
  return captureStdout(() => runInit({ dir: root, force, dryRun: false, yes: true }));
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("story-tree initialization", () => {
  it("seeds only the shared story documents and contract-kind directories", async () => {
    const root = await sandbox();
    await init(root);
    const specRoot = path.join(root, ".qfai", "spec");

    for (const relative of seedPaths) {
      expect(await readFile(path.join(specRoot, relative), "utf-8")).toBe(
        await readFile(path.join(templateRoot, relative), "utf-8"),
      );
    }
    for (const kind of contractKinds) {
      expect(await isPresent(path.join(specRoot, "03_contract", kind))).toBe(true);
    }
    expect(await isPresent(path.join(root, ".qfai", "specs"))).toBe(false);
    expect(await isPresent(path.join(root, ".qfai", "contracts"))).toBe(false);
    expect(await isPresent(path.join(specRoot, "02_business-flow", "business-flow-0001"))).toBe(
      false,
    );
  });

  it("validates the freshly initialized project without an error finding", async () => {
    const root = await sandbox();
    await init(root);

    const result = await validateProject(root);
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("routes every seeded Markdown file to a conforming mdschema", async () => {
    const root = await sandbox();
    await init(root);
    const checker = path.resolve(getInitAssetsDir(), "..", "scripts", "check-mdschema.mjs");
    const files = seedPaths.map((relative) => `.qfai/spec/${relative}`);

    const { stdout } = await execFileAsync(
      process.execPath,
      [checker, "--root", root, "--scope", "files", ...files],
      { cwd: root },
    );
    expect(stdout).toContain("6 file(s) conform");
  });

  it("preserves an edited seed under ordinary init and --force, and recreates a deleted seed", async () => {
    const root = await sandbox();
    await init(root);
    const specRoot = path.join(root, ".qfai", "spec");
    const glossary = path.join(specRoot, "01_policy", "glossary.md");
    const contracts = path.join(specRoot, "03_contract", "contracts.md");
    const authored = "# Project glossary\n\nOur terms belong to this project.\n";
    await writeFile(glossary, authored, "utf-8");

    for (const force of [false, true]) {
      await rm(contracts);
      await init(root, force);
      expect(await readFile(glossary, "utf-8")).toBe(authored);
      expect(await readFile(contracts, "utf-8")).toBe(
        await readFile(path.join(templateRoot, "03_contract", "contracts.md"), "utf-8"),
      );
    }
  });

  it("writes story-tree path defaults into the project config", async () => {
    const root = await sandbox();
    await init(root);
    const config = await readFile(path.join(root, "qfai.config.yaml"), "utf-8");
    expect(config).toContain("specsDir: .qfai/spec\n");
    expect(config).toContain("contractsDir: .qfai/spec/03_contract\n");
  });

  it.each(["spec-0001", "_policies"])(
    "skips the new seed when the configured specs directory has %s",
    async (legacyName) => {
      const root = await sandbox();
      await mkdir(path.join(root, ".qfai", "specs", legacyName), { recursive: true });
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "paths:\n  specsDir: .qfai/specs\n  contractsDir: .qfai/contracts\n",
        "utf-8",
      );
      const output = await init(root);

      expect(await isPresent(path.join(root, ".qfai", "spec"))).toBe(false);
      expect(await isPresent(path.join(root, ".qfai", "assistant", "skill"))).toBe(true);
      expect(output).toContain("/qfai-migration-v1-to-v2");
      expect(output).toContain(legacyName);
    },
  );

  it("treats a legacy contracts directory alone as an old-layout marker", async () => {
    const root = await sandbox();
    await mkdir(path.join(root, ".qfai", "contracts"), { recursive: true });
    const output = await init(root);

    expect(await isPresent(path.join(root, ".qfai", "spec"))).toBe(false);
    expect(output).toContain("/qfai-migration-v1-to-v2");
    expect(output).toContain(path.join(".qfai", "contracts"));
  });
});
