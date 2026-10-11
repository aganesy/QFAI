import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { link, mkdir, mkdtemp, readFile, rm, truncate, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, loadConfig } from "../../src/core/config.js";
import type { Issue, ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import {
  readStoryTests,
  validateStoryTreeObligations,
} from "../../src/core/validators/storyTreeObligations.js";
import { createSymlinkFixture } from "../helpers/symlinkFixture.js";

describe("story-tree test scan", () => {
  it("fails closed when a configured test glob cannot be scanned", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-scan-"));
    try {
      const config = {
        ...defaultConfig,
        validation: {
          ...defaultConfig.validation,
          traceability: {
            ...defaultConfig.validation.traceability,
            testFileGlobs: [`tests/${String.fromCharCode(0)}/*.ts`],
          },
        },
      };
      const model = buildStoryTreeModel(new Map());
      const findings = await validateStoryTreeObligations(root, config, "atdd", model);

      expect(findings.map((finding) => finding.code)).toEqual(["QFAI-SCAN-002"]);
      expect(findings[0]?.severity).toBe("error");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("names a test file relative to the project in its findings", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-relative-"));
    try {
      await mkdir(path.join(root, "tests", "unit"), { recursive: true });
      await writeFile(
        path.join(root, "tests", "unit", "a.test.ts"),
        `// ${["QFAI", "BF-0001"].join(":")}\n`,
        "utf8",
      );
      const config = {
        ...defaultConfig,
        validation: {
          ...defaultConfig.validation,
          traceability: {
            ...defaultConfig.validation.traceability,
            testFileGlobs: ["tests/**/*.test.ts"],
          },
        },
      };
      const model = buildStoryTreeModel(new Map());
      const findings = await validateStoryTreeObligations(root, config, "atdd", model);
      const misplaced = findings.filter((finding) => finding.code === "QFAI-STORY-007");

      expect(misplaced).toHaveLength(1);
      expect(misplaced[0]?.file).toBe("tests/unit/a.test.ts");
      expect(findings.map((finding) => finding.message).join("\n")).not.toContain(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  describe("configured test globs with boundary whitespace", () => {
    async function selectedFiles(
      testFileGlobs: string[],
      testFileExcludeGlobs: string[] = [],
    ): Promise<string[]> {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-glob-"));
      try {
        for (const file of ["tests/a.test.ts", "tests/ignored/b.test.ts", "tests/c.test.ts"]) {
          await mkdir(path.dirname(path.join(root, file)), { recursive: true });
          await writeFile(path.join(root, file), "export {};\n", "utf8");
        }
        const config = {
          ...defaultConfig,
          validation: {
            ...defaultConfig.validation,
            traceability: {
              ...defaultConfig.validation.traceability,
              testFileGlobs,
              testFileExcludeGlobs,
            },
          },
        };
        const { files } = await readStoryTests(root, config);
        return files
          .filter((file) => file.selectedForExample)
          .map((file) => path.relative(root, file.file).split(path.sep).join("/"))
          .sort();
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }

    it("selects and excludes without padding, as the control", async () => {
      expect(await selectedFiles(["tests/**/*.test.ts", "!tests/ignored/**"])).toEqual([
        "tests/a.test.ts",
        "tests/c.test.ts",
      ]);
    });

    it("reads a padded pattern and a padded exclusion like the unpadded ones", async () => {
      expect(await selectedFiles([" tests/**/*.test.ts ", " !tests/ignored/** "])).toEqual([
        "tests/a.test.ts",
        "tests/c.test.ts",
      ]);
    });

    it("trims a padded testFileExcludeGlobs entry", async () => {
      expect(await selectedFiles(["tests/**/*.test.ts"], [" tests/ignored/** "])).toEqual([
        "tests/a.test.ts",
        "tests/c.test.ts",
      ]);
    });

    it("selects nothing for a blank pattern and ignores a blank exclusion", async () => {
      expect(await selectedFiles(["   ", "!  "])).toEqual([]);
      expect(await selectedFiles(["tests/**/*.test.ts", " ! "], ["  "])).toEqual([
        "tests/a.test.ts",
        "tests/c.test.ts",
        "tests/ignored/b.test.ts",
      ]);
    });

    it("keeps a leading extglob negation as a pattern, not an exclusion", async () => {
      expect(await selectedFiles(["!(ignored)/**/*.test.ts"])).toEqual([
        "tests/a.test.ts",
        "tests/c.test.ts",
        "tests/ignored/b.test.ts",
      ]);
    });
  });
});

describe("forbidden identifiers through validate", () => {
  const roots: string[] = [];
  const candidate = "QFAI_SYNTHETIC_DENY";
  const policy = {
    sha256: createHash("sha256").update(candidate, "ascii").digest("hex"),
    byteLength: Buffer.byteLength(candidate, "ascii"),
  };

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  function git(root: string, ...args: string[]): void {
    execFileSync("git", args, { cwd: root, stdio: "ignore" });
  }

  async function put(root: string, file: string, bytes: string | Buffer): Promise<void> {
    const target = path.join(root, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }

  async function fixture(repository = true): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-forbidden-scan-"));
    roots.push(root);
    if (repository) {
      git(root, "init", "-b", "main");
      git(root, "config", "user.email", "test@example.test");
      git(root, "config", "user.name", "Test");
      git(root, "config", "core.autocrlf", "false");
    }
    await configure(root, [policy]);
    return root;
  }

  async function configure(root: string, forbiddenIdentifiers?: unknown): Promise<void> {
    await put(
      root,
      "qfai.config.yaml",
      JSON.stringify({
        validation: forbiddenIdentifiers === undefined ? {} : { forbiddenIdentifiers },
      }),
    );
  }

  async function scan(root: string, profile: ValidationProfile = "sdd"): Promise<Issue[]> {
    return (await validateProject(root, await loadConfig(root), { profile })).issues;
  }

  function security(issues: Issue[], code?: string): Issue[] {
    return issues.filter((finding) =>
      code ? finding.code === code : finding.code.startsWith("QFAI-SECURITY-"),
    );
  }

  function expectPrivate(issues: Issue[]): void {
    const serialized = JSON.stringify(issues);
    expect(serialized).not.toContain(candidate);
    expect(serialized).not.toContain(policy.sha256);
  }

  function expectMatch(issues: Issue[]): void {
    const matches = security(issues, "QFAI-SECURITY-001");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((finding) => finding.severity === "error")).toBe(true);
    expectPrivate(security(issues));
  }

  function expectIncomplete(issues: Issue[]): void {
    const incomplete = security(issues, "QFAI-SECURITY-002");
    expect(incomplete.length).toBeGreaterThan(0);
    expect(incomplete.every((finding) => finding.severity === "error")).toBe(true);
    expectPrivate(security(issues));
  }

  // QFAI:AC-0001-0232-01
  it("leaves absent and empty policies inert outside a Git repository", async () => {
    const root = await fixture(false);
    await put(root, "untracked.txt", candidate);
    for (const setting of [undefined, []]) {
      await configure(root, setting);
      expect(security(await scan(root))).toEqual([]);
    }
  });

  // QFAI:AC-0001-0232-01
  // QFAI:AC-0001-0232-02
  // QFAI:EX-0001-0232-02
  // QFAI:EX-0001-0232-04
  // QFAI:EX-0001-0232-05
  // QFAI:EX-0001-0232-06
  // QFAI:EX-0001-0232-11
  it("rejects invalid policy shapes, limits and YAML without exposing supplied values", async () => {
    const root = await fixture(false);
    const records = (count: number, distinctLengths: boolean) =>
      Array.from({ length: count }, (_, index) => ({
        sha256: createHash("sha256").update(`synthetic-policy-${index}`, "ascii").digest("hex"),
        byteLength: distinctLengths ? index + 1 : policy.byteLength,
      }));
    const accepted = records(64, false).map((entry, index) => ({
      ...entry,
      byteLength: (index % 8) + 1,
    }));
    await configure(root, accepted);
    const loaded = await loadConfig(root);
    expect(loaded.issues.filter((finding) => finding.code === "QFAI-CFG-002")).toEqual([]);
    const retained = JSON.stringify(loaded.config.validation);
    for (const entry of accepted) expect(retained).toContain(entry.sha256);
    for (const setting of [
      policy,
      [{ ...policy, sha256: candidate }],
      [{ ...policy, sha256: policy.sha256.toUpperCase() }],
      [{ ...policy, byteLength: 0 }],
      [{ ...policy, byteLength: 129 }],
      [{ ...policy, byteLength: 1.5 }],
      [policy, policy],
      records(65, false),
      records(9, true),
    ]) {
      await configure(root, setting);
      const issues = (await loadConfig(root)).issues;
      expect(
        issues.some((finding) => finding.code === "QFAI-CFG-002" && finding.severity === "error"),
      ).toBe(true);
      expectPrivate(issues);
    }
    await put(root, "qfai.config.yaml", `validation:\n  forbiddenIdentifiers: [\n${candidate}\n`);
    const malformed = (await loadConfig(root)).issues;
    expect(malformed.some((finding) => finding.code === "QFAI-CFG-002")).toBe(true);
    expectPrivate(malformed);
  });

  // QFAI:AC-0001-0232-08
  // QFAI:EX-0001-0232-34
  // QFAI:EX-0001-0232-35
  it("detects current tracked bytes in every profile and before damaged integration stops profile validators", async () => {
    const root = await fixture();
    await put(root, "tracked.bin", Buffer.from(`\u0000${candidate}\u0000`, "ascii"));
    git(root, "add", "tracked.bin");
    const profiles: ValidationProfile[] = [
      "discussion",
      "sdd",
      "prototyping",
      "atdd",
      "tdd",
      "verify",
      "full",
      "saas-package",
      "drift",
    ];
    for (const profile of profiles) expectMatch(await scan(root, profile));
    await put(root, ".qfai/waivers.yml", "version: 1\nwaivers: []\n");
    await put(root, ".qfai/assistant/skill", "not a directory\n");
    await put(root, ".claude/skills/qfai-implement/SKILL.md", "# Fixture wrapper\n");
    const damaged = await validateProject(root, await loadConfig(root), { profile: "sdd" });
    expect(damaged.profileValidatorsRan).toBe(false);
    expect(damaged.issues.some((finding) => finding.code === "QFAI-LINK-001")).toBe(true);
    expectMatch(damaged.issues);
  });

  // QFAI:AC-0001-0232-08
  // QFAI:EX-0001-0232-39
  it("still detects a tracked match before the legacy-layout early return", async () => {
    const root = await fixture();
    await put(root, ".qfai/specs/spec-0001/01_Spec.md", "# Legacy fixture\n");
    await put(root, "tracked.txt", candidate);
    git(root, "add", "tracked.txt");
    const result = await validateProject(root, await loadConfig(root), { profile: "sdd" });
    expect(result.profileValidatorsRan).toBe(false);
    expect(result.issues.some((finding) => finding.code === "QFAI-LAYOUT-001")).toBe(true);
    expectMatch(result.issues);
  });

  // QFAI:AC-0001-0232-04
  // QFAI:EX-0001-0232-17
  // QFAI:EX-0001-0232-18
  // QFAI:EX-0001-0232-20
  // QFAI:EX-0001-0232-36
  it("scans tracked ignored binary current bytes while excluding history and untracked files", async () => {
    const root = await fixture();
    await put(root, ".gitignore", "ignored.bin\n");
    await put(root, "ignored.bin", Buffer.from(`\u0000${candidate}\u0000`, "ascii"));
    git(root, "add", "--force", "ignored.bin");
    git(root, "commit", "-m", "tracked ignored binary");
    expectMatch(await scan(root));
    await put(root, "ignored.bin", "safe current bytes\n");
    await put(root, "untracked.txt", candidate);
    expect(security(await scan(root))).toEqual([]);
  });

  // QFAI:AC-0001-0232-03
  // QFAI:EX-0001-0232-14
  it("matches an embedded case-exact ASCII window without requiring word boundaries", async () => {
    const root = await fixture();
    await put(
      root,
      "tracked.bin",
      Buffer.from([0xff, ...Buffer.from(`prefix${candidate}suffix`, "ascii"), 0x80]),
    );
    git(root, "add", "tracked.bin");
    expectMatch(await scan(root));
    await put(root, "tracked.bin", candidate.toLowerCase());
    expect(security(await scan(root))).toEqual([]);
  });

  // QFAI:AC-0001-0232-04
  // QFAI:AC-0001-0232-05
  // QFAI:EX-0001-0232-22
  it("checks tracked relative paths with spaces without echoing the matched candidate or digest", async () => {
    const root = await fixture();
    const file = `space directory/prefix${candidate}suffix.bin`;
    await put(root, file, "safe contents\n");
    git(root, "add", file);
    expectMatch(await scan(root));
  });

  // QFAI:AC-0001-0232-06
  // QFAI:EX-0001-0232-23
  it("fails coverage when enabled Git enumeration is unavailable or a tracked file is missing", async () => {
    const outside = await fixture(false);
    expectIncomplete(await scan(outside));
    const root = await fixture();
    await put(root, "missing.txt", "safe contents\n");
    git(root, "add", "missing.txt");
    await rm(path.join(root, "missing.txt"));
    expectIncomplete(await scan(root));
  });

  // QFAI:AC-0001-0232-06
  // QFAI:EX-0001-0232-25
  it("refuses a tracked symbolic-link leaf without reading its target", async (ctx) => {
    const root = await fixture();
    const outside = await fixture(false);
    const target = path.join(outside, "target.txt");
    await put(outside, "target.txt", candidate);
    await put(root, "linked.txt", "safe contents\n");
    git(root, "add", "linked.txt");
    await rm(path.join(root, "linked.txt"));
    if (!(await createSymlinkFixture(target, path.join(root, "linked.txt"), "file"))) ctx.skip();
    const issues = await scan(root);
    expectIncomplete(issues);
    expect(security(issues, "QFAI-SECURITY-001")).toEqual([]);
    expect(await readFile(target, "utf8")).toBe(candidate);
  });

  // QFAI:AC-0001-0232-06
  // QFAI:EX-0001-0232-25
  it("refuses a tracked file beneath a symbolic-link parent", async (ctx) => {
    const root = await fixture();
    const outside = await fixture(false);
    await put(root, "nested/file.txt", "safe contents\n");
    git(root, "add", "nested/file.txt");
    await put(outside, "file.txt", "safe contents\n");
    await rm(path.join(root, "nested"), { recursive: true, force: true });
    if (
      !(await createSymlinkFixture(
        outside,
        path.join(root, "nested"),
        process.platform === "win32" ? "junction" : "dir",
      ))
    )
      ctx.skip();
    expectIncomplete(await scan(root));
  });

  // QFAI:AC-0001-0232-06
  it("refuses a hardlinked tracked file without changing its external bytes", async (ctx) => {
    const root = await fixture();
    const outside = await fixture(false);
    const target = path.join(outside, "target.txt");
    await put(outside, "target.txt", "safe contents\n");
    try {
      await link(target, path.join(root, "linked.txt"));
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        ["EPERM", "EACCES"].includes(String(error.code))
      )
        ctx.skip();
      throw error;
    }
    git(root, "add", "linked.txt");
    expectIncomplete(await scan(root));
    expect(await readFile(target, "utf8")).toBe("safe contents\n");
  });

  // QFAI:AC-0001-0232-07
  it("fails coverage for a tracked file exceeding sixteen MiB rather than reporting a clean scan", async () => {
    const root = await fixture();
    await put(root, "large.bin", "");
    await truncate(path.join(root, "large.bin"), 16 * 1024 * 1024 + 1);
    git(root, "add", "large.bin");
    expectIncomplete(await scan(root));
  });
});
