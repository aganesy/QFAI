/**
 * Integration: concrete `qfai doctor` examples of BF-0003 that no older suite
 * asserts — configuration discovery and loading, output routing, the Playwright
 * npx fallback, the advisory grouping, review-pack TTL, and the line-ending
 * basis of `workflows.integrity`.
 */
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { runInit } from "../../src/cli/commands/init.js";
import { createDoctorData } from "../../src/core/doctor.js";
import type { DoctorData } from "../../src/core/doctor.js";
import {
  adopterWorkflowPath,
  quietUnrelatedWarnings,
  useAdopterTreePool,
} from "../helpers/workflowsIntegrityFixtures.js";
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
  it("prints root, config, checks and summary as text and names the found config", async () => {
    // QFAI:EX-0003-0001-01
    const root = await newTempDir("text");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    const output = await captureStdout(async () => {
      await runDoctor({ root, rootExplicit: true, format: "text", failOn: "never" });
    });
    expect(output).toMatch(/^qfai doctor: root=.+ config=.*qfai\.config\.yaml \(found\)/mu);
    expect(output).toMatch(/^\[ok\] config\.search: /mu);
    expect(output).toMatch(/^summary: ok=\d+ info=\d+ warning=\d+ error=\d+$/mu);
  });

  it("reports a present config as found and names its path", async () => {
    // QFAI:EX-0003-0001-05
    const root = await newTempDir("found");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    const data = await doctorJson(root);
    expect(data.config.found).toBe(true);
    expect(path.basename(data.config.configPath)).toBe("qfai.config.yaml");
    expect(check(data, "config.search")?.severity).toBe("ok");
  });

  it("finds the root in an ancestor when --root is not given", async () => {
    // QFAI:EX-0003-0001-06
    const root = await newTempDir("ancestor");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    const nested = path.join(root, "a", "b");
    await mkdir(nested, { recursive: true });
    const data = await doctorJson(nested, false);
    expect(path.resolve(data.root)).toBe(path.resolve(root));
    expect(data.config.found).toBe(true);
  });

  it("grades an invalid config as an error naming the offending key", async () => {
    // QFAI:AC-0003-0001-03
    // QFAI:EX-0003-0001-07
    const root = await newTempDir("invalid");
    await put(root, "qfai.config.yaml", "paths:\n  - .qfai/spec\n");
    const data = await doctorJson(root);
    const load = check(data, "config.load");
    expect(load?.severity).toBe("error");
    const issues = (load?.details as { issues?: Array<{ message: string }> } | undefined)?.issues;
    expect(issues?.some((issue) => issue.message.includes("paths"))).toBe(true);
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

  it("does not warn when the default prompt directory is absent", async () => {
    // QFAI:EX-0003-0004-04
    const root = await newTempDir("prompts");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    await rm(path.join(root, ".qfai", "assistant", "prompt"), { recursive: true, force: true });
    const data = await doctorJson(root);
    expect(check(data, "paths.promptsDirDeprecated")?.severity).not.toBe("warning");
  });
});

describe("BF-0003 output routing", () => {
  it("prints root, config, checks and summary as JSON", async () => {
    // QFAI:EX-0003-0005-01
    const root = await newTempDir("json");
    await put(root, "qfai.config.yaml", "paths:\n  specsDir: .qfai/spec\n");
    const data = await doctorJson(root);
    expect(Object.keys(data)).toEqual(
      expect.arrayContaining(["root", "config", "checks", "summary"]),
    );
  });

  it("writes the report to --out and prints only the wrote line", async () => {
    // QFAI:EX-0003-0005-02
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

  it("prints an absolute path for a relative --out", async () => {
    // QFAI:EX-0003-0005-04
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

  it("creates missing parent directories of --out", async () => {
    // QFAI:EX-0003-0005-03
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

describe("BF-0003 Playwright npx fallback", () => {
  it("resolves playwright through npx when no local launcher exists", async () => {
    // QFAI:EX-0003-0006-05
    const root = await newTempDir("npx");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    await seedShim(path.join(root, "node_modules", ".bin"), "playwright-cli");
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
    expect(check(data, "D-DEPRECATED-PROBE")).toBeUndefined();
  });
});

describe("BF-0003 skill manifest location", () => {
  it("reads the manifest from a configured skills directory", async () => {
    // QFAI:EX-0003-0010-03
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

async function mutateSkill(root: string): Promise<void> {
  const target = path.join(root, ".qfai", "assistant", "skill", "qfai-atdd", "SKILL.md");
  const original = await readFile(target, "utf-8");
  await writeFile(target, `${original}\n<!-- drift sentinel -->\n`, "utf-8");
}

describe("BF-0003 advisory grouping", () => {
  it("keeps the prototyping error blocking and routes drift warnings to the advisory group", async () => {
    // QFAI:EX-0003-0007-02
    const root = await newTempDir("groups");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    await mutateSkill(root);
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
    expect(errors).not.toContain("skills.integrity");
    expect(advisory).toMatch(/^\[warning\] skills\.integrity: /mu);
    expect(advisory).toMatch(/^\[warning\] paths\.specsDir: /mu);
  });

  it("fails --fail-on warning on skills.integrity drift alone", async () => {
    // QFAI:EX-0003-0007-03
    const root = await newTempDir("skills-warning");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    await quietUnrelatedWarnings(root);
    await mutateSkill(root);
    const outPath = path.join(root, ".qfai", "report", "doctor.json");
    const exitCode = await runDoctor({
      root,
      rootExplicit: true,
      format: "json",
      outPath,
      failOn: "warning",
    });
    const data = JSON.parse(await readFile(outPath, "utf-8")) as DoctorData;
    const blocking = data.checks.filter((entry) => ["warning", "error"].includes(entry.severity));
    expect(blocking.map((entry) => entry.id)).toEqual(["skills.integrity"]);
    expect(check(data, "skills.integrity")?.severity).toBe("warning");
    expect(exitCode).toBe(1);
  });
});

describe("BF-0003 failure threshold", () => {
  it("fails --fail-on warning on an error alone", async () => {
    // QFAI:AC-0003-0012-03
    // QFAI:EX-0003-0012-03
    const dir = await pool.seedAdopterTree();
    await quietUnrelatedWarnings(dir);
    const agentDir = path.join(dir, ".qfai", "assistant", "agent");
    const agents = (await readdir(agentDir)).filter(
      (name) => name.endsWith(".md") && name !== "README.md",
    );
    await writeFile(
      path.join(agentDir, agents[0] ?? "missing.md"),
      "---\nname: [unterminated\ndescription: broken\n---\n\nbody\n",
      "utf-8",
    );
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

describe("BF-0003 review-pack TTL", () => {
  async function cleanAgedPack(config: string): Promise<{ pack: string; archived: string }> {
    const root = await newTempDir("ttl");
    await put(root, "qfai.config.yaml", config);
    const name = "review-20260501000000000";
    const pack = path.join(root, ".qfai", "review", name);
    await put(pack, "summary.md", "# Review\n");
    const aged = new Date(Date.now() - 26 * 24 * 60 * 60 * 1000);
    await utimes(pack, aged, aged);
    await captureStdout(async () => {
      await runDoctor({ root, rootExplicit: true, format: "text", clean: true, failOn: "never" });
    });
    return { pack, archived: path.join(root, ".qfai", "review", "_archive", name) };
  }

  it("keeps a 26-day-old pack when review.staleTtlDays is 30", async () => {
    // QFAI:EX-0003-0008-03
    const kept = await cleanAgedPack("review:\n  staleTtlDays: 30\n");
    await expect(readFile(path.join(kept.pack, "summary.md"), "utf-8")).resolves.toContain(
      "Review",
    );
    // Control: under the default TTL the same pack is archived.
    const moved = await cleanAgedPack("paths:\n  specsDir: .qfai/spec\n");
    await expect(readFile(path.join(moved.archived, "summary.md"), "utf-8")).resolves.toContain(
      "Review",
    );
  });
});

describe("BF-0003 workflows.integrity line-ending basis", () => {
  it("treats a line-ending-only difference as no drift", async () => {
    // QFAI:EX-0003-0011-12
    const dir = await pool.seedAdopterTree();
    const file = adopterWorkflowPath(dir, "qfai-tests.yml");
    const body = await readFile(file, "utf-8");
    const flipped = body.includes("\r\n")
      ? body.replace(/\r\n/gu, "\n")
      : body.replace(/\n/gu, "\r\n");
    expect(flipped).not.toBe(body);
    await writeFile(file, flipped, "utf-8");
    const data = await createDoctorData({ startDir: dir, rootExplicit: true });
    const integrity = data.checks.filter((entry) => entry.id === "workflows.integrity");
    expect(integrity).toHaveLength(1);
    expect(integrity[0]?.severity).toBe("ok");
  });
});
