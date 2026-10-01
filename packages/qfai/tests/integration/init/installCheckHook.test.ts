/**
 * Integration: the prompt-time hook that says qfai is not installed in this checkout.
 *
 * `npx qfai` walks up from the project, so a fresh clone or a new nested worktree with no install
 * runs whatever copy a parent directory holds, or fetches one. The hook looks for this checkout's
 * own launcher, up to the git root and no further, and prints the remedy when there is none.
 */
// QFAI:AC-0001-0196-14
// QFAI:EX-0001-0196-50
// QFAI:EX-0001-0196-51
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { INSTALL_CHECK_HOOK_MARKER } from "../../../src/core/claudeCodeHooks.js";
import { runOnEveryShell } from "../../helpers/codexHookShells.js";
import { runReminderHook } from "../../helpers/reminderHooks.js";
import { EXIT_ZERO } from "../../helpers/spawnCaptured.js";
import { removeTempTree } from "../../helpers/tempTree.js";

// tests/integration/init/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const INIT = path.join(packageRoot, "assets", "init");
const SHIPPED_MESSAGES = path.join(INIT, "root", ".agents", "rules", "reminders.json");

type Entry = Record<string, unknown>;

/** The one entry carrying the install-check marker in a shipped hook file. */
async function installCheckEntry(file: string): Promise<Entry> {
  const parsed: unknown = JSON.parse(await readFile(path.join(INIT, file), "utf-8"));
  const hooks: unknown =
    typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "hooks") : undefined;
  const groups: unknown =
    typeof hooks === "object" && hooks !== null
      ? Reflect.get(hooks, "UserPromptSubmit")
      : undefined;
  if (!Array.isArray(groups)) throw new Error(`${file} has no prompt groups`);
  const found: Entry[] = [];
  for (const group of groups) {
    const entries: unknown =
      typeof group === "object" && group !== null ? Reflect.get(group, "hooks") : undefined;
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        Reflect.get(entry, "statusMessage") === INSTALL_CHECK_HOOK_MARKER
      ) {
        found.push({ ...entry });
      }
    }
  }
  expect(found, `${file} carries one install check`).toHaveLength(1);
  return found[0] ?? {};
}

function argsOf(entry: Entry): string[] {
  const args = entry.args;
  if (!Array.isArray(args)) throw new Error("entry has no args");
  return args.map(String);
}

/** A directory with a git marker and the shipped message file, as a project root. */
async function project(root: string, gitMarker: "dir" | "file" | "none" = "dir"): Promise<string> {
  await mkdir(path.join(root, ".agents", "rules"), { recursive: true });
  await copyFile(SHIPPED_MESSAGES, path.join(root, ".agents", "rules", "reminders.json"));
  if (gitMarker === "dir") await mkdir(path.join(root, ".git"), { recursive: true });
  else if (gitMarker === "file")
    await writeFile(path.join(root, ".git"), "gitdir: elsewhere\n", "utf-8");
  return root;
}

async function launcherIn(dir: string): Promise<void> {
  await mkdir(path.join(dir, "node_modules", ".bin"), { recursive: true });
  await writeFile(path.join(dir, "node_modules", ".bin", "qfai"), "#!/bin/sh\n", "utf-8");
}

/** What the message carries: the two remedies, in the order the preflight states them. */
function expectRemedy(stdout: string): void {
  const payload: unknown = JSON.parse(stdout);
  const output: unknown =
    typeof payload === "object" && payload !== null
      ? Reflect.get(payload, "hookSpecificOutput")
      : null;
  const context: unknown =
    typeof output === "object" && output !== null ? Reflect.get(output, "additionalContext") : null;
  expect(context).toEqual(expect.stringContaining("install command"));
  expect(context).toEqual(expect.stringContaining("`npm i -D qfai`"));
}

describe("the install check of the Claude Code settings", () => {
  it("prints the remedy only where this checkout has no launcher, and looks no further up than its git root", async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), "qfai install check "));
    try {
      const entry = await installCheckEntry(path.join(".claude", "settings.json"));
      const run = (dir: string): Promise<string> =>
        runReminderHook({ command: "node", args: argsOf(entry) }, dir);

      // No install at all.
      const bare = await project(path.join(base, "bare"));
      expectRemedy(await run(bare));

      // A launcher in this checkout, and Plug'n'Play in another.
      const installed = await project(path.join(base, "installed"));
      await launcherIn(installed);
      expect(await run(installed)).toBe("");
      const pnp = await project(path.join(base, "pnp"));
      await writeFile(path.join(pnp, ".pnp.cjs"), "", "utf-8");
      expect(await run(pnp)).toBe("");

      // A project below its git root finds the launcher at the root.
      const monorepo = path.join(base, "monorepo");
      await mkdir(path.join(monorepo, ".git"), { recursive: true });
      await launcherIn(monorepo);
      const app = await project(path.join(monorepo, "packages", "app"), "none");
      expect(await run(app)).toBe("");

      // A fresh nested worktree: a launcher in a parent checkout does not count.
      await launcherIn(base);
      const worktree = await project(path.join(base, "worktrees", "fresh"), "file");
      expectRemedy(await run(worktree));
    } finally {
      await removeTempTree(base);
    }
  });
});

describe("the install check of the Codex hook file", () => {
  it("prints the same under every shell, from a subdirectory", async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), "qfai codex check & (x) "));
    try {
      const entry = await installCheckEntry(path.join(".codex", "hooks.json"));
      const bare = await project(path.join(base, "bare"));
      const installed = await project(path.join(base, "installed"));
      await launcherIn(installed);
      for (const [root, printsRemedy] of [
        [bare, true],
        [installed, false],
      ] as const) {
        const cwd = path.join(root, "src", "deep");
        await mkdir(cwd, { recursive: true });
        const outputs: string[] = [];
        for (const { shell, result } of await runOnEveryShell(entry, cwd, "{}")) {
          expect(result.outcome, `${shell}: ${result.stderr}`).toBe(EXIT_ZERO);
          expect(result.stderr, shell).toBe("");
          outputs.push(result.stdout);
        }
        expect(new Set(outputs).size).toBe(1);
        if (printsRemedy) expectRemedy(outputs[0] ?? "");
        else expect(outputs[0]).toBe("");
      }
    } finally {
      await removeTempTree(base);
    }
  });
});
