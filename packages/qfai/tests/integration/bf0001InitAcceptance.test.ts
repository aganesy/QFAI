/**
 * Acceptance tests for `qfai init`: a repeated run, a dry run, the skill links, a forced refresh of
 * the instructions files and the managed `.gitignore` block.
 *
 * Every case runs the real command against a temporary project and reads what it left on disk.
 */
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import {
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_MARKER,
} from "../../src/core/gitignore.js";
import { LANGUAGE_RULES_MARKER } from "../../src/core/instructionLanguageRules.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

const newTempDir = useTempDirPool("qfai-bf1-init-");

interface InitOptions {
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

async function init(dir: string, options: InitOptions = {}): Promise<string> {
  return captureStdout(() =>
    runInit({
      dir,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
      yes: true,
      verbose: options.verbose ?? false,
    }),
  );
}

/** The bullet paths under one run-report heading, with Windows separators folded to `/`. */
function reportSection(output: string, header: string): string[] {
  const lines = output.split("\n");
  const start = lines.indexOf(header);
  if (start === -1) return [];
  const bullet = "    - ";
  const paths: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith(bullet)) break;
    paths.push(line.slice(bullet.length).trim().replace(/\\/g, "/"));
  }
  return paths;
}

const gitignoreLines = async (dir: string): Promise<string[]> =>
  (await readFile(path.join(dir, ".gitignore"), "utf-8")).split(/\r?\n/);

const countOf = (lines: readonly string[], line: string): number =>
  lines.filter((candidate) => candidate === line).length;

const IGNORE_LINES = [".qfai/report/*", ".qfai/evidence/*", ".qfai/discussion/*", ".qfai/review/*"];

describe("BF-0001 init rerun, preview and links", () => {
  // QFAI:AC-0001-0021-01
  it("skips what already exists, adds what is missing and lists the skipped paths", async () => {
    const dir = await newTempDir();
    await init(dir);
    const config = path.join(dir, "qfai.config.yaml");
    const rule = path.join(dir, ".qfai", "assistant", "rule", "constitution.md");
    const instructions = path.join(dir, ".github", "instructions", "principles.instructions.md");
    await writeFile(config, "custom config\n", "utf-8");
    await writeFile(rule, "custom rule\n", "utf-8");
    await rm(instructions);

    const output = await init(dir, { verbose: true });

    expect(await readFile(config, "utf-8")).toBe("custom config\n");
    expect(await readFile(rule, "utf-8")).toBe("custom rule\n");
    expect((await lstat(instructions)).isFile()).toBe(true);
    const skipped = reportSection(output, "  skipped paths:");
    expect(skipped).toContain("qfai.config.yaml");
    expect(skipped).toContain(".qfai/assistant/rule/constitution.md");
    expect(skipped).not.toContain(".github/instructions/principles.instructions.md");
    expect(reportSection(output, "  written paths:")).toEqual([
      ".github/instructions/principles.instructions.md",
    ]);
  });

  // QFAI:AC-0001-0023-01
  it("lists the files a dry run would create and creates none", async () => {
    const dir = await newTempDir();

    const output = await init(dir, { dryRun: true });

    const planned = reportSection(output, "  would write paths:");
    expect(planned).toContain("qfai.config.yaml");
    expect(planned).toContain(".gitignore");
    expect(planned).toContain(".qfai/assistant/rule/constitution.md");
    expect(await readdir(dir)).toEqual([]);
  });

  // QFAI:AC-0001-0024-01
  it("links every shipped skill into the four host directories through a relative path under the assistant tree", async () => {
    const dir = await newTempDir();
    await init(dir);
    const shipped = path.join(getInitAssetsDir(), ".qfai", "assistant", "skill");
    const skills: string[] = [];
    for (const entry of await readdir(shipped, { withFileTypes: true })) {
      if (
        entry.isDirectory() &&
        (await lstat(path.join(shipped, entry.name, "SKILL.md")).catch(() => undefined))
      ) {
        skills.push(entry.name);
      }
    }
    expect(skills).toContain("qfai-sdd");

    const wrong: string[] = [];
    for (const host of [".claude/skills", ".github/skills", ".codex/skills", ".agents/skills"]) {
      for (const skill of skills) {
        const link = path.join(dir, ...host.split("/"), skill);
        if (!(await lstat(link)).isSymbolicLink()) {
          wrong.push(`${host}/${skill}: not a link`);
          continue;
        }
        const target = (await readlink(link)).replace(/\\/g, "/").replace(/\/$/, "");
        if (target !== `../../.qfai/assistant/skill/${skill}`) {
          wrong.push(`${host}/${skill}: ${target}`);
        }
        const canonical = await realpath(path.join(dir, ".qfai", "assistant", "skill", skill));
        if ((await realpath(link)) !== canonical)
          wrong.push(`${host}/${skill}: resolves elsewhere`);
      }
    }
    expect(wrong).toEqual([]);
  });

  // QFAI:AC-0001-0031-01
  it("regenerates both instructions files from the shipped templates under --force", async () => {
    const dir = await newTempDir();
    const instructions = path.join(dir, ".github", "instructions");
    await mkdir(instructions, { recursive: true });
    const names = ["code-review.instructions.md", "principles.instructions.md"];
    for (const name of names) {
      await writeFile(path.join(instructions, name), `STALE-COPY ${name}\n`, "utf-8");
    }

    await init(dir, { force: true });

    for (const name of names) {
      const shipped = await readFile(
        path.join(getInitAssetsDir(), ".github", "instructions", name),
        "utf-8",
      );
      // The template ends in a placeholder that init fills in, so the file is the text before it.
      const installed = await readFile(path.join(instructions, name), "utf-8");
      expect(installed, name).toContain("excludeAgent:");
      expect(installed, name).not.toContain("STALE-COPY");
      expect(installed, name).not.toContain(LANGUAGE_RULES_MARKER);
      expect(
        installed.startsWith((shipped.split(LANGUAGE_RULES_MARKER)[0] ?? "").trimEnd()),
        name,
      ).toBe(true);
    }
  });
});

describe("BF-0001 managed .gitignore block", () => {
  // QFAI:AC-0001-0033-01
  // QFAI:EX-0001-0033-01
  it("creates the block when the project has no .gitignore", async () => {
    const dir = await newTempDir();

    await init(dir);

    const lines = await gitignoreLines(dir);
    expect(countOf(lines, QFAI_GITIGNORE_MARKER)).toBe(1);
    for (const line of IGNORE_LINES) expect(countOf(lines, line), line).toBe(1);
    expect(lines.filter((line) => line.startsWith("!.qfai/evidence/"))).toEqual([]);

    // The ignore lines come first and the governance negations after them, so a later pattern wins.
    const lastIgnore = Math.max(...IGNORE_LINES.map((line) => lines.indexOf(line)));
    for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
      expect(lines.indexOf(negation), negation).toBeGreaterThan(lastIgnore);
    }
  });

  // QFAI:AC-0001-0033-01
  it("keeps the lines the project wrote outside the block", async () => {
    const dir = await newTempDir();
    await writeFile(path.join(dir, ".gitignore"), "node_modules/\n*.log\n", "utf-8");

    await init(dir);

    const lines = await gitignoreLines(dir);
    expect(countOf(lines, "node_modules/")).toBe(1);
    expect(countOf(lines, "*.log")).toBe(1);
    expect(countOf(lines, QFAI_GITIGNORE_MARKER)).toBe(1);
    for (const line of IGNORE_LINES) expect(countOf(lines, line), line).toBe(1);
  });
});
