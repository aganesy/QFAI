// QFAI:SPEC-0006:TC-0006-0024
//
// Integration: `qfai doctor --profile <skill>` reads the skill's
// manifest.json `runtimeDependencies` and probes the consumer
// project's node_modules for each entry. Missing deps are surfaced as
// findings with an `npm install <name>` install command.

import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runDoctor } from "../../../../src/cli/commands/doctor.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-skillprofile-${label}-`));
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

type DoctorJson = {
  checks: Array<{
    id: string;
    severity: "ok" | "info" | "warning" | "error";
    message: string;
    details?: Record<string, unknown>;
  }>;
  summary: { ok: number; info: number; warning: number; error: number };
};

async function seedManifest(root: string, skill: string, deps: string[]): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skills", skill);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "manifest.json"),
    JSON.stringify({ runtimeDependencies: deps }, null, 2),
    "utf-8",
  );
}

describe("doctor --profile <skill> probes manifest runtimeDependencies", () => {
  it("missing dep reported with install command", async () => {
    const root = await newTempDir("missing");
    await seedManifest(root, "qfai-prototyping", ["playwright"]);
    const outPath = path.join(root, ".qfai", "report", "doctor.json");

    const exit = await runDoctor({
      root,
      rootExplicit: true,
      format: "json",
      outPath,
      skillProfile: "qfai-prototyping",
    });
    // A missing runtime dependency is an `error` finding, and doctor's
    // failure policy now comes from `validation.failOn` (shipped default
    // `error`) rather than from the `--fail-on` flag alone — so a bare
    // run over this tree exits 1. Opting out takes `--fail-on never`.
    expect(exit).toBe(1);

    const data = JSON.parse(await readFile(outPath, "utf-8")) as DoctorJson;
    const finding = data.checks.find((check) => check.id === "skill.runtimeDependencies");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toMatch(/playwright/u);
    expect(finding?.message).toMatch(/npm install playwright/u);
  });

  it("installed dep reported as ok with no missing list", async () => {
    const root = await newTempDir("found");
    await seedManifest(root, "qfai-prototyping", ["playwright"]);
    await mkdir(path.join(root, "node_modules", "playwright"), { recursive: true });
    const outPath = path.join(root, ".qfai", "report", "doctor.json");

    const exit = await runDoctor({
      root,
      rootExplicit: true,
      format: "json",
      outPath,
      skillProfile: "qfai-prototyping",
    });
    expect(exit).toBe(0);

    const data = JSON.parse(await readFile(outPath, "utf-8")) as DoctorJson;
    const finding = data.checks.find((check) => check.id === "skill.runtimeDependencies");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("ok");
  });

  it("probes BOTH node_modules/.bin/<name> AND node_modules/<name>/", async () => {
    const root = await newTempDir("probe-paths");
    await seedManifest(root, "qfai-prototyping", ["playwright"]);
    // Only seed the .bin shim (no package dir).
    await mkdir(path.join(root, "node_modules", ".bin"), { recursive: true });
    const shim = path.join(
      root,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "playwright.cmd" : "playwright",
    );
    await writeFile(shim, "#!/bin/sh\necho 0\n", "utf-8");
    const outPath = path.join(root, ".qfai", "report", "doctor.json");

    await runDoctor({
      root,
      rootExplicit: true,
      format: "json",
      outPath,
      skillProfile: "qfai-prototyping",
    });
    const data = JSON.parse(await readFile(outPath, "utf-8")) as DoctorJson;
    const finding = data.checks.find((check) => check.id === "skill.runtimeDependencies");
    expect(finding?.severity).toBe("ok");
  });
});

// Regression: `[ok]` must mean "a manifest was located and it declares
// zero runtimeDependencies" — never "nothing was probed". A typo'd or
// renamed `--profile <skill>` previously produced the same green line
// as a real skill.
describe("doctor --profile <skill> does not report [ok] when nothing was probed", () => {
  async function runAndFind(root: string, skill: string): Promise<DoctorJson["checks"][number]> {
    const outPath = path.join(root, ".qfai", "report", "doctor.json");
    await runDoctor({ root, rootExplicit: true, format: "json", outPath, skillProfile: skill });
    const data = JSON.parse(await readFile(outPath, "utf-8")) as DoctorJson;
    const finding = data.checks.find((check) => check.id === "skill.runtimeDependencies");
    if (!finding) throw new Error("expected a skill.runtimeDependencies check");
    return finding;
  }

  it("errors on a skill name with no skill directory (typo'd --profile)", async () => {
    const root = await newTempDir("typo");
    await seedManifest(root, "qfai-prototyping", []);
    const finding = await runAndFind(root, "qfai-prototypingg");
    expect(finding.severity).toBe("error");
    expect(finding.message).toMatch(/unknown skill 'qfai-prototypingg'/u);
    expect(finding.details?.skillDirExists).toBe(false);
  });

  it("warns when the skill exists but has authored no manifest", async () => {
    const root = await newTempDir("nomanifest");
    await mkdir(path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping"), {
      recursive: true,
    });
    const finding = await runAndFind(root, "qfai-prototyping");
    expect(finding.severity).toBe("warning");
    expect(finding.message).toMatch(/no manifest for skill 'qfai-prototyping'/u);
    expect(finding.message).toMatch(/manifest\.json/u);
  });

  it("stays [ok] — and names the manifest — when a manifest declares zero deps", async () => {
    const root = await newTempDir("zero-deps");
    await seedManifest(root, "qfai-prototyping", []);
    const finding = await runAndFind(root, "qfai-prototyping");
    expect(finding.severity).toBe("ok");
    expect(finding.message).toMatch(/declares no runtimeDependencies/u);
    expect(finding.details?.manifestPath).toMatch(/manifest\.json/u);
  });

  it("warns about the missing skills root instead of blaming --profile", async () => {
    // Uninitialized project: every skill name resolves to a missing
    // directory, so "unknown skill / check --profile" would be a
    // misdiagnosis, and `--fail-on error` must not trip on it.
    const root = await newTempDir("noskillsroot");
    const finding = await runAndFind(root, "qfai-atdd");
    expect(finding.severity).toBe("warning");
    expect(finding.message).not.toMatch(/unknown skill/u);
    expect(finding.message).toMatch(/skills root/u);
    expect(finding.message).toMatch(/qfai init/u);
    expect(finding.details?.skillsRootExists).toBe(false);
  });

  it("errors when the manifest path exists but cannot be read", async () => {
    const root = await newTempDir("unreadable");
    await mkdir(
      path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping", "manifest.json"),
      { recursive: true },
    );
    const finding = await runAndFind(root, "qfai-prototyping");
    expect(finding.severity).toBe("error");
    expect(finding.message).toMatch(/could not be read/u);
    expect(finding.details?.manifest).toBe("unreadable");
  });

  // Regression: `<skillsRoot>/<skill>` being a regular file is a broken
  // filesystem, not "this skill authored no manifest" — it must not
  // land on the `warning` that a manifest-less skill directory gets.
  it("errors when the skill directory is a regular file, not a directory", async () => {
    const root = await newTempDir("skilldir-file");
    const skillsRoot = path.join(root, ".qfai", "assistant", "skills");
    await mkdir(skillsRoot, { recursive: true });
    await writeFile(path.join(skillsRoot, "qfai-prototyping"), "not a directory", "utf-8");
    const finding = await runAndFind(root, "qfai-prototyping");
    expect(finding.severity).toBe("error");
    expect(finding.message).toMatch(/could not be read/u);
    expect(finding.message).not.toMatch(/no manifest for skill/u);
    expect(finding.details?.manifest).toBe("unreadable");
    expect(finding.details?.skillDirExists).toBe(false);
  });

  it("errors when the manifest exists but cannot be parsed", async () => {
    const root = await newTempDir("unparseable");
    const dir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "manifest.json"), "{ not json", "utf-8");
    const finding = await runAndFind(root, "qfai-prototyping");
    expect(finding.severity).toBe("error");
    expect(finding.message).toMatch(/not JSON/u);
  });
});

async function _existsHelperFootnote(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
void _existsHelperFootnote;
