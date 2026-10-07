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
 * is how a case chooses which binary the package "depends on". `found` replaces
 * what the stand-in finder returns, as a JavaScript expression.
 */
async function packagedChecker(source: string, found?: string): Promise<void> {
  const base = await tempDir();
  const binary = path.join(base, "fake-mdschema.cjs");
  await writeFile(binary, source, "utf-8");
  await mkdir(path.join(base, "assets", "init"), { recursive: true });
  await mkdir(path.join(base, "assets", "scripts"), { recursive: true });
  await writeFile(
    path.join(base, "assets", "scripts", "check-mdschema.mjs"),
    `export function findMdschemaCommand() {\n  return ${found ?? `{ command: process.execPath, args: [${JSON.stringify(binary)}] }`};\n}\n`,
    "utf-8",
  );
  packagedAssets.dir = path.join(base, "assets", "init");
}

/**
 * A stand-in `lib/platform.js` that resolves the binary the way the real one
 * does: to a platform package when that resolves, else to `bin/mdschema` under
 * the package itself.
 */
const PLATFORM_FILE = [
  '"use strict";',
  'const path = require("node:path");',
  "function getBinaryPath() {",
  "  try {",
  '    return require.resolve("fake-platform-package/bin/mdschema");',
  "  } catch {",
  '    return path.join(__dirname, "..", "bin", "mdschema");',
  "  }",
  "}",
  "module.exports = { getBinaryPath };",
  "",
].join("\n");

/**
 * A packaged-assets stand-in whose checker finds a stand-in @jackchuka/mdschema
 * package whose command file exits 0. With `platform` "installed" the
 * platform package resolves from it; with "absent" only the package's own
 * `bin/` copy is left. `platformFile` replaces the source of `lib/platform.js`.
 */
async function packagedMdschema(options: {
  platform: "installed" | "absent";
  platformFile?: string;
}): Promise<void> {
  const base = await tempDir();
  const packageDir = path.join(base, "node_modules", "@jackchuka", "mdschema");
  const command = path.join(packageDir, "bin", "cli.js");
  await mkdir(path.dirname(command), { recursive: true });
  await mkdir(path.join(packageDir, "lib"), { recursive: true });
  await writeFile(command, "", "utf-8");
  await writeFile(
    path.join(packageDir, "lib", "platform.js"),
    options.platformFile ?? PLATFORM_FILE,
    "utf-8",
  );
  if (options.platform === "installed") {
    const platformBin = path.join(packageDir, "node_modules", "fake-platform-package", "bin");
    await mkdir(platformBin, { recursive: true });
    await writeFile(path.join(platformBin, "mdschema"), "", "utf-8");
  }
  await packagedChecker("", `{ command: process.execPath, args: [${JSON.stringify(command)}] }`);
}

describe("qfai doctor reports whether the mdschema binary runs", () => {
  // QFAI:EX-0003-0011-22
  it("is ok when the binary answers --help, and starts it with that and nothing else", async () => {
    // QFAI:AC-0003-0011-10
    const log = path.join(await tempDir(), "arguments.txt");
    await packagedChecker(
      `require("node:fs").writeFileSync(${JSON.stringify(log)}, process.argv.slice(2).join(" "));\n`,
    );

    const check = await checkMdschemaBinary();

    expect(check.severity).toBe("ok");
    expect(await readFile(log, "utf-8")).toBe("--help");
  });

  // QFAI:EX-0003-0011-22
  it("is ok when the platform package supplies the binary", async () => {
    // QFAI:AC-0003-0011-10
    await packagedMdschema({ platform: "installed" });

    const check = await checkMdschemaBinary();

    expect(check.severity).toBe("ok");
  });

  // QFAI:EX-0003-0011-22
  it("is ok when the package's platform file does not name a binary", async () => {
    // QFAI:AC-0003-0011-10
    await packagedMdschema({ platform: "absent", platformFile: "module.exports = {};\n" });

    const check = await checkMdschemaBinary();

    expect(check.severity).toBe("ok");
  });

  // QFAI:EX-0003-0011-24
  it("is a warning when the binary is the copy the install script downloaded", async () => {
    // QFAI:AC-0003-0011-10
    await packagedMdschema({ platform: "absent" });

    const check = await checkMdschemaBinary();

    expect(check.severity).toBe("warning");
    expect(check.message).toContain("only from a copy");
    expect(check.message).toContain("optional dependenc");
    expect(check.details["reason"]).toBe(
      "the platform package is absent and the binary is the downloaded copy",
    );
  });

  // QFAI:EX-0003-0011-23
  it("is an error naming the reason and the fix when the binary cannot run", async () => {
    // QFAI:AC-0003-0011-10
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

  // QFAI:EX-0003-0011-23
  it.skipIf(process.platform === "win32")(
    "names the signal when the binary is killed and prints nothing",
    async () => {
      // QFAI:AC-0003-0011-10
      await packagedChecker(`process.kill(process.pid, "SIGKILL");\n`);

      const check = await checkMdschemaBinary();

      expect(check.severity).toBe("error");
      expect(check.details["reason"]).toBe("it was stopped by SIGKILL");
    },
  );

  // QFAI:EX-0003-0011-23
  it("stops a binary that ignores SIGTERM at the deadline and reports it", async () => {
    // QFAI:AC-0003-0011-10
    await packagedChecker(`process.on("SIGTERM", () => {});\nsetInterval(() => {}, 1000);\n`);

    const check = await checkMdschemaBinary(500);

    expect(check.severity).toBe("error");
    expect(check.details["reason"]).toMatch(/ETIMEDOUT/);
  });

  // QFAI:EX-0003-0011-23
  it("names the same fixes when no installation is found at all", async () => {
    // QFAI:AC-0003-0011-10
    await packagedChecker(``, "null");

    const check = await checkMdschemaBinary();

    expect(check.severity).toBe("error");
    expect(check.message).toContain("no @jackchuka/mdschema installation was found");
    expect(check.message).toContain("npm approve-scripts");
    expect(check.message).toContain("onlyBuiltDependencies");
  });

  // QFAI:EX-0003-0011-23
  it("is an error rather than a crash when the packaged checker cannot be located", async () => {
    // QFAI:AC-0003-0011-10
    packagedAssets.unresolvable = true;

    const check = await checkMdschemaBinary();

    expect(check.severity).toBe("error");
    expect(check.message).toContain("the packaged init assets cannot be resolved");
  });

  // QFAI:EX-0003-0011-22
  it("does not start a binary found from the inspected project's root", async () => {
    // QFAI:AC-0003-0011-10
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
