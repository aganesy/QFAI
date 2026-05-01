import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validatePrototypingArtifactRefIntegrity } from "../../../src/core/validators/prototyping/refIntegrity.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-ref-integrity-"));
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

async function seedPrototypingJson(root: string, screenshot: string, html: string): Promise<void> {
  const dir = path.join(root, ".qfai", "evidence", "prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "prototyping.json"),
    JSON.stringify({
      schemaVersion: "3.0",
      specsCovered: ["0017"],
      iterations: [
        {
          index: 0,
          evidenceRefs: { screenshot, html },
        },
      ],
    }),
    "utf-8",
  );
}

describe("validatePrototypingArtifactRefIntegrity", () => {
  it("returns no issues when prototyping.json is missing", async () => {
    const root = await newTempDir();

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("returns no issues when iteration evidenceRefs point to existing files", async () => {
    const root = await newTempDir();
    const iterDir = path.join(root, ".qfai", "evidence", "prototyping", "iter-00");
    await mkdir(iterDir, { recursive: true });
    await writeFile(path.join(iterDir, "home.png"), "png", "utf-8");
    await writeFile(path.join(iterDir, "home.html"), "<html></html>", "utf-8");
    await seedPrototypingJson(
      root,
      ".qfai/evidence/prototyping/iter-00/home.png",
      ".qfai/evidence/prototyping/iter-00/home.html",
    );

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("emits QFAI-PROT2-009 when iteration evidenceRefs point to missing files", async () => {
    const root = await newTempDir();
    await seedPrototypingJson(
      root,
      ".qfai/evidence/prototyping/iter-00/missing.png",
      ".qfai/evidence/prototyping/iter-00/missing.html",
    );

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-PROT2-009", "QFAI-PROT2-009"]);
  });

  it("checks prototype-handoff artifact references when present", async () => {
    const root = await newTempDir();
    const handoffDir = path.join(root, ".qfai", "contracts", "design");
    await mkdir(handoffDir, { recursive: true });
    await writeFile(
      path.join(handoffDir, "prototype-handoff.yaml"),
      [
        'schemaVersion: "2.0"',
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'extractedDesignSystem: ".qfai/contracts/design/design-system.yaml"',
      ].join("\n"),
      "utf-8",
    );

    const issues = await validatePrototypingArtifactRefIntegrity(root, defaultConfig);
    expect(issues.map((issue) => issue.code)).toEqual(["QFAI-PROT2-009", "QFAI-PROT2-009"]);
  });
});
