import path from "node:path";
import { access, readdir, rm } from "node:fs/promises";

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

  if (options.force) {
    info(
      "NOTE: --force は .qfai/assistant/skills/** と publish 先（.claude/.github/.codex の skills）を上書きし、legacy 10_workflow.md を削除します（skills.local は保護され、specs/contracts 等は上書きしません）。",
    );
  }

  // v1.3.15:
  // - root/ と .qfai/ は create-only（既存は skip）
  // - assistant/skills と root 側の skills 配布先のみ --force で上書きする
  const rootResult = await copyTemplateTree(rootAssets, destRoot, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
    exclude: [".claude/skills", ".github/skills", ".codex/skills"],
  });
  const qfaiResult = await copyTemplateTree(qfaiAssets, destQfai, {
    force: false,
    dryRun: options.dryRun,
    conflictPolicy: "skip",
    protect: ["assistant/skills.local"],
    exclude: ["assistant/skills"],
  });
  const skillsResult = await copyTemplatePaths(
    qfaiAssets,
    destQfai,
    ["assistant/skills"],
    {
      force: options.force,
      dryRun: options.dryRun,
      conflictPolicy: "skip",
      protect: ["assistant/skills.local"],
    },
  );
  const publishedSkillsResult = await copyTemplatePaths(
    rootAssets,
    destRoot,
    [".claude/skills", ".github/skills", ".codex/skills"],
    {
      force: options.force,
      dryRun: options.dryRun,
      conflictPolicy: "skip",
    },
  );
  const removedLegacySkills = options.force
    ? await pruneLegacySkillFiles(destRoot, options.dryRun)
    : [];

  report(
    [
      ...rootResult.copied,
      ...qfaiResult.copied,
      ...skillsResult.copied,
      ...publishedSkillsResult.copied,
    ],
    [
      ...rootResult.skipped,
      ...qfaiResult.skipped,
      ...skillsResult.skipped,
      ...publishedSkillsResult.skipped,
    ],
    removedLegacySkills,
    options.dryRun,
    "init",
    destRoot,
  );
}

function report(
  copied: string[],
  skipped: string[],
  removed: string[],
  dryRun: boolean,
  label: string,
  baseDir: string,
): void {
  info(`qfai ${label}: ${dryRun ? "dry-run" : "done"}`);
  if (copied.length > 0) {
    info(`  created: ${copied.length}`);
  }
  if (skipped.length > 0) {
    info(`  skipped: ${skipped.length}`);
    info("  skipped paths:");
    for (const skippedPath of skipped) {
      const relative = path.relative(baseDir, skippedPath);
      info(`    - ${relative}`);
    }
  }
  if (removed.length > 0) {
    info(
      `  ${dryRun ? "would remove legacy files" : "removed legacy files"}: ${removed.length}`,
    );
    info(`${dryRun ? "  would remove paths:" : "  removed paths:"}`);
    for (const removedPath of removed) {
      const relative = path.relative(baseDir, removedPath);
      info(`    - ${relative}`);
    }
  }
}

async function pruneLegacySkillFiles(
  destRoot: string,
  dryRun: boolean,
): Promise<string[]> {
  const roots = [
    path.join(destRoot, ".qfai", "assistant", "skills"),
    path.join(destRoot, ".claude", "skills"),
    path.join(destRoot, ".github", "skills"),
    path.join(destRoot, ".codex", "skills"),
  ];

  const legacyFiles: string[] = [];
  for (const root of roots) {
    const found = await collectLegacyWorkflowFiles(root);
    legacyFiles.push(...found);
  }

  if (!dryRun) {
    for (const file of legacyFiles) {
      await rm(file, { force: true });
    }
  }

  return legacyFiles;
}

async function collectLegacyWorkflowFiles(dir: string): Promise<string[]> {
  if (!(await exists(dir))) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectLegacyWorkflowFiles(fullPath);
      files.push(...nested);
      continue;
    }
    if (entry.isFile() && entry.name === "10_workflow.md") {
      files.push(fullPath);
    }
  }

  return files;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
