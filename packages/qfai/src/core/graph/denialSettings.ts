import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isEnoent } from "../fs/errno.js";
import { findUnsafeHostFileComponent, readPinnedRegularFile } from "../init/fsGuards.js";
import { hasOpaqueCredentials, type GraphSettingsComposition } from "./hostSettings.js";

export async function composeAdditionalGraphDenialHooks(
  root: string,
): Promise<GraphSettingsComposition> {
  const codex = await compose(root, ".codex/hooks.json", "PreToolUse", {
    matcher: "^(Bash|PowerShell|exec_command|Grep|grep|rg|grep_search|search_files|file_search)$",
    hooks: [
      {
        type: "command",
        statusMessage: "QFAI graph exploration",
        command: "node .qfai/tools/graph-hook.mjs codex",
      },
    ],
  });
  const shared = await compose(
    root,
    ".github/hooks/qfai-graph.json",
    "preToolUse",
    {
      type: "command",
      bash: "node .qfai/tools/graph-hook.mjs shared",
      powershell: "node .qfai/tools/graph-hook.mjs shared",
      timeoutSec: 10,
    },
    1,
  );
  return {
    files: [...codex.files, ...shared.files],
    conflicts: [...codex.conflicts, ...shared.conflicts],
  };
}

async function compose(
  root: string,
  relative: string,
  event: string,
  managed: Record<string, unknown>,
  version?: number,
): Promise<GraphSettingsComposition> {
  const segments = relative.split("/");
  const file = path.join(root, ...segments);
  const conflict = {
    files: [],
    conflicts: [
      `Review ${relative} and manually merge graph hooks; existing settings were retained.`,
    ],
  };
  if (await findUnsafeHostFileComponent(root, segments)) return conflict;
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
  } catch {
    return conflict;
  }
  if (
    !object(parsed) ||
    (parsed.hooks !== undefined && !object(parsed.hooks)) ||
    (version !== undefined && parsed.version !== undefined && parsed.version !== version)
  )
    return conflict;
  if (hasOpaqueCredentials(parsed))
    return {
      files: [],
      conflicts: [
        `Review ${relative} and move credentials to environment variables before merging graph hooks; existing settings were retained.`,
      ],
    };
  const hooks = object(parsed.hooks) ? parsed.hooks : {};
  if (Object.values(hooks).some((groups: unknown) => !Array.isArray(groups))) return conflict;
  const groups: unknown = hooks[event] ?? [];
  if (!Array.isArray(groups)) return conflict;
  const currentGroups: unknown[] = groups;
  const current = currentGroups.filter((group: unknown) => candidate(group));
  if (current.length > 0)
    return current.length === 1 && JSON.stringify(current[0]) === JSON.stringify(managed)
      ? { files: [], conflicts: [] }
      : conflict;
  // This dedicated shared file must not acquire a second unrelated configuration.
  if (version !== undefined && text !== "{}") return conflict;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    JSON.stringify(
      {
        ...parsed,
        ...(version === undefined ? {} : { version }),
        hooks: { ...hooks, [event]: [...currentGroups, managed] },
      },
      null,
      2,
    ) + "\n",
  );
  return { files: [relative], conflicts: [] };
}

function candidate(value: unknown): boolean {
  if (!object(value)) return false;
  if (value.statusMessage === "QFAI graph exploration") return true;
  if (
    [value.command, value.bash, value.powershell].some(
      (text) => typeof text === "string" && text.includes("graph-hook.mjs"),
    )
  )
    return true;
  return Array.isArray(value.hooks) && value.hooks.some((hook: unknown) => candidate(hook));
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
