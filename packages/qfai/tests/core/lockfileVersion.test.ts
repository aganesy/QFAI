import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  npmPinnedVersion,
  pnpmPinnedVersion,
  readLockfilePin,
  yarnPinnedVersion,
} from "../../src/core/lockfileVersion.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-lockfile-"));
  roots.push(root);
  for (const [name, text] of Object.entries(files)) {
    await writeFile(path.join(root, name), text, "utf-8");
  }
  return root;
}

// QFAI:EX-0001-0313-01
describe("npmPinnedVersion", () => {
  it("reads the version of node_modules/qfai", () => {
    const lock = { packages: { "": {}, "node_modules/qfai": { version: "2.4.0" } } };
    expect(npmPinnedVersion(JSON.stringify(lock))).toBe("2.4.0");
  });

  it("answers null for a link, a lockfile without qfai and text that is not JSON", () => {
    const link = { packages: { "node_modules/qfai": { resolved: "packages/qfai", link: true } } };
    expect(npmPinnedVersion(JSON.stringify(link))).toBeNull();
    expect(npmPinnedVersion(JSON.stringify({ packages: { "": {} } }))).toBeNull();
    expect(npmPinnedVersion("{ not json")).toBeNull();
  });
});

// QFAI:EX-0001-0313-02
describe("pnpmPinnedVersion", () => {
  it("reads the qfai dependency of the importer `.`, without the peers suffix", () => {
    const lock = [
      "lockfileVersion: '9.0'",
      "importers:",
      "  .:",
      "    devDependencies:",
      "      qfai:",
      "        specifier: ^2.4.0",
      "        version: 2.4.0(typescript@5.6.0)",
      "",
    ].join("\n");
    expect(pnpmPinnedVersion(lock)).toBe("2.4.0");
  });

  it("answers null for a workspace link and an importer without qfai", () => {
    const workspace = [
      "importers:",
      "  .:",
      "    devDependencies:",
      "      qfai:",
      "        specifier: workspace:*",
      "        version: link:packages/qfai",
      "",
    ].join("\n");
    expect(pnpmPinnedVersion(workspace)).toBeNull();
    expect(pnpmPinnedVersion("importers:\n  .:\n    dependencies: {}\n")).toBeNull();
  });
});

// QFAI:EX-0001-0313-03
describe("yarnPinnedVersion", () => {
  it("reads a classic entry and a Berry entry", () => {
    const classic = 'qfai@^2.4.0:\n  version "2.4.0"\n  resolved "https://x/qfai-2.4.0.tgz"\n';
    const berry = '"qfai@npm:^2.4.0":\n  version: 2.4.0\n  resolution: "qfai@npm:2.4.0"\n';
    expect(yarnPinnedVersion(classic)).toBe("2.4.0");
    expect(yarnPinnedVersion(berry)).toBe("2.4.0");
  });

  it("answers null for a workspace entry, two pinned versions and no qfai entry", () => {
    const workspace = '"qfai@workspace:packages/qfai":\n  version: 0.0.0-use.local\n';
    const two = 'qfai@^2.2.0:\n  version "2.2.0"\n\nqfai@^2.4.0:\n  version "2.4.0"\n';
    expect(yarnPinnedVersion(workspace)).toBeNull();
    expect(yarnPinnedVersion(two)).toBeNull();
    expect(yarnPinnedVersion('other@^1.0.0:\n  version "1.0.0"\n')).toBeNull();
  });
});

// QFAI:EX-0001-0313-04
describe("readLockfilePin", () => {
  it("names the lockfile and its manager", async () => {
    const lock = { packages: { "node_modules/qfai": { version: "2.4.0" } } };
    const root = await project({ "package-lock.json": JSON.stringify(lock) });
    expect(await readLockfilePin(root)).toEqual({
      manager: "npm",
      file: "package-lock.json",
      version: "2.4.0",
    });
  });

  it("answers null with no lockfile, and lets the first lockfile present decide", async () => {
    expect(await readLockfilePin(await project({}))).toBeNull();
    const root = await project({
      "package-lock.json": JSON.stringify({ packages: {} }),
      "yarn.lock": 'qfai@^2.4.0:\n  version "2.4.0"\n',
    });
    expect(await readLockfilePin(root)).toBeNull();
  });
});
