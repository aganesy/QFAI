import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../fs/errno.js";
import { GRAPH_HOOK_MARKER, GRAPH_HOOK_SCRIPT } from "../graph/hookCommands.js";

/** The committed host settings init writes a graph hook entry into, root-relative. */
const HOST_SETTINGS = [
  ".claude/settings.json",
  ".codex/hooks.json",
  ".github/hooks/qfai-graph.json",
];

export type GraphHookCheck = {
  id: "graph.hookScript";
  severity: "ok" | "warning";
  title: string;
  message: string;
  details: { script: string; settings: string[] };
};

/** `true` when the file exists, `false` when it does not, and the error text when it cannot be checked. */
async function exists(target: string): Promise<boolean | string> {
  try {
    await stat(target);
    return true;
  } catch (cause: unknown) {
    if (isEnoent(cause)) return false;
    return cause instanceof Error ? cause.message : String(cause);
  }
}

/** Whether the file's JSON carries a graph hook entry; an absent or unreadable file carries none. */
async function hasGraphHook(file: string): Promise<boolean> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    return false;
  }
  try {
    return carriesGraphHook(JSON.parse(text));
  } catch {
    return false;
  }
}

function carriesGraphHook(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item: unknown) => carriesGraphHook(item));
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).some(
    (child: unknown) =>
      child === GRAPH_HOOK_MARKER ||
      (typeof child === "string" && child.includes(GRAPH_HOOK_SCRIPT)) ||
      carriesGraphHook(child),
  );
}

/**
 * Whether the graph hook entries in the committed host settings have their script.
 *
 * `.qfai/tools/` is git-ignored and created per checkout by init, so a fresh clone or a new
 * worktree carries the entries without the script. The hook then skips each call with a reminder,
 * which is why this is a warning and not an error. A project with no graph hook entry gets no check.
 */
export async function checkGraphHookScript(root: string): Promise<GraphHookCheck | undefined> {
  const settings: string[] = [];
  for (const relative of HOST_SETTINGS)
    if (await hasGraphHook(path.join(root, ...relative.split("/")))) settings.push(relative);
  if (settings.length === 0) return undefined;
  const title = `Graph hook script (${GRAPH_HOOK_SCRIPT})`;
  const details = { script: GRAPH_HOOK_SCRIPT, settings };
  const script = await exists(path.join(root, ...GRAPH_HOOK_SCRIPT.split("/")));
  if (script === true)
    return {
      id: "graph.hookScript",
      severity: "ok",
      title,
      message: "the graph hook script is installed",
      details,
    };
  if (typeof script === "string")
    return {
      id: "graph.hookScript",
      severity: "warning",
      title,
      message: `${GRAPH_HOOK_SCRIPT} could not be checked: ${script}`,
      details,
    };
  return {
    id: "graph.hookScript",
    severity: "warning",
    title,
    message:
      `${settings.join(", ")} run ${GRAPH_HOOK_SCRIPT}, which this checkout does not have. ` +
      ".qfai/tools/ is git-ignored and created per checkout: run qfai init here.",
    details,
  };
}
