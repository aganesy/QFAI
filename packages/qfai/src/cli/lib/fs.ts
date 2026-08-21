import { copyFile, lstat, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type CopyOptions = {
  force: boolean;
  dryRun: boolean;
  /**
   * Conflict behavior when force=false.
   * - "error" (default): abort if any destination file already exists.
   * - "skip": do not treat existing files as conflicts (they will be skipped).
   */
  conflictPolicy?: "error" | "skip";
  /**
   * Exclude specific relative paths from copying.
   * - Files under these paths are never copied.
   * - They do not participate in conflict detection.
   */
  exclude?: string[];
};

export type CopyResult = {
  copied: string[];
  skipped: string[];
};

export async function copyTemplateTree(
  sourceRoot: string,
  destRoot: string,
  options: CopyOptions,
): Promise<CopyResult> {
  const files = await collectTemplateFiles(sourceRoot);
  return copyFiles(files, sourceRoot, destRoot, options);
}

export async function copyTemplatePaths(
  sourceRoot: string,
  destRoot: string,
  relativePaths: string[],
  options: CopyOptions,
): Promise<CopyResult> {
  const allFiles: string[] = [];
  for (const relPath of relativePaths) {
    const fullPath = path.join(sourceRoot, relPath);
    const files = await collectTemplateFiles(fullPath);
    allFiles.push(...files);
  }

  return copyFiles(allFiles, sourceRoot, destRoot, options);
}

async function copyFiles(
  files: string[],
  sourceRoot: string,
  destRoot: string,
  options: CopyOptions,
): Promise<CopyResult> {
  const copied: string[] = [];
  const skipped: string[] = [];
  const conflicts: string[] = [];

  const excludePrefixes = (options.exclude ?? [])
    .map((p) => p.replace(/^[\\/]+/, "").replace(/[\\/]+$/, ""))
    .filter((p) => p.length > 0)
    .map((p) => p + path.sep);

  const isExcludedRelative = (relative: string): boolean => {
    if (excludePrefixes.length === 0) {
      return false;
    }
    const normalized = relative.replace(/[\\/]+/g, path.sep);
    return excludePrefixes.some(
      (prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix),
    );
  };

  const conflictPolicy = options.conflictPolicy ?? "error";

  if (!options.force && conflictPolicy === "error") {
    for (const file of files) {
      const relative = resolveTemplateDestinationRelativePath(path.relative(sourceRoot, file));
      if (isExcludedRelative(relative)) {
        continue;
      }
      const dest = path.join(destRoot, relative);
      if (!(await shouldWrite(dest, options.force))) {
        conflicts.push(dest);
      }
    }

    if (conflicts.length > 0) {
      throw new Error(formatConflictMessage(conflicts));
    }
  }

  for (const file of files) {
    const relative = resolveTemplateDestinationRelativePath(path.relative(sourceRoot, file));
    if (isExcludedRelative(relative)) {
      continue;
    }
    const dest = path.join(destRoot, relative);

    if (!(await shouldWrite(dest, options.force))) {
      skipped.push(dest);
      continue;
    }

    if (!options.dryRun) {
      await mkdir(path.dirname(dest), { recursive: true });
      await copyFile(file, dest);
    }
    copied.push(dest);
  }

  return { copied, skipped };
}

function resolveTemplateDestinationRelativePath(relative: string): string {
  return relative.replace(/[\\/]+/g, path.sep);
}

function formatConflictMessage(conflicts: string[]): string {
  return [
    "既存ファイルと衝突しました。安全のため停止します。",
    "",
    "衝突ファイル:",
    ...conflicts.map((conflict) => `- ${conflict}`),
    "",
    "上書きして続行する場合は --force を付けて再実行してください。",
  ].join("\n");
}

async function collectTemplateFiles(root: string): Promise<string[]> {
  const entries: string[] = [];
  if (!(await exists(root))) {
    return entries;
  }

  // A caller may name a single file rather than a directory — `qfai init`
  // forces `assistant/manifest/agent-catalog.yml` without forcing the tunable
  // manifests beside it. Without this, `readdir` throws ENOTDIR on the path.
  if ((await stat(root)).isFile()) {
    entries.push(root);
    return entries;
  }

  const items = await readdir(root, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(root, item.name);
    if (item.isDirectory()) {
      const nested = await collectTemplateFiles(fullPath);
      entries.push(...nested);
      continue;
    }
    if (item.isFile()) {
      entries.push(fullPath);
    }
  }

  return entries;
}

async function shouldWrite(target: string, force: boolean): Promise<boolean> {
  if (force) {
    return true;
  }
  return !(await exists(target));
}

/**
 * Whether anything occupies `target` — **including a symlink that resolves to
 * nothing**.
 *
 * `access` follows the link, so a dangling one answered "free" and the copy
 * that followed wrote through it: `copyFile` resolves the symlink and creates
 * the target, so a link pointing outside the project turned `qfai init` into a
 * writer of fixed content at an arbitrary path. `lstat` asks about the entry
 * itself, which is the question being asked.
 *
 * A read error other than absence answers "occupied": create-only must not
 * overwrite a path it could not look at.
 */
async function exists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error: unknown) {
    return (error as NodeJS.ErrnoException | null)?.code !== "ENOENT";
  }
}
