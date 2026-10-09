/**
 * Integration: concrete `qfai doctor` examples of BF-0003 that no older suite
 * asserts — configuration discovery and loading, output routing, the Playwright
 * npx fallback and the advisory grouping.
 */
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { runInit } from "../../src/cli/commands/init.js";
import { createDoctorData } from "../../src/core/doctor.js";
import type { DoctorData } from "../../src/core/doctor.js";
import { quietUnrelatedWarnings, useAdopterTreePool } from "../helpers/doctorFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

const isWin = process.platform === "win32";
const tempDirs: string[] = [];
const pool = useAdopterTreePool();

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-bf0003-doctor-${label}-`));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf-8");
}

async function doctorJson(root: string, rootExplicit = true): Promise<DoctorData> {
  const output = await captureStdout(async () => {
    await runDoctor({ root, rootExplicit, format: "json", failOn: "never" });
  });
  return JSON.parse(output) as DoctorData;
}

function check(data: DoctorData, id: string): DoctorData["checks"][number] | undefined {
  return data.checks.find((entry) => entry.id === id);
}

async function withPath<T>(value: string, task: () => Promise<T>): Promise<T> {
  const saved = process.env.PATH;
  process.env.PATH = value;
  try {
    return await task();
  } finally {
    process.env.PATH = saved;
  }
}

describe("BF-0003 configuration discovery and loading", () => {
  // QFAI:EX-0003-0001-01
  it("prints root, config, checks and summary as text and names the found config", async () => {
    const root = await newTempDir("text");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    const output = await captureStdout(async () => {
      await runDoctor({ root, rootExplicit: true, format: "text", failOn: "never" });
    });
    expect(output).toMatch(/^qfai doctor: root=.+ config=.*qfai\.config\.yaml \(found\)/mu);
    expect(output).toMatch(/^\[ok\] config\.search: /mu);
    expect(output).toMatch(/^summary: ok=\d+ info=\d+ warning=\d+ error=\d+$/mu);
  });

  // QFAI:EX-0003-0001-05
  it("reports a present config as found and names its path", async () => {
    const root = await newTempDir("found");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    const data = await doctorJson(root);
    expect(data.config.found).toBe(true);
    expect(path.basename(data.config.configPath)).toBe("qfai.config.yaml");
    expect(check(data, "config.search")?.severity).toBe("ok");
  });

  // QFAI:EX-0003-0001-06
  it("finds the root in an ancestor when --root is not given", async () => {
    const root = await newTempDir("ancestor");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    const nested = path.join(root, "a", "b");
    await mkdir(nested, { recursive: true });
    const data = await doctorJson(nested, false);
    expect(path.resolve(data.root)).toBe(path.resolve(root));
    expect(data.config.found).toBe(true);
  });

  // QFAI:EX-0003-0001-07
  it("grades an invalid config as an error naming the offending key", async () => {
    // QFAI:AC-0003-0001-03
    const root = await newTempDir("invalid");
    await put(root, "qfai.config.yaml", "paths:\n  - .qfai/spec\n");
    const data = await doctorJson(root);
    const load = check(data, "config.load");
    expect(load?.severity).toBe("error");
    const issues = (load?.details as { issues?: Array<{ message: string }> } | undefined)?.issues;
    expect(issues?.some((issue) => issue.message.includes("paths"))).toBe(true);
  });

  // QFAI:EX-0003-0001-08
  it("lists every loader issue on the single config.load line of the text output", async () => {
    // QFAI:AC-0003-0001-03
    const root = await newTempDir("invalid-text");
    await put(root, "qfai.config.yaml", "paths:\n  - .qfai/spec\nvalidation:\n  failOn: bogus\n");
    const issues = (
      check(await doctorJson(root), "config.load")?.details as
        { issues?: Array<{ message: string }> } | undefined
    )?.issues;
    expect(issues?.length).toBeGreaterThan(1);

    const text = await captureStdout(async () => {
      await runDoctor({ root, rootExplicit: true, format: "text", failOn: "never" });
    });
    const lines = text.split("\n").filter((line) => line.includes("config.load"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("[error]");
    for (const issue of issues ?? []) {
      expect(lines[0]).toContain(issue.message);
    }
  });

  it("lists a loader issue whole when its key holds a decoded newline", async () => {
    // QFAI:AC-0003-0001-03
    const root = await newTempDir("invalid-newline");
    await put(root, "qfai.config.yaml", 'reviewProfiles:\n  "a\\nb": 5\n');
    const load = check(await doctorJson(root), "config.load");
    expect(load?.message).toContain("reviewProfiles.a\\x0ab must be an entry");
  });

  it("lists every loader issue in the config.load message, past the tenth", async () => {
    // QFAI:AC-0003-0001-03
    const root = await newTempDir("invalid-many");
    const entries = Array.from({ length: 25 }, (_, index) => `  p${index}: 5\n`).join("");
    await put(root, "qfai.config.yaml", `reviewProfiles:\n${entries}`);
    const load = check(await doctorJson(root), "config.load");
    const issues = (load?.details as { issues?: Array<{ message: string }> } | undefined)?.issues;
    expect(issues?.length).toBeGreaterThanOrEqual(25);
    expect(load?.message).toContain("reviewProfiles.p0 must be an entry");
    for (const issue of issues ?? []) {
      expect(load?.message).toContain(issue.message);
    }
    expect(load?.message).toContain("reviewProfiles.p24 must be an entry");
  });

  it("lists a loader issue whole when its key holds two decoded newlines in a row", async () => {
    // QFAI:AC-0003-0001-03
    const root = await newTempDir("invalid-blank-line");
    await put(root, "qfai.config.yaml", 'reviewProfiles:\n  "a\\n\\nb": 5\n');
    const load = check(await doctorJson(root), "config.load");
    expect(load?.message).toContain("reviewProfiles.a\\x0a\\x0ab must be an entry");
  });

  it("cuts a very long rejected value in the config.load message and keeps it whole in details", async () => {
    // QFAI:AC-0003-0001-03
    const root = await newTempDir("invalid-long-value");
    await put(
      root,
      "qfai.config.yaml",
      `prototyping:\n  execution:\n    browserTool: ${"x".repeat(5000)}\n`,
    );
    const load = check(await doctorJson(root), "config.load");
    const issues = (load?.details as { issues?: Array<{ message: string }> } | undefined)?.issues;
    const toolIssue = issues?.find((issue) =>
      issue.message.startsWith("prototyping.execution.browserTool"),
    );
    expect(toolIssue?.message.length).toBeGreaterThan(5000);
    const message = load?.message ?? "";
    const listed = message.slice(message.indexOf(": ", message.indexOf("issue(s)")) + 2);
    const listedTool = listed
      .split("; ")
      .find((part) => part.startsWith("prototyping.execution.browserTool"));
    expect(listedTool).toHaveLength(500);
    expect(listedTool).toContain("prototyping.execution.browserTool must be");
    expect(listedTool).toContain(" ... ");
    expect(listedTool?.endsWith('x"')).toBe(true);
  });

  it("keeps a listed issue within 500 characters as displayed when its key is all escapes", async () => {
    // QFAI:AC-0003-0001-03
    const root = await newTempDir("invalid-escapes");
    // A YAML implicit key may run to 1024 characters, so 150 escapes of six fit.
    const key = "\\u2028".repeat(150);
    await put(root, "qfai.config.yaml", `reviewProfiles:\n  "${key}": 5\n`);
    const load = check(await doctorJson(root), "config.load");
    const message = load?.message ?? "";
    const listed = message.slice(message.indexOf(": ", message.indexOf("issue(s)")) + 2);
    const part = listed.split("; ").find((entry) => entry.startsWith("reviewProfiles."));
    expect(part?.length).toBeLessThanOrEqual(500);
    expect(part).toContain(" ... ");
    expect(part?.endsWith(" must be an entry.")).toBe(true);
    expect(/\\(?!u2028)/.test(part ?? "")).toBe(false);
  });

  it("keeps the source excerpt out of the message for a config with CRLF line endings", async () => {
    // QFAI:AC-0003-0001-03
    const root = await newTempDir("invalid-crlf");
    await put(root, "qfai.config.yaml", "paths: {specsDir: topsecret-value\r\n");
    const load = check(await doctorJson(root), "config.load");
    expect(load?.message).not.toContain("topsecret-value");
  });

  it("keeps the source excerpt of a YAML parse error out of the config.load message", async () => {
    // QFAI:AC-0003-0001-03
    const root = await newTempDir("invalid-excerpt");
    await put(root, "qfai.config.yaml", "paths: {specsDir: topsecret-value\n");
    const load = check(await doctorJson(root), "config.load");
    const issues = (load?.details as { issues?: Array<{ message: string }> } | undefined)?.issues;
    expect(issues?.some((issue) => issue.message.includes("topsecret-value"))).toBe(true);
    expect(load?.message).not.toContain("topsecret-value");
  });

  it("warns about a missing non-default specs directory and names it", async () => {
    // QFAI:EX-0003-0002-01
    const root = await newTempDir("specs");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: specs-custom\n");
    const data = await doctorJson(root);
    const specs = check(data, "paths.specsDir");
    expect(specs?.severity).toBe("warning");
    expect(String((specs?.details as { path?: unknown } | undefined)?.path)).toContain(
      "specs-custom",
    );
  });
});

describe("BF-0003 output routing", () => {
  // QFAI:EX-0003-0005-01
  it("prints root, config, checks and summary as JSON", async () => {
    const root = await newTempDir("json");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    const data = await doctorJson(root);
    expect(Object.keys(data)).toEqual(
      expect.arrayContaining(["root", "config", "checks", "summary"]),
    );
  });

  // QFAI:EX-0003-0005-02
  it("writes the report to --out and prints only the wrote line", async () => {
    const root = await newTempDir("out");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    const outPath = path.join(root, "doctor.json");
    const stdout = await captureStdout(async () => {
      await runDoctor({ root, rootExplicit: true, format: "json", outPath, failOn: "never" });
    });
    expect(stdout.trim()).toBe(`doctor: wrote ${outPath}`);
    const written = JSON.parse(await readFile(outPath, "utf-8")) as DoctorData;
    expect(written.summary).toBeDefined();
  });

  // QFAI:EX-0003-0005-04
  it("prints an absolute path for a relative --out", async () => {
    const root = await newTempDir("relative");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    const stdout = await captureStdout(async () => {
      await runDoctor({
        root,
        rootExplicit: true,
        format: "json",
        outPath: "doctor.json",
        failOn: "never",
      });
    });
    const printed = stdout.trim().replace(/^doctor: wrote /u, "");
    expect(stdout.trim()).toMatch(/^doctor: wrote /u);
    expect(path.isAbsolute(printed)).toBe(true);
    const written = JSON.parse(await readFile(printed, "utf-8")) as DoctorData;
    expect(written.summary).toBeDefined();
  });

  // QFAI:EX-0003-0005-03
  it("creates missing parent directories of --out", async () => {
    const root = await newTempDir("nested");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    const outPath = path.join(root, "missing", "nested", "doctor.json");
    await captureStdout(async () => {
      await runDoctor({ root, rootExplicit: true, format: "json", outPath, failOn: "never" });
    });
    const written = JSON.parse(await readFile(outPath, "utf-8")) as DoctorData;
    expect(written.checks.length).toBeGreaterThan(0);
  });
});

/** Writes an executable that prints a version: a `.cmd` shim on Windows, a shell script elsewhere. */
async function seedShim(dir: string, name: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  if (isWin) {
    await writeFile(path.join(dir, `${name}.cmd`), "@echo off\r\necho 1.52.0\r\n", "utf-8");
    return;
  }
  const target = path.join(dir, name);
  await writeFile(target, "#!/bin/sh\necho 1.52.0\n", "utf-8");
  await chmod(target, 0o755);
}

/** Writes an executable that exits non-zero: a `.cmd` shim on Windows, a shell script elsewhere. */
async function seedFailingShim(dir: string, name: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  if (isWin) {
    await writeFile(path.join(dir, `${name}.cmd`), "@echo off\r\nexit /b 1\r\n", "utf-8");
    return;
  }
  const target = path.join(dir, name);
  await writeFile(target, "#!/bin/sh\nexit 1\n", "utf-8");
  await chmod(target, 0o755);
}

/** Runs the prototyping doctor with `binDir` as the whole PATH and returns the launcher findings. */
async function launcherFindings(
  root: string,
  binDir: string,
): Promise<{
  launcher: DoctorData["checks"][number] | undefined;
}> {
  const data = await withPath(binDir, async () => {
    const outPath = path.join(root, ".qfai", "report", "doctor.json");
    await runDoctor({ root, rootExplicit: true, format: "json", outPath, profile: "prototyping" });
    return JSON.parse(await readFile(outPath, "utf-8")) as DoctorData;
  });
  return {
    launcher: check(data, "prototyping.playwrightCli"),
  };
}

describe("BF-0003 Playwright launcher stage order", () => {
  // QFAI:AC-0003-0006-01
  it("reports the project-local playwright when every stage could resolve", async () => {
    const root = await newTempDir("stage-primary");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const localBin = path.join(root, "node_modules", ".bin");
    await seedShim(localBin, "playwright");
    const binDir = await newTempDir("stage-primary-bin");
    await seedShim(binDir, "npx");

    const { launcher } = await launcherFindings(root, binDir);
    expect(launcher?.severity).toBe("ok");
    const details = launcher?.details as
      { resolvedStage?: string; executable?: string } | undefined;
    expect(details?.resolvedStage).toBe("primary");
    expect(String(details?.executable ?? "")).toMatch(/playwright(\.cmd)?$/u);
  });

  // QFAI:AC-0003-0006-01
  it("falls through to npx when the project-local playwright does not run", async () => {
    const root = await newTempDir("stage-fallthrough");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const localBin = path.join(root, "node_modules", ".bin");
    await seedFailingShim(localBin, "playwright");
    const binDir = await newTempDir("stage-fallthrough-bin");
    await seedShim(binDir, "npx");

    const { launcher } = await launcherFindings(root, binDir);
    expect(launcher?.severity).toBe("ok");
    expect((launcher?.details as { resolvedStage?: string } | undefined)?.resolvedStage).toBe(
      "npx-fallback",
    );
  });
});

describe("BF-0003 Playwright npx fallback", () => {
  // QFAI:EX-0003-0006-05
  // QFAI:AC-0003-0006-01
  it("resolves playwright through npx when no local launcher exists", async () => {
    const root = await newTempDir("npx");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const binDir = await newTempDir("npx-bin");
    await seedShim(binDir, "npx");
    const data = await withPath(binDir, async () => {
      const outPath = path.join(root, ".qfai", "report", "doctor.json");
      await runDoctor({
        root,
        rootExplicit: true,
        format: "json",
        outPath,
        profile: "prototyping",
      });
      return JSON.parse(await readFile(outPath, "utf-8")) as DoctorData;
    });
    const launcher = check(data, "prototyping.playwrightCli");
    expect((launcher?.details as { resolvedStage?: string } | undefined)?.resolvedStage).toBe(
      "npx-fallback",
    );
  });
});

describe("BF-0003 skill manifest location", () => {
  // QFAI:EX-0003-0010-03
  it("reads the manifest from a configured skills directory", async () => {
    const root = await newTempDir("skills-dir");
    await put(root, "qfai.config.yaml", "paths:\n  skillsDir: .qfai/assistant/skill-custom\n");
    await put(
      root,
      ".qfai/assistant/skill-custom/qfai-prototyping/manifest.json",
      JSON.stringify({ runtimeDependencies: ["playwright"] }),
    );
    const outPath = path.join(root, ".qfai", "report", "doctor.json");
    await runDoctor({
      root,
      rootExplicit: true,
      format: "json",
      outPath,
      skillProfile: "qfai-prototyping",
      failOn: "never",
    });
    const data = JSON.parse(await readFile(outPath, "utf-8")) as DoctorData;
    const finding = check(data, "skill.runtimeDependencies");
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toMatch(/npm install playwright/u);
    expect(JSON.stringify(finding?.details ?? {})).toContain("skill-custom");
  });
});

describe("BF-0003 advisory grouping", () => {
  // QFAI:AC-0003-0007-02
  // QFAI:EX-0003-0007-02
  it("keeps the prototyping error blocking and routes drift warnings to the advisory group", async () => {
    const root = await newTempDir("groups");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const configPath = path.join(root, "qfai.config.yaml");
    const config = await readFile(configPath, "utf-8");
    await writeFile(configPath, config.replace(/specsDir: \S+/u, "specsDir: specs-custom"));
    const outPath = path.join(root, ".qfai", "report", "doctor.txt");
    await withPath("", () =>
      runDoctor({ root, rootExplicit: true, format: "text", outPath, profile: "prototyping" }),
    );
    const text = await readFile(outPath, "utf-8");
    const [, afterErrors = ""] = text.split("== errors blocking the active profile ==");
    const [errors = "", advisory = ""] = afterErrors.split("== warnings advisory of drift ==");
    expect(errors).toMatch(/^\[error\] /mu);
    expect(advisory).toMatch(/^\[warning\] paths\.specsDir: /mu);
  });
});

/** A seeded adopter tree whose only non-ok finding is one corrupted agent file (an error). */
async function treeWithOneError(): Promise<string> {
  const dir = await pool.seedAdopterTree();
  await quietUnrelatedWarnings(dir);
  // The package does not ship this file, so the break is not also a drift warning.
  await writeFile(
    path.join(dir, ".qfai", "assistant", "agent", "broken-agent.md"),
    "---\nname: [unterminated\ndescription: broken\n---\n\nbody\n",
    "utf-8",
  );
  return dir;
}

describe("BF-0003 failure threshold", () => {
  // QFAI:EX-0003-0012-04
  it("follows validation.failOn when --fail-on is omitted, and never opts out", async () => {
    // QFAI:AC-0003-0012-04
    const dir = await treeWithOneError();
    const config = await readFile(path.join(dir, "qfai.config.yaml"), "utf-8");
    expect(config).not.toMatch(/failOn:\s*(?:warning|never)/u);
    const data = await createDoctorData({ startDir: dir, rootExplicit: true });
    expect(data.summary.error).toBeGreaterThan(0);
    const outPath = path.join(dir, ".qfai", "report", "doctor.json");
    const omitted = await runDoctor({ root: dir, rootExplicit: true, format: "json", outPath });
    expect(omitted).toBe(1);
    const never = await runDoctor({
      root: dir,
      rootExplicit: true,
      format: "json",
      outPath,
      failOn: "never",
    });
    expect(never).toBe(0);
  });

  // QFAI:EX-0003-0012-03
  it("fails --fail-on warning on an error alone", async () => {
    // QFAI:AC-0003-0012-03
    const dir = await treeWithOneError();
    const data = await createDoctorData({ startDir: dir, rootExplicit: true });
    expect(data.summary.warning).toBe(0);
    expect(data.summary.error).toBeGreaterThan(0);
    const exitCode = await runDoctor({
      root: dir,
      rootExplicit: true,
      format: "json",
      outPath: path.join(dir, ".qfai", "report", "doctor.json"),
      failOn: "warning",
    });
    expect(exitCode).toBe(1);
  });
});
