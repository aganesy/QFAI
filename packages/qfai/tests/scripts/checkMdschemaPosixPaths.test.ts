/**
 * The document-schema lane and `qfai validate` read `paths.specsDir` and
 * `paths.contractsDir` to one directory under POSIX path rules.
 *
 * `node:path` is replaced by its POSIX half for this file, so both readers
 * treat a backslash the way a Linux or macOS runner does, whichever platform
 * runs the suite.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadConfig, resolvePath } from "../../src/core/config.js";
import { configuredPaths } from "../../assets/scripts/check-mdschema.mjs";

vi.mock("node:path", async () => {
  const actual = await vi.importActual<{ default: typeof path }>("node:path");
  return { ...actual.default.posix, default: actual.default.posix };
});

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function treeWith(specsDir: string, contractsDir: string): Promise<string> {
  const root = await mkdtemp(`${os.tmpdir()}/qfai-posix-paths-`);
  roots.push(root);
  await writeFile(
    `${root}/qfai.config.yaml`,
    `paths:\n  specsDir: ${specsDir}\n  contractsDir: ${contractsDir}\n`,
    "utf-8",
  );
  return root;
}

describe("the spec paths under POSIX path rules", () => {
  it("runs with the POSIX path module", () => {
    expect(path.sep).toBe("/");
  });

  // QFAI:EX-0001-0011-16
  it.each([
    ["forward slashes", ".qfai/specs", ".qfai/contracts"],
    ["a leading ./ and a trailing /", "./.qfai/specs", "./.qfai/contracts/"],
    ["backslashes", ".qfai\\specs", ".qfai\\contracts\\"],
    ["single quotes", "'.qfai\\specs'", "'.qfai\\contracts'"],
    ["escaped backslashes in double quotes", '".qfai\\\\specs"', '".qfai\\\\contracts"'],
  ])("resolve %s to one directory for the lane and qfai validate", async (_, specs, contracts) => {
    const root = await treeWith(specs, contracts);

    const { config } = await loadConfig(root);
    const lane: unknown = configuredPaths(root);

    expect(lane).toEqual({ specsDir: ".qfai/specs", contractsDir: ".qfai/contracts" });
    expect({
      specsDir: path.relative(root, resolvePath(root, config, "specsDir")),
      contractsDir: path.relative(root, resolvePath(root, config, "contractsDir")),
    }).toEqual(lane);
  });

  // QFAI:EX-0001-0011-16
  it("decodes a double-quoted escape for the lane as the YAML parser does", async () => {
    const root = await treeWith('"docs\\tree"', ".qfai/contracts");

    const { config } = await loadConfig(root);
    const lane = configuredPaths(root);

    expect(lane.specsDir).toBe("docs\tree");
    expect(path.relative(root, resolvePath(root, config, "specsDir"))).toBe(lane.specsDir);
  });
});
