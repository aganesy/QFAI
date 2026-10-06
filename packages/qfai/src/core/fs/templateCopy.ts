import { constants as fsConstants } from "node:fs";
import { copyFile, lstat, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
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
   * Exclude specific relative paths from copying.
   * - Files under these paths are never copied.
   * - They do not participate in conflict detection.
   */
  exclude?: string[];
};

export type CopyResult = {
  copied: string[];
  skipped: string[];
  /** Destinations not written because an entry above them is a link or not a directory. */
  refused: string[];
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
  const refused: string[] = [];
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
      if ((await blockedAncestor(destRoot, dest)) !== undefined) {
        continue;
      }
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

    // Asked before `shouldWrite`, which reads a destination it cannot reach as
    // occupied and would count it as skipped. `copyFile` follows a linked
    // directory above the destination, so the write would land wherever the
    // link points; a file above it leaves nowhere to write.
    if ((await blockedAncestor(destRoot, dest)) !== undefined) {
      refused.push(dest);
      continue;
    }

    if (!(await shouldWrite(dest, options.force))) {
      skipped.push(dest);
      continue;
    }
    // A forced copy over a file that already holds the template's bytes changes
    // nothing, so it is reported as skipped rather than written.
    if (options.force && (await holdsSameBytes(file, dest))) {
      skipped.push(dest);
      continue;
    }
    // An overwrite follows a link at the destination, and truncates an inode
    // every hard-linked name shares. Either one is replaced as an entry, so its
    // target and its other names keep their content.
    if (options.force && !options.dryRun) {
      const existing = await lstatOrUndefined(dest);
      if (existing !== undefined && (existing.isSymbolicLink() || existing.nlink > 1)) {
        await rm(dest);
      }
    }

    if (!options.dryRun) {
      await mkdir(path.dirname(dest), { recursive: true });
      // EXCLUSIVE unless the caller asked to overwrite, and `copied` records only what this call
      // actually created.
      //
      // `shouldWrite` answered a question about a moment that has passed. A second process — another
      // `qfai init`, or the adopter's own editor — can create the file between that check and this
      // copy, and a plain `copyFile` then OVERWRITES it, and the path lands in `copied` as if
      // this call had created it. `COPYFILE_EXCL` makes the create the decision, and an `EEXIST` means the
      // adopter won the race — which is the same outcome `shouldWrite` intended for a file that was
      // already there.
      if (!options.force) {
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

  return { copied, skipped, refused };
}

/**
 * Whether `dest` is a regular file, not a link and not shared by a hard link,
 * whose bytes equal `source`'s. A link or a shared inode is replaced as an
 * entry on a forced copy, so it counts as a change.
 */
async function holdsSameBytes(source: string, dest: string): Promise<boolean> {
  const existing = await lstatOrUndefined(dest);
  if (existing === undefined || !existing.isFile() || existing.nlink > 1) {
    return false;
  }
  const [wanted, present] = await Promise.all([readFile(source), readFile(dest)]);
  return wanted.equals(present);
}

/** `lstat`, or `undefined` when nothing is at `target`. Other faults propagate. */
async function lstatOrUndefined(target: string) {
  try {
    return await lstat(target);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return undefined;
    throw error;
  }
}

/** The first entry between `root` and `target` that is a symbolic link or not a directory, if any. */
export async function blockedAncestor(root: string, target: string): Promise<string | undefined> {
  let current = root;
  for (const segment of path.relative(root, path.dirname(target)).split(path.sep)) {
    if (segment === "") continue;
    current = path.join(current, segment);
    const entry = await lstatOrUndefined(current);
    if (entry === undefined) return undefined;
    if (entry.isSymbolicLink() || !entry.isDirectory()) return current;
  }
  return undefined;
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

export async function collectTemplateFiles(root: string): Promise<string[]> {
  const entries: string[] = [];
  if (!(await exists(root))) {
    return entries;
  }

  // A caller may name a single file rather than a directory — `qfai init`
  // forces `assistant/manifest/agent-catalog.yml` without forcing the tunable
  // manifests beside it. Without this, `readdir` throws ENOTDIR on the path.
  //
  // Still propagates, and now says what it could not classify. `exists()` two
  // lines above asks `lstat`, which SUCCEEDS on a symlink whose reparse type
  // the OS will not follow — a Windows `git worktree` writes every
  // `.claude/skills/*` that way — so the entry is present and the next line
  // demanded that `stat` resolve it, unguarded, with `EPERM` escaping as a bare
  // Node message naming neither the template tree nor the reason.
  //
  // Not swallowed. This module's history is the argument: its comments record
  // `catch(() => false)` and `catch(() => [])` each being REMOVED for turning a
  // failing filesystem into a confidently clean report, and skipping an
  // unreadable template entry is that shape — `qfai init` would report a
  // successful copy of a tree it never read.
  const kind = await stat(root).catch((error: unknown) => {
    throw new Error(
      `Cannot determine the template entry's kind: ${root} — ` +
        (error instanceof Error ? error.message : String(error)),
      { cause: error },
    );
  });
  if (kind.isFile()) {
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
