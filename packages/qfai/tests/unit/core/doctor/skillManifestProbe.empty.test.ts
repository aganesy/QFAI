// QFAI:SPEC-0006:TC-0006-0025
//
// Boundary: a skill manifest declaring `runtimeDependencies: []` MUST
// yield zero probe findings — no false positives, even when the
// consumer project has no node_modules at all.

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  probeSkillManifest,
  probeSkillManifestRuntimeDeps,
} from "../../../../src/core/doctor/skillManifestProbe.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-skillprobe-${label}-`));
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

async function seedManifest(root: string, skill: string, deps: string[]): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skills", skill);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "manifest.json"),
    JSON.stringify({ runtimeDependencies: deps }, null, 2),
    "utf-8",
  );
}

describe("probeSkillManifestRuntimeDeps — empty runtimeDependencies", () => {
  it("emits zero probe findings when runtimeDependencies is []", async () => {
    const root = await newTempDir("empty");
    await seedManifest(root, "qfai-atdd", []);
    const findings = await probeSkillManifestRuntimeDeps(root, "qfai-atdd");
    expect(findings).toEqual([]);
  });

  it("returns empty array when manifest itself is absent", async () => {
    const root = await newTempDir("absent");
    const findings = await probeSkillManifestRuntimeDeps(root, "qfai-atdd");
    expect(findings).toEqual([]);
  });

  it("reports missing dep with install command when declared but not installed", async () => {
    const root = await newTempDir("missing");
    await seedManifest(root, "qfai-prototyping", ["playwright"]);
    const findings = await probeSkillManifestRuntimeDeps(root, "qfai-prototyping");
    expect(findings).toHaveLength(1);
    const finding = findings[0];
    if (!finding) throw new Error("expected one finding");
    expect(finding.name).toBe("playwright");
    expect(finding.status).toBe("missing");
    expect(finding.installCommand).toMatch(/npm install/u);
    expect(finding.installCommand).toContain("playwright");
  });

  it("reports found dep when node_modules/<name>/ is present", async () => {
    const root = await newTempDir("found");
    await seedManifest(root, "qfai-prototyping", ["playwright"]);
    await mkdir(path.join(root, "node_modules", "playwright"), { recursive: true });
    const findings = await probeSkillManifestRuntimeDeps(root, "qfai-prototyping");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.status).toBe("found");
  });
});

// Regression: "manifest declares zero deps" and "this skill has no
// manifest at all" MUST stay distinguishable at the probe boundary —
// collapsing them let a typo'd `--profile <skill>` report healthy.
describe("probeSkillManifest — manifest state is reported separately from findings", () => {
  it("reports manifest=found with zero findings when runtimeDependencies is []", async () => {
    const root = await newTempDir("state-empty");
    await seedManifest(root, "qfai-atdd", []);
    const result = await probeSkillManifest(root, "qfai-atdd");
    expect(result.manifest).toBe("found");
    expect(result.skillDirExists).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("reports manifest=found when the manifest omits the field entirely", async () => {
    const root = await newTempDir("state-nofield");
    const dir = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "manifest.json"),
      JSON.stringify({ name: "qfai-atdd" }),
      "utf-8",
    );
    const result = await probeSkillManifest(root, "qfai-atdd");
    expect(result.manifest).toBe("found");
    expect(result.findings).toEqual([]);
  });

  it("reports manifest=absent (not found) when the skill directory does not exist", async () => {
    const root = await newTempDir("state-typo");
    await seedManifest(root, "qfai-atdd", []);
    const result = await probeSkillManifest(root, "qfai-atdd-typo");
    expect(result.manifest).toBe("absent");
    expect(result.skillDirExists).toBe(false);
    expect(result.manifestPath).toContain("qfai-atdd-typo");
    expect(result.findings).toEqual([]);
  });

  it("reports manifest=absent with skillDirExists=true when only the manifest is missing", async () => {
    const root = await newTempDir("state-nomanifest");
    await mkdir(path.join(root, ".qfai", "assistant", "skills", "qfai-atdd"), { recursive: true });
    const result = await probeSkillManifest(root, "qfai-atdd");
    expect(result.manifest).toBe("absent");
    expect(result.skillDirExists).toBe(true);
  });

  it("reports manifest=unreadable — not absent — when the read itself fails", async () => {
    const root = await newTempDir("state-unreadable");
    // A directory in place of manifest.json makes readFile throw
    // EISDIR: the manifest path is occupied, so nothing was probed and
    // "absent" would hide the fault as a missing declaration.
    await mkdir(path.join(root, ".qfai", "assistant", "skills", "qfai-atdd", "manifest.json"), {
      recursive: true,
    });
    const result = await probeSkillManifest(root, "qfai-atdd");
    expect(result.manifest).toBe("unreadable");
    expect(result.skillDirExists).toBe(true);
    expect(result.findings).toEqual([]);
  });

  // Regression: the skill "directory" being a regular file is a
  // filesystem fault, not a missing manifest. `access()` alone said the
  // skill dir existed, and the read failed with ENOTDIR (POSIX) /
  // ENOENT (Windows) — both of which used to land on `absent`, so
  // doctor warned "no manifest" and autoremediate said "not found".
  it("reports manifest=unreadable when the skill directory is a regular file", async () => {
    const root = await newTempDir("state-skilldir-file");
    const skillsRoot = path.join(root, ".qfai", "assistant", "skills");
    await mkdir(skillsRoot, { recursive: true });
    await writeFile(path.join(skillsRoot, "qfai-atdd"), "not a directory", "utf-8");
    const result = await probeSkillManifest(root, "qfai-atdd");
    expect(result.manifest).toBe("unreadable");
    expect(result.skillDirExists).toBe(false);
    expect(result.skillsRootExists).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("reports manifest=unreadable when the skills root itself is a regular file", async () => {
    const root = await newTempDir("state-skillsroot-file");
    await mkdir(path.join(root, ".qfai", "assistant"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "assistant", "skills"), "not a directory", "utf-8");
    const result = await probeSkillManifest(root, "qfai-atdd");
    expect(result.manifest).toBe("unreadable");
    expect(result.skillDirExists).toBe(false);
    expect(result.skillsRootExists).toBe(false);
    expect(result.findings).toEqual([]);
  });

  it("separates a missing skills root from a missing skill inside an existing root", async () => {
    const uninitialized = await newTempDir("state-noroot");
    const noRoot = await probeSkillManifest(uninitialized, "qfai-atdd");
    expect(noRoot.manifest).toBe("absent");
    expect(noRoot.skillsRootExists).toBe(false);
    expect(noRoot.skillDirExists).toBe(false);

    const initialized = await newTempDir("state-root");
    await seedManifest(initialized, "qfai-atdd", []);
    const typo = await probeSkillManifest(initialized, "qfai-atdd-typo");
    expect(typo.manifest).toBe("absent");
    expect(typo.skillsRootExists).toBe(true);
    expect(typo.skillDirExists).toBe(false);
  });

  it("reports manifest=unparseable for invalid JSON and for a non-array field", async () => {
    const root = await newTempDir("state-bad");
    const dir = path.join(root, ".qfai", "assistant", "skills", "qfai-atdd");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "manifest.json"), "{ not json", "utf-8");
    expect((await probeSkillManifest(root, "qfai-atdd")).manifest).toBe("unparseable");

    await writeFile(
      path.join(dir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: "playwright" }),
      "utf-8",
    );
    expect((await probeSkillManifest(root, "qfai-atdd")).manifest).toBe("unparseable");
  });
});
