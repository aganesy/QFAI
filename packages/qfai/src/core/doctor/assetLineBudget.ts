import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { collectFiles } from "../fs.js";
import { ASSISTANT_DIR } from "../paths/assistantPaths.js";

/**
 * Line ceiling for a single assistant asset file.
 *
 * One number for every file, owned at runtime rather than by a test constant:
 * the ceiling is stated in the shipped operating baseline, so a project that
 * only has the published package must still be able to check it. The framework's
 * own asset test imports this constant instead of redeclaring it.
 *
 * The ceiling is a backstop, not the design rule. The design rule is that a
 * skill body stays thin: it states the contract and points at the topic file
 * that carries the detail, under the skill's own `references/`, `templates/` or
 * `examples/` directory. A file approaching this number is a signal to move a
 * section out, not to raise it.
 */
export const ASSISTANT_ASSET_MAX_LINES = 500;

/** File extensions that count as an authored assistant asset. */
export const ASSISTANT_ASSET_EXTENSIONS: readonly string[] = [".md", ".yml", ".yaml"];

/**
 * Asset files exempt from {@link ASSISTANT_ASSET_MAX_LINES}, with the reason.
 *
 * Keys are POSIX paths relative to the project's `.qfai/` directory. Keep this
 * list short: an exemption claims no split is possible, and "this file is long"
 * is not that claim. Every entry needs a reason a reader can check.
 */
export const LINE_BUDGET_EXEMPT: ReadonlyMap<string, string> = new Map([
  [
    "assistant/manifest/agent-catalog.yml",
    "Generated, not authored: it is derived from `assistant/agents/<id>.md`, one " +
      "entry per agent, and the agent-catalog test asserts it matches those " +
      "sources. Splitting it would mean splitting the agent roster it mirrors.",
  ],
]);

/**
 * Counts lines the way every budget assertion does.
 *
 * `split(/\r?\n/)` — not a blank-line-skipping counter. A markdown file is
 * substantially blank lines by volume, and undercounting them lets a file sit
 * ~20% over the ceiling while reporting as compliant.
 */
export function countLines(content: string): number {
  return content.split(/\r?\n/).length;
}

export type OversizedAssistantAsset = { path: string; lines: number };

export type AssistantAssetBudgetStatus = "ok" | "over_budget" | "skipped_missing_assistant";

export type AssistantAssetBudgetReport = {
  status: AssistantAssetBudgetStatus;
  assistantDir: string;
  maxLines: number;
  /** Number of asset files measured (exempt and unreadable files excluded). */
  scanned: number;
  oversized: OversizedAssistantAsset[];
  /** Exempt paths that were present and therefore skipped. */
  exempt: string[];
  /** Paths that could not be read; reported rather than silently passed. */
  unreadable: string[];
};

function toQfaiRelativePath(assistantDir: string, absolute: string): string {
  const rel = path.relative(assistantDir, absolute).replace(/[\\/]+/g, "/");
  return `${path.basename(ASSISTANT_DIR)}/${rel}`;
}

/**
 * Measures every `.qfai/assistant/**` asset against {@link ASSISTANT_ASSET_MAX_LINES}.
 *
 * Returns `skipped_missing_assistant` when the tree has not been created yet,
 * so a project that has not run init is not reported as a failure.
 */
export async function checkAssistantAssetLineBudget(
  root: string,
): Promise<AssistantAssetBudgetReport> {
  const assistantDir = path.resolve(root, ASSISTANT_DIR);
  let assistantExists = true;
  try {
    await access(assistantDir);
  } catch {
    assistantExists = false;
  }
  if (!assistantExists) {
    return {
      status: "skipped_missing_assistant",
      assistantDir,
      maxLines: ASSISTANT_ASSET_MAX_LINES,
      scanned: 0,
      oversized: [],
      exempt: [],
      unreadable: [],
    };
  }

  const files = await collectFiles(assistantDir, {
    extensions: [...ASSISTANT_ASSET_EXTENSIONS],
  });

  const oversized: OversizedAssistantAsset[] = [];
  const exempt: string[] = [];
  const unreadable: string[] = [];
  let scanned = 0;

  for (const absolute of files.sort()) {
    const relPath = toQfaiRelativePath(assistantDir, absolute);
    if (LINE_BUDGET_EXEMPT.has(relPath)) {
      exempt.push(relPath);
      continue;
    }
    let content: string;
    try {
      content = await readFile(absolute, "utf-8");
    } catch {
      // An unreadable asset cannot be measured. Surfacing it beats counting it
      // as compliant, which would let a permission error hide an overrun.
      unreadable.push(relPath);
      continue;
    }
    scanned += 1;
    const lines = countLines(content);
    if (lines > ASSISTANT_ASSET_MAX_LINES) {
      oversized.push({ path: relPath, lines });
    }
  }

  return {
    status: oversized.length > 0 ? "over_budget" : "ok",
    assistantDir,
    maxLines: ASSISTANT_ASSET_MAX_LINES,
    scanned,
    oversized,
    exempt,
    unreadable,
  };
}
