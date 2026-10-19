import path from "node:path";
import { findUnsafeHostFileComponent, readPinnedRegularFile } from "../init/fsGuards.js";
import {
  CLAUDE_GRAPH_HOOK_GROUP,
  CODEX_GRAPH_HOOK_GROUP,
  SHARED_GRAPH_HOOK_ENTRY,
} from "./hookCommands.js";
import { inspectGraphHostProtection, type GraphHostProtection } from "./hosts.js";
import { codegraphEnvironment, type GraphProcess } from "./process.js";

export async function inspectInstalledGraphHosts(
  root: string,
  run: GraphProcess,
): Promise<GraphHostProtection[]> {
  const entries = await readObject(root, ".qfai/tools/graph-entrypoints.json");
  const sources = object(entries?.sources) ? entries.sources : undefined;
  let wrappers = entries?.kind === "graph-entrypoints" && sources !== undefined;
  for (const name of ["graph-cli.mjs", "graph-hook.mjs", "graph-enforcement.json"])
    wrappers =
      wrappers &&
      typeof sources?.[name] === "string" &&
      (await read(root, `.qfai/tools/${name}`)) === sources[name];
  const claude = await readObject(root, ".claude/settings.json");
  const claudeReady =
    wrappers &&
    claude?.disableAllHooks !== true &&
    contains(claude, "PreToolUse", CLAUDE_GRAPH_HOOK_GROUP);
  const codex = await readObject(root, ".codex/hooks.json");
  const codexReady =
    wrappers &&
    codex?.disableAllHooks !== true &&
    contains(codex, "PreToolUse", CODEX_GRAPH_HOOK_GROUP);
  const shared = await readObject(root, ".github/hooks/qfai-graph.json");
  const sharedReady =
    wrappers && shared?.version === 1 && contains(shared, "preToolUse", SHARED_GRAPH_HOOK_ENTRY);
  const facts = [];
  for (const [host, configured] of [
    ["claude", claudeReady],
    ["codex", codexReady],
    ["copilot", sharedReady],
    ["vscode", sharedReady],
  ] as const) {
    let version: string | undefined;
    // An editor version cannot establish which chat harness receives the hook.
    if (host !== "vscode") {
      try {
        const result = await run(host, ["--version"], {
          cwd: root,
          env: codegraphEnvironment(root),
          timeoutMs: 5000,
          maxBufferBytes: 4096,
        });
        const text = result.stdout.trim();
        const reported =
          text.length <= 160
            ? /^(?:Claude Code |codex-cli |(?:GitHub )?Copilot CLI )?(\d+\.\d+\.\d+(?:-[\da-zA-Z]+(?:\.[\da-zA-Z]+)*)?)(?: \(Claude Code\))?$/.exec(
                text,
              )
            : null;
        if (result.exitCode === 0 && reported) version = reported[1];
      } catch {
        /* A missing launcher does not change init's installation result. */
      }
    }
    facts.push({
      host,
      ...(version ? { version } : {}),
      configuration: configured ? ("configured" as const) : ("not-configured" as const),
      trust: "unknown" as const,
      // These settings do not prove denial on host startup failure or timeout.
      failureProtocol: "unverified" as const,
    });
  }
  return inspectGraphHostProtection(facts);
}

async function read(root: string, relative: string): Promise<string | undefined> {
  const segments = relative.split("/");
  try {
    if (await findUnsafeHostFileComponent(root, segments)) return undefined;
    return (await readPinnedRegularFile(path.join(root, ...segments), 1024 * 1024)) ?? undefined;
  } catch {
    return undefined;
  }
}

async function readObject(
  root: string,
  relative: string,
): Promise<Record<string, unknown> | undefined> {
  const text = await read(root, relative);
  try {
    const value: unknown = text === undefined ? undefined : JSON.parse(text);
    return object(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function contains(
  value: Record<string, unknown> | undefined,
  event: string,
  entry: unknown,
): boolean {
  if (!object(value?.hooks)) return false;
  const groups: unknown = value.hooks[event];
  return Array.isArray(groups) && groups.some((group: unknown) => same(group, entry));
}

function same(left: unknown, right: unknown): boolean {
  if (Array.isArray(right))
    return (
      Array.isArray(left) &&
      left.length === right.length &&
      right.every((value: unknown, index: number) => same(left[index], value))
    );
  if (!object(right)) return left === right;
  return (
    object(left) &&
    Object.keys(left).length === Object.keys(right).length &&
    Object.entries(right).every(
      ([key, value]) => Object.hasOwn(left, key) && same(left[key], value),
    )
  );
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
