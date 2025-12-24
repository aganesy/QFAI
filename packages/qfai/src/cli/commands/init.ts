import path from "node:path";

import { copyTemplateTree } from "../lib/fs.js";
import { getInitAssetsDir } from "../lib/assets.js";
import { info } from "../lib/logger.js";

export type InitOptions = {
  dir: string;
  force: boolean;
  dryRun: boolean;
};

export async function runInit(options: InitOptions): Promise<void> {
  const sourceRoot = getInitAssetsDir();
  const destRoot = path.resolve(options.dir, "qfai");
  const result = await copyTemplateTree(sourceRoot, destRoot, {
    force: options.force,
    dryRun: options.dryRun,
  });

  report(result.copied, result.skipped, options.dryRun, "init");
}

function report(
  copied: string[],
  skipped: string[],
  dryRun: boolean,
  label: string,
): void {
  info(`qfai ${label}: ${dryRun ? "dry-run" : "done"}`);
  if (copied.length > 0) {
    info(`  created: ${copied.length}`);
  }
  if (skipped.length > 0) {
    info(`  skipped: ${skipped.length}`);
  }
}
