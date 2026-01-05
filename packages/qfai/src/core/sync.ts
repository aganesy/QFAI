import { access, mkdir, readdir, readFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { toRelativePath } from "./paths.js";
import { resolveToolVersion } from "./version.js";

export type SyncMode = "check" | "export";
export type SyncFormat = "text" | "json";

export type SyncDiffStatus = "added" | "removed" | "changed" | "unchanged";

export type SyncDiffEntry = {
  filePath: string;
  status: SyncDiffStatus;
  reason?: string;
};

export type SyncSummary = {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
};

export type SyncData = {
  tool: "qfai";
  version: string;
  generatedAt: string;
  root: string;
  mode: SyncMode;
  scope: string;
  summary: SyncSummary;
  diffs: SyncDiffEntry[];
  exportPath?: string;
};

export type SyncOptions = {
  root: string;
  mode: SyncMode;
  outPath?: string;
};

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function computeFileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function collectFilesRecursive(
  dir: string,
  base: string,
): Promise<string[]> {
  const result: string[] = [];
  if (!(await exists(dir))) {
    return result;
  }

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectFilesRecursive(fullPath, base);
      result.push(...nested);
    } else if (entry.isFile()) {
      const relative = path.relative(base, fullPath);
      result.push(relative);
    }
  }
  return result;
}

function resolveAssetsPath(): string {
  const base = import.meta.url;
  const basePath = base.startsWith("file:") ? fileURLToPath(base) : base;
  // src/core/sync.ts -> assets/init/.qfai/promptpack
  return path.resolve(
    path.dirname(basePath),
    "../../assets/init/.qfai/promptpack",
  );
}

async function copyDirRecursive(
  srcDir: string,
  destDir: string,
): Promise<void> {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, destPath);
    }
  }
}

export async function createSyncData(options: SyncOptions): Promise<SyncData> {
  const root = path.resolve(options.root);
  const version = await resolveToolVersion();
  const generatedAt = new Date().toISOString();
  const scope = "promptpack";

  // Assets (SSOT) path
  const assetsPromptPackPath = resolveAssetsPath();
  // Project's promptpack path
  const projectPromptPackPath = path.join(root, ".qfai", "promptpack");

  const diffs: SyncDiffEntry[] = [];

  // Collect files from both directories
  const assetsFiles = await collectFilesRecursive(
    assetsPromptPackPath,
    assetsPromptPackPath,
  );
  const projectFiles = await collectFilesRecursive(
    projectPromptPackPath,
    projectPromptPackPath,
  );

  const assetsSet = new Set(assetsFiles);
  const projectSet = new Set(projectFiles);

  // Check files in assets (SSOT)
  for (const relativePath of assetsFiles) {
    const assetsFilePath = path.join(assetsPromptPackPath, relativePath);
    const projectFilePath = path.join(projectPromptPackPath, relativePath);

    if (!projectSet.has(relativePath)) {
      // File exists in assets but not in project -> added (would be added by sync)
      diffs.push({
        filePath: relativePath,
        status: "added",
        reason: "File exists in assets but not in project",
      });
    } else {
      // Both have the file, compare hashes
      const assetsHash = await computeFileHash(assetsFilePath);
      const projectHash = await computeFileHash(projectFilePath);
      if (assetsHash !== projectHash) {
        diffs.push({
          filePath: relativePath,
          status: "changed",
          reason: "Content differs between assets and project",
        });
      } else {
        diffs.push({
          filePath: relativePath,
          status: "unchanged",
        });
      }
    }
  }

  // Check files only in project (not in assets)
  for (const relativePath of projectFiles) {
    if (!assetsSet.has(relativePath)) {
      diffs.push({
        filePath: relativePath,
        status: "removed",
        reason: "File exists in project but not in assets (local extension)",
      });
    }
  }

  // Sort diffs by file path for consistent output
  diffs.sort((a, b) => a.filePath.localeCompare(b.filePath));

  const summary: SyncSummary = {
    added: diffs.filter((d) => d.status === "added").length,
    removed: diffs.filter((d) => d.status === "removed").length,
    changed: diffs.filter((d) => d.status === "changed").length,
    unchanged: diffs.filter((d) => d.status === "unchanged").length,
  };

  let exportPath: string | undefined;

  // Handle export mode
  if (options.mode === "export") {
    // Use Date.now() for millisecond precision to reduce collision risk
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseTimestamp = `${timestamp}-${Date.now()}`;
    const defaultOutDir = path.join(root, ".qfai", ".sync");
    const outBase = options.outPath
      ? path.isAbsolute(options.outPath)
        ? options.outPath
        : path.resolve(root, options.outPath)
      : defaultOutDir;

    let exportDir: string | undefined;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const uniqueTimestamp =
        attempt === 0 ? baseTimestamp : `${baseTimestamp}-${attempt}`;
      const exportParent = path.join(outBase, uniqueTimestamp);
      const candidate = path.join(exportParent, "promptpack");

      await mkdir(exportParent, { recursive: true });

      try {
        // Reserve the promptpack directory exclusively to avoid collisions
        await mkdir(candidate);
        exportDir = candidate;
        break;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException | undefined)?.code;
        if (code === "EEXIST") {
          continue;
        }
        throw err;
      }
    }

    if (!exportDir) {
      throw new Error("Failed to allocate unique export directory");
    }

    // Copy assets to export directory
    await copyDirRecursive(assetsPromptPackPath, exportDir);
    exportPath = toRelativePath(root, exportDir);
  }

  return {
    tool: "qfai",
    version,
    generatedAt,
    root: toRelativePath(process.cwd(), root),
    mode: options.mode,
    scope,
    summary,
    diffs,
    ...(exportPath ? { exportPath } : {}),
  };
}

export function computeExitCode(data: SyncData): number {
  // 0: no diff (sync not needed)
  // 1: has diff (sync recommended)
  // 2: execution failed (handled at caller level via try/catch)
  const hasDiff =
    data.summary.added > 0 ||
    data.summary.removed > 0 ||
    data.summary.changed > 0;
  return hasDiff ? 1 : 0;
}
