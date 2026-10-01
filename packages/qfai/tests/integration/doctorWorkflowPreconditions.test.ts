import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

type Fixture = {
  packageJson?: Record<string, unknown>;
  files?: Record<string, string>;
};

async function project(fixture: Fixture): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-preconditions-"));
  roots.push(root);
  await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/spec\n", "utf-8");
  if (fixture.packageJson !== undefined) {
    await writeFile(path.join(root, "package.json"), JSON.stringify(fixture.packageJson), "utf-8");
  }
  for (const [relative, content] of Object.entries(fixture.files ?? {})) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf-8");
  }
  return root;
}

type Finding = { id: string; severity: string; message: string };

async function preconditions(root: string): Promise<Finding[]> {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.filter(
    (check) =>
      check.id.startsWith("workflows.") &&
      check.id !== "workflows.docsLane" &&
      check.severity !== "ok",
  );
}

async function finding(root: string, id: string): Promise<Finding | undefined> {
  return (await preconditions(root)).find((check) => check.id === id);
}

describe("qfai doctor reports the repository facts the shipped workflows need", () => {
  it("warns when pnpm-lock.yaml has no packageManager and says what to set", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-16
    const root = await project({
      packageJson: { name: "demo" },
      files: { "pnpm-lock.yaml": "lockfileVersion: 9\n" },
    });

    const check = await finding(root, "workflows.packageManager");

    expect(check?.severity).toBe("warning");
    expect(check?.message).toContain("pnpm-lock.yaml");
    expect(check?.message).toContain('"packageManager"');
    expect(check?.message).toContain("pnpm@");
  });

  it("warns on a packageManager value that does not name a pnpm version", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-16
    for (const value of ["yarn@4.9.2", "pnpm", "pnpm@9", "pnpm@9.12.03", "pnpm@9.12.3+nope.beef"]) {
      const root = await project({
        packageJson: { packageManager: value },
        files: { "pnpm-lock.yaml": "" },
      });

      const check = await finding(root, "workflows.packageManager");

      expect(check?.severity, value).toBe("warning");
      expect(check?.message, value).toContain(value);
    }
  });

  it("stays silent when packageManager names a pnpm version, or there is no pnpm lockfile", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-17
    for (const value of ["pnpm@9.15.9", "pnpm@10.0.0-rc.1", "pnpm@9.15.9+sha512.abcdef"]) {
      const root = await project({
        packageJson: { packageManager: value },
        files: { "pnpm-lock.yaml": "" },
      });

      expect(await finding(root, "workflows.packageManager"), value).toBeUndefined();
    }
    const npmOnly = await project({
      packageJson: { name: "demo" },
      files: { "package-lock.json": "{}" },
    });
    expect(await finding(npmOnly, "workflows.packageManager")).toBeUndefined();
  });

  it("warns when two lockfiles are present and names the one the workflows use", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-18
    const root = await project({
      packageJson: { packageManager: "pnpm@9.15.9" },
      files: { "pnpm-lock.yaml": "", "package-lock.json": "{}" },
    });

    const check = await finding(root, "workflows.lockfiles");

    expect(check?.severity).toBe("warning");
    expect(check?.message).toContain("pnpm-lock.yaml");
    expect(check?.message).toContain("package-lock.json");
    expect(check?.message).toMatch(/install with pnpm/u);
    expect(check?.message).toMatch(/ignore package-lock\.json/u);
  });

  it("stays silent with a single lockfile", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-18
    const root = await project({
      packageJson: { packageManager: "pnpm@9.15.9" },
      files: { "pnpm-lock.yaml": "" },
    });

    expect(await finding(root, "workflows.lockfiles")).toBeUndefined();
  });

  it("warns when engines.node is declared and no Node version file exists", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-19
    const root = await project({ packageJson: { engines: { node: ">=22.0.0" } } });

    const check = await finding(root, "workflows.nodeVersionFile");

    expect(check?.severity).toBe("warning");
    expect(check?.message).toContain(">=22.0.0");
    expect(check?.message).toContain(".nvmrc");
    expect(check?.message).toContain("Node 20");
  });

  it("treats an empty version file as absent and a filled one as present", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-19
    const empty = await project({
      packageJson: { engines: { node: ">=20" } },
      files: { ".nvmrc": "\n" },
    });
    expect((await finding(empty, "workflows.nodeVersionFile"))?.severity).toBe("warning");

    for (const name of [".nvmrc", ".node-version"]) {
      const root = await project({
        packageJson: { engines: { node: ">=20" } },
        files: { [name]: "22\n" },
      });
      expect(await finding(root, "workflows.nodeVersionFile"), name).toBeUndefined();
    }
  });

  it("does not ask for a Node version file where engines.node is not declared", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-19
    const root = await project({ packageJson: { name: "demo" } });

    expect(await finding(root, "workflows.nodeVersionFile")).toBeUndefined();
  });

  it("warns on a Node pinned below engines.node in another workflow", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-20
    const root = await project({
      packageJson: { engines: { node: ">=20.19.0" } },
      files: {
        ".nvmrc": "22\n",
        ".github/workflows/ci.yml": [
          "jobs:",
          "  build:",
          "    steps:",
          "      - name: Set up Node",
          "        with:",
          "          node-version: 18",
          "",
        ].join("\n"),
        ".github/workflows/release.yaml": [
          "jobs:",
          "  matrix:",
          "    strategy:",
          "      matrix:",
          "        include: []",
          "    steps:",
          "      - name: Set up Node",
          "        with:",
          "          node-version: [20.11.0, 22.x] # an older 20 first",
          "",
        ].join("\n"),
      },
    });

    const check = await finding(root, "workflows.nodePin");

    expect(check?.severity).toBe("warning");
    expect(check?.message).toContain(".github/workflows/ci.yml");
    expect(check?.message).toContain("18");
    expect(check?.message).toContain(".github/workflows/release.yaml");
    expect(check?.message).toContain("20.11.0");
    expect(check?.message).not.toContain("22.x");
    expect(check?.message).toContain(">=20.19.0");
  });

  it("accepts pins that satisfy engines.node or that name no version", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-20
    const root = await project({
      packageJson: { engines: { node: ">=20.19.0" } },
      files: {
        ".nvmrc": "22\n",
        ".github/workflows/ci.yml": [
          "steps:",
          "  - with:",
          '      node-version: "20"',
          "  - with:",
          "      node-version: 22.x",
          "  - with:",
          "      node-version: ${{ steps.node.outputs.version }}",
          "  - with:",
          "      node-version: lts/*",
          "",
        ].join("\n"),
      },
    });

    expect(await finding(root, "workflows.nodePin")).toBeUndefined();
  });

  it("raises warnings only, so a project without CI is not blocked", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-16
    const root = await project({
      packageJson: { engines: { node: ">=22" } },
      files: { "pnpm-lock.yaml": "", "package-lock.json": "{}" },
    });

    const found = await preconditions(root);

    expect(found.map((check) => check.id).sort()).toEqual([
      "workflows.lockfiles",
      "workflows.nodeVersionFile",
      "workflows.packageManager",
    ]);
    expect(found.every((check) => check.severity === "warning")).toBe(true);
  });

  it("finds the lower bound of engines.node wherever it stands in the range", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-20
    const root = await project({
      packageJson: { engines: { node: "<23 >=20.19.0" } },
      files: {
        ".nvmrc": "22\n",
        ".github/workflows/ci.yml": "steps:\n  - with:\n      node-version: 18\n",
      },
    });

    expect((await finding(root, "workflows.nodePin"))?.message).toContain("Node 18");
  });

  it("reads a pin from the parsed workflow, not from a script that mentions the key", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-20
    const root = await project({
      packageJson: { engines: { node: ">=20.19.0" } },
      files: {
        ".nvmrc": "22\n",
        ".github/workflows/ci.yml": [
          "steps:",
          "  - run: |",
          "      cat <<EOF",
          "        node-version: 18",
          "      EOF",
          "  - with:",
          "      node-version: 20.10",
          "",
        ].join("\n"),
      },
    });

    const message = (await finding(root, "workflows.nodePin"))?.message ?? "";

    expect(message).toContain("Node 20.10");
    expect(message).not.toContain("Node 18");
  });

  it("prints a repository-controlled value on one line without control characters", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-16
    const root = await project({
      packageJson: {
        engines: { node: ">=22\n[error] forged\u001b[31m" },
        packageManager: "yarn@4\n[error] forged",
      },
      files: { "pnpm-lock.yaml": "" },
    });

    for (const check of await preconditions(root)) {
      expect(check.message, check.id).not.toMatch(/\p{Cc}/u);
    }
  });

  it("names the same fallback Node the shipped workflows fall open to", async () => {
    // QFAI:AC-0003-0011-08
    // QFAI:EX-0003-0011-19
    const lane = await readFile(
      path.join(getInitAssetsDir(), "root", ".github", "workflows", "qfai-docs.yml"),
      "utf-8",
    );
    const root = await project({ packageJson: { engines: { node: ">=22" } } });

    const fallback = /fallback="(\d+)"/u.exec(lane)?.[1];

    expect((await finding(root, "workflows.nodeVersionFile"))?.message).toContain(
      `Node ${fallback}`,
    );
  });
});
