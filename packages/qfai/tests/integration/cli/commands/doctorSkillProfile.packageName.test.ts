// A `runtimeDependencies` entry reaches a `node_modules` path and the
// `npm install` argument list, so the probe refuses any entry that is not a
// registry package name: shell text, an npm option, a path that climbs out of
// `node_modules`. Doctor reports the manifest as an error and probes nothing,
// and `--autoremediate` installs nothing from it.

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runDoctor } from "../../../../src/cli/commands/doctor.js";
import { runAutoremediate } from "../../../../src/core/doctor/autoremediate.js";
import {
  isRegistryPackageName,
  probeSkillManifest,
} from "../../../../src/core/doctor/skillManifestProbe.js";
import { isRecord } from "../../../../src/core/workflow/parse.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-skill-pkgname-${label}-`));
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

async function seedManifest(root: string, deps: readonly string[]): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "manifest.json"),
    JSON.stringify({ runtimeDependencies: deps }),
    "utf-8",
  );
}

const REFUSED = [
  "playwright & calc",
  "playwright; rm -rf ~",
  "$(touch pwned)",
  "--global",
  "-g",
  "../escape",
  "..",
  "Playwright",
  "playwright@1.2.3",
  "@scope/",
  "a".repeat(215),
];

// QFAI:AC-0003-0010-03
// QFAI:EX-0003-0010-04
describe("runtimeDependencies entries must be registry package names", () => {
  it.each(REFUSED)("refuses %j", (name) => {
    expect(isRegistryPackageName(name)).toBe(false);
  });

  it.each(["playwright", "@playwright/test", "lodash.merge", "a".repeat(214)])(
    "accepts %j",
    (name) => {
      expect(isRegistryPackageName(name)).toBe(true);
    },
  );

  it("probes no entry of a manifest that lists one refused name", async () => {
    const root = await newTempDir("probe");
    await seedManifest(root, ["playwright", "playwright & calc"]);
    const result = await probeSkillManifest(root, "qfai-prototyping");
    expect(result.manifest).toBe("invalid");
    expect(result.invalidNames).toEqual(["playwright & calc"]);
    expect(result.findings).toEqual([]);
  });

  it("reports the manifest as an error naming the refused entry", async () => {
    const root = await newTempDir("doctor");
    await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
    await writeFile(path.join(root, ".github", "workflows", "qfai-docs.yml"), "name: qfai-docs\n");
    await seedManifest(root, ["--global"]);
    const outPath = path.join(root, "doctor.json");
    await runDoctor({
      root,
      rootExplicit: true,
      format: "json",
      outPath,
      skillProfile: "qfai-prototyping",
    });
    const report: unknown = JSON.parse(await readFile(outPath, "utf-8"));
    if (!isRecord(report) || !Array.isArray(report["checks"])) {
      throw new Error("doctor report lacks a checks array");
    }
    const check: unknown = report["checks"].find(
      (entry: unknown) => isRecord(entry) && entry["id"] === "skill.runtimeDependencies",
    );
    if (!isRecord(check) || !isRecord(check["details"])) {
      throw new Error("expected a skill.runtimeDependencies check with details");
    }
    expect(check["severity"]).toBe("error");
    expect(check["message"]).toContain('"--global"');
    expect(check["message"]).toContain("not registry package names");
    expect(check["details"]["invalidNames"]).toEqual(["--global"]);
  });

  it("installs nothing from such a manifest under --autoremediate --yes", async () => {
    const root = await newTempDir("autoremediate");
    await seedManifest(root, ["$(touch pwned)"]);
    const installCalls: string[] = [];
    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: false,
      skill: "qfai-prototyping",
      installRunner: async (name) => {
        installCalls.push(name);
        await Promise.resolve();
      },
    });
    expect(installCalls).toEqual([]);
    expect(summary.installed).toEqual([]);
    expect(summary.failedInstalls).toEqual([]);
    expect(summary.lines).toContainEqual(
      expect.stringMatching(
        /not registry package names \("\$\(touch pwned\)"\).*nothing installed/u,
      ),
    );
  });
});
