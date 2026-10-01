import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CODEX_HOOKS_RELATIVE_PATH,
  mergeDocumentationClarityHooks,
  serializeClaudeSettings,
} from "../claudeCodeHooks.js";
import { hasErrnoCode, isEnoent } from "../fs/errno.js";
import { findUnsafeHostFileComponent } from "./fsGuards.js";

/**
 * What bringing one host's hook file up to the shipped template takes.
 *
 * `edited` names each group the project changed, which is kept as it is.
 * `target` is absolute; every message names the file by its relative path.
 */
export type ReminderHooksPlan =
  /** Nothing is written. `message` says why and what to do, naming the file. */
  | { readonly kind: "refused"; readonly message: string }
  /** The project has no such file: the template is written whole. */
  | { readonly kind: "create"; readonly target: string; readonly text: string }
  /** `events` names the hook events whose groups were added or refreshed. */
  | {
      readonly kind: "update";
      readonly target: string;
      readonly text: string;
      readonly events: readonly string[];
      readonly permissionsAdded: boolean;
      readonly edited: readonly string[];
    }
  /** The file already carries every group the template declares. */
  | { readonly kind: "current"; readonly edited: readonly string[] };

/** A plan that writes the file. */
export type ReminderHooksWrite = Extract<ReminderHooksPlan, { kind: "create" | "update" }>;

/** What `qfai init` prints once it has written `.codex/hooks.json`. */
export const CODEX_HOOKS_TRUST_NOTE = `Codex runs the hooks in ${CODEX_HOOKS_RELATIVE_PATH} only after you review and trust them with /hooks.`;

/** The line naming a group the project edited, which is kept. */
export function keptHookGroupNote(relativePath: string, group: string): string {
  return `kept: ${relativePath} hook group ${group} (edited here)`;
}

/** What an update adds, as the run reports it. */
export function reminderHooksUpdateDetail(
  events: readonly string[],
  permissionsAdded: boolean,
): string {
  const parts = events.length > 0 ? [`reminder hooks: ${events.join(", ")}`] : [];
  if (permissionsAdded) parts.push("permission entries");
  return parts.join("; ");
}

/**
 * What reading a settings file produced: its text, nothing there, or a fault.
 *
 * `readTextFileIfPresent` collapses the last two into a throw, which is right
 * for a file init must have and wrong for this one. A settings file a
 * permission or a file type keeps this from reading is a file to leave alone
 * and report — not a reason to abandon the rest of an init run.
 */
type SettingsRead =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "absent" }
  | { readonly kind: "unreadable"; readonly reason: string };

async function readSettingsText(target: string): Promise<SettingsRead> {
  try {
    return { kind: "text", text: await readFile(target, "utf-8") };
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return { kind: "absent" };
    }
    const code = hasErrnoCode(err) ? err.code : "read failed";
    return { kind: "unreadable", reason: code };
  }
}

function copyByHand(relativePath: string, reason: string): ReminderHooksPlan {
  if (reason.startsWith("`permissions")) {
    return {
      kind: "refused",
      message:
        `${relativePath} was left unchanged (${reason}). Make \`permissions.allow\` an array, or add the ` +
        `shipped \`permissions.allow\` entries by hand, then run init again.`,
    };
  }
  return {
    kind: "refused",
    message:
      `${relativePath} was left unchanged (${reason}). Copy the \`hooks\` entries from ` +
      `the shipped template by hand to enable the reminder hooks.`,
  };
}

/**
 * Plans one host's reminder hooks: Claude Code's `.claude/settings.json` or
 * Codex's `.codex/hooks.json`, as `relativePath` names, against the template
 * at the same path under `assetsRoot`. Reads only.
 *
 * A project without the file gets the whole template. One that has its own
 * gets the hook groups it lacks, appended after whatever it already declares,
 * and each group an earlier release wrote is replaced where it stands. A group
 * the project edited is kept and named.
 *
 * Every refusal leaves the file exactly as it is. A symbolic link anywhere on
 * the path, the file itself included and dangling or not, would carry the read
 * and the write out of the project: a checked-in `.codex -> ~/.codex` is
 * enough to rewrite the user's own hook file.
 *
 * Messages name `relativePath`, never the absolute path. An absolute path
 * carries the destination directory's own name, which on an untrusted
 * repository can hold a newline or an ANSI escape and forge a report heading.
 */
export async function planReminderHooks(
  assetsRoot: string,
  destRoot: string,
  relativePath: string,
): Promise<ReminderHooksPlan> {
  const segments = relativePath.split("/");
  const target = path.join(destRoot, ...segments);

  const template = await readSettingsText(path.join(assetsRoot, ...segments));
  if (template.kind !== "text") {
    const why =
      template.kind === "absent"
        ? "the shipped hook template is missing from this install"
        : `the shipped hook template could not be read (${template.reason})`;
    return {
      kind: "refused",
      message: `${relativePath} was left unchanged: ${why}, so the reminder hooks are not wired up.`,
    };
  }

  if ((await findUnsafeHostFileComponent(destRoot, segments)) !== undefined) {
    return {
      kind: "refused",
      message:
        `${relativePath} was left unchanged: it, or a directory above it, is a symbolic link ` +
        `or not a directory, so the reminder hooks are not wired up.`,
    };
  }

  const existing = await readSettingsText(target);
  if (existing.kind === "unreadable") return copyByHand(relativePath, existing.reason);
  if (existing.kind === "absent") return { kind: "create", target, text: template.text };

  const merged = mergeDocumentationClarityHooks(existing.text, template.text);
  if (merged.outcome === "unreadable") return copyByHand(relativePath, merged.reason);
  if (merged.outcome === "already-present") return { kind: "current", edited: merged.edited };
  return {
    kind: "update",
    target,
    text: serializeClaudeSettings(merged.settings),
    events: merged.events,
    permissionsAdded: merged.permissionsAdded,
    edited: merged.edited,
  };
}

/** Writes what `planReminderHooks` planned, creating the host directory when it is absent. */
export async function writeReminderHooks(plan: ReminderHooksWrite): Promise<void> {
  await mkdir(path.dirname(plan.target), { recursive: true });
  await writeFile(plan.target, plan.text, "utf-8");
}
