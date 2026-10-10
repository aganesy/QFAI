/**
 * The Claude Code hook entries `qfai init` seeds, and how they reach a project
 * that already has a `.claude/settings.json`. Codex's `.codex/hooks.json` has
 * the same table of groups and is merged by the same code.
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
 * The template's `permissions.allow` entries are merged the same way: the ones
 * the project lacks are appended after its own, and nothing else under
 * `permissions` is touched. Claude Code accepts no wildcard for a skill name,
 * so the template lists each shipped skill.
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
 * line of it opens with a task-notification or wake-up wrapper, or a system
 * notification header. Those turns are automated rather than typed, and no
 * question to the user forms on them. Any other input, including none, prints
 * the reminder.
 */
export const STRUCTURED_QUESTION_HOOK_MARKER = "QFAI structured-question reminder";

/**
 * Identity of the group that sends, on every turn, a request naming no skill
 * to `qfai-run`.
 *
 * The host picks a skill from the request's wording, and may pick another one
 * or none. The hook is the one place the rule is stated, and it states it with
 * each message so that it does not fade as a session grows.
 *
 * It skips the same automated turns as the question-form group: with no user
 * message on them there is no request to route.
 */
export const FREE_TEXT_ENTRY_HOOK_MARKER = "QFAI free-text entry reminder";

/**
 * Identity of the group that says, on every turn, that qfai is not installed in
 * this checkout.
 *
 * `npx qfai` walks up from the project, so a fresh clone or a nested worktree
 * with no install of its own resolves the copy a parent directory holds, which
 * may be an older version, or fetches one. The group's program looks for this
 * checkout's own launcher, up to its git root and no further, and prints the
 * remedy only where there is none.
 */
export const INSTALL_CHECK_HOOK_MARKER = "QFAI install check reminder";

/**
 * Identity of the group that asks, when a turn ends, for the session review the
 * session-feedback rule sets out.
 *
 * `Stop` rather than a prompt-time event: it is the one moment after the last
 * task, and no hook can see whether the user's work is done. The group's program
 * therefore blocks the stop once, with a message that has the agent decline at
 * once unless the work is complete. It stays silent when a stop hook is already
 * continuing the turn, which ends the loop, and when the turn ends in a question,
 * which is a pause rather than a completion.
 */
export const SESSION_FEEDBACK_HOOK_MARKER = "QFAI session feedback reminder";

/**
 * Identity of the group that restates the API-budget rule before a shell command.
 *
 * Its program decides whether to print: it reads the command out of the hook's
 * own input and stays silent unless the command mentions the forge. The matcher
 * alone would fire on every compound command, which is the reason the writing
 * rule's hook stays off the shell entirely.
 */
export const API_BUDGET_HOOK_MARKER = "QFAI api-budget reminder";

/** Where both the template and the project keep the file, relative to the root. */
export const CLAUDE_SETTINGS_RELATIVE_PATH = ".claude/settings.json";

/**
 * Where both the template and the project keep Codex's hook file.
 *
 * It has the same `hooks.<event>` table of groups as the Claude Code settings,
 * so the merge below serves both. Its tool-time groups carry the Claude Code
 * groups' markers under Codex's own tool names, so a group's identity is the
 * same in both files. Codex has no tool call that leaves plan mode, so the plan
 * reminder has no Codex group.
 */
export const CODEX_HOOKS_RELATIVE_PATH = ".codex/hooks.json";

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
  // grilling design artifact, documentation clarity after a write or edit, and
  // minimal implementation, while they skipped the run's own records
  "65ebbdd8b1f90c1d74903fea8825bc88d690ffecc9812ebc24dbce08b1183ce0",
  "d9bcff10eec6b956afac8917ea2f015443a1c7a2033e589faad8847d1dcb2c43",
  "d0ca4f31020f37882d1f93448a0f77dfcdd21a66d25f0562961576e60d351fea",
  // Codex: every group of the file whose Windows line ran only under `cmd.exe`
  "dba38a95f6008a2371c7a19f965d9e5c5cfedff81b956b9fdc9a5ae60378f0f6",
  "143a27e53eb0cace36d4079b931a48c5e057a44e8aa0c11064f018aa7bd74128",
  "71d3ff9ff25b358ca42c4d11755b9204a9f6b7c22f57d4e37c73d6b96941b4c0",
  "456900de1ad2c5496bab7deae388b095edcf69ce51315e7ddbbfc7c413cfa330",
  "559a90b17f19c6cc670c512151843d28a3295149bb9c1bb07ca268bfc3f0cfae",
  "981058fa84e7c20eb9a72815aa6d132cbd8dbfbbe7e2a99db24a209e0b034723",
  "15d21b0c00535c6f8241a4fbefb670c9d01bbdf15e9b18337d5fc76ed09b8879",
  "b537eee9778a7273ddaffb33513e9202394894ef8e0eecdf7a961d85b8cb7a5c",
  // structured question: the program that read no input, before it skipped automated turns
  "ace5deb2efa50f5c8dcdfbb595c94073a50a064e7cae46e27a49a1217dbabd0c",
  // structured question: the program that skipped only a task-notification or wake-up wrapper
  "42e59754850b7e1e7e3b62e6ea596810552a0a05db64504ae17522748a7f1998",
  // free-text entry: the program that read no input, before it skipped automated turns
  "8ed926315594cbe69d000b754cbf4e67cedf3cdcaab82d60fdee20adcd6cc16e",
  // tool-time reminders that printed on every call, before they were limited per session:
  // grilling before a write or edit and before delegation, API budget, documentation clarity
  // after a Markdown write or edit, and minimal implementation
  "3d67d2654ce6fbe4cd060a55598ecd5b0198f06c7b13b8b75ea3462e0fc122ac",
  "a6186d6a3c4723441e5604dfb1531faa80cceb1a6cfde8f3a88a379b65b54c7d",
  "fd357165036f1d8546c6052160738ec64536e8063fa9e20427104a605d4953ce",
  "871cd5dc08d66d273b1ce1be9325da13b53999269b5cd72831d5cf8d501c2b72",
  "cd1490ce2ef9062619617277eb4d684d6b1d934f9b1ed2df2751660d6c72e650",
  // minimal implementation in `.claude/settings.json` and `.codex/hooks.json`, before it skipped
  // files that are not product source
  "7b5ba83e524a9c5a8f94f320cc0ac18b216b2c1e7b27497ccd8bb3e443f2b5c9",
  "2ae0c735ac2c72fffd652a2cb3b818c8f2dbefd0493998a86d46c6160d99734b",
  // Codex: the tool-time groups that printed on every call, before they were limited per session:
  // grilling before a write, grilling before a delegation, API budget, documentation clarity after
  // a Markdown write or edit, and minimal implementation.
  "8bd6fb0f6757f6b3e1d5091ff8725dafcd2647fcb5a848ec59659678c6b2eac7",
  "18fec3634efbf8092a5fc1048e7f2270599fb80e80e149a317c50ceab5441f72",
  "25d30caf60dad4693052424eb765c8a44d5743a458f18e267af290665c291b20",
  "590c412049cd6cb5ff40c8f1d22bc4ae78f3fcee2301b077a3bdedf259397611",
  "5d30d9e8e46c895af66eb5ac8c198662627c52ca0e2121835cc9ac0d0d1e830a",
  // Full-only and periodic groups replaced by first-full, then brief reminders.
  "584c2adc4cebac97de824615439a621fdfa56193772e2fcd873ad8f32d43aacd",
  "3091e6649c6784eb9dbc016d01ef8843d1f61ae8444a37c862645952c85879a8",
  "4c807c335b4fb02454ca5c4d579b61c7ea580df09380e3cd818e328c0174b1f2",
  "0a77dab5a2d06b88519a01981fb6e3a7483445248a669a84318fe8647bbed9c3",
  "e2e76031637af64d5972f4019bddec2ca727697f5f548dd47505f2c7d42128b7",
  "cd191df19f9145caeb18f62469c74c429608cf8899acd191e93297b9da76daf7",
  "25e2ffc325db1643266438c6b7761227285441fa74422b0ff4fcde1b54dae9b9",
  "a799d5be256ceaedff7250619e25eef2683bf88b0bcdcf19225e56fc8926a064",
  "cb60506ba7716c5a7f508324e006857a4c17738e294cdb8263c6b92ea93680ec",
  "9575f07ca1f37cdc55f729a1ce08da4e161f677b1d28e0a8f6f2702be387d677",
  "b05b5cdea6b3e6745d466a11d8aaf6dc42650d69ab2f2619575b5e5fa51988fc",
]);

export type HookMergeResult =
  /**
   * The project file gained or refreshed groups or permission entries. `events`
   * names the hook events touched, `permissionsAdded` says whether entries were
   * appended to `permissions.allow`, and `edited` names the groups left alone
   * because the project changed them.
   */
  | {
      readonly outcome: "merged";
      readonly settings: ClaudeSettings;
      readonly events: readonly string[];
      readonly permissionsAdded: boolean;
      readonly edited: readonly string[];
    }
  /** The project already carries every group and entry the template declares. */
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

  const allowed = addAllowedEntries(merged, shippedAllowEntries(templateText));
  if (typeof allowed === "string") return { outcome: "unreadable", reason: allowed };

  if (events.length === 0 && !allowed) {
    return { outcome: "already-present", edited };
  }
  merged.hooks = mergedHooks;
  return { outcome: "merged", settings: merged, events, permissionsAdded: allowed, edited };
}

/** The `permissions.allow` strings the template declares, none when it declares no list. */
function shippedAllowEntries(templateText: string): readonly string[] {
  const permissions = parseSettings(templateText)?.permissions;
  const allow = isRecord(permissions) ? permissions.allow : undefined;
  return isUnknownArray(allow) ? allow.filter((entry) => typeof entry === "string") : [];
}

/**
 * Appends the shipped entries the project lacks to `merged.permissions.allow`.
 *
 * The project's own entries keep their order and every other key of
 * `permissions` is left as it is. Returns whether anything was added, or the
 * reason the project's value cannot be read, which refuses the whole file the
 * way an unreadable `hooks` value does.
 */
function addAllowedEntries(merged: ClaudeSettings, shipped: readonly string[]): boolean | string {
  if (shipped.length === 0) return false;
  const permissions = merged.permissions === undefined ? {} : merged.permissions;
  if (!isRecord(permissions)) return "`permissions` in the project settings file is not an object";
  const allow = permissions.allow === undefined ? [] : permissions.allow;
  if (!isUnknownArray(allow)) return "`permissions.allow` is not an array";
  const missing = shipped.filter((entry) => !allow.includes(entry));
  if (missing.length === 0) return false;
  merged.permissions = { ...permissions, allow: [...allow, ...missing] };
  return true;
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
