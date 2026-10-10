import { readdir, readFile, stat } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import { QFAI_GITIGNORE_MARKER, missingRecommendedGitignoreEntries } from "../gitignore.js";
import { resolvePath } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const SUSPICIOUS_TEMPLATE_NAME_RE = /^(?:_?templates?|_?sample(?:s)?|sample-template)$/i;

export async function validateRepositoryHygiene(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const issues: Issue[] = [];

  issues.push(...(await recommendedGitignoreIssues(root)));

  const suspiciousPaths = await collectSuspiciousTemplatePaths(specsRoot);
  if (suspiciousPaths.length > 0) {
    issues.push(
      issue(
        "QFAI-HYG-002",
        `Suspected template content under specs (warning): ${suspiciousPaths.join(", ")}`,
        "warning",
        specsRoot,
        "hygiene.templateContamination",
        suspiciousPaths,
        "change",
        "Move templates and samples to `.qfai/assistant/templates/`, and keep only real deliverables under specs.",
      ),
    );
  }

  return issues;
}

async function collectSuspiciousTemplatePaths(root: string): Promise<string[]> {
  if (!(await isDirectory(root))) {
    return [];
  }

  const matches: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    let entries: Dirent[];
    try {
      entries = await readdir(current, {
        withFileTypes: true,
        encoding: "utf8",
      });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SUSPICIOUS_TEMPLATE_NAME_RE.test(entry.name)) {
          matches.push(toPosix(path.relative(root, absolute)));
        }
        queue.push(absolute);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const baseName = path.parse(entry.name).name;
      if (SUSPICIOUS_TEMPLATE_NAME_RE.test(baseName)) {
        matches.push(toPosix(path.relative(root, absolute)));
      }
    }
  }

  return matches.sort((left, right) => left.localeCompare(right));
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}

/**
 * The recommended ignore entries a root `.gitignore` carrying the QFAI marker
 * lacks, read across the whole file.
 *
 * `qfai init` never re-adds a recommended entry to an existing block, so a
 * project whose block predates one — the root `tmp/` that Article XI requires
 * is the case that matters — learns of it only here.
 */
async function recommendedGitignoreIssues(root: string): Promise<Issue[]> {
  const gitignorePath = path.join(root, ".gitignore");
  let content: string;
  try {
    content = await readFile(gitignorePath, "utf-8");
  } catch (err: unknown) {
    if (isEnoent(err)) return [];
    throw err;
  }
  if (!content.includes(QFAI_GITIGNORE_MARKER)) return [];
  const missing = missingRecommendedGitignoreEntries(content);
  if (missing.length === 0) return [];
  return [
    issue(
      "QFAI-HYG-003",
      `The root .gitignore is missing recommended entries: ${missing.join(", ")}`,
      "info",
      gitignorePath,
      "hygiene.gitignoreRecommended",
      [...missing],
      "change",
      "No action is needed if you track them on purpose. Rerunning `qfai init` does not restore an entry you removed; add it by hand to return to the default.",
    ),
  ];
}
