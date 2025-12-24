import { access, copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

export type CopyOptions = {
  force: boolean;
  dryRun: boolean;
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

  if (!options.force) {
    for (const file of files) {
      const relative = path.relative(sourceRoot, file);
      const dest = path.join(destRoot, relative);
      if (!(await shouldWrite(dest, options.force))) {
        conflicts.push(dest);
      }
    }

    if (conflicts.length > 0) {
      throw new Error(`既存ファイルがあるため中断しました: ${conflicts[0]}`);
    }
  }

  for (const file of files) {
    const relative = path.relative(sourceRoot, file);
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

async function collectTemplateFiles(root: string): Promise<string[]> {
  const entries: string[] = [];
  if (!(await exists(root))) {
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

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
