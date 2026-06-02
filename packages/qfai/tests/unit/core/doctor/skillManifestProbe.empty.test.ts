// QFAI:SPEC-0006:TC-0006-0025
//
// Boundary: a skill manifest declaring `runtimeDependencies: []` MUST
// yield zero probe findings — no false positives, even when the
// consumer project has no node_modules at all.

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { probeSkillManifestRuntimeDeps } from "../../../../src/core/doctor/skillManifestProbe.js";

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
