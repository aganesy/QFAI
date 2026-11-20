import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

/** Absolute paths whose read fails, with the error it fails with. */
const { failing } = vi.hoisted(() => ({ failing: new Map<string, Error>() }));

function refusal(code: string, target: string): Error {
  return Object.assign(new Error(`${code}: permission denied, open '${target}'`), {
    code,
    syscall: "open",
    path: target,
  });
}

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    readFile: (...args: Parameters<FsPromises["readFile"]>) => {
      const error = failing.get(String(args[0]));
      return error === undefined ? actual.readFile(...args) : Promise.reject(error);
    },
  };
});

const { createDoctorData } = await import("../../src/core/doctor.js");
const { getInitAssetsDir } = await import("../../src/shared/assets.js");
const { removeTempTree } = await import("../helpers/tempTree.js");

const roots: string[] = [];

afterEach(async () => {
  failing.clear();
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

function packagedText(name: string): Promise<string> {
  return readFile(path.join(getInitAssetsDir(), "root", ".github", "workflows", name), "utf-8");
}

async function project(installed: readonly string[]): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-cost-io-"));
  roots.push(root);
  await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/spec\n", "utf-8");
  await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
  for (const name of installed) {
    await writeFile(
      path.join(root, ".github", "workflows", name),
      await packagedText(name),
      "utf-8",
    );
  }
  return root;
}

function failRead(root: string, name: string, code: string): void {
  const file = path.join(root, ".github", "workflows", name);
  failing.set(file, refusal(code, file));
}

async function costCheck(root: string) {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.find((check) => check.id === "workflows.cost");
}

describe("qfai doctor names a shipped workflow it cannot read in the job count", () => {
  // QFAI:EX-0003-0011-45
  it("names an installed workflow that cannot be read, with its path and the cause, as not counted", async () => {
    // QFAI:AC-0003-0011-12
    const root = await project(["qfai-tests.yml", "qfai-validate.yml"]);
    failRead(root, "qfai-tests.yml", "EACCES");

    const check = await costCheck(root);

    expect(check?.severity).toBe("info");
    expect(check?.message).toContain("qfai-validate.yml starts 1 job");
    expect(check?.message).toContain(
      ".github/workflows/qfai-tests.yml could not be read (EACCES: permission denied",
    );
    expect(check?.message).toContain("so its jobs are not counted.");
    expect(check?.message).not.toContain("qfai-tests.yml starts");
    expect(check?.message).not.toContain("qfai-docs.yml");
    expect(check?.details).toMatchObject({
      unread: [
        {
          file: "qfai-tests.yml",
          path: ".github/workflows/qfai-tests.yml",
          cause: expect.stringContaining("EACCES: permission denied"),
        },
      ],
    });
  });

  // QFAI:EX-0003-0011-45
  it("reports the check when the only installed workflow cannot be read", async () => {
    // QFAI:AC-0003-0011-12
    const root = await project(["qfai-validate.yml"]);
    failRead(root, "qfai-validate.yml", "EIO");

    const check = await costCheck(root);

    expect(check?.severity).toBe("info");
    expect(check?.message).toContain(".github/workflows/qfai-validate.yml could not be read (EIO");
    expect(check?.details).toMatchObject({
      workflows: [],
      unread: [{ file: "qfai-validate.yml" }],
    });
  });
});
