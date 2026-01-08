import { access, readdir } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".pnpm",
  "tmp",
  ".mcp-tools",
]);

export type CollectFilesOptions = {
  extensions?: string[];
  ignoreDirs?: string[];
};

export type CollectFilesByGlobOptions = {
  globs: string[];
  ignore?: string[];
  limit?: number;
};

export type CollectFilesByGlobsResult = {
  files: string[];
  truncated: boolean;
  matchedFileCount: number;
  limit: number;
};

export const DEFAULT_GLOB_FILE_LIMIT = 20000;

export async function collectFiles(
  root: string,
  options: CollectFilesOptions = {},
): Promise<string[]> {
  const entries: string[] = [];
  if (!(await exists(root))) {
    return entries;
  }

  const ignoreDirs = new Set([
    ...DEFAULT_IGNORE_DIRS,
    ...(options.ignoreDirs ?? []),
  ]);
  const extensions = options.extensions?.map((ext) => ext.toLowerCase()) ?? [];

  await walk(root, root, ignoreDirs, extensions, entries);
  return entries;
}

export async function collectFilesByGlobs(
  root: string,
  options: CollectFilesByGlobOptions,
): Promise<CollectFilesByGlobsResult> {
  const limit = normalizeLimit(options.limit);
  if (options.globs.length === 0) {
    return { files: [], truncated: false, matchedFileCount: 0, limit };
  }

  const stream = fg.stream(options.globs, {
    cwd: root,
    ignore: options.ignore ?? [],
    onlyFiles: true,
    absolute: true,
    unique: true,
  });
  const files: string[] = [];
  let truncated = false;
  for await (const entry of stream) {
    if (files.length >= limit) {
      truncated = true;
      destroyStream(stream);
      break;
    }
    files.push(String(entry));
  }
  const matchedFileCount = files.length;
  return { files, truncated, matchedFileCount, limit };
}

async function walk(
  base: string,
  current: string,
  ignoreDirs: Set<string>,
  extensions: string[],
  out: string[],
): Promise<void> {
  const items = await readdir(current, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(current, item.name);

    if (item.isDirectory()) {
      if (ignoreDirs.has(item.name)) {
        continue;
      }
      await walk(base, fullPath, ignoreDirs, extensions, out);
      continue;
    }

    if (item.isFile()) {
      if (extensions.length > 0) {
        const ext = path.extname(item.name).toLowerCase();
        if (!extensions.includes(ext)) {
          continue;
        }
      }
      out.push(fullPath);
    }
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function normalizeLimit(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_GLOB_FILE_LIMIT;
  }
  const flooredValue = Math.floor(value);
  if (flooredValue <= 0) {
    return DEFAULT_GLOB_FILE_LIMIT;
  }
  return flooredValue;
}

function destroyStream(stream: unknown): void {
  if (!stream || typeof stream !== "object") {
    return;
  }
  const record = stream as { destroy?: unknown };
  if (typeof record.destroy === "function") {
    record.destroy();
  }
}
