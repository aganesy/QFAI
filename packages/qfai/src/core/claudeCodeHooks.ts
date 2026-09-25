/**
 * The Claude Code hook entries `qfai init` seeds, and how they reach a project
 * that already has a `.claude/settings.json`.
 *
 * The root template copy is create-only, so a project with its own settings
 * file keeps it — and with it, none of the hooks the same run wrote for a fresh
 * project. That is the population most likely to have an agent already writing
 * pull requests, which is what the hooks are there to steer. So the entries are
 * merged in as well, by the same shape `ensureAgentEntryPointRules` uses for
 * the rule section in `AGENTS.md` and `CLAUDE.md`.
 *
 * The merge is narrow. It appends to the arrays under `hooks.<event>`, and it
 * rewrites a group in place only when the group is exactly one an earlier
 * release wrote. It never reorders or removes anything, and it refuses the whole
 * file rather than guess whenever a value has an unexpected shape: a settings
 * file is the project's own configuration, and a half-understood merge into it
 * is worse than leaving it alone and saying so.
 *
 * The decision is taken per group, not per file. A file-wide one would mean
 * that the moment a project carries any group, every group added afterwards
 * reaches it no longer — and a project that installed an earlier set is exactly
 * the one an upgrade is for.
 *
 * The groups carry no message text. Each runs a fixed reader over
 * `.agents/rules/reminders.json`, which `qfai init` refreshes wherever the
 * project has not edited it, so a changed message reaches an existing project
 * without this file changing at all.
 */

import { createHash } from "node:crypto";

/** Identity of the hook entries seeded here, carried in each entry's spinner label. */
export const DOCUMENTATION_CLARITY_HOOK_MARKER = "QFAI documentation-clarity reminder";

/**
 * Identity of the group that restates the implementation rule after a file is
 * written or edited.
 *
 * A second marker rather than a second meaning for the first: the merge decides
 * per group, and it tells one group from another by the markers its entries
 * carry. Two groups sharing a marker would be one group to it, so a project
 * holding either would be told it has both.
 */
export const MINIMAL_IMPLEMENTATION_HOOK_MARKER = "QFAI minimal-implementation reminder";

/**
 * Identities of the three groups that restate the grilling rule, one for each
 * moment a decision stops being cheap to revisit.
 *
 * They share an event and differ only in matcher, which is the case the
 * paragraph above is about: the merge reads a group's identity off its markers,
 * so one marker across all three would make them one group, and a project that
 * had added any one of them by hand would never receive the other two.
 */
export const GRILLING_DESIGN_ARTIFACT_HOOK_MARKER = "QFAI grilling reminder: design artifact";
export const GRILLING_DELEGATION_HOOK_MARKER = "QFAI grilling reminder: delegation";
export const GRILLING_PLAN_HOOK_MARKER = "QFAI grilling reminder: plan";

/**
 * Identity of the group that restates the question-form rule on every turn.
 *
 * `UserPromptSubmit` rather than a one-shot event: the rule has to be in view at
 * the moment a question forms, and that moment is unpredictable. A session-start
 * reminder is gone by the time the context is compacted, which is exactly when a
 * long session starts skipping it.
 *
 * Its program reads the prompt out of the hook's input and stays silent when a
 * line of it opens with a task-notification or wake-up wrapper. Those turns are
 * automated rather than typed, and no question to the user forms on them. Any
 * other input, including none, prints the reminder.
 */
export const STRUCTURED_QUESTION_HOOK_MARKER = "QFAI structured-question reminder";

/**
 * Identity of the group that restates the API-budget rule before a shell command.
 *
 * Its program decides whether to print: it reads the command out of the hook's
 * own input and stays silent unless the command mentions the forge. The matcher alone would fire on every compound command,
 * which is the reason the writing rule's hook stays off the shell entirely.
 */
export const API_BUDGET_HOOK_MARKER = "QFAI api-budget reminder";

/** Where both the template and the project keep the file, relative to the root. */
export const CLAUDE_SETTINGS_RELATIVE_PATH = ".claude/settings.json";

export type ClaudeSettings = Record<string, unknown>;

/**
 * Every hook group an earlier template shipped, as the SHA-256 of
 * `JSON.stringify(group)` read from that template.
 *
 * Most of those groups carried their message inline; others ran a program that
 * has since changed. A project that installed one keeps that release's version
 * for good unless the merge replaces it. A group that
 * hashes to one of these is text a release wrote and nobody changed, so it takes
 * the template's group of the same identity; any other content under that
 * identity is the project's. A project can skip releases, so every spelling that
 * shipped stays listed.
 */
const SUPERSEDED_HOOK_GROUPS: ReadonlySet<string> = new Set([
  // documentation clarity, before a GitHub post
  "83272cd6a7fc8d0e56f67552005f8b6439098c96b64da26cbc25b4b9fc648f4a",
  // documentation clarity, after a Markdown write or edit
  "d998f68524cf18e997ccef824296889de6a963b0d45ab4318e86d68aca46edbb",
  "a2ef0a2c3dacc3438a9aa5f396a8ea25d2953ab18722f3dbaca04fc16376b803",
  // minimal implementation
  "3c112325b980d6ed9863ae413cbd50562fafe2ea270cda16e73367fed66d5635",
  "ce6a181d3a30a3458dc7886d6cf725aacb8a5d0e65bd58143204adba172a2621",
  // grilling: design artifact, delegation, plan
  "f9b1ad386f2975b1b8124a708c1b944cb1cf230335af27777ce0c32b47901491",
  "c36d673ed2a64f228b5575550d3d1bb75737ec830f1707e83c1ede4a5d232e12",
  "8fdbeff2b19a3e9c2a073fdc6056ed1fdaa4da0ae090b4e62ca76e45c840ea54",
  "87c5aaa089c2b3ceec57c9f1596fbe3f91edf51f6f8bd0544b7ab6fe82cd0149",
  "1337d0a1d6d9e60ce742c202e809220d2c380d6f7f372ca338141131782d1cc7",
  "18aefbcf40d6b8f8ea4d9ec1653c071adb11b0ec63830c460204896c00297af3",
  // structured question
  "50b1cbf2727d6fd0ad6561847e11bcb70090aa4dca4f7571ca30add9139617b4",
  "ace5deb2efa50f5c8dcdfbb595c94073a50a064e7cae46e27a49a1217dbabd0c",
]);

export type HookMergeResult =
  /**
   * The project file gained or refreshed groups. `events` names the hook events
   * touched, and `edited` the groups left alone because the project changed them.
   */
  | {
      readonly outcome: "merged";
      readonly settings: ClaudeSettings;
      readonly events: readonly string[];
      readonly edited: readonly string[];
    }
  /** The project already carries every group the template declares. */
  | { readonly outcome: "already-present"; readonly edited: readonly string[] }
  /** Nothing was changed; `reason` says what could not be read. */
  | { readonly outcome: "unreadable"; readonly reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `Array.isArray` with the element type stated.
 *
 * The built-in narrows an `unknown` to `any[]`, which makes every read of an
 * element untyped from there on. Naming the elements `unknown` keeps them
 * something the compiler still asks about.
 */
function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** The parsed object, or `null` when the text is not JSON or not an object. */
function parseSettings(text: string): ClaudeSettings | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return isRecord(parsed) ? parsed : null;
}

/** The `hooks` table of a settings object, or `null` when it is absent or malformed. */
function hooksTable(settings: ClaudeSettings): Record<string, unknown> | null | undefined {
  const hooks = settings.hooks;
  if (hooks === undefined) {
    return undefined;
  }
  return isRecord(hooks) ? hooks : null;
}

/**
 * Whether any entry anywhere under `hooks` carries the marker.
 *
 * A question about the file, answered for callers that want one. It is not how
 * the merge decides what to add: a file can carry one group and be missing the
 * next, and this would say yes to both.
 */
export function carriesDocumentationClarityHooks(settings: ClaudeSettings): boolean {
  const hooks = hooksTable(settings);
  if (hooks === undefined || hooks === null) {
    return false;
  }
  for (const groups of Object.values(hooks)) {
    if (!isUnknownArray(groups)) continue;
    for (const group of groups) {
      if (!isRecord(group) || !isUnknownArray(group.hooks)) continue;
      for (const entry of group.hooks) {
        if (isRecord(entry) && entry.statusMessage === DOCUMENTATION_CLARITY_HOOK_MARKER) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * A hook group's identity for the merge: the `statusMessage` values its entries
 * carry, sorted, as a string that can be compared.
 *
 * Identity rests on the markers rather than on the group's whole content
 * because the rest of a group is the part a project may reasonably have
 * touched — the reminder text is prose, and re-appending a group whose wording
 * someone adjusted would leave the project running two of them. The markers are
 * the part that says which group this is.
 *
 * `null` when the group carries no marker at all, which is a group this merge
 * cannot recognise on a later run.
 */
function groupIdentity(group: unknown): string | null {
  if (!isRecord(group) || !isUnknownArray(group.hooks)) {
    return null;
  }
  const markers: string[] = [];
  for (const entry of group.hooks) {
    if (isRecord(entry) && typeof entry.statusMessage === "string") {
      markers.push(entry.statusMessage);
    }
  }
  return markers.length === 0 ? null : JSON.stringify([...markers].sort());
}

/** The identities of the groups already under one event. */
function carriedIdentities(groups: readonly unknown[]): Set<string> {
  const carried = new Set<string>();
  for (const group of groups) {
    const identity = groupIdentity(group);
    if (identity !== null) {
      carried.add(identity);
    }
  }
  return carried;
}

/** The hook groups the template declares, by event, or `null` when the template is malformed. */
function templateGroups(templateText: string): Map<string, readonly unknown[]> | null {
  const template = parseSettings(templateText);
  if (template === null) {
    return null;
  }
  const hooks = hooksTable(template);
  if (hooks === undefined || hooks === null) {
    return null;
  }
  const byEvent = new Map<string, readonly unknown[]>();
  for (const [event, groups] of Object.entries(hooks)) {
    if (!isUnknownArray(groups) || groups.length === 0) {
      return null;
    }
    byEvent.set(event, groups);
  }
  return byEvent.size === 0 ? null : byEvent;
}

/**
 * `existingText` with the template's hook groups added, and each group an
 * earlier release wrote replaced by this release's.
 *
 * The result is a fresh object; the caller serializes it. Both inputs are read
 * as text rather than as objects so a project file that is not JSON at all is
 * an answer this function gives, not an exception the caller has to catch.
 */
export function mergeDocumentationClarityHooks(
  existingText: string,
  templateText: string,
): HookMergeResult {
  const groupsByEvent = templateGroups(templateText);
  if (groupsByEvent === null) {
    return { outcome: "unreadable", reason: "the shipped template declares no hooks" };
  }

  const existing = parseSettings(existingText);
  if (existing === null) {
    return { outcome: "unreadable", reason: "the project settings file is not a JSON object" };
  }

  const existingHooks = hooksTable(existing);
  if (existingHooks === null) {
    return {
      outcome: "unreadable",
      reason: "`hooks` in the project settings file is not an object",
    };
  }

  const merged: ClaudeSettings = structuredClone(existing);
  const mergedHooks: Record<string, unknown> = isRecord(merged.hooks) ? merged.hooks : {};
  const events: string[] = [];
  const edited: string[] = [];

  for (const [event, groups] of groupsByEvent) {
    const current = mergedHooks[event];
    if (current !== undefined && !isUnknownArray(current)) {
      return { outcome: "unreadable", reason: `\`hooks.${event}\` is not an array` };
    }
    const shipped = shippedByIdentity(groups);
    if (shipped === null) {
      return {
        outcome: "unreadable",
        reason: `a \`hooks.${event}\` group in the shipped template carries no status message`,
      };
    }
    const refreshed = refreshEvent(event, current ?? [], shipped, edited);
    if (refreshed !== null) {
      mergedHooks[event] = refreshed;
      events.push(event);
    }
  }

  if (events.length === 0) {
    return { outcome: "already-present", edited };
  }
  merged.hooks = mergedHooks;
  return { outcome: "merged", settings: merged, events, edited };
}

/** The template's groups for one event by identity, or `null` when one has no marker. */
function shippedByIdentity(groups: readonly unknown[]): Map<string, unknown> | null {
  const shipped = new Map<string, unknown>();
  for (const group of groups) {
    const identity = groupIdentity(group);
    if (identity === null) return null;
    shipped.set(identity, group);
  }
  return shipped;
}

/**
 * One event's groups brought to the template, or `null` when nothing changed.
 *
 * A group the template also declares is replaced in place when it is exactly
 * one an earlier release wrote, and added to `edited` when it is anything
 * else. A template group the project has no group for is appended.
 */
function refreshEvent(
  event: string,
  current: readonly unknown[],
  shipped: ReadonlyMap<string, unknown>,
  edited: string[],
): unknown[] | null {
  const refreshed = [...current];
  let touched = false;
  for (const [index, group] of refreshed.entries()) {
    const identity = groupIdentity(group);
    const release = identity === null ? undefined : shipped.get(identity);
    if (identity === null || release === undefined) continue;
    if (JSON.stringify(group) === JSON.stringify(release)) continue;
    if (SUPERSEDED_HOOK_GROUPS.has(groupDigest(group))) {
      refreshed[index] = structuredClone(release);
      touched = true;
    } else {
      edited.push(groupLabel(event, identity));
    }
  }

  const carried = carriedIdentities(refreshed);
  for (const [identity, group] of shipped) {
    if (!carried.has(identity)) {
      refreshed.push(structuredClone(group));
      touched = true;
    }
  }
  return touched ? refreshed : null;
}

function groupDigest(group: unknown): string {
  return createHash("sha256").update(JSON.stringify(group)).digest("hex");
}

/**
 * How the run output names a group: its event and its markers.
 *
 * Built from the template's identity, never from the project's own text, so
 * nothing the project wrote reaches the terminal through it.
 */
function groupLabel(event: string, identity: string): string {
  const markers: unknown = JSON.parse(identity);
  const names = isUnknownArray(markers) ? [...new Set(markers.map(String))] : [];
  return `${event} "${names.join('", "')}"`;
}

/** The text to write back: two-space JSON with a trailing newline. */
export function serializeClaudeSettings(settings: ClaudeSettings): string {
  return `${JSON.stringify(settings, null, 2)}\n`;
}
