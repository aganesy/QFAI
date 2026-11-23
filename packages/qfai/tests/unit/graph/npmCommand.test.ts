// npm is started without a shell by doctor's installs and by graph provisioning, both through
// `npmCommand`. npm's JavaScript entry beside Node runs with Node. Without one, POSIX starts
// the `npm` launcher, while Windows, whose `.cmd` launcher only a shell can start, looks for
// the entry under a directory on PATH and fails when it finds none.

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  npmCommand,
  npmEntryOnPath,
  NpmEntryNotFoundError,
} from "../../../src/core/graph/process.js";

const tempDirs: string[] = [];
const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");

afterEach(async () => {
  if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform);
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function tempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

async function npmEntryUnder(dir: string): Promise<string> {
  const entry = path.join(dir, "node_modules", "npm", "bin", "npm-cli.js");
  await mkdir(path.dirname(entry), { recursive: true });
  await writeFile(entry, "", "utf-8");
  return entry;
}

function pretendPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
}

// QFAI:EX-0003-0010-04
// QFAI:EX-0001-0237-05
describe("npmCommand", () => {
  it("runs npm's JavaScript entry beside node with node", async () => {
    const root = await tempRoot("qfai-npm-beside-");
    const entry = await npmEntryUnder(root);
    expect(await npmCommand({ nodeDirectory: root, searchPath: "" })).toEqual({
      command: process.execPath,
      prefix: [entry],
    });
  });

  it("on Windows runs the entry found on PATH when none is beside node", async () => {
    const root = await tempRoot("qfai-npm-onpath-");
    const entry = await npmEntryUnder(path.join(root, "with-npm"));
    pretendPlatform("win32");
    const searchPath = [path.join(root, "without-npm"), path.join(root, "with-npm")].join(
      path.delimiter,
    );
    expect(await npmCommand({ nodeDirectory: path.join(root, "node"), searchPath })).toEqual({
      command: process.execPath,
      prefix: [entry],
    });
  });

  it("on Windows fails with the reason when no entry is beside node or on PATH", async () => {
    const root = await tempRoot("qfai-npm-missing-");
    pretendPlatform("win32");
    const lookup = npmCommand({
      nodeDirectory: path.join(root, "node"),
      searchPath: path.join(root, "bin"),
    });
    await expect(lookup).rejects.toBeInstanceOf(NpmEntryNotFoundError);
    await expect(lookup).rejects.toThrow(/npm-cli\.js\) was not found beside node or on PATH/u);
  });

  it("on POSIX starts the npm launcher when no entry is beside node", async () => {
    const root = await tempRoot("qfai-npm-posix-");
    await npmEntryUnder(path.join(root, "with-npm"));
    pretendPlatform("linux");
    expect(
      await npmCommand({
        nodeDirectory: path.join(root, "node"),
        searchPath: path.join(root, "with-npm"),
      }),
    ).toEqual({ command: "npm", prefix: [] });
  });
});

// QFAI:EX-0003-0010-04
describe("npmEntryOnPath", () => {
  it("finds npm's JavaScript entry beside an npm on the search path", async () => {
    const root = await tempRoot("qfai-npm-searchpath-");
    const withNpm = path.join(root, "with-npm");
    const entry = await npmEntryUnder(withNpm);
    const searchPath = ["", path.join(root, "without-npm"), withNpm].join(path.delimiter);
    expect(await npmEntryOnPath(searchPath)).toBe(entry);
    expect(await npmEntryOnPath(path.join(root, "without-npm"))).toBeUndefined();
  });

  // Windows lets a PATH entry be quoted, as when it holds the delimiter.
  it("reads a double-quoted search path entry without its quotes", async () => {
    const root = await tempRoot("qfai-npm-quoted-");
    const entry = await npmEntryUnder(root);
    expect(await npmEntryOnPath(`"${root}"`)).toBe(entry);
  });

  // A relative entry resolves against the project, whose own node_modules/npm would run as npm.
  it("skips a relative search path entry", async () => {
    const root = await tempRoot("qfai-npm-relative-");
    const entry = await npmEntryUnder(root);
    const previous = process.cwd();
    process.chdir(root);
    try {
      expect(await npmEntryOnPath(".")).toBeUndefined();
      expect(await npmEntryOnPath(`"."`)).toBeUndefined();
      expect(await npmEntryOnPath(root)).toBe(entry);
    } finally {
      process.chdir(previous);
    }
  });
});
