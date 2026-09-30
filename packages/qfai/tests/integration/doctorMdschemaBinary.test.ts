import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { removeTempTree } from "../helpers/tempTree.js";

import type * as AssetsModule from "../../src/shared/assets.js";

/** The mock's switch; `vi.hoisted` because `vi.mock` runs above every import. */
const packagedAssets = vi.hoisted(() => ({ unresolvable: false }));

vi.mock("../../src/shared/assets.js", async (importOriginal) => {
  const actual = await importOriginal<typeof AssetsModule>();
  return {
    ...actual,
    getInitAssetsDir: (): string => {
      if (packagedAssets.unresolvable) {
        throw new Error("test fixture: the packaged init assets cannot be resolved");
      }
      return actual.getInitAssetsDir();
    },
  };
});

const roots: string[] = [];

afterEach(async () => {
  packagedAssets.unresolvable = false;
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mdschema-binary-"));
  roots.push(root);
  await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/spec\n", "utf-8");
  return root;
}

/** An mdschema installation in the project whose entry point is `source`. */
async function installMdschema(root: string, source: string): Promise<void> {
  const packageDir = path.join(root, "node_modules", "@jackchuka", "mdschema");
  await mkdir(path.join(packageDir, "bin"), { recursive: true });
  await writeFile(
    path.join(packageDir, "package.json"),
    JSON.stringify({ name: "@jackchuka/mdschema", bin: { mdschema: "bin/cli.js" } }),
    "utf-8",
  );
  await writeFile(path.join(packageDir, "bin", "cli.js"), source, "utf-8");
}

async function binaryCheck(
  root: string,
): Promise<{ severity: string; message: string; details?: Record<string, unknown> } | undefined> {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.find((check) => check.id === "workflows.mdschemaBinary");
}

describe("qfai doctor reports whether the mdschema binary runs", () => {
  it("is ok when the installed binary answers --help", async () => {
    // QFAI:AC-0003-0011-10
    // QFAI:EX-0003-0011-22
    const root = await project();
    const log = path.join(root, "arguments.txt");
    // A stand-in that records how it was started, so the case shows what doctor ran.
    await installMdschema(
      root,
      `require("node:fs").writeFileSync(${JSON.stringify(log)}, process.argv.slice(2).join(" "));\n`,
    );

    const check = await binaryCheck(root);

    expect(check?.severity).toBe("ok");
    expect(await readFile(log, "utf-8")).toBe("--help");
  });

  it("is an error naming the fix when the binary cannot run", async () => {
    // QFAI:AC-0003-0011-10
    // QFAI:EX-0003-0011-23
    const root = await project();
    await installMdschema(
      root,
      `console.error("mdschema binary not found at /nowhere");\nprocess.exit(1);\n`,
    );

    const check = await binaryCheck(root);

    expect(check?.severity).toBe("error");
    expect(check?.message).toContain("mdschema binary not found at /nowhere");
    expect(check?.message).toContain("optional dependenc");
    expect(check?.message).toContain("npm approve-scripts");
    expect(check?.message).toContain("onlyBuiltDependencies");
    expect(check?.details?.["reason"]).toBe("mdschema binary not found at /nowhere");
  });

  it("is an error rather than a crash when the packaged checker cannot be located", async () => {
    // QFAI:AC-0003-0011-10
    // QFAI:EX-0003-0011-23
    const root = await project();
    packagedAssets.unresolvable = true;

    const check = await binaryCheck(root);

    expect(check?.severity).toBe("error");
    expect(check?.message).toContain("the packaged init assets cannot be resolved");
  });

  it("is ok for the package's own installation in a plain project", async () => {
    // QFAI:AC-0003-0011-10
    // QFAI:EX-0003-0011-22
    const root = await project();

    expect((await binaryCheck(root))?.severity).toBe("ok");
  });
});
