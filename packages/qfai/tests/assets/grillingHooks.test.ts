import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  GRILLING_DELEGATION_HOOK_MARKER,
  GRILLING_DESIGN_ARTIFACT_HOOK_MARKER,
  GRILLING_PLAN_HOOK_MARKER,
} from "../../src/core/claudeCodeHooks.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** This repository's own hooks, and the copy `qfai init` writes. */
const SETTINGS = [".claude/settings.json", "packages/qfai/assets/init/.claude/settings.json"];

type Hook = {
  readonly type: string;
  readonly command?: string;
  readonly args?: readonly string[];
  readonly statusMessage?: string;
  readonly if?: string;
};
type Matcher = { readonly matcher: string; readonly hooks: readonly Hook[] };

type Settings = { readonly hooks: Record<string, readonly Matcher[] | undefined> };

const readSettings = async (rel: string): Promise<Settings> =>
  JSON.parse(await readFile(path.join(repoRoot, rel), "utf-8"));

/** The `PreToolUse` groups, in file order. */
const groups = (s: Settings): readonly Matcher[] => s.hooks.PreToolUse ?? [];

/** The one `PreToolUse` group with this matcher; absent is the failure to report. */
function preToolUse(s: Settings, matcher: string): Matcher {
  const found = groups(s).find((m) => m.matcher === matcher);
  if (found === undefined) throw new Error(`no PreToolUse group matches ${matcher}`);
  return found;
}

/** Which marker each reminder carries, and so which group the upgrade merge sees. */
const MARKERS: ReadonlyArray<readonly [string, string]> = [
  ["Write|Edit", GRILLING_DESIGN_ARTIFACT_HOOK_MARKER],
  ["Task|Agent", GRILLING_DELEGATION_HOOK_MARKER],
  ["ExitPlanMode", GRILLING_PLAN_HOOK_MARKER],
];

describe("the grilling reminder fires where a decision gets made quietly", () => {
  it.each(SETTINGS)("%s reminds before a design artifact is written", async (rel) => {
    // The moment a decision stops being reversible cheaply.
    //
    // No `if`, deliberately, and for the reason the implementation-rule hook in
    // this same file gives: the condition is a path scope, and a project moves
    // its artifacts with `paths.specsDir` / `paths.discussionDir`. A scope
    // naming the defaults is silently absent in exactly the project that
    // relocated -- and deriving it at `qfai init` fixes it only until the
    // config changes, which init does not see. The cost of the broader match is
    // one line on a write that was not a design decision, against a reminder
    // that disappears without trace on one that was.
    const settings = await readSettings(rel);
    const group = preToolUse(settings, "Write|Edit");
    expect(group.hooks).toHaveLength(1);
    expect(group.hooks[0]?.if, "a path scope goes stale when a project relocates").toBeUndefined();
  });

  it.each(SETTINGS)("%s reminds before work is delegated", async (rel) => {
    // Delegation is where a decision is most often made alone: the sub-agent
    // answers whatever the work order left open, and nobody sees the question.
    const settings = await readSettings(rel);
    expect(preToolUse(settings, "Task|Agent").hooks.length).toBeGreaterThan(0);
  });

  it.each(SETTINGS)("%s reminds before a plan is fixed", async (rel) => {
    const settings = await readSettings(rel);
    expect(preToolUse(settings, "ExitPlanMode").hooks.length).toBeGreaterThan(0);
  });

  it.each(SETTINGS)("%s keeps every reminder a reminder", async (rel) => {
    // A blocking hook would have to judge whether a question should have been
    // asked, which needs intent — and a false positive stops work outright.
    // `additionalContext` is what a reminder emits; a decision field is not.
    const settings = await readSettings(rel);
    for (const [matcher] of MARKERS) {
      for (const hook of preToolUse(settings, matcher).hooks) {
        const payload = (hook.args ?? []).join(" ");
        expect(payload).toContain("additionalContext");
        expect(payload).not.toContain("permissionDecision");
      }
    }
  });

  it.each(SETTINGS)("%s runs node directly, with no shell", async (rel) => {
    // The pattern the writing-standard reminder established: no shell, no file
    // reads, no network — so a hook on every write cannot itself fail the run.
    const settings = await readSettings(rel);
    for (const [matcher] of MARKERS) {
      for (const hook of preToolUse(settings, matcher).hooks) {
        expect(hook.type).toBe("command");
        expect(hook.command).toBe("node");
        expect(hook.args?.[0]).toBe("-e");
      }
    }
  });

  it.each(SETTINGS)("%s points at the master rather than restating it", async (rel) => {
    // A hook that carries the rule drifts from it, and a compressed method is
    // worse than none: the rule's parts qualify each other, so a summary that
    // drops a qualifier states the opposite of what the rule says. An earlier
    // draft of this text managed it four times over — user-held facts have no
    // recommendation, a frontier larger than the host takes goes in consecutive
    // batches, a running lookup keeps a session open past an empty frontier,
    // and a session between agents does end at a count.
    //
    // So the reminder names the trigger, names the file, and stops.
    const settings = await readSettings(rel);
    for (const [matcher] of MARKERS) {
      const payload = preToolUse(settings, matcher)
        .hooks.map((h) => (h.args ?? []).join(" "))
        .join(" ");
      expect(payload, `${matcher} does not name the master`).toContain(".agents/rules/grilling.md");
      for (const part of ["frontier", "round", "recommend", "confirmation", "lookup"]) {
        expect(payload.toLowerCase(), `${matcher} restates the method: ${part}`).not.toContain(
          part,
        );
      }
    }
  });

  it.each(SETTINGS)("%s gives each reminder its own marker", async (rel) => {
    // The upgrade merge reads a group's identity off the markers its entries
    // carry. One marker across the three would make them one group, so a
    // project that had added any of them by hand would never receive the rest.
    const settings = await readSettings(rel);
    for (const [matcher, marker] of MARKERS) {
      for (const hook of preToolUse(settings, matcher).hooks) {
        expect(hook.statusMessage, `${matcher} carries the wrong marker`).toBe(marker);
      }
    }
  });

  it("both settings files carry the same reminders", async () => {
    // One is the other's source. A reminder in this repository and not in the
    // shipped copy reaches nobody who installed QFAI.
    const shapes = await Promise.all(
      SETTINGS.map(async (rel) =>
        JSON.stringify(groups(await readSettings(rel)).map((m) => m.matcher)),
      ),
    );
    expect(new Set(shapes).size, "the two copies list different matchers").toBe(1);
  });
});
