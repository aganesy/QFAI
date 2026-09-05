import { createReadStream, type Dirent } from "node:fs";
import { access, lstat, readdir } from "node:fs/promises";
import path from "node:path";

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
 * `examples/` directory.
 *
 * Raised from 500 once, on measurement rather than on the "this file is long"
 * claim this number exists to refuse. Three skill bodies had converged on the
 * old ceiling at 498 / 498 / 500 lines, with 33 / 22 / 16 open changes in
 * flight against them. Two of the three are net neutral, but the middle one is
 * not: eleven of its open changes each carry it past the old ceiling on their
 * own, the widest to 549, and their intended edits together add 161 lines to a
 * body that starts at 498.
 *
 * Splitting does not absorb that. What those bodies still carry is held there
 * by asset tests that require an agent to read a rule where the rule acts, so
 * the movable residue is a few dozen lines. Nor is a net-neutral queue safe at
 * zero headroom: changes land one at a time, and a body at 498 fails on the
 * first one that adds four lines whether or not a later one takes them back.
 *
 * Converging on the limit was itself the signal: a body at the ceiling stops
 * shedding topics and starts packing them into longer lines, and by then the
 * widest line in one of those files ran 6192 characters — so the count had
 * stopped bounding what an agent must read. A line ceiling cannot see that;
 * only a reader can.
 *
 * A file approaching this number is still a signal to move a section out.
 * Raise it again only against evidence of the same kind.
 */
export const ASSISTANT_ASSET_MAX_LINES = 800;

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
    "A roster, not prose: one entry per agent, mirroring `assistant/agents/<id>.md`. " +
      "Its length tracks the number of agents — shipped, or adjusted through " +
      "`qfai-configure` — so there is no topic to move out; splitting it would " +
      "mean splitting the agent roster itself.",
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

const NEWLINE_BYTE = 0x0a;

/**
 * Counts the lines of a file without holding it in memory.
 *
 * Same arithmetic as {@link countLines} — `split(/\r?\n/).length` is the number
 * of `\n` separators plus one — but streamed, so a mis-generated asset of any
 * size costs a constant-size buffer instead of the whole file plus a per-line
 * array. Doctor has to survive the malformed tree it is being asked to
 * diagnose; the exact count is kept because the finding reports it.
 */
async function countFileLines(absolute: string): Promise<number> {
  const stream = createReadStream(absolute);
  let newlines = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: string | Buffer) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        let index = buffer.indexOf(NEWLINE_BYTE);
        while (index !== -1) {
          newlines += 1;
          index = buffer.indexOf(NEWLINE_BYTE, index + 1);
        }
      });
      stream.on("error", reject);
      stream.on("end", resolve);
    });
  } finally {
    stream.destroy();
  }
  return newlines + 1;
}

export type OversizedAssistantAsset = { path: string; lines: number };

/** An asset skipped by {@link LINE_BUDGET_EXEMPT}, carried with its reason. */
export type ExemptAssistantAsset = { path: string; reason: string };

export type AssistantAssetBudgetStatus =
  | "ok"
  | "over_budget"
  | "incomplete"
  | "skipped_missing_assistant";

export type AssistantAssetBudgetReport = {
  status: AssistantAssetBudgetStatus;
  assistantDir: string;
  maxLines: number;
  /** Number of asset files measured (exempt and unreadable files excluded). */
  scanned: number;
  oversized: OversizedAssistantAsset[];
  /**
   * Exempt paths that were present and therefore skipped, each with the reason
   * from {@link LINE_BUDGET_EXEMPT}. The shipped baseline promises the reader
   * sees *why* a file was not measured, so the reason travels with the path
   * instead of living only in this module's source.
   */
  exempt: ExemptAssistantAsset[];
  /** Files that could not be read; reported rather than silently passed. */
  unreadable: string[];
  /**
   * Paths whose contents were never measured: a directory that could not be
   * listed, or an entry whose type could not be determined at all — the latter
   * may be a directory, so it is reported rather than assumed to be neither.
   */
  unscannable: string[];
};

/**
 * Rewrites the platform's separators to `/` — and only the platform's.
 *
 * A blanket `replace(/[\\/]+/g, "/")` is wrong off Windows: POSIX treats a
 * backslash as an ordinary filename character, so an authored asset literally
 * named `manifest\agent-catalog.yml` directly under `assistant/` would be
 * reported as `assistant/manifest/agent-catalog.yml`, collide with the
 * {@link LINE_BUDGET_EXEMPT} key and go unmeasured at any length. On Windows
 * both separators are real separators, so both still collapse there.
 */
function toPosixSegments(relative: string): string {
  return path.sep === "\\" ? relative.replace(/[\\/]+/g, "/") : relative.replace(/\/+/g, "/");
}

function toQfaiRelativePath(assistantDir: string, absolute: string): string {
  const assistantName = path.basename(ASSISTANT_DIR);
  if (path.resolve(absolute) === path.resolve(assistantDir)) {
    return assistantName;
  }
  return `${assistantName}/${toPosixSegments(path.relative(assistantDir, absolute))}`;
}

type AssistantAssetScan = {
  files: string[];
  /**
   * Paths the walk could not descend into or classify: a directory whose
   * listing failed (permission, or removed mid-scan), or an entry whose type
   * neither `readdir` nor `lstat` could report.
   */
  unscannable: string[];
};

/**
 * True when `readdir` reported no type for the entry.
 *
 * `withFileTypes: true` fills the type from the directory entry only when the
 * filesystem supplies one. NFS, several FUSE mounts and other network
 * filesystems answer `DT_UNKNOWN`, and then *every* predicate on the Dirent is
 * false — an ordinary file and an ordinary directory both look like "neither".
 * A walk that only asks `isFile()` / `isDirectory()` drops them silently, so a
 * whole subtree of oversized assets goes unmeasured while the report still says
 * `ok`. Such an entry has to be resolved with a `lstat` instead.
 */
function hasUnknownType(entry: Dirent): boolean {
  return !(
    entry.isFile() ||
    entry.isDirectory() ||
    entry.isSymbolicLink() ||
    entry.isBlockDevice() ||
    entry.isCharacterDevice() ||
    entry.isFIFO() ||
    entry.isSocket()
  );
}

/**
 * Walks the assistant tree without the repository-wide default ignore list.
 *
 * The baseline promises that *every* `.qfai/assistant/**` asset is measured, so
 * this cannot reuse `collectFiles`: that walker always drops directories named
 * `node_modules` / `.git` / `dist` / `.pnpm` / `tmp` / `.mcp-tools`, which would
 * silently exempt e.g. `skills/<id>/references/tmp/*.md` from the ceiling.
 *
 * A directory that cannot be listed is recorded instead of thrown: doctor is a
 * diagnostic and must still print its other checks when one subtree is locked
 * or is removed while the scan runs. Symlinked directories are not followed —
 * neither `Dirent.isDirectory()` nor `lstat().isDirectory()` is true for a link
 * — so the walk stays inside the real assistant tree.
 */
async function scanAssistantAssets(assistantDir: string): Promise<AssistantAssetScan> {
  const files: string[] = [];
  const unscannable: string[] = [];

  const visit = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      unscannable.push(toQfaiRelativePath(assistantDir, dir));
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      let isDirectory = entry.isDirectory();
      let isFile = entry.isFile();
      if (hasUnknownType(entry)) {
        // `lstat`, not `stat`: resolving the type must not start following
        // links the typed path deliberately leaves alone.
        try {
          const stats = await lstat(absolute);
          isDirectory = stats.isDirectory();
          isFile = stats.isFile();
        } catch {
          // Unknown and unresolvable — it may be a directory full of assets,
          // so record it as unmeasured instead of dropping it.
          unscannable.push(toQfaiRelativePath(assistantDir, absolute));
          continue;
        }
      }
      if (isDirectory) {
        await visit(absolute);
        continue;
      }
      if (!isFile) {
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (ASSISTANT_ASSET_EXTENSIONS.includes(ext)) {
        files.push(absolute);
      }
    }
  };

  await visit(assistantDir);
  return { files: files.sort(), unscannable: unscannable.sort() };
}

/** Reads a Node `errno` code off an unknown rejection without asserting a type. */
function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Classifies the presence probe on the assistant tree.
 *
 * Only "the path is not there" means the tree has not been created. A probe
 * that fails for any other reason — `EACCES`/`EPERM` on `.qfai` itself, or an
 * I/O error — measured nothing, and reporting that as `skipped_missing_assistant`
 * would answer a permission fault with "run 'qfai init'" and quietly certify an
 * unmeasured tree. Those are reported as unprobeable instead.
 */
function classifyAssistantProbe(error: unknown): "missing" | "unprobeable" {
  const code = errorCode(error);
  return code === "ENOENT" || code === "ENOTDIR" ? "missing" : "unprobeable";
}

/**
 * Measures every `.qfai/assistant/**` asset against {@link ASSISTANT_ASSET_MAX_LINES}.
 *
 * Returns `skipped_missing_assistant` when the tree has not been created yet,
 * so a project that has not run init is not reported as a failure, and
 * `incomplete` when nothing was over budget but some path could not be measured
 * — an unmeasured asset must not be reported as compliant.
 */
export async function checkAssistantAssetLineBudget(
  root: string,
): Promise<AssistantAssetBudgetReport> {
  const assistantDir = path.resolve(root, ASSISTANT_DIR);
  const empty = {
    assistantDir,
    maxLines: ASSISTANT_ASSET_MAX_LINES,
    scanned: 0,
    oversized: [],
    exempt: [],
    unreadable: [],
  };
  let probe: "present" | "missing" | "unprobeable" = "present";
  try {
    await access(assistantDir);
  } catch (error) {
    probe = classifyAssistantProbe(error);
  }
  if (probe === "missing") {
    return { status: "skipped_missing_assistant", ...empty, unscannable: [] };
  }
  if (probe === "unprobeable") {
    return {
      status: "incomplete",
      ...empty,
      unscannable: [toQfaiRelativePath(assistantDir, assistantDir)],
    };
  }

  const scan = await scanAssistantAssets(assistantDir);

  const oversized: OversizedAssistantAsset[] = [];
  const exempt: ExemptAssistantAsset[] = [];
  const unreadable: string[] = [];
  let scanned = 0;

  for (const absolute of scan.files) {
    const relPath = toQfaiRelativePath(assistantDir, absolute);
    const exemptReason = LINE_BUDGET_EXEMPT.get(relPath);
    if (exemptReason !== undefined) {
      exempt.push({ path: relPath, reason: exemptReason });
      continue;
    }
    let lines: number;
    try {
      lines = await countFileLines(absolute);
    } catch {
      // An unreadable asset cannot be measured. Surfacing it beats counting it
      // as compliant, which would let a permission error hide an overrun.
      unreadable.push(relPath);
      continue;
    }
    scanned += 1;
    if (lines > ASSISTANT_ASSET_MAX_LINES) {
      oversized.push({ path: relPath, lines });
    }
  }

  const incomplete = unreadable.length > 0 || scan.unscannable.length > 0;
  const status: AssistantAssetBudgetStatus =
    oversized.length > 0 ? "over_budget" : incomplete ? "incomplete" : "ok";

  return {
    status,
    assistantDir,
    maxLines: ASSISTANT_ASSET_MAX_LINES,
    scanned,
    oversized,
    exempt,
    unreadable,
    unscannable: scan.unscannable,
  };
}
