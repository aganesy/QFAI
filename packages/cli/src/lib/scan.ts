import { access, readdir } from "node:fs/promises";
import path from "node:path";

const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".pnpm",
  "tmp",
  ".mcp-tools",
]);

export async function collectFiles(
  root: string,
  extensions: string[],
): Promise<string[]> {
  const entries: string[] = [];
  if (!(await exists(root))) {
    return entries;
  }

  const normalized = extensions.map((ext) => ext.toLowerCase());
  await walk(root, normalized, entries);
  return entries;
}

async function walk(
  current: string,
  extensions: string[],
  out: string[],
): Promise<void> {
  const items = await readdir(current, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(current, item.name);
    if (item.isDirectory()) {
      if (DEFAULT_IGNORE_DIRS.has(item.name)) {
        continue;
      }
      await walk(fullPath, extensions, out);
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
