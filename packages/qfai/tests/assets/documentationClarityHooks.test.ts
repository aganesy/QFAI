/**
 * The Claude Code hooks `qfai init` seeds, checked as configuration and as
 * something that runs.
 *
 * A hook that parses but prints nothing Claude Code can read is silently dead:
 * plain stdout from a tool-loop hook reaches the debug log and nowhere else, so
 * the only evidence the reminder arrives is a run whose stdout parses as the
 * documented JSON envelope. Every shipped entry is executed here for exactly
 * that reason.
 *
 * The matcher set is pinned too. A shell-argument condition matches compound
 * commands it was never meant to, so the entries filter on tool name and on
 * file path, which do not have that failure. Widening them back is a change a
 * reader should see.
 *
 * The entries carry no message. Each runs one fixed reader over
 * `.agents/rules/reminders.json`, which `qfai init` refreshes where the project
 * has not edited it, so a changed message reaches a project that installed an
 * earlier release. The settings file does not change with the message.
 */

import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  API_BUDGET_HOOK_MARKER,
  DOCUMENTATION_CLARITY_HOOK_MARKER,
  FREE_TEXT_ENTRY_HOOK_MARKER,
  GRILLING_DELEGATION_HOOK_MARKER,
  GRILLING_DESIGN_ARTIFACT_HOOK_MARKER,
  GRILLING_PLAN_HOOK_MARKER,
  INSTALL_CHECK_HOOK_MARKER,
  MINIMAL_IMPLEMENTATION_HOOK_MARKER,
  SESSION_FEEDBACK_HOOK_MARKER,
  STRUCTURED_QUESTION_HOOK_MARKER,
} from "../../src/core/claudeCodeHooks.js";
import {
  PROJECT_DIR_PLACEHOLDER,
  projectDirOf,
  runReminderHook,
} from "../helpers/reminderHooks.js";
import { flat, sectionOf } from "../helpers/shippedAssistant.js";
import { removeTempTree } from "../helpers/tempTree.js";

/** Where every entry reads its message, as the settings file names it. */
const MESSAGES_ARG = `${PROJECT_DIR_PLACEHOLDER}/.agents/rules/reminders.json`;

/** The shipped message file. */
const SHIPPED_MESSAGES = "packages/qfai/assets/init/root/.agents/rules/reminders.json";

function expectNoEmbeddedReminderText(program: string, messages: unknown): void {
  if (typeof messages !== "object" || messages === null) throw new Error("no reminder catalog");
  for (const message of Object.values(messages)) {
    if (typeof message !== "object" || message === null) throw new Error("invalid reminder");
    const output: unknown = Reflect.get(message, "hookSpecificOutput");
    const full: unknown =
      typeof output === "object" && output !== null
        ? Reflect.get(output, "additionalContext")
        : undefined;
    for (const context of [
      full,
      Reflect.get(message, "reason"),
      Reflect.get(message, "briefContext"),
    ]) {
      if (typeof context !== "string") continue;
      expect(program).not.toContain(context);
      expect(program).not.toContain(JSON.stringify(context).slice(1, -1));
    }
  }
}

/** What the host writes to a `Bash` hook's stdin for one command. */
function hookInput(command: string): string {
  return JSON.stringify({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command },
  });
}

/**
 * The rule master each reminder restates, by the marker its entries carry.
 *
 * The last two cases below hold a property of every entry in the file rather
 * than of a named one, so a reminder added later is covered without touching
 * them. What it costs is a row here, and a marker absent from this table is
 * itself the failure those cases report.
 */
const RESTATES: ReadonlyMap<string, string> = new Map([
  [DOCUMENTATION_CLARITY_HOOK_MARKER, "documentation-clarity.md"],
  [MINIMAL_IMPLEMENTATION_HOOK_MARKER, "minimal-implementation.md"],
  [GRILLING_DESIGN_ARTIFACT_HOOK_MARKER, "grilling.md"],
  [GRILLING_DELEGATION_HOOK_MARKER, "grilling.md"],
  [GRILLING_PLAN_HOOK_MARKER, "grilling.md"],
  [STRUCTURED_QUESTION_HOOK_MARKER, "user-questions.md"],
  [API_BUDGET_HOOK_MARKER, "api-budget.md"],
  [SESSION_FEEDBACK_HOOK_MARKER, "session-feedback.md"],
  // A skill rather than a rule master: the entry the request is sent to.
  [FREE_TEXT_ENTRY_HOOK_MARKER, "qfai-run"],
  [INSTALL_CHECK_HOOK_MARKER, "npm i -D qfai"],
]);

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** The shipped template, and this repository's own copy of it. */
const SETTINGS_PATHS = ["packages/qfai/assets/init/.claude/settings.json", ".claude/settings.json"];

interface HookEntry {
  readonly type: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly statusMessage: string;
  readonly if?: string;
}

interface HookGroup {
  readonly matcher: string;
  readonly hooks: readonly HookEntry[];
}

/** The parsed `hooks` table, rejecting anything the shape below does not cover. */
function readHooks(text: string): ReadonlyMap<string, readonly HookGroup[]> {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || !("hooks" in parsed)) {
    throw new Error("settings file carries no hooks table");
  }
  const hooks: unknown = parsed.hooks;
  if (typeof hooks !== "object" || hooks === null) {
    throw new Error("hooks is not an object");
  }
  const byEvent = new Map<string, readonly HookGroup[]>();
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) throw new Error(`${event} is not an array`);
    byEvent.set(event, groups.map(toGroup));
  }
  return byEvent;
}

function toGroup(value: unknown): HookGroup {
  if (typeof value !== "object" || value === null) throw new Error("hook group is not an object");
  const matcher: unknown = Reflect.get(value, "matcher");
  const entries: unknown = Reflect.get(value, "hooks");
  if (typeof matcher !== "string") throw new Error("hook group has no matcher");
  if (!Array.isArray(entries)) throw new Error("hook group has no entries");
  return { matcher, hooks: entries.map(toEntry) };
}

function toEntry(value: unknown): HookEntry {
  if (typeof value !== "object" || value === null) throw new Error("hook entry is not an object");
  const type: unknown = Reflect.get(value, "type");
  const command: unknown = Reflect.get(value, "command");
  const args: unknown = Reflect.get(value, "args");
  const statusMessage: unknown = Reflect.get(value, "statusMessage");
  const condition: unknown = Reflect.get(value, "if");
  if (typeof type !== "string" || typeof command !== "string") {
    throw new Error("hook entry has no type or command");
  }
  if (!Array.isArray(args) || !args.every((arg): arg is string => typeof arg === "string")) {
    throw new Error("hook entry args are not strings");
  }
  if (typeof statusMessage !== "string") throw new Error("hook entry has no statusMessage");
  return {
    type,
    command,
    args,
    statusMessage,
    ...(typeof condition === "string" ? { if: condition } : {}),
  };
}

describe.each(SETTINGS_PATHS)("%s", (rel) => {
  let hooks: ReadonlyMap<string, readonly HookGroup[]>;
  let catalog: unknown;

  beforeAll(async () => {
    hooks = readHooks(await readFile(path.join(repoRoot, rel), "utf-8"));
    catalog = JSON.parse(await readFile(path.join(repoRoot, SHIPPED_MESSAGES), "utf-8"));
  });

  it("wires the reminder to a GitHub post and to a Markdown edit", () => {
    expect([...hooks.keys()].sort()).toEqual([
      "PostToolUse",
      "PreToolUse",
      "Stop",
      "UserPromptSubmit",
    ]);

    // Selected by matcher rather than by position: other reminders share the
    // event, and asserting this one is the only entry made every later hook a
    // failure of this test rather than of its own.
    const preToolUse = hooks.get("PreToolUse") ?? [];
    const github = preToolUse.filter((group) => group.matcher.includes("mcp__github__"));
    expect(github).toHaveLength(1);
    // Tool-name matching only. A `Bash` entry would need a shell-argument
    // condition, which also matches compound commands unrelated to GitHub.
    expect(github[0].matcher).not.toContain("Bash");
    for (const entry of github[0].hooks) {
      expect(entry.if).toBeUndefined();
    }

    const postToolUse = hooks.get("PostToolUse") ?? [];
    expect(postToolUse).toHaveLength(2);
    expect(postToolUse.map((group) => group.matcher)).toEqual(["Write|Edit", "Write|Edit"]);
    expect(postToolUse[0].hooks.map((entry) => entry.if)).toEqual([
      "Write(**/*.md)",
      "Edit(**/*.md)",
    ]);
  });

  it("restates the implementation rule with no path condition of its own", () => {
    const postToolUse = hooks.get("PostToolUse") ?? [];
    const group = postToolUse[1];

    expect(group.hooks).toHaveLength(1);
    expect(group.hooks[0].statusMessage).toBe(MINIMAL_IMPLEMENTATION_HOOK_MARKER);
    // No `if`, deliberately. The condition is a permission-rule scope matched
    // against the path, and naming source by extension would enumerate a
    // language set: a language left out is a hook silently absent exactly where
    // the rule is needed. The program decides instead, by what is plainly not
    // source, so a language nobody listed still gets the reminder.
    expect(group.hooks[0].if).toBeUndefined();
  });

  // QFAI:EX-0001-0196-53
  it("prints the implementation reminder only for a file that is product source", async () => {
    const entry = (hooks.get("PostToolUse") ?? [])[1]?.hooks[0];
    if (entry === undefined) throw new Error("no implementation reminder entry");
    const project = projectDirOf(repoRoot, rel);
    const input = (file: string): string =>
      JSON.stringify({
        hook_event_name: "PostToolUse",
        tool_name: "Edit",
        tool_input: { file_path: file },
      });

    for (const file of [
      "src/a.ts",
      "scripts/run.ps1",
      "lib/tool.rb",
      path.join(project, "packages", "x", "src", "b.py"),
    ]) {
      const text = await runReminderHook(entry, project, input(file));
      expect(text, file).toContain("minimal-implementation.md");
    }
    for (const file of [
      "tmp/x.py",
      "tests/a.ts",
      "src/a.test.ts",
      "src/a.spec.ts",
      "README.md",
      "package.json",
      "config/app.yaml",
      ".env.example",
      ".qfai/spec/a.md",
      path.join(os.tmpdir(), "draft.ts"),
      "../outside.ts",
    ]) {
      await expect(runReminderHook(entry, project, input(file)), file).resolves.toBe("");
    }
    // Input that names no file is not a reason to stay silent.
    for (const none of ["{}", "", "{ not json"]) {
      const text = await runReminderHook(entry, project, none);
      expect(text, JSON.stringify(none)).toContain("minimal-implementation.md");
    }
  });

  it("points at the floor and the interface rule instead of restating them", async () => {
    const entry = (hooks.get("PostToolUse") ?? [])[1]?.hooks[0];
    const text =
      entry === undefined ? "" : await runReminderHook(entry, projectDirOf(repoRoot, rel));
    expect(text).toContain("The ladder never removes what § 2 of that rule lists.");
    expect(text).not.toContain("error handling that prevents data loss");
    expect(text).toContain("is it already in this codebase");
    expect(text).toContain(".agents/rules/interface-clarity.md");
  });

  it("runs a program directly, with no shell and no message of its own", () => {
    const readers = new Set<string>();
    for (const [, groups] of hooks) {
      for (const group of groups) {
        for (const entry of group.hooks) {
          expect(entry.type).toBe("command");
          // `args` present means exec form: the payload never reaches a shell,
          // so quoting cannot differ between platforms.
          expect(entry.command).toBe("node");
          expect(entry.args[0]).toBe("-e");
          expect([...RESTATES.keys()]).toContain(entry.statusMessage);
          // The reader, the file it reads and the key of one message. The text
          // lives in the file, so a release that changes it leaves this alone.
          expect(entry.args).toHaveLength(4);
          expect(entry.args[2]).toBe(MESSAGES_ARG);
          expectNoEmbeddedReminderText(entry.args.join(" "), catalog);
          readers.add(entry.args[1] ?? "");
        }
      }
    }
    // Eight shared readers cover prompt, tool and stop filters, full/brief
    // delivery, and the unchanged periodic reminders.
    expect(readers.size, "each entry uses one of the eight shared readers").toBe(8);
    for (const reader of readers) {
      expect(reader).toContain("process.argv[1]");
      expect(reader).toContain("process.argv[2]");
    }
  });

  // The matcher fires on every shell command, so the program is what narrows it.
  // `documentation-clarity.md` keeps its own hook off the shell for exactly the
  // over-matching this filter prevents, and that decision is unchanged.
  it("prints the budget reminder only for a command that names the forge", async () => {
    const group = (hooks.get("PreToolUse") ?? []).find((candidate) => candidate.matcher === "Bash");
    expect(group, "no PreToolUse group matches Bash").toBeDefined();
    expect(group?.hooks.map((entry) => entry.statusMessage)).toEqual([API_BUDGET_HOOK_MARKER]);
    const entry = group?.hooks[0];
    if (entry === undefined) return;
    const project = projectDirOf(repoRoot, rel);

    for (const command of [
      "gh api repos/owner/repo/actions/runs",
      "gh pr checks",
      "curl https://api.github.com/rate_limit",
    ]) {
      const printed = await runReminderHook(entry, project, hookInput(command));
      expect(printed, `${command} printed nothing`).toContain("api-budget.md");
    }

    for (const command of [
      "git status && pnpm check-types",
      "node scripts/check-bidi.mjs --highlight",
      "echo ghost",
    ]) {
      await expect(runReminderHook(entry, project, hookInput(command))).resolves.toBe("");
    }
  });

  // The host's payload is not part of this repository, so the entry prints
  // nothing for input it does not recognise rather than guessing at a shape.
  it("prints nothing for input that carries no command", async () => {
    const group = (hooks.get("PreToolUse") ?? []).find((candidate) => candidate.matcher === "Bash");
    const entry = group?.hooks[0];
    if (entry === undefined) return;
    const project = projectDirOf(repoRoot, rel);
    for (const input of ["", "{ not json", "{}", JSON.stringify({ tool_name: "Bash" })]) {
      await expect(runReminderHook(entry, project, input)).resolves.toBe("");
    }
  });

  it("names only messages the shipped file carries, and every one of them", async () => {
    const messages: unknown = JSON.parse(
      await readFile(path.join(repoRoot, SHIPPED_MESSAGES), "utf-8"),
    );
    if (typeof messages !== "object" || messages === null) throw new Error("no message table");
    const named = new Set<string>();
    for (const [, groups] of hooks) {
      for (const group of groups) {
        for (const entry of group.hooks) named.add(entry.args[3] ?? "");
      }
    }
    expect([...named].sort()).toEqual(Object.keys(messages).sort());
  });

  it("prints nothing and exits 0 when the message file is missing or unreadable", async () => {
    // A reminder is worth less than the session it runs in. `runReminderHook`
    // rejects on a non-zero exit, so a resolved empty string is both halves.
    const project = await mkdtemp(path.join(os.tmpdir(), "qfai-reminder-hook-"));
    try {
      const entries = [...hooks.values()].flatMap((groups) => groups.flatMap((g) => g.hooks));
      for (const entry of entries) {
        await expect(runReminderHook(entry, project)).resolves.toBe("");
      }
      await mkdir(path.join(project, ".agents", "rules"), { recursive: true });
      await writeFile(
        path.join(project, ".agents", "rules", "reminders.json"),
        "{ not json",
        "utf-8",
      );
      for (const entry of entries) {
        await expect(runReminderHook(entry, project)).resolves.toBe("");
      }
      await writeFile(path.join(project, ".agents", "rules", "reminders.json"), "{}\n", "utf-8");
      for (const entry of entries) {
        await expect(runReminderHook(entry, project)).resolves.toBe("");
      }
    } finally {
      await removeTempTree(project);
    }
  });

  it("gives every group under one event its own set of markers", () => {
    // How the upgrade merge tells one group from another. Two groups under the
    // same event with the same markers are one group to it, so a project
    // holding either is credited with both and never receives the other.
    for (const [event, groups] of hooks) {
      const identities = groups.map((group) =>
        JSON.stringify([...group.hooks.map((entry) => entry.statusMessage)].sort()),
      );
      expect(new Set(identities).size, `two ${event} groups share a marker set`).toBe(
        identities.length,
      );
    }
  });

  it("prints the documented envelope for its own event", async () => {
    for (const [event, groups] of hooks) {
      for (const group of groups) {
        for (const entry of group.hooks) {
          // Prints only where this checkout has no launcher, which the checkout
          // running the suite usually has; its own test builds a project with none.
          if (entry.statusMessage === INSTALL_CHECK_HOOK_MARKER) continue;
          const stdout = await runReminderHook(entry, projectDirOf(repoRoot, rel));
          const payload: unknown = JSON.parse(stdout);
          if (typeof payload !== "object" || payload === null) {
            throw new Error("hook printed something other than an object");
          }
          // A stop is answered by a decision that blocks it, not by context added to the turn.
          if (event === "Stop") {
            expect(Reflect.get(payload, "decision")).toBe("block");
            const reason: unknown = Reflect.get(payload, "reason");
            expect(reason).toEqual(
              expect.stringContaining(RESTATES.get(entry.statusMessage) ?? ""),
            );
            continue;
          }
          const output: unknown = Reflect.get(payload, "hookSpecificOutput");
          if (typeof output !== "object" || output === null) {
            throw new Error("hook printed no hookSpecificOutput");
          }
          expect(Reflect.get(output, "hookEventName")).toBe(event);
          const context: unknown = Reflect.get(output, "additionalContext");
          expect(typeof context).toBe("string");
          if (typeof context !== "string") return;
          // The reminder names the rule it restates, and stays short enough to
          // sit in front of the model on every fire.
          const master = RESTATES.get(entry.statusMessage);
          expect(master, `no rule master recorded for ${entry.statusMessage}`).toBeDefined();
          expect(context).toContain(master);
          expect(context.length).toBeLessThan(1000);
        }
      }
    }
  });
});

// QFAI:SPEC-REF: AC-0001-0196-12, EX-0001-0196-37
// These guards cover the shared instruction payload, not an agent's judgment.
describe("documentation clarity reminder scope", () => {
  const keys = [
    "documentation-clarity-before-post",
    "documentation-clarity-after-write",
    "documentation-clarity-after-edit",
  ] as const;
  let messages: ReadonlyMap<string, string>;
  let master: string;

  beforeAll(async () => {
    const [messageText, ruleText] = await Promise.all([
      readFile(path.join(repoRoot, SHIPPED_MESSAGES), "utf-8"),
      readFile(
        path.join(
          repoRoot,
          "packages/qfai/assets/init/root/.agents/rules/documentation-clarity.md",
        ),
        "utf-8",
      ),
    ]);
    const parsed: unknown = JSON.parse(messageText);
    if (typeof parsed !== "object" || parsed === null) throw new Error("no message table");
    messages = new Map(
      keys.map((key) => {
        const value: unknown = Reflect.get(parsed, key);
        if (typeof value !== "object" || value === null)
          throw new Error(`${key} is not an envelope`);
        const output: unknown = Reflect.get(value, "hookSpecificOutput");
        if (typeof output !== "object" || output === null) {
          throw new Error(`${key} has no hookSpecificOutput`);
        }
        const context: unknown = Reflect.get(output, "additionalContext");
        if (typeof context !== "string") throw new Error(`${key} has no additionalContext`);
        return [key, flat(context)];
      }),
    );
    master = ruleText;
  });

  function clauses(text: string): string[] {
    return flat(text).split(/[.;!?]\s+/);
  }

  function expectRequestedRecordScope(text: string): void {
    const condition =
      clauses(text).find(
        (clause) =>
          /\buser\b/i.test(clause) &&
          /\brequest\w*\b/i.test(clause) &&
          /\b(?:incident|event|work)\b/i.test(clause) &&
          /\b(?:record|report|account)\w*\b/i.test(clause),
      ) ?? "";
    expect(condition, "the record exception needs an explicit user request").toMatch(
      /\b(?:explicit\w*|express\w*|specifically)\b/i,
    );
    expect(condition, "the exception must be conditional").toMatch(
      /\b(?:only|if|when|exception)\b/i,
    );
    expect(text).toMatch(/\b(?:necessary|needed|required)\b/i);
    expect(
      clauses(text).some(
        (clause) =>
          /\b(?:observed|factual)\b/i.test(clause) && /\b(?:events?|facts?)\b/i.test(clause),
      ),
      "the record names observed events",
    ).toBe(true);
    expect(text).toMatch(/\bevidence\b/i);
    expect(text).toMatch(/\b(?:uncertainty|unverified|unknowns?)\b/i);
    expect(text).toMatch(/\bcurrent\b[^.;]*\bimpact\b/i);
    expect(text).toMatch(/\bnext\b[^.;]*\b(?:actions?|steps?)\b/i);
  }

  function expectOrdinaryHistoryExcluded(text: string): void {
    expect(text).toMatch(/\b(?:specifications?|specs?)\b/i);
    expect(text).toMatch(/\bchange\b/i);
    const prohibition =
      clauses(text).find(
        (clause) =>
          /\b(?:no|not|never|omit|exclude)\b/i.test(clause) &&
          ((/\b(?:design|implementation)\b/i.test(clause) && /\bhistory\b/i.test(clause)) ||
            /how (?:the )?work went/i.test(clause)),
      ) ?? "";
    expect(prohibition, "ordinary specifications and change descriptions exclude history").not.toBe(
      "",
    );
  }

  it("allows numbers and links in pull request and issue bodies before posting", () => {
    const allowance =
      clauses(messages.get(keys[0]) ?? "").find(
        (clause) =>
          /\b(?:PR|pull[ -]requests?)\b/i.test(clause) &&
          /\bissues?\b/i.test(clause) &&
          /\bbod(?:y|ies)\b/i.test(clause) &&
          /\bnumbers?\b/i.test(clause) &&
          /\blinks?\b/i.test(clause),
      ) ?? "";
    expect(allowance).toMatch(/\b(?:allow\w*|may|can|belong\w*|permitted)\b/i);
    expect(allowance).not.toMatch(/\b(?:no|never|prohibit\w*)\b[^.;]*\bnumbers?\b/i);
  });

  it("keeps source and ordinary Markdown identifier restrictions and existing exceptions", () => {
    for (const key of keys.slice(1)) {
      const message = messages.get(key) ?? "";
      expect(message).toMatch(/\bMarkdown\b/i);
      expect(message).toMatch(
        /\b(?:no|never|prohibit\w*)\b[^.;]*\b(?:issue|PR|pull[ -]request)\b[^.;]*\bnumbers?\b/i,
      );
    }
    const identifiers = flat(sectionOf(master, "## 1."));
    expect(identifiers).toMatch(/Never write[^.]*source code or Markdown files/i);
    expect(identifiers).toMatch(/Pull request and issue bodies[^.]*outside this clause/i);
    expect(identifiers).toMatch(/Numbers and links belong[^.]*commit messages and the changelog/i);
    expect(identifiers).toContain("Spec-tree IDs");
    expect(identifiers).toContain("Names the reader sees");
  });

  it("limits all three reminders to expressly requested records with necessary factual content", () => {
    for (const key of keys) expectRequestedRecordScope(messages.get(key) ?? "");
  });

  it("keeps design history out of ordinary specifications and change descriptions in every reminder", () => {
    for (const key of keys) expectOrdinaryHistoryExcluded(messages.get(key) ?? "");
  });

  it("gives clause two the same narrow record exception without weakening ordinary writing", () => {
    const history = flat(sectionOf(master, "## 2."));
    expectRequestedRecordScope(history);
    expectOrdinaryHistoryExcluded(history);
  });

  it("makes the re-read check distinguish requested records from excluded design history", () => {
    const reread = flat(sectionOf(master, "## 9."));
    const historyCheck =
      reread.split("|").find((cell) => /(?:how the work went|\bhistory\b)/i.test(cell)) ?? "";
    expect(historyCheck).toMatch(/\b(?:request\w*|exception|clause 2)\b|§\s*2/i);
    expect(reread).toMatch(/\b(?:explicit\w*|express\w*|specifically)\b/i);
    expect(reread).toMatch(/\b(?:incident|event|work)\b[^.;]*\b(?:record|report|account)\w*\b/i);
  });
});

describe("shipped template and this repository agree", () => {
  it("carries the same hooks in both copies", async () => {
    const [shipped, own] = await Promise.all(
      SETTINGS_PATHS.map((rel) => readFile(path.join(repoRoot, rel), "utf-8")),
    );

    // The hooks and the allow list are shared. `permissions.ask` is this
    // repository's own: it stops the commands that tag and publish
    // (`releaseCommandStop.test.ts`).
    const shared = (text: string): unknown => {
      const settings: Record<string, unknown> = JSON.parse(text);
      const permissions = settings.permissions;
      return {
        hooks: settings.hooks,
        allow:
          typeof permissions === "object" && permissions !== null
            ? Reflect.get(permissions, "allow")
            : undefined,
      };
    };

    expect(shared(own ?? "")).toEqual(shared(shipped ?? ""));
  });
});
