/**
 * Acceptance of what `qfai init` distributes into a project, run through the
 * command itself: the agent symlinks, the wrapper prune, the git symlink
 * setting, the Copilot instruction files and the assistant-tree layers.
 */

import { execFile as execFileCb } from "node:child_process";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { parse as parseYaml } from "yaml";
import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const execFile = promisify(execFileCb);
const roots: string[] = [];

async function sandbox(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-distribution-"));
  roots.push(root);
  return root;
}

async function initProject(): Promise<string> {
  const root = await sandbox();
  await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

/** The bullet paths one run-report section lists, named by its header line. */
function sectionPaths(output: string, header: string): string[] {
  const lines = output.split("\n");
  const start = lines.indexOf(header);
  if (start === -1) return [];
  const bullet = "    - ";
  const paths: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith(bullet)) break;
    paths.push(line.slice(bullet.length).trim());
  }
  return paths;
}

/** A wrapper body shaped like the ones init once wrote: it delegates to the canonical doc. */
function generatedCommandBody(stem: string): string {
  return [
    "---",
    `description: "QFAI: ${stem}"`,
    "---",
    "Follow the canonical QFAI prompt exactly:",
    `@.qfai/assistant/prompts/${stem}.md`,
    "",
  ].join("\n");
}

function generatedPromptBody(stem: string): string {
  return [
    "---",
    `description: "QFAI: ${stem}"`,
    "---",
    "1) Open and follow the canonical QFAI prompt:",
    `- .qfai/assistant/prompts/${stem}.md`,
    "",
  ].join("\n");
}

describe("init distribution: agents and wrappers", () => {
  // QFAI:AC-0001-0025-01
  it("links every canonical agent card from both hosts and writes no README beside them", async () => {
    const root = await initProject();
    const agentDir = path.join(root, ".qfai", "assistant", "agent");
    const cards = (await readdir(agentDir))
      .filter((name) => name.endsWith(".md") && name !== "README.md")
      .sort();
    expect(cards.length).toBeGreaterThan(0);

    for (const card of cards) {
      const name = card.slice(0, -".md".length);
      const canonical = await realpath(path.join(agentDir, card));
      for (const link of [
        path.join(root, ".claude", "agents", `${name}.md`),
        path.join(root, ".github", "agents", `${name}.agent.md`),
      ]) {
        expect((await lstat(link)).isSymbolicLink(), link).toBe(true);
        expect(await realpath(link), link).toBe(canonical);
      }
    }

    for (const dir of [".agents", ".codex", ".claude/agents", ".github/agents"]) {
      expect(await exists(path.join(root, ...dir.split("/"), "README.md")), dir).toBe(false);
    }
  });

  // QFAI:AC-0001-0027-01
  it("prunes generated wrappers on --force and leaves adopter-owned entries alone", async () => {
    const root = await initProject();
    const generated = [
      [path.join(root, ".claude", "commands", "qfai-spec.md"), generatedCommandBody("qfai-spec")],
      [
        path.join(root, ".github", "prompts", "qfai-spec.prompt.md"),
        generatedPromptBody("qfai-spec"),
      ],
    ] as const;
    const adopter = [
      [path.join(root, ".claude", "commands", "qfai-release.md"), "project command\n"],
      [path.join(root, ".github", "prompts", "qfai-release.prompt.md"), "project prompt\n"],
      [path.join(root, ".codex", "skills", "custom-skill", "SKILL.md"), "project skill\n"],
    ] as const;
    for (const [file, text] of [...generated, ...adopter]) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, text, "utf-8");
    }
    const oldSkill = path.join(root, ".codex", "skills", "qfai-configure");
    await rm(oldSkill, { recursive: true, force: true });
    await mkdir(oldSkill, { recursive: true });
    await writeFile(path.join(oldSkill, "SKILL.md"), "old wrapper\n", "utf-8");

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    for (const [file] of generated) {
      expect(await exists(file), file).toBe(false);
    }
    expect((await lstat(oldSkill)).isSymbolicLink()).toBe(true);
    for (const [file, text] of adopter) {
      expect(await readFile(file, "utf-8"), file).toBe(text);
    }
  });
});

describe("init distribution: git symlink setting", () => {
  // QFAI:AC-0001-0028-01
  it("sets core.symlinks inside a git repository and reports nothing outside one", async () => {
    const repo = await sandbox();
    await execFile("git", ["init"], { cwd: repo });
    // Shadow any true in the user's global config so the write is observable.
    await execFile("git", ["config", "--local", "core.symlinks", "false"], { cwd: repo });

    await captureStdout(() => runInit({ dir: repo, force: false, dryRun: false, yes: true }));
    const { stdout } = await execFile("git", ["config", "--local", "--get", "core.symlinks"], {
      cwd: repo,
    });
    expect(stdout.trim()).toBe("true");

    const outside = await sandbox();
    const insideRepository = await execFile("git", ["rev-parse", "--git-dir"], {
      cwd: outside,
    }).then(
      () => true,
      () => false,
    );
    if (insideRepository) return; // The temporary directory happens to sit inside a repository.

    const output = await captureStdout(() =>
      runInit({ dir: outside, force: false, dryRun: false, yes: true }),
    );
    expect(output).not.toContain("core.symlinks");
    expect(await exists(path.join(outside, ".git"))).toBe(false);
  });

  // QFAI:AC-0001-0028-02
  it("stops with Developer Mode guidance when Windows refuses a symlink after the probe", async () => {
    const root = await sandbox();
    let calls = 0;

    await expect(
      runInit(
        { dir: root, force: false, dryRun: false, yes: true },
        {
          platform: "win32",
          // The first call is the scratch-directory probe; the refusal comes from the
          // first symlink the run writes into the project.
          createSymlink: () => {
            calls += 1;
            return calls === 1
              ? Promise.resolve()
              : Promise.reject(Object.assign(new Error("not permitted"), { code: "EPERM" }));
          },
        },
      ),
    ).rejects.toThrow(
      /Failed to create a symlink \(EPERM\)\.[\s\S]*Developer Mode has to be enabled[\s\S]*https:\/\/learn\.microsoft\.com\/windows\/apps\/get-started\/enable-your-device-for-development/,
    );
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});

describe("init distribution: Copilot instruction files", () => {
  // QFAI:AC-0001-0029-01
  it("creates the Copilot repository instructions citing every shipped rule master", async () => {
    const root = await initProject();
    const text = await readFile(path.join(root, ".github", "copilot-instructions.md"), "utf-8");
    expect(text.startsWith("# QFAI repository instructions (Copilot)\n")).toBe(true);

    const masters = (await readdir(path.join(getInitAssetsDir(), "root", ".agents", "rules")))
      .filter((name) => name.endsWith(".md"))
      .sort();
    expect(masters.length).toBeGreaterThan(0);
    const cited = text
      .split("\n")
      .filter((line) => line.startsWith("- `.agents/rules/"))
      .map((line) => /^- `\.agents\/rules\/([^`]+)`/.exec(line)?.[1]);
    expect([...cited].sort()).toEqual(masters);
  });

  // QFAI:AC-0001-0029-02
  it("keeps an adopter-authored Copilot instructions file", async () => {
    const root = await sandbox();
    const file = path.join(root, ".github", "copilot-instructions.md");
    const authored = "# House rules\n\nUse tabs and keep the diff small.\n";
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, authored, "utf-8");

    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

    expect(await readFile(file, "utf-8")).toContain(authored);
  });

  // QFAI:AC-0001-0030-01
  it("creates both review instruction files, each opening with YAML front matter", async () => {
    const root = await initProject();
    const dir = path.join(root, ".github", "instructions");
    expect((await readdir(dir)).sort()).toEqual([
      "code-review.instructions.md",
      "principles.instructions.md",
    ]);

    for (const name of ["code-review.instructions.md", "principles.instructions.md"]) {
      const text = await readFile(path.join(dir, name), "utf-8");
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
      expect(match, name).not.toBeNull();
      expect(parseYaml(match?.[1] ?? ""), name).toEqual({
        applyTo: "**/*",
        excludeAgent: "coding-agent",
      });
    }
  });

  // QFAI:AC-0001-0030-02
  it("leaves existing review instruction files unchanged and reports them as skipped", async () => {
    const root = await sandbox();
    const dir = path.join(root, ".github", "instructions");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "code-review.instructions.md"), "custom review\n", "utf-8");
    await writeFile(path.join(dir, "principles.instructions.md"), "", "utf-8");

    const output = await captureStdout(() =>
      runInit({ dir: root, force: false, dryRun: false, yes: true, verbose: true }),
    );

    expect(await readFile(path.join(dir, "code-review.instructions.md"), "utf-8")).toBe(
      "custom review\n",
    );
    expect(await readFile(path.join(dir, "principles.instructions.md"), "utf-8")).toBe("");
    const skipped = sectionPaths(output, "  skipped paths:");
    const written = sectionPaths(output, "  written paths:");
    for (const name of ["code-review.instructions.md", "principles.instructions.md"]) {
      expect(skipped).toContain(`.github/instructions/${name}`);
      expect(written).not.toContain(`.github/instructions/${name}`);
    }
  });

  // QFAI:AC-0001-0032-01
  it("prints the Copilot review activation guidance only when an instructions file is created", async () => {
    const root = await sandbox();
    const guidance = "To enable it: comment '@github-copilot review' on a PR, or";

    const first = await captureStdout(() =>
      runInit({ dir: root, force: false, dryRun: false, yes: true }),
    );
    expect(first).toContain("Created the instructions files for Copilot code review.");
    expect(first).toContain(guidance);

    const second = await captureStdout(() =>
      runInit({ dir: root, force: false, dryRun: false, yes: true }),
    );
    expect(second).not.toContain(guidance);

    await rm(path.join(root, ".github", "instructions", "principles.instructions.md"));
    const third = await captureStdout(() =>
      runInit({ dir: root, force: false, dryRun: false, yes: true }),
    );
    expect(third).toContain(guidance);
  });
});

describe("init distribution: assistant tree", () => {
  // QFAI:AC-0001-0034-01
  it("seeds the four assistant layers and none of the retired layer directories", async () => {
    const root = await initProject();
    const assistant = path.join(root, ".qfai", "assistant");

    for (const layer of ["rule", "skill", "agent", "prompt"]) {
      expect((await lstat(path.join(assistant, layer))).isDirectory(), layer).toBe(true);
    }
    for (const layer of ["rule", "agent"]) {
      const files = await readdir(path.join(assistant, layer));
      expect(files.filter((name) => name.endsWith(".md")).length, layer).toBeGreaterThan(0);
    }
    const skills = await readdir(path.join(assistant, "skill"));
    expect(skills).toContain("qfai-discussion");
    expect(await exists(path.join(assistant, "skill", "qfai-discussion", "SKILL.md"))).toBe(true);
    expect(
      (await lstat(path.join(assistant, "skill", "qfai-discussion", "references"))).isDirectory(),
    ).toBe(true);

    const entries = await readdir(assistant);
    for (const retired of ["constitution", "manifest", "catalog", "process"]) {
      expect(entries).not.toContain(retired);
    }
  });
});
