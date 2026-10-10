/**
 * The stop-time reminder that asks for the session review when a turn ends, for Claude Code and
 * for Codex.
 *
 * The hook cannot see whether the user's work is done, so it blocks the stop with a message that
 * has the agent decline at once unless the work is complete. It stays silent where the turn is
 * already continuing because of a stop hook, and where the turn ends in a question.
 */
// QFAI:AC-0001-0231-01
// QFAI:AC-0001-0231-02
// QFAI:AC-0001-0231-03
// QFAI:AC-0001-0231-04

import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { SESSION_FEEDBACK_HOOK_MARKER } from "../../../src/core/claudeCodeHooks.js";
import { initQuietly, withEmptyRepo } from "./upgradeStates.js";
import { runOnEveryShell } from "../../helpers/codexHookShells.js";
import { projectDirOf, runReminderHook } from "../../helpers/reminderHooks.js";
import { EXIT_ZERO } from "../../helpers/spawnCaptured.js";
import { removeTempTree } from "../../helpers/tempTree.js";

// tests/integration/init/<this file> -> integration -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
);

const SHIPPED_MESSAGES = "packages/qfai/assets/init/root/.agents/rules/reminders.json";
const OWN_SETTINGS = ".claude/settings.json";
const SHIPPED_SETTINGS = "packages/qfai/assets/init/.claude/settings.json";
const OWN_CODEX = ".codex/hooks.json";
const SHIPPED_CODEX = "packages/qfai/assets/init/.codex/hooks.json";

type Entry = Record<string, unknown>;

/** The shape the tests below rely on, rejecting any other. */
function asRecord(value: unknown, what: string): Entry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${what} is not an object`);
  }
  return { ...value };
}

/** The entries of the groups under `Stop` in a hook file. */
async function stopEntries(rel: string): Promise<Entry[]> {
  const parsed: unknown = JSON.parse(await readFile(path.join(repoRoot, rel), "utf-8"));
  const groups = asRecord(parsed, rel).hooks;
  const stop = asRecord(groups, `${rel}: hooks`).Stop;
  if (!Array.isArray(stop)) throw new Error(`${rel} has no Stop groups`);
  return stop.flatMap((group: unknown) => {
    const entries = asRecord(group, `${rel}: a Stop group`).hooks;
    if (!Array.isArray(entries)) throw new Error(`${rel}: a Stop group has no entries`);
    return entries.map((entry: unknown) => asRecord(entry, `${rel}: an entry`));
  });
}

/** The one entry that carries the session feedback marker. */
async function feedbackEntry(rel: string): Promise<Entry> {
  const entries = (await stopEntries(rel)).filter(
    (entry) => entry.statusMessage === SESSION_FEEDBACK_HOOK_MARKER,
  );
  expect(entries, `${rel} carries one session feedback group`).toHaveLength(1);
  const entry = entries[0];
  if (entry === undefined) throw new Error(`${rel} has no session feedback entry`);
  return entry;
}

function argsOf(entry: Entry): string[] {
  const args = entry.args;
  if (!Array.isArray(args)) throw new Error("entry has no args");
  return args.map(String);
}

const stopInput = (fields: Record<string, unknown>): string =>
  JSON.stringify({ hook_event_name: "Stop", ...fields });

/** The decision a printed message carries: it blocks, and says why. */
function reasonOf(stdout: string): string {
  const printed = asRecord(JSON.parse(stdout), "the output");
  expect(printed.decision).toBe("block");
  const reason = printed.reason;
  if (typeof reason !== "string") throw new Error("the output has no reason");
  return reason;
}

const COMPLETE = stopInput({ stop_hook_active: false, last_assistant_message: "Done." });
const SILENT_INPUTS: readonly string[] = [
  stopInput({ stop_hook_active: true, last_assistant_message: "Done." }),
  stopInput({ stop_hook_active: false, last_assistant_message: "Shall I continue?" }),
  stopInput({ stop_hook_active: false, last_assistant_message: "Continue?\n" }),
  // The fullwidth question mark, written as an escape: this repository holds no such character.
  stopInput({ stop_hook_active: false, last_assistant_message: "Continue\uFF1F" }),
  // Input the hook cannot read is no completion: blocking it could never end the turn.
  "",
  "{ not json",
  "null",
];
const PRINTING_INPUTS: readonly string[] = [
  COMPLETE,
  stopInput({ last_assistant_message: "" }),
  stopInput({}),
  "{}",
];

// QFAI:EX-0001-0231-01
// QFAI:EX-0001-0231-04
// QFAI:EX-0001-0231-06
// QFAI:EX-0001-0231-07
// QFAI:EX-0001-0231-08
// QFAI:EX-0001-0231-09
// QFAI:EX-0001-0231-11
describe("the session feedback reminder for Claude Code", () => {
  it.each([OWN_SETTINGS, SHIPPED_SETTINGS])(
    "%s runs the fixed reader over the shipped messages",
    async (rel) => {
      const entry = await feedbackEntry(rel);
      expect(entry.command).toBe("node");
      expect(argsOf(entry).slice(2)).toEqual([
        "${CLAUDE_PROJECT_DIR}/.agents/rules/reminders.json",
        "session-feedback",
      ]);
    },
  );

  it.each([OWN_SETTINGS, SHIPPED_SETTINGS])(
    "%s blocks the stop of a completed turn",
    async (rel) => {
      const entry = await feedbackEntry(rel);
      const project = projectDirOf(repoRoot, SHIPPED_SETTINGS);
      for (const input of PRINTING_INPUTS) {
        const stdout = await runReminderHook(entry, project, input);
        expect(reasonOf(stdout), input).toContain(".agents/rules/session-feedback.md");
      }
    },
  );

  it.each([OWN_SETTINGS, SHIPPED_SETTINGS])(
    "%s stays silent when the turn is not a completion",
    async (rel) => {
      const entry = await feedbackEntry(rel);
      const project = projectDirOf(repoRoot, SHIPPED_SETTINGS);
      for (const input of SILENT_INPUTS) {
        await expect(runReminderHook(entry, project, input), input).resolves.toBe("");
      }
    },
  );

  it("prints nothing and exits 0 when the message file or the key is missing", async () => {
    const entry = await feedbackEntry(SHIPPED_SETTINGS);
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-feedback-"));
    try {
      await expect(runReminderHook(entry, root, COMPLETE)).resolves.toBe("");
      await mkdir(path.join(root, ".agents", "rules"), { recursive: true });
      await writeFile(path.join(root, ".agents", "rules", "reminders.json"), "{}", "utf-8");
      await expect(runReminderHook(entry, root, COMPLETE)).resolves.toBe("");
    } finally {
      await removeTempTree(root);
    }
  });

  it("tells the agent when to decline, what to review, and to ask before filing", async () => {
    const entry = await feedbackEntry(SHIPPED_SETTINGS);
    const stdout = await runReminderHook(entry, projectDirOf(repoRoot, SHIPPED_SETTINGS), COMPLETE);
    const reason = reasonOf(stdout);
    expect(reason).toContain("is every task the user gave you complete");
    expect(reason).toContain("nothing waiting on the user");
    expect(reason).toContain("already ran this review after the user's latest instruction");
    expect(reason).toContain("reply with one short line and stop");
    expect(reason).toContain("problems in QFAI itself");
    expect(reason).toContain("none of the project's names, source, secrets or personal data");
    expect(reason).toContain("ask the user through the structured question tool whether to file");
    expect(reason).toContain("only the drafts they approve");
    expect(reason.length).toBeLessThan(1500);
  });

  it("gives this repository and the package the same group and the same message", async () => {
    expect(await feedbackEntry(OWN_SETTINGS)).toEqual(await feedbackEntry(SHIPPED_SETTINGS));
    expect(await feedbackEntry(OWN_CODEX)).toEqual(await feedbackEntry(SHIPPED_CODEX));
    const messages = JSON.parse(await readFile(path.join(repoRoot, SHIPPED_MESSAGES), "utf-8"));
    expect(asRecord(asRecord(messages, "reminders")["session-feedback"], "message").decision).toBe(
      "block",
    );
  });
});

// QFAI:EX-0001-0231-05
// QFAI:EX-0001-0231-06
// QFAI:EX-0001-0231-07
// QFAI:EX-0001-0231-08
describe("the session feedback reminder for Codex", () => {
  const roots: string[] = [];
  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
  });

  /** A project with a git marker and the shipped messages, with the hook run from a subdirectory. */
  async function project(): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-feedback-codex-"));
    roots.push(root);
    await mkdir(path.join(root, ".git"), { recursive: true });
    await mkdir(path.join(root, ".agents", "rules"), { recursive: true });
    await copyFile(
      path.join(repoRoot, SHIPPED_MESSAGES),
      path.join(root, ".agents", "rules", "reminders.json"),
    );
    const sub = path.join(root, "src", "deep");
    await mkdir(sub, { recursive: true });
    return sub;
  }

  it.each([OWN_CODEX, SHIPPED_CODEX])("%s has one entry in the single-line form", async (rel) => {
    const entry = await feedbackEntry(rel);
    const command = entry.command;
    if (typeof command !== "string") throw new Error("entry has no command string");
    expect(entry.commandWindows).toBeUndefined();
    expect(command.startsWith('node -e "')).toBe(true);
    expect(command.endsWith('" session-feedback')).toBe(true);
    const program = command.slice('node -e "'.length, command.lastIndexOf('" '));
    expect(program).not.toMatch(/["$`%!]/);
    expect(program).not.toContain("\\\\");
    expect(program).toMatch(/^[\x20-\x7e]*$/);
  });

  it("blocks a completed turn and stays silent otherwise, the same under every shell", async () => {
    const entry = await feedbackEntry(SHIPPED_CODEX);
    const cwd = await project();
    for (const input of [...PRINTING_INPUTS, ...SILENT_INPUTS]) {
      const outputs = new Set<string>();
      for (const { shell, result } of await runOnEveryShell(entry, cwd, input)) {
        expect(result.outcome, `${shell}: ${result.stderr}`).toBe(EXIT_ZERO);
        expect(result.stderr, shell).toBe("");
        outputs.add(result.stdout.trim());
      }
      expect(outputs.size, input).toBe(1);
      const [printed] = [...outputs];
      if (SILENT_INPUTS.includes(input)) expect(printed, input).toBe("");
      else expect(reasonOf(printed ?? ""), input).toContain("session-feedback.md");
    }
  });
});

// QFAI:EX-0001-0231-01
// QFAI:EX-0001-0231-02
// QFAI:EX-0001-0231-03
describe("init and the stop-time group", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("writes the group on a fresh project and appends it after the project's own", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      for (const rel of [OWN_SETTINGS, OWN_CODEX]) {
        const written = path.join(root, rel);
        expect(await readFile(written, "utf-8")).toContain(SESSION_FEEDBACK_HOOK_MARKER);
      }
    });

    for (const rel of [OWN_SETTINGS, OWN_CODEX]) {
      await withEmptyRepo(async (root) => {
        const own = { hooks: [{ type: "command", command: "./own-stop.sh" }] };
        await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
        await writeFile(path.join(root, rel), JSON.stringify({ hooks: { Stop: [own] } }), "utf-8");

        await initQuietly(root);
        const merged: unknown = JSON.parse(await readFile(path.join(root, rel), "utf-8"));
        const stop = asRecord(asRecord(merged, rel).hooks, "hooks").Stop;
        if (!Array.isArray(stop)) throw new Error("no Stop groups");
        expect(stop, rel).toHaveLength(2);
        expect(stop[0], rel).toEqual(own);
        expect(JSON.stringify(stop[1]), rel).toContain(SESSION_FEEDBACK_HOOK_MARKER);

        const before = await readFile(path.join(root, rel), "utf-8");
        await initQuietly(root);
        expect(await readFile(path.join(root, rel), "utf-8"), rel).toBe(before);
      });
    }
  });
});
