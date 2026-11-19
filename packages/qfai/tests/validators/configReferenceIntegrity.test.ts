/**
 * Tests for validateConfigReferenceIntegrity (v1.8.4 Phase 7).
 *
 * Verifies the two QFAI-CFG-LINK-* codes:
 *   001: primarySpecId points to a missing spec dir
 *   002: paths.* points to a missing directory (warning; info when it is a shipped default that is absent)
 */
import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { QfaiConfig } from "../../src/core/config.js";
import { isEperm } from "../../src/core/fs/errno.js";
import { validateConfigReferenceIntegrity } from "../../src/core/validators/configReferenceIntegrity.js";

type FsPromises = typeof fsPromises;

/**
 * Error codes to raise for a path, per fs call. Empty by default, so every other
 * case reads the real file system; a read failure cannot be produced portably
 * on disk.
 */
const fsFaults = vi.hoisted(() => ({
  stat: new Map<string, string>(),
  lstat: new Map<string, string>(),
}));

function faultFor(faults: Map<string, string>, target: unknown): void {
  const code = faults.get(String(target));
  if (code !== undefined) {
    throw Object.assign(new Error(`${code}: injected`), { code });
  }
}

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    stat: async (...args: Parameters<FsPromises["stat"]>) => {
      faultFor(fsFaults.stat, args[0]);
      return actual.stat(...args);
    },
    lstat: async (...args: Parameters<FsPromises["lstat"]>) => {
      faultFor(fsFaults.lstat, args[0]);
      return actual.lstat(...args);
    },
  };
});

afterEach(() => {
  fsFaults.stat.clear();
  fsFaults.lstat.clear();
});

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cfg-link-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

function makeConfig(overrides: { primaryUiContract?: string } = {}): QfaiConfig {
  return {
    paths: {
      contractsDir: ".qfai/spec/03_contract",
      specsDir: ".qfai/spec",
      deliberationDir: ".qfai/deliberation",
      outDir: ".qfai/out",
      skillsDir: ".qfai/assistant/skill",
      srcDir: "src",
      testsDir: "tests",
    },
    validation: {
      failOn: "error",
      testStrategy: {
        forbidTestTodoStubs: true,
      },
      traceability: {
        testFileGlobs: [],
        testFileExcludeGlobs: [],
      },
    },
    output: { validateJsonPath: ".qfai/output/validate.json" },
    prototyping: {
      ...(overrides.primaryUiContract !== undefined
        ? { primaryUiContract: overrides.primaryUiContract }
        : {}),
    },
  };
}

async function seedDirs(root: string, paths: string[]): Promise<void> {
  for (const p of paths) {
    await mkdir(path.join(root, p), { recursive: true });
  }
}

describe("validateConfigReferenceIntegrity", () => {
  it("returns empty when a configured UI contract declares screens", async () => {
    const root = await newTempDir();
    await seedDirs(root, [
      ".qfai/spec",
      ".qfai/spec/03_contract/ui",
      ".qfai/assistant/skill",
      "src",
      "tests",
    ]);
    await writeFile(
      path.join(root, ".qfai/spec/03_contract/ui/home.yaml"),
      "# QFAI-CONTRACT-ID: UI-0012\nscreens: [{id: home}]\n",
      "utf-8",
    );
    const issues = await validateConfigReferenceIntegrity(
      root,
      makeConfig({ primaryUiContract: "UI-0012" }),
    );
    expect(issues).toEqual([]);
  });

  it("emits QFAI-CFG-LINK-001 when the configured UI contract is absent", async () => {
    const root = await newTempDir();
    await seedDirs(root, [
      ".qfai/spec",
      ".qfai/spec/03_contract",
      ".qfai/assistant/skill",
      "src",
      "tests",
    ]);
    const issues = await validateConfigReferenceIntegrity(
      root,
      makeConfig({ primaryUiContract: "UI-9999" }),
    );
    const linkIssue = issues.find((i) => i.code === "QFAI-CFG-LINK-001");
    expect(linkIssue).toBeDefined();
    expect(linkIssue?.severity).toBe("error");
    expect(linkIssue?.message).toMatch(/9999/);
  });

  // QFAI:EX-0003-0003-03
  it("emits QFAI-CFG-LINK-002 (warning) for missing non-default paths", async () => {
    const root = await newTempDir();
    // specs/contracts use default skill-created paths, so their
    // absence is no longer a config-reference warning after clean init.
    const config = makeConfig();
    config.paths.srcDir = "lib";
    config.paths.testsDir = "spec";
    const issues = await validateConfigReferenceIntegrity(root, config);
    const warningIssues = issues.filter((i) => i.code === "QFAI-CFG-LINK-002");
    expect(warningIssues.map((i) => i.rule).sort()).toEqual([
      "config.paths.skillsDir.reality",
      "config.paths.srcDir.reality",
      "config.paths.testsDir.reality",
    ]);
    for (const i of warningIssues) {
      expect(i.severity).toBe("warning");
    }
  });

  // QFAI:EX-0003-0003-03
  it("reads a shipped default spelled with a leading ./ as the default", async () => {
    const root = await newTempDir();
    const base = makeConfig();
    const issues = await validateConfigReferenceIntegrity(root, {
      ...base,
      paths: { ...base.paths, srcDir: "./src" },
    });
    const srcIssue = issues.find((i) => i.rule === "config.paths.srcDir.reality");

    expect(srcIssue?.severity).toBe("info");
  });

  // QFAI:EX-0003-0003-03
  it("reports an absent shipped-default source and test directories at info", async () => {
    const root = await newTempDir();
    const issues = await validateConfigReferenceIntegrity(root, makeConfig());
    const byRule = new Map(
      issues.filter((i) => i.code === "QFAI-CFG-LINK-002").map((i) => [i.rule, i]),
    );

    expect(byRule.get("config.paths.srcDir.reality")?.severity).toBe("info");
    expect(byRule.get("config.paths.srcDir.reality")?.message).toContain(
      "the project has no source yet",
    );
    expect(byRule.get("config.paths.testsDir.reality")?.severity).toBe("info");
    expect(byRule.get("config.paths.testsDir.reality")?.message).toContain(
      "the project has no tests yet",
    );
    expect(byRule.get("config.paths.skillsDir.reality")?.severity).toBe("warning");
    // A benign absence prescribes no repair.
    expect(byRule.get("config.paths.srcDir.reality")?.suggested_action).toBeUndefined();
  });

  // QFAI:EX-0003-0003-04
  it("still warns when the shipped-default directory is a file", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "src"), "not a directory", "utf-8");

    const issues = await validateConfigReferenceIntegrity(root, makeConfig());
    const srcIssue = issues.find((i) => i.rule === "config.paths.srcDir.reality");

    expect(srcIssue?.severity).toBe("warning");
    expect(srcIssue?.suggested_action).toBeDefined();
  });

  it("still warns when a custom workflow artifact path is missing", async () => {
    const root = await newTempDir();
    const config = makeConfig();
    config.paths.contractsDir = "custom-contracts";

    const issues = await validateConfigReferenceIntegrity(root, config);
    expect(issues.some((i) => i.rule === "config.paths.contractsDir.reality")).toBe(true);
  });

  // QFAI:EX-0003-0003-07
  it("stays silent when the shipped-default spec and contract directories are absent", async () => {
    const root = await newTempDir();
    const issues = await validateConfigReferenceIntegrity(root, makeConfig());
    const rules = issues.map((i) => i.rule);

    expect(rules).not.toContain("config.paths.specsDir.reality");
    expect(rules).not.toContain("config.paths.contractsDir.reality");
  });

  // QFAI:EX-0003-0003-07
  it("reads a default spec and contract path spelled with a leading ./ as the default", async () => {
    const root = await newTempDir();
    const base = makeConfig();
    const issues = await validateConfigReferenceIntegrity(root, {
      ...base,
      paths: { ...base.paths, specsDir: "./.qfai/spec", contractsDir: "./.qfai/spec/03_contract" },
    });
    const rules = issues.map((i) => i.rule);

    expect(rules).not.toContain("config.paths.specsDir.reality");
    expect(rules).not.toContain("config.paths.contractsDir.reality");
  });

  // QFAI:EX-0003-0003-07
  it("warns when a file stands at the shipped-default spec and contract paths", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai", "spec"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "spec", "03_contract"), "not a directory", "utf-8");
    const fileAtSpecs = await newTempDir();
    await mkdir(path.join(fileAtSpecs, ".qfai"), { recursive: true });
    await writeFile(path.join(fileAtSpecs, ".qfai", "spec"), "not a directory", "utf-8");

    const contractIssue = (await validateConfigReferenceIntegrity(root, makeConfig())).find(
      (i) => i.rule === "config.paths.contractsDir.reality",
    );
    const specIssue = (await validateConfigReferenceIntegrity(fileAtSpecs, makeConfig())).find(
      (i) => i.rule === "config.paths.specsDir.reality",
    );

    expect(contractIssue?.severity).toBe("warning");
    expect(contractIssue?.message).toContain("is not a directory");
    expect(specIssue?.severity).toBe("warning");
    expect(specIssue?.message).toContain("is not a directory");
  });

  // QFAI:EX-0003-0003-07
  it("warns when a broken link stands at the shipped-default spec path", async () => {
    const root = await newTempDir();
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    try {
      await symlink(path.join(root, "missing-target"), path.join(root, ".qfai", "spec"));
    } catch (error: unknown) {
      if (process.platform === "win32" && isEperm(error)) {
        return;
      }
      throw error;
    }

    const issues = await validateConfigReferenceIntegrity(root, makeConfig());
    const specIssue = issues.find((i) => i.rule === "config.paths.specsDir.reality");

    expect(specIssue?.severity).toBe("warning");
    expect(specIssue?.message).toContain("is not a directory");
  });

  // QFAI:EX-0003-0003-07
  it("warns when the shipped-default spec and contract paths cannot be read", async () => {
    const root = await newTempDir();
    const config = makeConfig();
    // The spec path refuses stat outright; the contract path looks absent to stat but its lstat fails.
    fsFaults.stat.set(path.resolve(root, config.paths.specsDir), "EACCES");
    fsFaults.lstat.set(path.resolve(root, config.paths.contractsDir), "EIO");

    const issues = await validateConfigReferenceIntegrity(root, config);
    const specIssue = issues.find((i) => i.rule === "config.paths.specsDir.reality");
    const contractIssue = issues.find((i) => i.rule === "config.paths.contractsDir.reality");

    expect(specIssue?.severity).toBe("warning");
    expect(specIssue?.message).toContain("could not be read");
    expect(contractIssue?.severity).toBe("warning");
    expect(contractIssue?.message).toContain("could not be read");
  });

  it("treats outDir absence as silent (lazy creation)", async () => {
    const root = await newTempDir();
    await seedDirs(root, [
      ".qfai/spec",
      ".qfai/spec/03_contract",
      ".qfai/assistant/skill",
      "src",
      "tests",
      // No `.qfai/out`
    ]);
    const issues = await validateConfigReferenceIntegrity(root, makeConfig());
    // outDir is excluded from VERIFIED_PATH_KEYS; should not produce an issue.
    const outDirIssues = issues.filter(
      (i) => i.code === "QFAI-CFG-LINK-002" && i.message.includes("outDir"),
    );
    expect(outDirIssues).toEqual([]);
  });
});
