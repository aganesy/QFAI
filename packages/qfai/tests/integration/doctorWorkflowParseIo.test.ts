import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

/** Absolute paths whose read or listing fails, with the error it fails with. */
const { failing } = vi.hoisted(() => ({ failing: new Map<string, Error>() }));

function refusal(code: string, syscall: string, target: string): Error {
  return Object.assign(new Error(`${code}: permission denied, ${syscall} '${target}'`), {
    code,
    syscall,
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
    readdir: (...args: Parameters<FsPromises["readdir"]>) => {
      const error = failing.get(String(args[0]));
      return error === undefined ? actual.readdir(...args) : Promise.reject(error);
    },
  };
});

const { createDoctorData } = await import("../../src/core/doctor.js");
const { removeTempTree } = await import("../helpers/tempTree.js");

const roots: string[] = [];

afterEach(async () => {
  failing.clear();
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const VALID =
  "name: ok\non: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n";

async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-parse-io-"));
  roots.push(root);
  await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/spec\n", "utf-8");
  for (const [relative, text] of Object.entries(files)) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, text, "utf-8");
  }
  return root;
}

async function parseFindings(root: string) {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.filter((check) => check.id.startsWith("workflows.parse"));
}

describe("qfai doctor names a workflow file or directory it cannot read", () => {
  // QFAI:EX-0003-0011-38
  it("warns for a file that cannot be read and a directory that cannot be listed, with the path and the cause", async () => {
    // QFAI:AC-0003-0011-13
    const root = await project({
      ".github/workflows/ci.yml": VALID,
      ".github/workflows/ok.yml": VALID,
      ".github/actions/setup/action.yml": VALID,
    });
    const file = path.join(root, ".github", "workflows", "ci.yml");
    const dir = path.join(root, ".github", "actions");
    failing.set(file, refusal("EACCES", "open", file));
    failing.set(dir, refusal("EACCES", "scandir", dir));

    const found = await parseFindings(root);

    expect(found.map((check) => check.id)).toEqual([
      "workflows.parse.actions",
      "workflows.parse.workflows/ci.yml",
    ]);
    const [listing, reading] = found;
    expect(listing?.severity).toBe("warning");
    expect(listing?.message).toContain(".github/actions cannot be listed: EACCES");
    expect(listing?.details).toMatchObject({
      path: ".github/actions",
      issues: [{ code: "EACCES" }],
    });
    expect(reading?.severity).toBe("warning");
    expect(reading?.message).toContain(".github/workflows/ci.yml cannot be read: EACCES");
    expect(reading?.details).toMatchObject({
      path: ".github/workflows/ci.yml",
      issues: [{ line: null, code: "EACCES" }],
    });
  });

  // QFAI:EX-0003-0011-38
  it("raises nothing for a workflow directory that does not exist", async () => {
    // QFAI:AC-0003-0011-13
    const root = await project({ ".github/workflows/ok.yml": VALID });

    expect(await parseFindings(root)).toEqual([]);
  });
});
