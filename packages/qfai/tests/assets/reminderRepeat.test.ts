import { randomUUID } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { projectDirOf, runReminderHook } from "../helpers/reminderHooks.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** This repository's own hooks, and the copy `qfai init` writes. */
const SETTINGS = [".claude/settings.json", "packages/qfai/assets/init/.claude/settings.json"];

type Entry = { readonly command?: string; readonly args?: readonly string[] };
type Group = { readonly hooks: readonly Entry[] };

/** The reminders printed on a limited schedule, and the ones printed on every call. */
const LIMITED = [
  "grilling-design-artifact",
  "grilling-delegation",
  "minimal-implementation",
  "documentation-clarity-after-write",
  "documentation-clarity-after-edit",
  "api-budget",
];
const EVERY_CALL = ["documentation-clarity-before-post", "grilling-plan"];

/** Calls between two prints of one reminder, after the first. */
const PERIOD = 20;

/** Session ids this file made, so the counters they left in the temp directory can go. */
const sessions: string[] = [];

function newSession(): string {
  const id = `repeat-${randomUUID()}`;
  sessions.push(id);
  return id;
}

afterAll(async () => {
  const names = await readdir(os.tmpdir());
  await Promise.all(
    names
      .filter((name) => sessions.some((id) => name.startsWith(`qfai-reminder-${id}-`)))
      .map((name) => rm(path.join(os.tmpdir(), name), { force: true })),
  );
});

async function entries(rel: string): Promise<ReadonlyMap<string, Entry>> {
  const parsed: { hooks: Record<string, readonly Group[]> } = JSON.parse(
    await readFile(path.join(repoRoot, rel), "utf-8"),
  );
  const byKey = new Map<string, Entry>();
  for (const groups of Object.values(parsed.hooks)) {
    for (const group of groups) {
      for (const entry of group.hooks) byKey.set(entry.args?.[3] ?? "", entry);
    }
  }
  return byKey;
}

/** What one call prints. The command names the forge so the API-budget reminder applies. */
function call(rel: string, entry: Entry, input: Record<string, unknown>): Promise<string> {
  return runReminderHook(
    entry,
    projectDirOf(repoRoot, rel),
    JSON.stringify({ tool_input: { command: "gh api repos/o/r" }, ...input }),
  );
}

describe.each(SETTINGS)("%s limits how often a tool-time reminder repeats", (rel) => {
  it("prints each limited reminder on a session's first call and not on the second", async () => {
    const byKey = await entries(rel);
    for (const key of LIMITED) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const session_id = newSession();
      expect(await call(rel, entry, { session_id }), `${key}, first call`).toContain(
        "additionalContext",
      );
      expect(await call(rel, entry, { session_id }), `${key}, second call`).toBe("");
    }
  });

  it("prints again on the call after a full period, and not before it", async () => {
    const entry = (await entries(rel)).get("minimal-implementation");
    if (entry === undefined) throw new Error("no entry carries minimal-implementation");
    const session_id = newSession();
    const printed: number[] = [];
    for (let n = 1; n <= PERIOD + 1; n += 1) {
      if ((await call(rel, entry, { session_id })) !== "") printed.push(n);
    }
    expect(printed).toEqual([1, PERIOD + 1]);
  });

  it("counts each session, and each sub-agent of a session, on its own", async () => {
    const entry = (await entries(rel)).get("minimal-implementation");
    if (entry === undefined) throw new Error("no entry carries minimal-implementation");
    const session_id = newSession();
    await call(rel, entry, { session_id });
    expect(await call(rel, entry, { session_id, agent_id: "helper" })).toContain(
      "additionalContext",
    );
    expect(await call(rel, entry, { session_id: newSession() })).toContain("additionalContext");
  });

  it("prints on every call when the input names no session", async () => {
    const byKey = await entries(rel);
    for (const key of LIMITED) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      for (const input of [{}, { session_id: 7 }]) {
        expect(await call(rel, entry, input), key).toContain("additionalContext");
        expect(await call(rel, entry, input), key).toContain("additionalContext");
      }
    }
  });

  it("counts the API-budget reminder only on a command that names the forge", async () => {
    const entry = (await entries(rel)).get("api-budget");
    if (entry === undefined) throw new Error("no entry carries api-budget");
    const session_id = newSession();
    for (let n = 0; n < 3; n += 1) {
      expect(await call(rel, entry, { session_id, tool_input: { command: "git status" } })).toBe(
        "",
      );
    }
    expect(await call(rel, entry, { session_id })).toContain("api-budget.md");
  });

  it("leaves the reminders for a post and for leaving plan mode on every call", async () => {
    const byKey = await entries(rel);
    for (const key of EVERY_CALL) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const session_id = newSession();
      expect(await call(rel, entry, { session_id }), key).toContain("additionalContext");
      expect(await call(rel, entry, { session_id }), key).toContain("additionalContext");
    }
  });
});
