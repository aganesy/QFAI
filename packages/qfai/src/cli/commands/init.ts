import path from "node:path";

import { copyTemplateTree } from "../lib/fs.js";
import { getInitAssetsDir } from "../lib/assets.js";
import { info } from "../lib/logger.js";

export type InitOptions = {
  dir: string;
  force: boolean;
  dryRun: boolean;
  yes: boolean;
};

export async function runInit(options: InitOptions): Promise<void> {
  const assetsRoot = getInitAssetsDir();
  const rootAssets = path.join(assetsRoot, "root");
  const qfaiAssets = path.join(assetsRoot, ".qfai");

  const destRoot = path.resolve(options.dir);
  const destQfai = path.join(destRoot, ".qfai");

  const rootResult = await copyTemplateTree(rootAssets, destRoot, {
    force: options.force,
    dryRun: options.dryRun,
  });
  const qfaiResult = await copyTemplateTree(qfaiAssets, destQfai, {
    force: options.force,
    dryRun: options.dryRun,
    protect: ["prompts.local"],
  });

  report(
    [...rootResult.copied, ...qfaiResult.copied],
    [...rootResult.skipped, ...qfaiResult.skipped],
    options.dryRun,
    "init",
  );
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
