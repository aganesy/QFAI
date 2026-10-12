/**
 * Integration: the prompt-time hook that says qfai is not installed in this checkout.
 *
 * `npx qfai` walks up from the project, so a fresh clone or a new nested worktree with no install
 * runs whatever copy a parent directory holds, or fetches one. The hook looks for this checkout's
 * own launcher, up to the git root and no further, and prints the remedy when there is none.
 */
// QFAI:AC-0001-0196-14
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { INSTALL_CHECK_HOOK_MARKER } from "../../../src/core/claudeCodeHooks.js";
import { runOnEveryShell } from "../../helpers/codexHookShells.js";
import { runReminderHook } from "../../helpers/reminderHooks.js";
import { EXIT_ZERO } from "../../helpers/spawnCaptured.js";
import { removeTempTree } from "../../helpers/tempTree.js";
import { initQuietly, withEmptyRepo } from "./upgradeStates.js";

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

// QFAI:EX-0001-0196-50
// QFAI:EX-0001-0196-51
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
      // Plug'n'Play proves the install mode only; the project has to declare qfai as well.
      const pnp = await project(path.join(base, "pnp"));
      await writeFile(path.join(pnp, ".pnp.cjs"), "", "utf-8");
      await writeFile(path.join(pnp, "package.json"), '{"devDependencies":{}}\n', "utf-8");
      expectRemedy(await run(pnp));
      await writeFile(
        path.join(pnp, "package.json"),
        '{"devDependencies":{"qfai":"^2.0.0"}}\n',
        "utf-8",
      );
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

type NativeInstallOptions = {
  malformed?:
    "cwd" | "separator" | "executable" | "relative" | "unknown" | "missing" | "file" | "unreadable";
  missingTool?: boolean;
  exit?: number;
  launcher?:
    | "local"
    | "parent"
    | "pnp"
    | "pnp-undeclared"
    | "pnp-failed"
    | "pnp-corrupt"
    | "pnp-missing-manifest"
    | "none";
  fault?: "spawn" | "signal" | "timeout";
};

/** Controlled native children exercise the generated entry, not a Cloud account. */
async function withNativeInstall(
  options: NativeInstallOptions,
  check: (result: {
    root: string;
    argv: string[];
    status: number | null;
    signal: NodeJS.Signals | null;
    stdout: string;
    stderr: string;
    calls: unknown[];
    confirmations: unknown[];
  }) => void | Promise<void>,
): Promise<void> {
  await withEmptyRepo(async (container) => {
    const root = path.join(container, "target checkout");
    await mkdir(root);
    await initQuietly(root);
    const entry = path.join(
      root,
      ".qfai",
      "assistant",
      "skill",
      "qfai-run",
      "scripts",
      "codex-cloud-install.mjs",
    );
    expect(existsSync(entry), "init generates the native preparation entry").toBe(true);
    const record = path.join(root, "native-calls.jsonl");
    const confirmation = path.join(root, "confirmation-calls.jsonl");
    const fixture = path.join(root, "native fixture.mjs");
    await writeFile(
      fixture,
      String.raw`
import { appendFileSync } from "node:fs";
appendFileSync(process.env.INSTALL_FIXTURE_RECORD, JSON.stringify({ argv: process.argv.slice(1), cwd: process.cwd() }) + "\n");
process.exitCode = Number(process.env.INSTALL_FIXTURE_EXIT);
`,
    );
    const local = path.join(root, "node_modules", ".bin");
    if ((options.launcher ?? "local") === "local") {
      await mkdir(local, { recursive: true });
      await writeFile(path.join(local, "qfai"), "controlled local launcher\n");
    }
    if (options.launcher === "parent") {
      const parent = path.join(container, "node_modules", ".bin");
      await mkdir(parent, { recursive: true });
      await writeFile(path.join(parent, "qfai"), "parent is not this target\n");
    }
    const pnp = options.launcher?.startsWith("pnp") ?? false;
    if (pnp) {
      await writeFile(path.join(root, ".pnp.cjs"), "controlled target marker\n");
      if (options.launcher !== "pnp-missing-manifest") {
        await writeFile(
          path.join(root, "package.json"),
          options.launcher === "pnp-corrupt"
            ? "{broken"
            : JSON.stringify({
                devDependencies: options.launcher === "pnp-undeclared" ? {} : { qfai: "*" },
              }),
        );
      }
    }
    const args = [fixture, "argument with spaces", "& | $ ; (literal)"];
    let invocation = [
      "--cwd",
      root,
      "--",
      options.missingTool ? path.join(root, "missing executable") : process.execPath,
      ...args,
    ];
    const malformed = options.malformed;
    if (malformed === "cwd") invocation = ["--", process.execPath, ...args];
    if (malformed === "separator") invocation = ["--cwd", root, process.execPath, ...args];
    if (malformed === "executable") invocation = ["--cwd", root, "--"];
    if (malformed === "relative") invocation[1] = "relative checkout";
    if (malformed === "unknown") invocation.unshift("--guess-manager");
    if (malformed === "missing") invocation[1] = path.join(root, "absent checkout");
    if (malformed === "file") invocation[1] = fixture;
    const env = {
      ...process.env,
      INSTALL_FIXTURE_RECORD: record,
      INSTALL_FIXTURE_EXIT: String(options.exit ?? 0),
    };
    const nodeArgs: string[] = [];
    if (options.fault || pnp || malformed === "unreadable") {
      const preload = path.join(root, "controlled native fault.mjs");
      await writeFile(
        preload,
        `
import childProcess from "node:child_process";
import fs, { appendFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
const original = childProcess.spawnSync;
const originalAccess = fs.accessSync;
fs.accessSync = (...args) => {
  if (${malformed === "unreadable"} && args[0] === ${JSON.stringify(root)}) {
    appendFileSync(${JSON.stringify(confirmation)}, "unreadable directory observed\\n");
    const error = new Error("controlled unreadable directory");
    error.code = "EACCES";
    throw error;
  }
  return originalAccess(...args);
};
const fault = ${JSON.stringify(options.fault ?? null)};
childProcess.spawnSync = (command, argv, config) => {
  if (command === "yarn") {
    appendFileSync(${JSON.stringify(confirmation)}, JSON.stringify({ command, argv, cwd: config.cwd, shell: config.shell }) + "\\n");
    return original(process.execPath, ["-e", "process.exit(${options.launcher === "pnp-failed" ? 9 : 0})"], config);
  }
  if (fault) {
    appendFileSync(${JSON.stringify(confirmation)}, JSON.stringify({ fault, command, argv, cwd: config.cwd }) + "\\n");
    const result = { pid: 0, output: [null, null, null], stdout: null, stderr: null, status: null, signal: null };
    if (fault === "signal") return { ...result, signal: "SIGTERM" };
    const error = new Error(fault === "timeout" ? "controlled observed timeout" : "controlled native spawn refusal");
    error.code = fault === "timeout" ? "ETIMEDOUT" : "EACCES";
    return { ...result, error };
  }
  return original(command, argv, config);
};
syncBuiltinESMExports();
`,
      );
      nodeArgs.push("--import", pathToFileURL(preload).href);
    }
    const result = spawnSync(process.execPath, [...nodeArgs, entry, ...invocation], {
      cwd: os.tmpdir(),
      env,
      encoding: "utf8",
      timeout: 30_000,
    });
    if (result.error) throw result.error;
    const rows = async (file: string): Promise<unknown[]> =>
      existsSync(file)
        ? (await readFile(file, "utf8"))
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line): unknown => JSON.parse(line))
        : [];
    await check({
      root,
      argv: args,
      status: result.status,
      signal: result.signal,
      stdout: result.stdout,
      stderr: result.stderr,
      calls: await rows(record),
      confirmations:
        malformed === "unreadable" && existsSync(confirmation)
          ? [await readFile(confirmation, "utf8")]
          : await rows(confirmation),
    });
  });
}

// QFAI:AC-0001-0196-17
describe("the generated installer's native process boundary", () => {
  // QFAI:EX-0001-0196-62
  it("preserves separate argv and the reviewed target cwd without launching a plan", async () => {
    await withNativeInstall({}, ({ root, argv, status, signal, stderr, stdout, calls }) => {
      expect(signal, stderr).toBeNull();
      expect(status, stderr).toBe(0);
      expect(calls).toEqual([{ argv, cwd: root }]);
      expect(stdout).toMatch(/preparation.*succeeded/i);
      expect(stdout).toContain(root);
    });
  });
  // QFAI:EX-0001-0196-63
  it.each([
    "cwd",
    "separator",
    "executable",
    "relative",
    "unknown",
    "missing",
    "file",
    "unreadable",
  ] as const)("refuses malformed %s before an install child", async (malformed) =>
    withNativeInstall({ malformed }, ({ status, signal, stderr, calls, confirmations }) => {
      expect(signal, stderr).toBeNull();
      expect(status).not.toBeNull();
      expect(status).not.toBe(0);
      expect(stderr).toMatch(/cwd|input|executable|directory|usage/i);
      if (malformed === "missing" || malformed === "unreadable") {
        expect(stderr).toContain(malformed === "missing" ? "ENOENT" : "EACCES");
        expect(stderr).toMatch(/supply.*readable.*absolute.*checkout directory.*rerun/i);
      }
      expect(calls).toEqual([]);
      if (malformed === "unreadable")
        expect(confirmations).toEqual(["unreadable directory observed\n"]);
    }),
  );
  // QFAI:EX-0001-0196-64
  it("reports an unavailable executable without a fallback", async () => {
    await withNativeInstall({ missingTool: true }, ({ status, signal, stderr, stdout, calls }) => {
      expect(signal, stderr).toBeNull();
      expect(status).not.toBeNull();
      expect(status).not.toBe(0);
      expect(stderr).toContain("ENOENT");
      expect(stderr).toMatch(/executable.*available.*cwd.*readable.*rerun/i);
      expect(stdout).not.toMatch(/preparation.*succeeded/i);
      expect(calls).toEqual([]);
    });
  });
  // QFAI:EX-0001-0196-64
  // QFAI:EX-0001-0196-65
  it.each(["spawn", "signal", "timeout"] as const)(
    "retains a controlled native %s outcome",
    async (fault) =>
      withNativeInstall({ fault }, ({ status, signal, stderr, stdout, calls, confirmations }) => {
        expect(signal, stderr).toBeNull();
        expect(status).not.toBeNull();
        expect(status).not.toBe(0);
        expect(stderr).toContain(
          fault === "signal" ? "SIGTERM" : fault === "timeout" ? "ETIMEDOUT" : "EACCES",
        );
        if (fault === "signal")
          expect(stderr).toMatch(
            /Installation ended on signal SIGTERM\..*review.*failed command output.*resolve.*cause.*before rerunning/i,
          );
        expect(stdout).not.toMatch(/preparation.*succeeded/i);
        expect(calls).toEqual([]);
        expect(confirmations).toHaveLength(1);
      }),
  );
  // QFAI:EX-0001-0196-66
  it("preserves installation exit seven beside a pre-existing local launcher", async () => {
    await withNativeInstall(
      { exit: 7 },
      ({ status, signal, stderr, stdout, calls, confirmations }) => {
        expect(signal, stderr).toBeNull();
        expect(status, stderr).toBe(7);
        expect(stderr).toMatch(/install.*7/i);
        expect(stderr).toMatch(
          /Installation exited 7\..*review.*failed command output.*resolve.*cause.*before rerunning/i,
        );
        expect(stdout).not.toMatch(/preparation.*succeeded/i);
        expect(calls).toHaveLength(1);
        expect(confirmations).toEqual([]);
      },
    );
  });
  // QFAI:EX-0001-0196-67
  it.each([
    "parent",
    "none",
    "pnp-undeclared",
    "pnp-failed",
    "pnp-corrupt",
    "pnp-missing-manifest",
  ] as const)("refuses unavailable or failed target proof: %s", async (launcher) =>
    withNativeInstall({ launcher }, ({ status, signal, stderr, stdout, calls, confirmations }) => {
      expect(signal, stderr).toBeNull();
      expect(status).not.toBeNull();
      expect(status).not.toBe(0);
      expect(stderr).toMatch(/canonical|launcher|qfai|confirmation/i);
      if (launcher === "pnp-failed")
        expect(stderr).toMatch(
          /Canonical launcher confirmation exited 9\..*review.*failed command output.*resolve.*cause.*before rerunning/i,
        );
      if (launcher === "parent" || launcher === "none")
        expect(stderr).toMatch(
          /no canonical qfai launcher\..*reviewed target.*declares qfai.*installation.*prepares.*canonical.*before rerunning/i,
        );
      if (launcher === "pnp-corrupt" || launcher === "pnp-missing-manifest") {
        expect(stderr).toContain(launcher === "pnp-corrupt" ? "SyntaxError" : "ENOENT");
        expect(stderr).toMatch(/check.*target package\.json.*canonical qfai launcher.*rerun/i);
      }
      expect(stdout).not.toMatch(/preparation.*succeeded/i);
      expect(calls).toHaveLength(1);
      expect(confirmations).toHaveLength(launcher === "pnp-failed" ? 1 : 0);
    }),
  );
  // QFAI:EX-0001-0196-67
  it("accepts a target PnP declaration only after its controlled native confirmation", async () => {
    await withNativeInstall(
      { launcher: "pnp" },
      ({ root, status, signal, stderr, calls, confirmations }) => {
        expect(signal, stderr).toBeNull();
        expect(status, stderr).toBe(0);
        expect(calls).toHaveLength(1);
        expect(confirmations).toEqual([
          { command: "yarn", argv: ["exec", "qfai", "--help"], cwd: root, shell: false },
        ]);
      },
    );
  });
});
