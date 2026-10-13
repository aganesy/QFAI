import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isEnoent } from "../fs/errno.js";
import { findUnsafeHostFileComponent, readPinnedRegularFile } from "../init/fsGuards.js";
import { composeAdditionalGraphDenialHooks } from "./denialSettings.js";

export interface GraphSettingsComposition {
  files: string[];
  conflicts: string[];
}

export async function composeGraphDenialHooks(root: string): Promise<GraphSettingsComposition> {
  const claude = await composeClaudeDenialHook(root);
  const additional = await composeAdditionalGraphDenialHooks(root);
  return {
    files: [...claude.files, ...additional.files],
    conflicts: [...claude.conflicts, ...additional.conflicts],
  };
}

async function composeClaudeDenialHook(root: string): Promise<GraphSettingsComposition> {
  const relative = ".claude/settings.json";
  const file = path.join(root, ".claude", "settings.json");
  if (await findUnsafeHostFileComponent(root, [".claude", "settings.json"])) {
    return {
      files: [],
      conflicts: [
        "Review .claude/settings.json and manually merge graph hooks; its path is unsafe.",
      ],
    };
  }
  const conflict = {
    files: [],
    conflicts: [
      "Review .claude/settings.json and manually merge graph hooks; existing settings were retained.",
    ],
  };
  let text = "{}";
  try {
    const current = await readPinnedRegularFile(file, 1024 * 1024);
    if (current === null) return conflict;
    text = current;
  } catch (cause: unknown) {
    if (!isEnoent(cause)) return conflict;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause: unknown) {
    if (!(cause instanceof SyntaxError)) throw cause;
    return conflict;
  }
  if (!isObject(parsed) || (parsed.hooks !== undefined && !isObject(parsed.hooks))) return conflict;
  if (
    parsed.permissions !== undefined &&
    (!isObject(parsed.permissions) ||
      (parsed.permissions.allow !== undefined && !Array.isArray(parsed.permissions.allow)))
  )
    return conflict;
  if (hasOpaqueCredentials(parsed)) return credentialConflict(relative);
  const hooks = isObject(parsed.hooks) ? parsed.hooks : {};
  if (Object.values(hooks).some((groups: unknown) => !Array.isArray(groups))) return conflict;
  const groups = hooks.PreToolUse === undefined ? [] : hooks.PreToolUse;
  if (!Array.isArray(groups)) return conflict;
  const currentGroups: unknown[] = groups;
  const marker = "QFAI graph exploration";
  const managed = {
    matcher: "Bash|PowerShell|Grep",
    hooks: [
      {
        type: "command",
        statusMessage: marker,
        command: "node",
        args: ["${CLAUDE_PROJECT_DIR}/.qfai/tools/graph-hook.mjs", "claude"],
      },
    ],
  };
  const existing = currentGroups.filter(
    (group: unknown) =>
      isObject(group) &&
      Array.isArray(group.hooks) &&
      group.hooks.some((hook: unknown) => isObject(hook) && hook.statusMessage === marker),
  );
  if (existing.length > 0) {
    return existing.length === 1 && JSON.stringify(existing[0]) === JSON.stringify(managed)
      ? { files: [], conflicts: [] }
      : conflict;
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    JSON.stringify(
      { ...parsed, hooks: { ...hooks, PreToolUse: [...currentGroups, managed] } },
      null,
      2,
    ) + "\n",
  );
  return { files: [relative], conflicts: [] };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function credentialConflict(relative: string): GraphSettingsComposition {
  return {
    files: [],
    conflicts: [
      `Review ${relative} and move credentials to environment variables before merging graph settings; existing settings were retained.`,
    ],
  };
}

export function hasOpaqueCredentials(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item: unknown) => hasOpaqueCredentials(item));
  if (!isObject(value)) return false;
  return Object.entries(value).some(
    ([key, child]) =>
      (key === "env" && isObject(child) && Object.keys(child).length > 0) ||
      (/token|secret|password|api.?key|authorization|credential/i.test(key) &&
        typeof child === "string" &&
        child !== "") ||
      hasOpaqueCredentials(child),
  );
}
