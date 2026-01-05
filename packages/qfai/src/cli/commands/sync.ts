import { createSyncData, computeExitCode } from "../../core/sync.js";
import type { SyncData, SyncFormat, SyncMode } from "../../core/sync.js";
import path from "node:path";
import { info, error } from "../lib/logger.js";

export type SyncCommandOptions = {
  root: string;
  mode: SyncMode;
  outPath?: string;
  format: SyncFormat;
};

function formatSyncText(data: SyncData): string {
  const lines: string[] = [];
  lines.push(
    `qfai sync: root=${data.root} mode=${data.mode} scope=${data.scope}`,
  );
  lines.push("");

  const diffs = data.diffs.filter((d) => d.status !== "unchanged");
  if (diffs.length === 0) {
    lines.push(
      "No differences found. Project promptpack is in sync with assets.",
    );
  } else {
    lines.push("Differences:");
    for (const diff of diffs) {
      const statusMark =
        diff.status === "added"
          ? "[+]"
          : diff.status === "removed"
            ? "[-]"
            : "[~]";
      lines.push(`  ${statusMark} ${diff.filePath}`);
    }
  }

  lines.push("");
  lines.push(
    `summary: added=${data.summary.added} removed=${data.summary.removed} changed=${data.summary.changed} unchanged=${data.summary.unchanged}`,
  );

  if (data.exportPath) {
    lines.push("");
    lines.push(`exported to: ${data.exportPath}`);
    lines.push("");
    lines.push("Next steps:");

    const absRoot = path.resolve(process.cwd(), data.root);
    const absExportPath = path.resolve(absRoot, data.exportPath);
    lines.push(
      `  git diff --no-index ${path.join(absRoot, ".qfai", "promptpack")} ${absExportPath}`,
    );
  } else if (data.summary.added + data.summary.changed > 0) {
    lines.push("");
    lines.push("To export sync candidates:");
    lines.push("  qfai sync --mode export");
  }

  return lines.join("\n");
}

function formatSyncJson(data: SyncData): string {
  return JSON.stringify(data, null, 2);
}

export async function runSync(options: SyncCommandOptions): Promise<number> {
  try {
    const data = await createSyncData({
      root: options.root,
      mode: options.mode,
      ...(options.outPath !== undefined ? { outPath: options.outPath } : {}),
    });

    const output =
      options.format === "json" ? formatSyncJson(data) : formatSyncText(data);

    info(output);

    // export mode always returns 0 on success (export completed)
    // check mode returns exit code based on diff status
    if (options.mode === "export") {
      return 0;
    }
    return computeExitCode(data);
  } catch (err) {
    error(`sync failed: ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }
}
