import path from "node:path";

import { copyTemplatePaths, copyTemplateTree } from "../lib/fs.js";
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

  // v0.8: overwrite scope is prompts only.
  // - root/ と .qfai/ は create-only（既存は skip）
  // - prompts/ は --force 時のみ上書き
  const rootResult = await copyTemplateTree(rootAssets, destRoot, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
  });
  const qfaiResult = await copyTemplateTree(qfaiAssets, destQfai, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
    protect: ["prompts.local"],
  });
  const promptsResult = await copyTemplatePaths(
    qfaiAssets,
    destQfai,
    ["prompts"],
    {
      force: options.force,
      dryRun: options.dryRun,
      conflictPolicy: "skip",
      protect: ["prompts.local"],
    },
  );

  report(
    [...rootResult.copied, ...qfaiResult.copied, ...promptsResult.copied],
    [...rootResult.skipped, ...qfaiResult.skipped, ...promptsResult.skipped],
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
