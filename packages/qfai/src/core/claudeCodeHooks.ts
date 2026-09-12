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
 * The merge is additive and narrow. It only appends to the arrays under
 * `hooks.<event>`, never reorders or removes what is there, and it refuses the
 * whole file rather than guess whenever a value has an unexpected shape: a
 * settings file is the project's own configuration, and a half-understood merge
 * into it is worse than leaving it alone and saying so.
 *
 * The decision is taken per group, not per file. A file-wide one would mean
 * that the moment a project carries any group, every group added afterwards
 * reaches it no longer — and a project that installed an earlier set is exactly
 * the one an upgrade is for.
 */

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

/** Where both the template and the project keep the file, relative to the root. */
export const CLAUDE_SETTINGS_RELATIVE_PATH = ".claude/settings.json";

export type ClaudeSettings = Record<string, unknown>;

export type HookMergeResult =
  /** The project file gained the entries; `events` names the hook events touched. */
  | {
      readonly outcome: "merged";
      readonly settings: ClaudeSettings;
      readonly events: readonly string[];
    }
  /** The project already carries every group the template declares. */
  | { readonly outcome: "already-present" }
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
 * `existingText` with the template's hook entries appended.
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

  for (const [event, groups] of groupsByEvent) {
    const current = mergedHooks[event];
    if (current !== undefined && !isUnknownArray(current)) {
      return { outcome: "unreadable", reason: `\`hooks.${event}\` is not an array` };
    }
    const carried = carriedIdentities(current ?? []);
    const missing: unknown[] = [];
    for (const group of groups) {
      const identity = groupIdentity(group);
      if (identity === null) {
        return {
          outcome: "unreadable",
          reason: `a \`hooks.${event}\` group in the shipped template carries no status message`,
        };
      }
      if (!carried.has(identity)) {
        missing.push(structuredClone(group));
      }
    }
    if (missing.length === 0) {
      continue;
    }
    mergedHooks[event] = [...(current ?? []), ...missing];
    events.push(event);
  }

  if (events.length === 0) {
    return { outcome: "already-present" };
  }
  merged.hooks = mergedHooks;
  return { outcome: "merged", settings: merged, events };
}

/** The text to write back: two-space JSON with a trailing newline. */
export function serializeClaudeSettings(settings: ClaudeSettings): string {
  return `${JSON.stringify(settings, null, 2)}\n`;
}
