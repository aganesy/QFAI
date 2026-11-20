import { spawnSync } from "node:child_process";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { legacyInitArguments } from "../helpers/legacyInitArguments.js";

// The child calls the promisified execFile the way graph preparation does and prints the
// outcome, so the preload's interception is observed exactly as an init child sees it.
const CHILD = `
import childProcess from "node:child_process";
import { promisify } from "node:util";
const [command, args] = JSON.parse(process.env.LEGACY_CALL);
try {
  await promisify(childProcess.execFile)(command, args, { cwd: process.cwd() });
  console.log("fixture");
} catch (error) {
  console.log(error instanceof Error ? error.message : String(error));
}
`;

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-legacy-preload-"));
  await writeFile(path.join(root, "child.mjs"), CHILD);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function npmInstall(packageSpec: string): string {
  const prefix = path.join(root, ".qfai", "tools", "codegraph");
  const args = [
    "install",
    "--prefix",
    prefix,
    "--no-audit",
    "--no-fund",
    "--save-exact",
    "--ignore-scripts",
    packageSpec,
  ];
  // A PATH holding no npm keeps a regressed guard from reaching the real registry.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  const child = spawnSync(
    process.execPath,
    legacyInitArguments(path.join(root, "child.mjs"), ["init"]),
    {
      cwd: root,
      encoding: "utf8",
      env: { ...env, PATH: root, LEGACY_CALL: JSON.stringify(["npm", args]) },
    },
  );
  expect(child.status, child.stderr).toBe(0);
  return child.stdout.trim();
}

describe("legacy init acquisition preload", () => {
  it("answers the pinned CodeGraph install with the fixture shim", async () => {
    expect(npmInstall("@colbymchenry/codegraph@1.6.2")).toBe("fixture");
    await expect(
      stat(
        path.join(
          root,
          ".qfai",
          "tools",
          "codegraph",
          "node_modules",
          "@colbymchenry",
          "codegraph",
          "npm-shim.js",
        ),
      ),
    ).resolves.toBeTruthy();
  });

  it("rejects a CodeGraph install at any other version", () => {
    expect(npmInstall("@colbymchenry/codegraph@9.9.9")).toMatch(
      /^Unexpected acquisition operation in legacy init preload: npm install .*@colbymchenry\/codegraph@9\.9\.9$/u,
    );
  });

  it("rejects an npm install of any other package", () => {
    expect(npmInstall("left-pad@1.3.0")).toMatch(
      /^Unexpected acquisition operation in legacy init preload: npm install .*left-pad@1\.3\.0$/u,
    );
  });
});
