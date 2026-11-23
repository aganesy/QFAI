/**
 * The document-schema lane reads `qfai.config.yaml` the way `qfai validate`
 * does: with the same YAML parser and the same rules for `paths.specsDir` and
 * `paths.contractsDir`, so any YAML spelling the loader accepts names the same
 * two directories for both, and a configuration the loader reports stops the
 * lane instead of sending it to the default tree.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig, resolvePath } from "../../src/core/config.js";
import { checkDocuments, configuredPaths } from "../../assets/scripts/check-mdschema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts -> tests -> packages/qfai -> packages -> repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "check-mdschema.mjs");

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function treeWithConfig(config: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mdschema-config-"));
  roots.push(root);
  await writeFile(path.join(root, "qfai.config.yaml"), config, "utf-8");
  return root;
}

function treeRelative(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join("/");
}

async function writeFlowDocument(root: string): Promise<void> {
  const flow = path.join(root, ".qfai", "spec", "02_business-flow", "business-flow-0001");
  await mkdir(flow, { recursive: true });
  await writeFile(path.join(flow, "business-flow.md"), "# not a flow\n", "utf-8");
}

// `--summary` makes the lane print this table, and the verdict closes every
// `--scope all` run, once it has gone on to check the documents.
const CHECKED_TABLE = "Per-document-type result:";
const CHECKED_VERDICT = "(every matching document)";

function runLane(root: string): { status: number | null; stdout: string; stderr: string } {
  const child = spawnSync("node", [SCRIPT, "--root", root, "--scope", "all", "--summary"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    timeout: 120_000,
  });
  return { status: child.status, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
}

describe("the lane reads qfai.config.yaml as qfai validate does", () => {
  // QFAI:EX-0001-0011-27
  it.each([
    [
      "trailing comments",
      "paths:\n  specsDir: .qfai/specs # the relocated tree\n  contractsDir: '.qfai/contracts' # beside it\n",
    ],
    [
      "a double-quoted value with a trailing comment",
      'paths:\n  specsDir: ".qfai/specs" # moved\n  contractsDir: .qfai/contracts\n',
    ],
    [
      "a comment line and a blank line inside the mapping",
      "paths:\n  # where the story tree lives\n  specsDir: .qfai/specs\n\n  contractsDir: .qfai/contracts\n",
    ],
    ["a flow mapping", "paths: { specsDir: .qfai/specs, contractsDir: .qfai/contracts }\n"],
    [
      "a comment after the mapping key",
      "paths: # story tree\n  specsDir: .qfai/specs\n  contractsDir: .qfai/contracts\n",
    ],
  ])("resolves %s to the directories the loader resolves", async (_, config) => {
    const root = await treeWithConfig(config);

    const { config: loaded, issues } = await loadConfig(root);
    const lane: unknown = configuredPaths(root);

    expect(issues).toEqual([]);
    expect(lane).toEqual({ specsDir: ".qfai/specs", contractsDir: ".qfai/contracts" });
    expect({
      specsDir: treeRelative(root, resolvePath(root, loaded, "specsDir")),
      contractsDir: treeRelative(root, resolvePath(root, loaded, "contractsDir")),
    }).toEqual(lane);
  });

  // QFAI:EX-0001-0011-27
  it.each([
    [
      "a configuration that does not parse",
      "paths:\n  specsDir: [.qfai/specs\n",
      "the configuration file could not be read or parsed",
    ],
    ["an empty file", "", "the configuration file format is invalid"],
    [
      "a file that holds only a comment",
      "# nothing configured yet\n",
      "the configuration file format is invalid",
    ],
    ["a paths value that is not a mapping", "paths: .qfai/specs\n", "paths must be an object"],
    [
      "a specsDir that is not a string",
      "paths:\n  specsDir: 42\n",
      "paths.specsDir must be a string",
    ],
    [
      "an empty contractsDir",
      "paths:\n  contractsDir: ''\n",
      "paths.contractsDir must be a string",
    ],
  ])("stops with exit 2 on %s, which the loader reports", async (_, config, named) => {
    const root = await treeWithConfig(config);
    await writeFlowDocument(root);

    const { issues } = await loadConfig(root);
    const result = runLane(root);
    const checked: unknown = await checkDocuments(root);

    expect(issues.map((issue) => issue.code)).toContain("QFAI-CFG-002");
    expect(result.status).toBe(2);
    expect(result.stderr).toContain(`check-mdschema: qfai.config.yaml: ${named}`);
    expect(result.stderr).not.toContain(root);
    // Lines the lane prints on every run that reaches the documents.
    expect(result.stdout).not.toContain(CHECKED_TABLE);
    expect(result.stdout + result.stderr).not.toContain(CHECKED_VERDICT);
    expect(checked).toEqual({ ok: false, reason: `qfai.config.yaml: ${named}.` });
  });

  // QFAI:EX-0001-0011-27
  it("prints the per-type table and the verdict once it checks the same tree", async () => {
    const root = await treeWithConfig("paths:\n  specsDir: .qfai/spec\n");
    await writeFlowDocument(root);

    const result = runLane(root);

    expect(result.stdout).toContain(CHECKED_TABLE);
    expect(result.stdout + result.stderr).toContain(CHECKED_VERDICT);
  });
});
