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
 */

/** Identity of the hook entries seeded here, carried in each entry's spinner label. */
export const DOCUMENTATION_CLARITY_HOOK_MARKER = "QFAI documentation-clarity reminder";

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
  /** The project already carries the marker, from an earlier run or by hand. */
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

/** Whether any entry anywhere under `hooks` already carries the marker. */
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
  if (carriesDocumentationClarityHooks(existing)) {
    return { outcome: "already-present" };
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
    mergedHooks[event] = [...(current ?? []), ...structuredClone(groups)];
    events.push(event);
  }

  merged.hooks = mergedHooks;
  return { outcome: "merged", settings: merged, events };
}

/** The text to write back: two-space JSON with a trailing newline. */
export function serializeClaudeSettings(settings: ClaudeSettings): string {
  return `${JSON.stringify(settings, null, 2)}\n`;
}
