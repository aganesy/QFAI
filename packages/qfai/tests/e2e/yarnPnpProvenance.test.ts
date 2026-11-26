import { mkdir, mkdtemp, readdir, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { assertBuiltCliFresh } from "../helpers/builtCli.js";
import { EXIT_ZERO, outputContext, spawnCaptured } from "../helpers/spawnCaptured.js";
import { removeTempTree } from "../helpers/tempTree.js";

const packageRoot = path.resolve(import.meta.dirname, "../..");
assertBuiltCliFresh(path.join(packageRoot, "dist/cli/index.mjs"));

it("accepts yarn exec qfai when PnP resolves the declared dependency into an external cache", async () => {
  const scratch = await realpath(await mkdtemp(path.join(os.tmpdir(), "qfai-yarn-pnp-")));
  const project = path.join(scratch, "project");
  const cache = path.join(scratch, "global");
  try {
    const packed = await spawnCaptured(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", scratch],
      { cwd: packageRoot },
    );
    expect(packed.outcome, outputContext(packed)).toBe(EXIT_ZERO);
    const archive = (await readdir(scratch)).find(
      (name) => name.startsWith("qfai-") && name.endsWith(".tgz"),
    );
    if (archive === undefined) throw new Error("npm pack did not produce a QFAI archive");
    const tarball = path.join(scratch, archive);
    await mkdir(project);
    await writeFile(
      path.join(project, "package.json"),
      JSON.stringify({
        name: "pnp-provenance-fixture",
        private: true,
        packageManager: "yarn@4.9.2",
        devDependencies: { qfai: `file:${tarball}` },
      }),
    );
    await writeFile(path.join(project, "qfai.config.yaml"), "{}\n");
    const options = {
      cwd: project,
      env: {
        ...process.env,
        YARN_NODE_LINKER: "pnp",
        YARN_PNP_ENABLE_ESM_LOADER: "true",
        YARN_ENABLE_GLOBAL_CACHE: "true",
        YARN_GLOBAL_FOLDER: cache,
        YARN_ENABLE_IMMUTABLE_INSTALLS: "false",
        YARN_ENABLE_SCRIPTS: "false",
      },
    };
    const yarn = async (args: string[]) =>
      await spawnCaptured("corepack", ["yarn@4.9.2", ...args], options);
    const installed = await yarn(["install"]);
    const installCodes = new Set(
      (installed.stdout + installed.stderr).match(
        /\b(?:YN\d{4}|ERR_[A-Z0-9_]+|E(?:AI_AGAIN|NOTFOUND|TIMEDOUT|CONNRESET|ACCES|NOENT))\b/g,
      ),
    );
    expect(
      installed.outcome,
      `Yarn could not install the PnP fixture (${[...installCodes].join(", ")})`,
    ).toBe(EXIT_ZERO);
    const resolved = await yarn([
      "node",
      "-p",
      "require('pnpapi').resolveToUnqualified('qfai', require('node:path').resolve('package.json'))",
    ]);
    expect(resolved.outcome, outputContext(resolved)).toBe(EXIT_ZERO);
    expect(resolved.stdout.trim()).toContain(cache);
    const result = await yarn([
      "exec",
      "qfai",
      "validate",
      "--profile",
      "discussion",
      "--format",
      "github",
      "--fail-on",
      "error",
    ]);
    expect(result.stdout, outputContext(result)).toContain(
      `(${resolved.stdout.trim().replace(/[/\\]$/, "")})`,
    );
    expect(result.stdout).not.toContain("QFAI-TOOL-002");
  } finally {
    await removeTempTree(scratch);
  }
}, 180_000);
