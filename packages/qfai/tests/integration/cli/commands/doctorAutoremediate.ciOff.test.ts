// QFAI:AC-0003-0009-02
//
// Error/boundary: `qfai doctor --autoremediate` is disabled in CI by
// default (the `isCiEnvironment()` path) and surfaces the
// "autoremediate disabled in CI" line without performing any remediation.
// The `--dry-run` flag preview-only path performs zero side effects on
// install / run-log removal.
//
// BR-CLI-0008-0015 speaks of "standard CI env vars", with
// `CI=true` given only as an example, so the CLI-level cases below pin the
// kill-switch to the convention (any truthy `CI`, plus `GITHUB_ACTIONS`)
// rather than to one spelling.

import {
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAutoremediate } from "../../../../src/core/doctor/autoremediate.js";
import { runDoctor } from "../../../../src/cli/commands/doctor.js";
import { pathExists } from "../../../helpers/pathExists.js";
import { recordAssistantVersion } from "../../../helpers/assistantVersion.js";
import {
  canCreateSymlink,
  SHIPPED_SKILL,
  wireProject,
} from "../../../helpers/integrationWrapperFixture.js";

const tempDirs: string[] = [];

async function newTempDir(label: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), `qfai-doctor-ci-${label}-`));
  tempDirs.push(dir);
  // A project carries the document-schema lane; doctor reports its absence as an error.
  await mkdir(path.join(dir, ".github", "workflows"), { recursive: true });
  await writeFile(path.join(dir, ".github", "workflows", "qfai-docs.yml"), "name: qfai-docs\n");
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

/** One run log past the TTL and one from today; returns the stale one. */
async function seedStaleRunLogs(root: string): Promise<string> {
  const staleRun = path.join(root, ".qfai", "report", "run-20260401120000001");
  await mkdir(staleRun, { recursive: true });
  await mkdir(path.join(root, ".qfai", "report", "run-20260811120000002"), { recursive: true });
  const aged = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await utimes(staleRun, aged, aged);
  return staleRun;
}

// QFAI:EX-0003-0009-02
describe("doctor --autoremediate CI-off / --dry-run side-effect gates", () => {
  it("CI=true short-circuits with 'autoremediate disabled in CI'", async () => {
    const root = await newTempDir("ci");
    await writeFile(path.join(root, "qfai.config.yaml"), "report:\n  keepLatestRuns: 1\n", "utf-8");
    const staleRun = await seedStaleRunLogs(root);

    const summary = await runAutoremediate({
      root,
      dryRun: false,
      yes: true,
      isCi: true,
    });

    expect(summary.disabledInCi).toBe(true);
    expect(summary.lines.join("\n")).toContain("autoremediate disabled in CI");
    // No prune despite the stale run log.
    expect(await pathExists(staleRun)).toBe(true);
    expect(summary.installed).toEqual([]);
    expect(summary.prunedRunLogs).toEqual([]);
  });

  // QFAI:EX-0003-0009-05
  it("--dry-run yields no install / run-log removal side effects", async () => {
    const root = await newTempDir("dry");
    // Seed skill manifest declaring a missing dep.
    const manifestDir = path.join(root, ".qfai", "assistant", "skill", "qfai-prototyping");
    await mkdir(manifestDir, { recursive: true });
    await recordAssistantVersion(root);
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({ runtimeDependencies: ["playwright"] }, null, 2),
      "utf-8",
    );
    const configPath = path.join(root, "qfai.config.yaml");
    await writeFile(configPath, "report:\n  keepLatestRuns: 1\n", "utf-8");
    const originalConfig = await readFile(configPath, "utf-8");
    const staleRun = await seedStaleRunLogs(root);

    const installCalls: string[] = [];
    const summary = await runAutoremediate({
      root,
      dryRun: true,
      yes: true,
      isCi: false,
      skill: "qfai-prototyping",
      installRunner: async (name) => {
        installCalls.push(name);
      },
    });

    expect(summary.disabledInCi).toBe(false);
    // No install side effect.
    expect(installCalls).toEqual([]);
    expect(summary.installed).toEqual([]);
    // No run-log removal: the stale run is still there.
    expect(await pathExists(staleRun)).toBe(true);
    expect(await readFile(configPath, "utf-8")).toBe(originalConfig);
    // The plan is reported in the future tense.
    const dryRunLines = summary.lines.join("\n");
    expect(dryRunLines).toMatch(/dry-run/u);
    expect(dryRunLines).toContain("autoremediate: would run npm install");
    expect(dryRunLines).toContain("autoremediate: would prune run logs=1");
  });
});

// Regression: the CLI used to compute `isCi` as
// `process.env["CI"] === "true"`, an exact comparison that read the
// conventional truthy-by-presence spellings (`CI=1`, Vercel's default) as
// "local". Under those the full mutating path ran on a CI checkout: the
// root `.gitignore` was rewritten and run logs pruned — precisely what
// AC-0006-0018 forbids. `GITHUB_ACTIONS`
// was not consulted at all.
describe("doctor --autoremediate CI detection follows the convention", () => {
  const CI_ENV_KEYS = ["CI", "GITHUB_ACTIONS"] as const;
  const savedCiEnv = new Map<(typeof CI_ENV_KEYS)[number], string | undefined>();

  const setCiEnv = (key: (typeof CI_ENV_KEYS)[number], value: string | undefined): void => {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- literal union key
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  };

  beforeEach(() => {
    for (const key of CI_ENV_KEYS) {
      savedCiEnv.set(key, process.env[key]);
      setCiEnv(key, undefined);
    }
  });

  afterEach(() => {
    for (const key of CI_ENV_KEYS) {
      setCiEnv(key, savedCiEnv.get(key));
    }
    savedCiEnv.clear();
  });

  type CiEnv = Partial<Record<(typeof CI_ENV_KEYS)[number], string>>;
  type Case = { label: string; env: CiEnv };

  async function runInEnv(label: string, env: CiEnv): Promise<boolean> {
    const root = await newTempDir(label.replace(/[= ]/gu, "-"));
    await writeFile(
      path.join(root, "qfai.config.yaml"),
      "paths:\n  specsDir: .qfai/specs\n",
      "utf-8",
    );
    for (const key of CI_ENV_KEYS) {
      setCiEnv(key, env[key]);
    }
    const exit = await runDoctor({
      root,
      rootExplicit: true,
      format: "json",
      outPath: path.join(root, ".qfai", "report", "doctor.json"),
      autoremediate: true,
      yes: true,
    });
    expect(exit).toBe(0);
    return pathExists(path.join(root, ".gitignore"));
  }

  const ciCases: Case[] = [
    { label: "CI=true", env: { CI: "true" } },
    { label: "CI=1", env: { CI: "1" } },
    { label: "CI=yes", env: { CI: "yes" } },
    { label: "GITHUB_ACTIONS=true", env: { GITHUB_ACTIONS: "true" } },
  ];

  const localCases: Case[] = [
    { label: "CI unset", env: {} },
    { label: "CI=false", env: { CI: "false" } },
    { label: "CI=0", env: { CI: "0" } },
    { label: "CI empty", env: { CI: "" } },
  ];

  for (const { label, env } of ciCases) {
    // QFAI:EX-0003-0009-04 (the GITHUB_ACTIONS=true case)
    // QFAI:EX-0003-0009-07
    it(`${label} leaves the root .gitignore untouched`, async () => {
      expect(await runInEnv(label, env)).toBe(false);
    });
  }

  for (const { label, env } of localCases) {
    // QFAI:EX-0003-0009-03 (the CI=false case)
    it(`${label} still remediates (the guard must not swallow local runs)`, async () => {
      expect(await runInEnv(label, env)).toBe(true);
    });
  }

  // QFAI:AC-0003-0009-06
  // QFAI:EX-0003-0009-16
  // QFAI:EX-0003-0009-17
  it("previews and repairs managed wrappers while preserving project-owned entries", async (test) => {
    const root = await newTempDir("wrapper");
    if (!(await canCreateSymlink(root))) test.skip();
    await wireProject(root);
    await recordAssistantVersion(root);
    const wrapper = path.join(root, ".claude", "skills", SHIPPED_SKILL);
    const missingWrapper = path.join(root, ".agents", "skills", SHIPPED_SKILL);
    const agent = "architecture-reviewer";
    const agentWrapper = path.join(root, ".github", "agents", `${agent}.agent.md`);
    const healthyWrapper = path.join(root, ".claude", "agents", `${agent}.md`);
    const backup = `${healthyWrapper}.qfai-repair-4242`;
    const heldLink = path.join(backup, `${agent}.md`);
    const agentSource = path.join(root, ".qfai", "assistant", "agent", `${agent}.md`);
    const projectFile = path.join(root, ".codex", "skills", SHIPPED_SKILL);
    const projectDir = path.join(root, ".github", "skills", SHIPPED_SKILL);
    const projectNote = path.join(projectDir, "notes.md");
    const canonicalTarget = await readlink(wrapper);
    const canonicalAgentTarget = path.relative(path.dirname(agentWrapper), agentSource);
    const legacyAgentTarget = path.join("..", "..", ".qfai", "assistant", "agents", `${agent}.md`);
    const wrongTarget = path.join("..", "..", "missing-skill");
    const wrongAgentTarget = path.join("..", "..", "missing-agent.md");
    const projectContent = "project-owned instructions\n";
    await rm(wrapper);
    await rm(missingWrapper);
    await symlink(wrongTarget, wrapper, "dir");
    await writeFile(agentSource, "# canonical agent\n", "utf-8");
    await symlink(wrongAgentTarget, agentWrapper, "file");
    await symlink(canonicalAgentTarget, healthyWrapper, "file");
    await mkdir(backup);
    await symlink(legacyAgentTarget, heldLink, "file");
    await rm(projectFile);
    await writeFile(projectFile, projectContent, "utf-8");
    await rm(projectDir);
    await mkdir(projectDir);
    await writeFile(projectNote, projectContent, "utf-8");

    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const run = (dryRun: boolean): Promise<number> =>
      runDoctor({
        root,
        rootExplicit: true,
        autoremediate: true,
        dryRun,
        format: "json",
        failOn: "never",
      });
    const output = (): string => stderr.mock.calls.map(([chunk]) => String(chunk)).join("");
    try {
      expect(await run(true)).toBe(0);
      expect(output()).toContain(`would relink .claude/skills/${SHIPPED_SKILL}`);
      expect(output()).toContain(`would relink .agents/skills/${SHIPPED_SKILL}`);
      expect(output()).toContain(`would relink .github/agents/${agent}.agent.md`);
      expect(output()).toContain(`would relink .claude/agents/${agent}.md.qfai-repair-4242`);
      expect(await readlink(wrapper)).toBe(wrongTarget);
      await expect(readlink(missingWrapper)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readlink(agentWrapper)).toBe(wrongAgentTarget);
      expect(await readlink(healthyWrapper)).toBe(canonicalAgentTarget);
      expect(await readlink(heldLink)).toBe(legacyAgentTarget);
      expect(await readFile(projectFile, "utf-8")).toBe(projectContent);
      expect(await readFile(projectNote, "utf-8")).toBe(projectContent);

      stderr.mockClear();
      expect(await run(false)).toBe(0);
      expect(output()).toContain(`relinked .claude/skills/${SHIPPED_SKILL}`);
      expect(output()).toContain(`relinked .agents/skills/${SHIPPED_SKILL}`);
      expect(output()).toContain(`relinked .github/agents/${agent}.agent.md`);
      expect(output()).toContain(`relinked .claude/agents/${agent}.md.qfai-repair-4242`);
      expect(await readlink(wrapper)).toBe(canonicalTarget);
      expect(await readlink(missingWrapper)).toBe(canonicalTarget);
      expect(await readlink(agentWrapper)).toBe(canonicalAgentTarget);
      expect(await readlink(healthyWrapper)).toBe(canonicalAgentTarget);
      expect(await pathExists(backup)).toBe(false);
      expect(await readFile(projectFile, "utf-8")).toBe(projectContent);
      expect(await readFile(projectNote, "utf-8")).toBe(projectContent);
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
  });
});
