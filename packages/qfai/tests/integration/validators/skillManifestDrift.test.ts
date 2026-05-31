// QFAI:SPEC-0006:TC-0006-0026
//
// Pair III SSOT-sync: when the probe implementation references the
// canonical manifest field name AND the manifest schema reference does
// likewise, the pair is symmetric and no finding fires. If one side
// drops the canonical token while the other retains it, the asymmetric
// state surfaces as `R-SKILL-MANIFEST-DRIFT` (severity error).

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  detectSkillManifestDrift,
  SKILL_MANIFEST_PAIRS,
} from "../../../src/core/validators/skillManifestDrift.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-skillmanifestdrift-${label}-`));
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

async function writePackageFile(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf-8");
}

describe("detectSkillManifestDrift — SSOT-sync Pair III", () => {
  it("symmetric (both sides reference canonical field) → no findings", async () => {
    const root = await newTempDir("symmetric");
    const pair = SKILL_MANIFEST_PAIRS[0];
    if (!pair) throw new Error("expected at least one pair");
    await writePackageFile(
      root,
      pair.probeImplRel,
      `// uses ${pair.probeToken}\nexport const x = 1;\n`,
    );
    await writePackageFile(
      root,
      pair.schemaRel,
      `// declares ${pair.schemaToken}\nexport const y = 1;\n`,
    );
    const issues = await detectSkillManifestDrift(root);
    expect(issues).toEqual([]);
  });

  it("probe references token but schema does NOT → asymmetric → R-SKILL-MANIFEST-DRIFT", async () => {
    const root = await newTempDir("probe-only");
    const pair = SKILL_MANIFEST_PAIRS[0];
    if (!pair) throw new Error("expected at least one pair");
    await writePackageFile(
      root,
      pair.probeImplRel,
      `// uses ${pair.probeToken}\nexport const x = 1;\n`,
    );
    await writePackageFile(
      root,
      pair.schemaRel,
      `// no token here\nexport const y = 1;\n`,
    );
    const issues = await detectSkillManifestDrift(root);
    expect(issues.length).toBeGreaterThan(0);
    const finding = issues.find((iss) => iss.code === "R-SKILL-MANIFEST-DRIFT");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toMatch(/R-SKILL-MANIFEST-DRIFT/u);
    expect(finding?.message.length).toBeGreaterThan(20);
  });

  it("schema declares token but probe drops it → asymmetric → R-SKILL-MANIFEST-DRIFT", async () => {
    const root = await newTempDir("schema-only");
    const pair = SKILL_MANIFEST_PAIRS[0];
    if (!pair) throw new Error("expected at least one pair");
    await writePackageFile(root, pair.probeImplRel, `// no token\nexport const x = 1;\n`);
    await writePackageFile(
      root,
      pair.schemaRel,
      `// declares ${pair.schemaToken}\nexport const y = 1;\n`,
    );
    const issues = await detectSkillManifestDrift(root);
    expect(issues.find((iss) => iss.code === "R-SKILL-MANIFEST-DRIFT")).toBeDefined();
  });

  it("symmetric absence (neither side has the token) → no findings", async () => {
    const root = await newTempDir("neither");
    const pair = SKILL_MANIFEST_PAIRS[0];
    if (!pair) throw new Error("expected at least one pair");
    await writePackageFile(root, pair.probeImplRel, `// no token\nexport const x = 1;\n`);
    await writePackageFile(root, pair.schemaRel, `// no token\nexport const y = 1;\n`);
    const issues = await detectSkillManifestDrift(root);
    expect(issues).toEqual([]);
  });

  it("missing source files no-op (consumer repo without the package) → no findings", async () => {
    const root = await newTempDir("absent");
    const issues = await detectSkillManifestDrift(root);
    expect(issues).toEqual([]);
  });
});
