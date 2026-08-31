import { constants as fsConstants } from "node:fs";
import { copyFile, lstat, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

/** The `code` of a Node filesystem error, or `undefined` for anything else thrown. */
function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const code: unknown = Reflect.get(error, "code");
  return typeof code === "string" ? code : undefined;
}

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
   * Protect specific relative paths from overwriting.
   * - Even when force=true, existing files under these paths are never overwritten.
   * - When force=false, existing files under these paths do not block the copy.
   */
  protect?: string[];
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

  const protectPrefixes = (options.protect ?? [])
    .map((p) => p.replace(/^[\\/]+/, "").replace(/[\\/]+$/, ""))
    .filter((p) => p.length > 0)
    .map((p) => p + path.sep);

  const excludePrefixes = (options.exclude ?? [])
    .map((p) => p.replace(/^[\\/]+/, "").replace(/[\\/]+$/, ""))
    .filter((p) => p.length > 0)
    .map((p) => p + path.sep);

  const isProtectedRelative = (relative: string): boolean => {
    if (protectPrefixes.length === 0) {
      return false;
    }
    const normalized = relative.replace(/[\\/]+/g, path.sep);
    return protectPrefixes.some(
      (prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix),
    );
  };

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
      if (isProtectedRelative(relative)) {
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

    const forceForThisFile = isProtectedRelative(relative) ? false : options.force;

    if (!(await shouldWrite(dest, forceForThisFile))) {
      skipped.push(dest);
      continue;
    }

    if (!options.dryRun) {
      await mkdir(path.dirname(dest), { recursive: true });
      // EXCLUSIVE unless the caller asked to overwrite, and `copied` records only what this call
      // actually created.
      //
      // `shouldWrite` answered a question about a moment that has passed. A second process — another
      // `qfai init`, or the adopter's own editor — can create the file between that check and this
      // copy, and a plain `copyFile` then OVERWRITES it. Worse than the lost bytes: the path lands
      // in `copied`, so `recordInstalledWorkflows` stamps the packaged digest as QFAI's own, doctor
      // reports no drift on a file QFAI never wrote, and the retired-workflow prune considers it
      // QFAI's to delete. `COPYFILE_EXCL` makes the create the decision, and an `EEXIST` means the
      // adopter won the race — which is the same outcome `shouldWrite` intended for a file that was
      // already there.
      if (!forceForThisFile) {
        try {
          await copyFile(file, dest, fsConstants.COPYFILE_EXCL);
        } catch (error) {
          if (errorCode(error) === "EEXIST") {
            skipped.push(dest);
            continue;
          }
          throw error;
        }
      } else {
        await copyFile(file, dest);
      }
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
    "Conflicts with existing files. Stopping to stay safe.",
    "",
    "Conflicting files:",
    ...conflicts.map((conflict) => `- ${conflict}`),
    "",
    "To overwrite them and continue, re-run with --force.",
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
