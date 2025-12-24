import path from "node:path";

import { getTemplatesDir } from "@qfai/templates";

import { copyTemplatePaths } from "../lib/fs.js";
import { info } from "../lib/logger.js";

export type OnboardOptions = {
  root: string;
  force: boolean;
  dryRun: boolean;
};

const ONBOARD_PATHS = ["docs/steering", "docs/rules"];
export async function runOnboard(options: OnboardOptions): Promise<void> {
  const sourceRoot = getTemplatesDir();
  const destRoot = path.resolve(options.root);
  const result = await copyTemplatePaths(sourceRoot, destRoot, ONBOARD_PATHS, {
    force: options.force,
    dryRun: options.dryRun,
  });

  report(result.copied, result.skipped, options.dryRun, "onboard");
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
