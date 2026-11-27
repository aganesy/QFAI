/**
 * Integration: `qfai init` records the release that wrote `.qfai/assistant/` in
 * `.qfai/assistant/VERSION`: written into a tree that holds only this release's text, kept by a
 * plain run otherwise, and rewritten under `--force`.
 */
import { constants } from "node:fs";
import { appendFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import type * as fsPromises from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { resolveToolVersion } from "../../src/core/version.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { graphProcessFixture } from "../helpers/graphProcess.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

type FsPromises = typeof fsPromises;

const race = vi.hoisted(
  (): { destination: string | undefined; versionDestination: string | undefined } => ({
    destination: undefined,
    versionDestination: undefined,
  }),
);

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    open: async (...args: Parameters<FsPromises["open"]>) => {
      const [destination] = args;
      if (destination === race.versionDestination) {
        await actual.writeFile(destination, "0.0.1\n", { flag: "wx" });
      }
      return actual.open(...args);
    },
    copyFile: async (...args: Parameters<FsPromises["copyFile"]>) => {
      const [, destination, mode] = args;
      if (destination === race.destination && mode === constants.COPYFILE_EXCL) {
        await actual.writeFile(destination, "concurrent edit\n");
      }
      return actual.copyFile(...args);
    },
  };
});

const newTempDir = useTempDirPool("qfai-init-version-");

async function init(dir: string, force = false, dryRun = false): Promise<string> {
  return captureStdout(() =>
    runInit({ dir, force, dryRun, yes: true }, undefined, graphProcessFixture().run),
  );
}

const versionFile = (dir: string): string => path.join(dir, ".qfai", "assistant", "VERSION");
const skillFile = (dir: string): string =>
  path.join(dir, ".qfai", "assistant", "skill", "qfai-sdd", "SKILL.md");

async function expectAbsent(file: string): Promise<void> {
  await expect(readFile(file, "utf-8")).rejects.toMatchObject({ code: "ENOENT" });
}

describe("qfai init records the release that wrote the assistant tree", () => {
  // QFAI:AC-0001-0021-01
  // QFAI:EX-0001-0021-13
  it("writes the running version on a fresh run, keeps another on a plain run and rewrites it under --force", async () => {
    const dir = await newTempDir();
    const running = await resolveToolVersion();

    await init(dir);
    expect(await readFile(versionFile(dir), "utf-8")).toBe(`${running}\n`);

    await writeFile(versionFile(dir), "0.0.1\n", "utf-8");
    await init(dir);
    expect(await readFile(versionFile(dir), "utf-8")).toBe("0.0.1\n");

    await init(dir, true);
    expect(await readFile(versionFile(dir), "utf-8")).toBe(`${running}\n`);
  });

  // QFAI:AC-0001-0021-01
  // QFAI:EX-0001-0021-13
  it("writes a missing version file on a plain run only when no differing shipped file is kept", async () => {
    const dir = await newTempDir();
    const running = await resolveToolVersion();
    await init(dir);
    await rm(versionFile(dir));
    const shipped = await readFile(skillFile(dir), "utf-8");

    await appendFile(skillFile(dir), "\n<!-- earlier -->\n");
    await init(dir);
    await expectAbsent(versionFile(dir));

    await writeFile(skillFile(dir), shipped, "utf-8");
    await init(dir, false, true);
    await expectAbsent(versionFile(dir));

    await init(dir);
    expect(await readFile(versionFile(dir), "utf-8")).toBe(`${running}\n`);
  });

  // QFAI:AC-0001-0021-01
  // QFAI:EX-0001-0021-17
  it("reports the bounded kept list and the separate refusal when both defer the version", async () => {
    const dir = await newTempDir();
    const skills = path.join(".qfai", "assistant", "skill");
    const matching = path.join(skills, "qfai-sdd", "SKILL.md");
    const blocked = path.join(".qfai", "assistant", "step", "implement-tdd");
    await mkdir(path.dirname(path.join(dir, blocked)), { recursive: true });
    await writeFile(path.join(dir, blocked), "project file\n", "utf-8");
    await init(dir);
    expect((await stat(path.join(dir, matching))).isFile()).toBe(true);
    const edited = (await readdir(path.join(dir, skills), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name !== "qfai-sdd")
      .slice(0, 9)
      .map((entry) => path.join(skills, entry.name, "SKILL.md"));
    expect(edited).toHaveLength(9);
    for (const file of edited) {
      await appendFile(path.join(dir, file), "\n<!-- local edit -->\n");
    }

    const output = await init(dir);
    const diagnostic = output
      .split(/\r?\n/)
      .find((line) => line.startsWith("Assistant VERSION stays absent"));

    await expectAbsent(versionFile(dir));
    const summary =
      /^Assistant VERSION stays absent when required assets cannot be verified\. Check the kept assets at (.+) and 1 more\. See warnings for paths that could not be written\.$/.exec(
        diagnostic ?? "",
      );
    expect(summary).not.toBeNull();
    const listed = (summary?.[1] ?? "").split(", ");
    expect(listed).toHaveLength(8);
    expect(new Set(listed).size).toBe(8);
    expect(edited).toEqual(expect.arrayContaining(listed));
    expect(listed).not.toContain(matching);
    const refused = path.join(blocked, "STEP.md");
    expect(listed).not.toContain(refused);
    const refusal = output
      .split(/\r?\n/)
      .find((line) => line.startsWith(`WARN: ${refused} was not written.`));
    expect(refusal).toContain("non-directory blocks a parent path");
  });

  // QFAI:AC-0001-0021-01
  // QFAI:EX-0001-0021-15
  it("leaves the version absent when a required assistant asset could not be copied", async () => {
    const dir = await newTempDir();
    const blocked = path.join(dir, ".qfai", "assistant", "step", "implement-tdd");
    await mkdir(path.dirname(blocked), { recursive: true });
    await writeFile(blocked, "project file\n", "utf-8");

    const output = await init(dir);

    expect(await readFile(blocked, "utf-8")).toBe("project file\n");
    await expectAbsent(versionFile(dir));
    expect(output).toContain(
      "Assistant VERSION stays absent when required assets cannot be verified",
    );
    expect(output).toContain(
      `${path.relative(dir, path.join(blocked, "STEP.md"))} was not written. Check whether a directory or special entry occupies the destination, or a symbolic link or non-directory blocks a parent path.`,
    );

    await rm(blocked);
    await init(dir);
    const shippedStep = path.join(
      getInitAssetsDir(),
      ".qfai",
      "assistant",
      "step",
      "implement-tdd",
      "STEP.md",
    );
    expect(await readFile(path.join(blocked, "STEP.md"), "utf-8")).toBe(
      await readFile(shippedStep, "utf-8"),
    );
    const running = await resolveToolVersion();
    expect(await readFile(versionFile(dir), "utf-8")).toBe(`${running}\n`);
  });

  // QFAI:AC-0001-0021-01
  // QFAI:EX-0001-0021-15
  it("leaves the version absent when another writer creates a differing asset on first init", async () => {
    const dir = await newTempDir();
    const skill = skillFile(dir);
    race.destination = skill;
    try {
      await init(dir);
    } finally {
      race.destination = undefined;
    }

    expect(await readFile(skill, "utf-8")).toBe("concurrent edit\n");
    await expectAbsent(versionFile(dir));
  });

  // QFAI:EX-0001-0021-16
  it("keeps a competing version marker created just before plain init opens it", async () => {
    const dir = await newTempDir();
    const marker = versionFile(dir);
    race.versionDestination = marker;

    try {
      await init(dir);
    } finally {
      race.versionDestination = undefined;
    }

    expect(await readFile(marker, "utf-8")).toBe("0.0.1\n");
    await init(dir, true);
    expect(await readFile(marker, "utf-8")).toBe(`${await resolveToolVersion()}\n`);
  });

  // QFAI:AC-0001-0021-01
  // QFAI:EX-0001-0021-13
  it("writes nothing over a version entry that is not a regular file, under --force too", async () => {
    const dir = await newTempDir();
    await init(dir);
    await rm(versionFile(dir));
    await mkdir(versionFile(dir));

    await init(dir, true);

    expect((await stat(versionFile(dir))).isDirectory()).toBe(true);
  });
});
