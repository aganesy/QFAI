/**
 * An installed qfai older than the one the tree was written for.
 *
 * The files `qfai init` writes carry no version, so a checkout whose lockfile
 * moved after the last install ran an older qfai over newer files and was told,
 * thirteen times, that a skill lacked a marker it had. The only record of the
 * version the tree expects is the project's own dependency declaration, so the
 * run compares the two and says so once, first.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateProject } from "../../src/core/validate.js";
import {
  compareInstalledToDeclared,
  isOlderVersion,
  lowestVersionOfRange,
  resolveToolVersion,
} from "../../src/core/version.js";

/**
 * The project sits under the operating system's temporary directory, not under
 * this repository: a tree below the repository would inherit the repository
 * root's own `package.json`, which declares qfai, and the case that declares
 * nothing would not be tested. The project holds one skill that lacks the
 * drift-protocol marker, and a `package.json` declaring qfai as `declared`, or
 * declaring nothing when `declared` is `null`. `oldLayout` adds a spec-pack
 * directory, which ends the run before the profile's validators. `recorded`
 * is what `.qfai/assistant/VERSION` holds: the running version by default, and
 * no file at all when it is `null`.
 */
async function withProject(
  declared: string | null,
  task: (root: string) => Promise<void>,
  oldLayout = false,
  recorded: string | null | "running" = "running",
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-older-declared-"));
  try {
    if (oldLayout) {
      await mkdir(path.join(root, ".qfai", "specs", "spec-0001"), { recursive: true });
    }
    const skillDir = path.join(root, ".qfai", "assistant", "skill", "qfai-example");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, "SKILL.md"),
      [
        "---",
        "name: qfai-example",
        "description: An example skill.",
        "---",
        "",
        "# Example",
        "",
      ].join("\n"),
      "utf-8",
    );
    if (recorded !== null) {
      const version = recorded === "running" ? await resolveToolVersion() : recorded;
      await writeFile(path.join(root, ".qfai", "assistant", "VERSION"), `${version}\n`, "utf-8");
    }
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "older-declared-fixture",
        private: true,
        ...(declared === null ? {} : { devDependencies: { qfai: declared } }),
      }),
      "utf-8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function findings(root: string) {
  return (await validateProject(root, undefined, { profile: "full" })).issues;
}

describe("the installed qfai is older than the declared one", () => {
  // QFAI:EX-0001-0039-17
  it("raises QFAI-TOOL-003 first and explains the skill-marker error as a version difference", async () => {
    await withProject("^9.0.0", async (root) => {
      const issues = await findings(root);

      // Ahead of every other finding, the config read's included.
      const first = issues[0];
      expect(first?.code).toBe("QFAI-TOOL-003");
      expect(first?.severity).toBe("warning");
      expect(first?.message).toContain("9.0.0");
      expect(first?.suggested_action).toContain("npm ci");

      const marker = issues.filter((found) => found.code === "QFAI-SKILLS-010");
      expect(marker).toHaveLength(1);
      expect(marker[0]?.severity).toBe("error");
      expect(marker[0]?.message).toContain("QFAI-TOOL-003");
      expect(marker[0]?.suggested_action).toContain("^9.0.0");
      expect(marker[0]?.suggested_action).toContain("before editing this file");
    });
  });

  // QFAI:EX-0001-0039-17
  it("raises QFAI-TOOL-003 first on a tree the old-layout check stops", async () => {
    await withProject(
      "^9.0.0",
      async (root) => {
        const issues = await findings(root);
        expect(issues.map((found) => found.code)).toEqual(["QFAI-TOOL-003", "QFAI-LAYOUT-001"]);
      },
      true,
    );
  });

  // QFAI:EX-0001-0039-17
  it.each(["^0.0.1", "latest", "workspace:*", null])(
    "raises nothing about the version under the declaration %s",
    async (declared) => {
      await withProject(declared, async (root) => {
        const issues = await findings(root);

        expect(issues.some((found) => found.code === "QFAI-TOOL-003")).toBe(false);
        const marker = issues.find((found) => found.code === "QFAI-SKILLS-010");
        expect(marker?.message).toBe(
          "SKILL.md is missing the required marker [DRIFT-PROTOCOL:REQUIRED].",
        );
        expect(marker?.suggested_action).toBeUndefined();
      });
    },
  );
});

describe("the running qfai is not the release that wrote the assistant tree", () => {
  // QFAI:EX-0001-0039-21
  it("raises QFAI-TOOL-004 first and explains the skill-marker error as a version difference", async () => {
    await withProject(
      null,
      async (root) => {
        const issues = await findings(root);

        const first = issues[0];
        expect(first?.code).toBe("QFAI-TOOL-004");
        expect(first?.severity).toBe("warning");
        expect(first?.message).toContain("written by qfai 0.0.1");
        expect(first?.message).toContain(await resolveToolVersion());
        expect(first?.suggested_action).toContain("npm ci");
        expect(first?.suggested_action).toContain("qfai init --force");

        const marker = issues.filter((found) => found.code === "QFAI-SKILLS-010");
        expect(marker).toHaveLength(1);
        expect(marker[0]?.severity).toBe("error");
        expect(marker[0]?.message).toContain("QFAI-TOOL-004");
        expect(marker[0]?.suggested_action).toContain("npm ci");
      },
      false,
      "0.0.1",
    );
  });

  // QFAI:EX-0001-0039-21
  it("raises one QFAI-TOOL-004 for a tree with no version file, also on a tree the old-layout check stops", async () => {
    await withProject(
      null,
      async (root) => {
        const issues = await findings(root);
        expect(issues.map((found) => found.code)).toEqual(["QFAI-TOOL-004", "QFAI-LAYOUT-001"]);
        expect(issues[0]?.message).toContain("records no version");
        expect(issues[0]?.suggested_action).toContain("qfai init --force");
      },
      true,
      null,
    );
  });

  // QFAI:EX-0001-0039-21
  it("raises nothing about the assistant tree when it records the running version", async () => {
    await withProject(null, async (root) => {
      const issues = await findings(root);
      expect(issues.some((found) => found.code === "QFAI-TOOL-004")).toBe(false);
    });
  });
});

describe("lowestVersionOfRange", () => {
  it.each([
    ["2.1.1", "2.1.1"],
    ["^2.1.1", "2.1.1"],
    ["~2.1.1", "2.1.1"],
    [">=2.1.1 <3", "2.1.1"],
    ["=2.1.1", "2.1.1"],
    ["v2.1.1", "2.1.1"],
  ])("reads %s as %s", (range, lowest) => {
    expect(lowestVersionOfRange(range)).toBe(lowest);
  });

  it.each(["latest", "*", "2.x", "^2.1", "workspace:*", "file:../qfai", "^1.0.0 || ^2.0.0", ""])(
    "states no lowest version for %s",
    (range) => {
      expect(lowestVersionOfRange(range)).toBeNull();
    },
  );
});

describe("isOlderVersion", () => {
  it("compares major, then minor, then patch as numbers", () => {
    expect(isOlderVersion("2.1.0", "2.1.1")).toBe(true);
    expect(isOlderVersion("2.9.0", "2.10.0")).toBe(true);
    expect(isOlderVersion("1.99.99", "2.0.0")).toBe(true);
    expect(isOlderVersion("2.1.1", "2.1.1")).toBe(false);
    expect(isOlderVersion("2.1.2", "2.1.1")).toBe(false);
  });

  it("answers false where either side is not a version", () => {
    expect(isOlderVersion("unknown", "2.1.1")).toBe(false);
    expect(isOlderVersion("2.1.0", "latest")).toBe(false);
  });
});

describe("compareInstalledToDeclared", () => {
  it("names both versions and the range when the installed copy is older", () => {
    expect(compareInstalledToDeclared("2.1.0", "^2.1.1")).toEqual({
      installed: "2.1.0",
      declaredRange: "^2.1.1",
      declaredLowest: "2.1.1",
    });
  });

  it("answers null for an equal or newer copy, no declaration, or an unreadable range", () => {
    expect(compareInstalledToDeclared("2.1.1", "^2.1.1")).toBeNull();
    expect(compareInstalledToDeclared("2.2.0", "^2.1.1")).toBeNull();
    expect(compareInstalledToDeclared("2.1.0", null)).toBeNull();
    expect(compareInstalledToDeclared("2.1.0", "workspace:*")).toBeNull();
    expect(compareInstalledToDeclared("unknown", "^2.1.1")).toBeNull();
  });
});
