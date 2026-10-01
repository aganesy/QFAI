import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { checkMdschemaBinary } from "../../src/core/doctor/mdschemaBinary.js";
import { removeTempTree } from "../helpers/tempTree.js";

import type * as AssetsModule from "../../src/shared/assets.js";

/**
 * The mock's switches; `vi.hoisted` because `vi.mock` runs above every import.
 * `dir` stands in for the packaged init assets, and `unresolvable` makes the
 * resolver throw as a broken install does.
 */
const packagedAssets = vi.hoisted((): { dir: string | undefined; unresolvable: boolean } => ({
  dir: undefined,
  unresolvable: false,
}));

vi.mock("../../src/shared/assets.js", async (importOriginal) => {
  const actual = await importOriginal<typeof AssetsModule>();
  return {
    ...actual,
    getInitAssetsDir: (): string => {
      if (packagedAssets.unresolvable) {
        throw new Error("test fixture: the packaged init assets cannot be resolved");
      }
      return packagedAssets.dir ?? actual.getInitAssetsDir();
    },
  };
});

const roots: string[] = [];

afterEach(async () => {
  packagedAssets.dir = undefined;
  packagedAssets.unresolvable = false;
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-mdschema-binary-"));
  roots.push(dir);
  return dir;
}

/**
 * A packaged-assets stand-in whose checker resolves to a binary running `source`.
 * The checker is the one file the probe loads from the package, so replacing it
 * is how a case chooses which binary the package "depends on".
 */
async function packagedChecker(source: string): Promise<void> {
  const base = await tempDir();
  const binary = path.join(base, "fake-mdschema.cjs");
  await writeFile(binary, source, "utf-8");
  await mkdir(path.join(base, "assets", "init"), { recursive: true });
  await mkdir(path.join(base, "assets", "scripts"), { recursive: true });
  await writeFile(
    path.join(base, "assets", "scripts", "check-mdschema.mjs"),
    `export function findMdschemaCommand() {\n  return { command: process.execPath, args: [${JSON.stringify(binary)}] };\n}\n`,
    "utf-8",
  );
  packagedAssets.dir = path.join(base, "assets", "init");
}

describe("qfai doctor reports whether the mdschema binary runs", () => {
  it("is ok when the binary answers --help, and starts it with that and nothing else", async () => {
    // QFAI:AC-0003-0011-10
    // QFAI:EX-0003-0011-22
    const log = path.join(await tempDir(), "arguments.txt");
    await packagedChecker(
      `require("node:fs").writeFileSync(${JSON.stringify(log)}, process.argv.slice(2).join(" "));\n`,
    );

    const check = await checkMdschemaBinary();

    expect(check.severity).toBe("ok");
    expect(await readFile(log, "utf-8")).toBe("--help");
  });

  it("is an error naming the reason and the fix when the binary cannot run", async () => {
    // QFAI:AC-0003-0011-10
    // QFAI:EX-0003-0011-23
    await packagedChecker(
      `console.error("mdschema binary not found at /nowhere");\nprocess.exit(1);\n`,
    );

    const check = await checkMdschemaBinary();

    expect(check.severity).toBe("error");
    expect(check.message).toContain("mdschema binary not found at /nowhere");
    expect(check.message).toContain("optional dependenc");
    expect(check.message).toContain("npm approve-scripts");
    expect(check.message).toContain("onlyBuiltDependencies");
    expect(check.details["reason"]).toBe("mdschema binary not found at /nowhere");
  });

  it.skipIf(process.platform === "win32")(
    "names the signal when the binary is killed and prints nothing",
    async () => {
      // QFAI:AC-0003-0011-10
      // QFAI:EX-0003-0011-23
      await packagedChecker(`process.kill(process.pid, "SIGKILL");\n`);

      const check = await checkMdschemaBinary();

      expect(check.severity).toBe("error");
      expect(check.details["reason"]).toBe("it was stopped by SIGKILL");
    },
  );

  it("stops a binary that ignores SIGTERM at the deadline and reports it", async () => {
    // QFAI:AC-0003-0011-10
    // QFAI:EX-0003-0011-23
    await packagedChecker(`process.on("SIGTERM", () => {});\nsetInterval(() => {}, 1000);\n`);

    const check = await checkMdschemaBinary(500);

    expect(check.severity).toBe("error");
    expect(check.details["reason"]).toMatch(/ETIMEDOUT/);
  });

  it("is an error rather than a crash when the packaged checker cannot be located", async () => {
    // QFAI:AC-0003-0011-10
    // QFAI:EX-0003-0011-23
    packagedAssets.unresolvable = true;

    const check = await checkMdschemaBinary();

    expect(check.severity).toBe("error");
    expect(check.message).toContain("the packaged init assets cannot be resolved");
  });

  it("does not start a binary found from the inspected project's root", async () => {
    // QFAI:AC-0003-0011-10
    // QFAI:EX-0003-0011-22
    const root = await tempDir();
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/spec\n",
      "utf-8",
    );
    const marker = path.join(root, "started.txt");
    const packageDir = path.join(root, "node_modules", "@jackchuka", "mdschema");
    await mkdir(path.join(packageDir, "bin"), { recursive: true });
    await writeFile(
      path.join(packageDir, "package.json"),
      JSON.stringify({ name: "@jackchuka/mdschema", bin: { mdschema: "bin/cli.js" } }),
      "utf-8",
    );
    await writeFile(
      path.join(packageDir, "bin", "cli.js"),
      `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "started");\n`,
      "utf-8",
    );

    const data = await createDoctorData({ startDir: root, rootExplicit: true });

    const check = data.checks.find((candidate) => candidate.id === "workflows.mdschemaBinary");
    expect(check?.severity).toBe("ok");
    expect(existsSync(marker)).toBe(false);
  });
});
