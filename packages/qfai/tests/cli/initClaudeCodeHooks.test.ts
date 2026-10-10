/** Init updates shipped readers while preserving the project's own host settings. */

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import {
  DOCUMENTATION_CLARITY_HOOK_MARKER,
  GRILLING_DELEGATION_HOOK_MARKER,
  GRILLING_DESIGN_ARTIFACT_HOOK_MARKER,
  GRILLING_PLAN_HOOK_MARKER,
  MINIMAL_IMPLEMENTATION_HOOK_MARKER,
} from "../../src/core/claudeCodeHooks.js";
import { captureStderr } from "../helpers/stderr.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const SETTINGS = path.join(".claude", "settings.json");

// tests/cli/<this file> -> tests -> packages/qfai
const assetsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "init",
);

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

/** The groups under one hook event. */
function readHookGroups(settings: unknown, event = "PreToolUse"): unknown[] {
  const hooks: unknown =
    typeof settings === "object" && settings !== null ? Reflect.get(settings, "hooks") : undefined;
  const groups: unknown =
    typeof hooks === "object" && hooks !== null ? Reflect.get(hooks, event) : undefined;
  if (!Array.isArray(groups)) throw new Error(`settings carry no ${event} groups`);
  return [...groups];
}

/** One `qfai init` run with its console output swallowed; returns what it wrote to stderr. */
async function initInto(root: string, force = false): Promise<string> {
  let stderr = "";
  await captureStdout(async () => {
    stderr = await captureStderr(async () => {
      await runInit({ dir: root, force, dryRun: false, yes: true });
    });
  });
  return stderr;
}

/** One `qfai init` run; returns what it wrote to stdout. */
async function initReporting(root: string, force = false): Promise<string> {
  return captureStdout(async () => {
    await captureStderr(async () => {
      await runInit({ dir: root, force, dryRun: false, yes: true });
    });
  });
}

/** Every hook entry of a parsed settings object, with the event it sits under. */
function entriesOf(settings: unknown): { event: string; entry: Record<string, unknown> }[] {
  const hooks: unknown =
    typeof settings === "object" && settings !== null ? Reflect.get(settings, "hooks") : undefined;
  if (typeof hooks !== "object" || hooks === null) throw new Error("settings carry no hooks");
  const found: { event: string; entry: Record<string, unknown> }[] = [];
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) throw new Error(`${event} is not an array`);
    for (const group of groups) {
      const entries: unknown = Reflect.get(group, "hooks");
      if (!Array.isArray(entries)) throw new Error(`a ${event} group has no entries`);
      for (const entry of entries) found.push({ event, entry: { ...entry } });
    }
  }
  return found;
}

/** Every group an earlier template held, exactly as it was written. */
async function earlierGroups(): Promise<unknown> {
  const fixture = path.join(
    assetsRoot,
    "..",
    "..",
    "tests",
    "fixtures",
    "claude-settings",
    "earlier-reminder-groups.json",
  );
  return JSON.parse(await readFile(fixture, "utf-8"));
}

async function seedSettings(
  root: string,
  settings: unknown,
  relativePath = SETTINGS,
): Promise<void> {
  await mkdir(path.dirname(path.join(root, relativePath)), { recursive: true });
  await writeFile(path.join(root, relativePath), `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
}

/** The project's own permission entry is still first; init appends the shipped ones after it. */
function expectOwnPermissionFirst(settings: Record<string, unknown>): void {
  const permissions = settings.permissions;
  const allow: unknown =
    typeof permissions === "object" && permissions !== null
      ? Reflect.get(permissions, "allow")
      : undefined;
  expect(Array.isArray(allow) ? allow[0] : undefined).toBe("Bash(git status)");
}

async function readSettings(
  root: string,
  relativePath = SETTINGS,
): Promise<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(await readFile(path.join(root, relativePath), "utf-8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("settings file is not a JSON object");
  }
  return { ...parsed };
}

async function withTempRoot(body: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-hooks-"));
  try {
    await body(root);
  } finally {
    await removeTempTree(root);
  }
}

// Fixed readers from the templates that printed full reminders only.
const earlierReaders = [
  {
    file: ".claude/settings.json",
    event: "UserPromptSubmit",
    key: "free-text-entry",
    program:
      "try{let p;try{p=JSON.parse(require('fs').readFileSync(0,'utf8')).prompt}catch{}if(!(typeof p==='string'&&/^[ \\t]*(<(task-notification|wake)[\\s>]|\\[SYSTEM NOTIFICATION)/m.test(p))){const m=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))[process.argv[2]];if(m!==undefined)console.log(JSON.stringify(m))}}catch{}",
  },
  {
    file: ".claude/settings.json",
    event: "PreToolUse",
    key: "api-budget",
    program:
      "try{const f=require('fs');let i={};try{i=JSON.parse(f.readFileSync(0,'utf8'))}catch{}const c=i.tool_input&&i.tool_input.command;if(typeof c==='string'&&/(^|[^\\w.-])gh([^\\w.-]|$)|api\\.github\\.com/.test(c)){let n=1;if(typeof i.session_id==='string'){try{const t=require('path').join(require('os').tmpdir(),['qfai-reminder',i.session_id,i.agent_id||'main',process.argv[2]].join('-').replace(/[^\\w.-]/g,'_'));f.appendFileSync(t,'.');n=f.statSync(t).size}catch{}}if((n-1)%20===0){const m=JSON.parse(f.readFileSync(process.argv[1],'utf8'))[process.argv[2]];if(m!==undefined)console.log(JSON.stringify(m))}}}catch{}",
  },
  {
    file: ".codex/hooks.json",
    event: "UserPromptSubmit",
    key: "free-text-entry",
    program:
      "node -e \"try{const f=require('fs'),p=require('path');let d=process.cwd(),r;for(;;){const c=p.join(d,'.agents','rules','reminders.json');if(r===undefined&&f.existsSync(c))r=c;if(f.existsSync(p.join(d,'.git')))break;const u=p.dirname(d);if(u===d){r=undefined;break}d=u}if(r){const m=JSON.parse(f.readFileSync(r,'utf8'))[process.argv[1]];m===undefined||console.log(JSON.stringify(m))}}catch{}\" free-text-entry",
  },
  {
    file: ".codex/hooks.json",
    event: "PreToolUse",
    key: "api-budget",
    program:
      "node -e \"try{const j=JSON.parse(require('fs').readFileSync(0,'utf8')),i=j.tool_input.command;if(typeof i==='string'&&/[^\\w.-]gh[^\\w.-]|api\\.github\\.com/.test(' '+i+' ')){const f=require('fs'),p=require('path');let d=process.cwd(),r;for(;;){const c=p.join(d,'.agents','rules','reminders.json');if(r===undefined&&f.existsSync(c))r=c;if(f.existsSync(p.join(d,'.git')))break;const u=p.dirname(d);if(u===d){r=undefined;break}d=u}if(r){let n=1;if(typeof j.session_id==='string'){try{const t=p.join(require('os').tmpdir(),['qfai-reminder',j.session_id,j.agent_id||'main',process.argv[1]].join('-').replace(/[^\\w.-]/g,'_'));f.appendFileSync(t,'.');n=f.statSync(t).size}catch{}}if(Number.isInteger((n-1)/20)){const m=JSON.parse(f.readFileSync(r,'utf8'))[process.argv[1]];m===undefined||console.log(JSON.stringify(m))}}}}catch{}\" api-budget",
  },
] as const;

function earlierReaderGroup(reader: (typeof earlierReaders)[number]) {
  const claude = reader.file === ".claude/settings.json";
  const statusMessage =
    reader.key === "api-budget" ? "QFAI api-budget reminder" : "QFAI free-text entry reminder";
  const entry = claude
    ? {
        type: "command",
        statusMessage,
        command: "node",
        args: [
          "-e",
          reader.program,
          "${CLAUDE_PROJECT_DIR}/.agents/rules/reminders.json",
          reader.key,
        ],
      }
    : { type: "command", statusMessage, command: reader.program, timeout: 10 };
  const hooks = [entry] as const;
  if (reader.event === "PreToolUse") return { matcher: "Bash", hooks };
  return claude ? { matcher: "*", hooks } : { hooks };
}

// QFAI:EX-0001-0021-09
describe("qfai init and the reminder hooks", () => {
  it.each(earlierReaders)("upgrades the full-only $key reader in $file", async (reader) => {
    await withTempRoot(async (root) => {
      const earlier = earlierReaderGroup(reader);
      const own = { hooks: [{ type: "command", command: "./own.sh" }] };
      await seedSettings(
        root,
        {
          permissions: { allow: ["Bash(git status)"] },
          hooks: { [reader.event]: [own, earlier] },
        },
        reader.file,
      );
      const shipped = readHookGroups(
        await readSettings(assetsRoot, reader.file),
        reader.event,
      ).filter((group) => JSON.stringify(group).includes(earlier.hooks[0].statusMessage));
      expect(shipped).toHaveLength(1);
      expect(shipped[0]).not.toEqual(earlier);

      const stdout = await initReporting(root);
      const settings = await readSettings(root, reader.file);
      const groups = readHookGroups(settings, reader.event);
      expectOwnPermissionFirst(settings);
      expect(groups.slice(0, 2)).toEqual([own, shipped[0]]);
      expect(
        groups.filter((group) => JSON.stringify(group).includes(earlier.hooks[0].statusMessage)),
      ).toEqual(shipped);
      expect(stdout).toContain(`updated: ${reader.file}`);
      expect(stdout).not.toContain("(edited here)");
      const updated = await readFile(path.join(root, reader.file), "utf-8");
      for (const force of [false, true]) {
        await initInto(root, force);
        expect(await readFile(path.join(root, reader.file), "utf-8")).toBe(updated);
      }
    });
  });

  it.each(earlierReaders)(
    "keeps a user-edited $key reader in $file, including with force",
    async (reader) => {
      await withTempRoot(async (root) => {
        const earlier = earlierReaderGroup(reader);
        const edited = {
          ...earlier,
          hooks: [{ ...earlier.hooks[0], command: "project-node" }] as const,
        };
        await seedSettings(root, { hooks: { [reader.event]: [edited] } }, reader.file);
        let previous: string | undefined;
        for (const force of [false, true, false]) {
          const stdout = await initReporting(root, force);
          const groups = readHookGroups(await readSettings(root, reader.file), reader.event);
          expect(groups[0]).toEqual(edited);
          expect(
            groups.filter((group) => JSON.stringify(group).includes(edited.hooks[0].statusMessage)),
          ).toEqual([edited]);
          expect(stdout).toContain(
            `kept: ${reader.file} hook group ${reader.event} "${edited.hooks[0].statusMessage}" (edited here)`,
          );
          const text = await readFile(path.join(root, reader.file), "utf-8");
          if (previous !== undefined) expect(text).toBe(previous);
          previous = text;
        }
      });
    },
  );

  it("seeds the whole settings file into a project that has none", async () => {
    await withTempRoot(async (root) => {
      await initInto(root);

      const text = await readFile(path.join(root, SETTINGS), "utf-8");
      expect(text).toContain(DOCUMENTATION_CLARITY_HOOK_MARKER);
      expect(text).toContain("mcp__github__");
    });
  });

  it("writes no message text into the settings file, and the messages beside the rules", async () => {
    await withTempRoot(async (root) => {
      await initInto(root);

      const text = await readFile(path.join(root, SETTINGS), "utf-8");
      expect(text).not.toContain(".agents/rules/grilling.md");
      const messages: unknown = JSON.parse(
        await readFile(path.join(root, ".agents", "rules", "reminders.json"), "utf-8"),
      );
      if (typeof messages !== "object" || messages === null) throw new Error("no message table");
      expectNoEmbeddedReminderText(text, messages);
      const entries = entriesOf(JSON.parse(text));
      expect(entries.length).toBeGreaterThan(0);
      for (const { entry } of entries) {
        const args: unknown = entry.args;
        if (!Array.isArray(args)) throw new Error("entry has no args");
        expect(args[2]).toBe("${CLAUDE_PROJECT_DIR}/.agents/rules/reminders.json");
        expect(Object.keys(messages)).toContain(args[3]);
      }
    });
  });

  it("replaces every group an earlier release wrote with this release's", async () => {
    await withTempRoot(async (root) => {
      const earlier = await earlierGroups();
      if (typeof earlier !== "object" || earlier === null) throw new Error("fixture is empty");
      await seedSettings(root, { permissions: { allow: ["Bash(git status)"] }, ...earlier });

      const stdout = await initReporting(root);

      const settings = await readSettings(root);
      expectOwnPermissionFirst(settings);
      const messages: unknown = JSON.parse(
        await readFile(path.join(root, ".agents", "rules", "reminders.json"), "utf-8"),
      );
      expectNoEmbeddedReminderText(JSON.stringify(settings), messages);
      const shipped = entriesOf(
        JSON.parse(await readFile(path.join(assetsRoot, ".claude", "settings.json"), "utf-8")),
      ).map(({ event, entry }) => JSON.stringify({ event, entry }));
      for (const { event, entry } of entriesOf(settings)) {
        expect(shipped).toContain(JSON.stringify({ event, entry }));
      }
      expect(stdout).toContain("updated: .claude/settings.json");
      expect(stdout).not.toContain("(edited here)");
    });
  });

  it("keeps a group the project edited, and names it on every run", async () => {
    await withTempRoot(async (root) => {
      const edited = {
        matcher: "mcp__github__(create_pull_request)",
        hooks: [
          {
            type: "command",
            statusMessage: DOCUMENTATION_CLARITY_HOOK_MARKER,
            command: "node",
            args: ["-e", "console.log('our own reminder')"],
          },
        ],
      };
      await seedSettings(root, { hooks: { PreToolUse: [edited] } });

      for (let run = 0; run < 2; run += 1) {
        const stdout = await initReporting(root);
        expect(readHookGroups(await readSettings(root))[0]).toEqual(edited);
        expect(stdout).toContain(
          `kept: .claude/settings.json hook group PreToolUse "${DOCUMENTATION_CLARITY_HOOK_MARKER}" (edited here)`,
        );
      }
    });
  });

  it("merges the entries into settings the project already had", async () => {
    await withTempRoot(async (root) => {
      const ownHook = { matcher: "Bash", hooks: [{ type: "command", command: "./own.sh" }] };
      await seedSettings(root, {
        permissions: { allow: ["Bash(git status)"] },
        hooks: { PreToolUse: [ownHook] },
      });

      await initInto(root);

      const settings = await readSettings(root);
      // Everything the project had is still there, and still first.
      expectOwnPermissionFirst(settings);
      const asText = JSON.stringify(settings);
      expect(asText).toContain("./own.sh");
      expect(asText).toContain(DOCUMENTATION_CLARITY_HOOK_MARKER);
      expect(asText.indexOf("./own.sh")).toBeLessThan(
        asText.indexOf(DOCUMENTATION_CLARITY_HOOK_MARKER),
      );
    });
  });

  it("adds a group to a project that carries only the earlier ones", async () => {
    // The upgrade path, and the reason the merge decides per group. A project
    // that installed before a reminder existed carries a settings file the
    // create-only copy will not touch, so a rerun is the only way the group
    // reaches it.
    await withTempRoot(async (root) => {
      const shipped: unknown = JSON.parse(
        await readFile(path.join(assetsRoot, ".claude", "settings.json"), "utf-8"),
      );
      const preToolUse = readHookGroups(shipped);
      const earlier = preToolUse.filter((group) =>
        JSON.stringify(group).includes(DOCUMENTATION_CLARITY_HOOK_MARKER),
      );
      expect(earlier.length).toBeGreaterThan(0);
      await seedSettings(root, { hooks: { PreToolUse: earlier } });

      await initInto(root);

      const settings = await readSettings(root);
      const merged = readHookGroups(settings);
      expect(merged.length).toBe(preToolUse.length);
      for (const marker of [
        GRILLING_DESIGN_ARTIFACT_HOOK_MARKER,
        GRILLING_DELEGATION_HOOK_MARKER,
        GRILLING_PLAN_HOOK_MARKER,
      ]) {
        expect(JSON.stringify(merged), `${marker} did not reach the project`).toContain(marker);
      }
      // The group it already had is not duplicated by the one it gained.
      expect(JSON.stringify(merged).split(DOCUMENTATION_CLARITY_HOOK_MARKER)).toHaveLength(2);
    });
  });

  it("adds the entries exactly once across repeated runs", async () => {
    await withTempRoot(async (root) => {
      await seedSettings(root, { hooks: {} });

      await initInto(root);
      const afterFirst = await readFile(path.join(root, SETTINGS), "utf-8");
      await initInto(root);
      const afterSecond = await readFile(path.join(root, SETTINGS), "utf-8");

      expect(afterSecond).toBe(afterFirst);
      expect(afterSecond.split(DOCUMENTATION_CLARITY_HOOK_MARKER)).toHaveLength(4);
    });
  });

  it("keeps older same-marker implementation text on normal and forced reinit", async () => {
    await withTempRoot(async (root) => {
      const own = { matcher: "Bash", hooks: [{ type: "command", command: "./own.sh" }] };
      const older = {
        matcher: "Edit",
        customSetting: "keep",
        hooks: [
          {
            type: "command",
            statusMessage: MINIMAL_IMPLEMENTATION_HOOK_MARKER,
            command: "project-node",
            args: ["-e", "console.log('older implementation reminder')"],
          },
        ],
      };
      await seedSettings(root, {
        permissions: { allow: ["Bash(git status)"] },
        hooks: { PostToolUse: [own, older] },
      });

      let previousText: string | undefined;
      for (const force of [false, true, false]) {
        await initInto(root, force);
        const settings = await readSettings(root);
        const hooks: unknown = settings.hooks;
        if (typeof hooks !== "object" || hooks === null) throw new Error("missing hooks");
        const groups: unknown = Reflect.get(hooks, "PostToolUse");
        if (!Array.isArray(groups)) throw new Error("missing PostToolUse groups");
        expect(groups).toHaveLength(3);
        expect(groups.slice(0, 2)).toEqual([own, older]);
        expect(JSON.stringify(groups).split(MINIMAL_IMPLEMENTATION_HOOK_MARKER)).toHaveLength(2);
        expectOwnPermissionFirst(settings);
        const text = await readFile(path.join(root, SETTINGS), "utf-8");
        if (previousText !== undefined) expect(text).toBe(previousText);
        previousText = text;
      }
    });
  });

  it("leaves a settings file it cannot parse exactly as it found it, and says so", async () => {
    await withTempRoot(async (root) => {
      const damaged = '{ "hooks": "off",\n';
      await mkdir(path.join(root, ".claude"), { recursive: true });
      await writeFile(path.join(root, SETTINGS), damaged, "utf-8");

      const stderr = await initInto(root);

      expect(await readFile(path.join(root, SETTINGS), "utf-8")).toBe(damaged);
      expect(stderr).toContain("reminder hooks");
    });
  });

  // A directory at the settings path causes a read failure on every host.
  // Init reports it and still writes the other assets.
  it("reports a settings path it cannot read and still completes the run", async () => {
    await withTempRoot(async (root) => {
      await mkdir(path.join(root, SETTINGS), { recursive: true });

      const stderr = await initInto(root);

      expect(stderr).toContain("reminder hooks");
      expect(stderr).toContain(".claude/settings.json");
      // init got past it: the files it writes beside the hooks are all there.
      await expect(readFile(path.join(root, "AGENTS.md"), "utf-8")).resolves.toContain(
        "documentation-clarity.md",
      );
    });
  });
});
