import { readdir, stat } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

type LegacyDirRule = {
  legacy: string;
  canonical: string;
};

const LEGACY_DIR_RULES: LegacyDirRule[] = [
  { legacy: "discussions", canonical: "discussion" },
  { legacy: "discuss", canonical: "discussion" },
  { legacy: "requirements", canonical: "discussion" },
  { legacy: "require", canonical: "discussion" },
  { legacy: "specs", canonical: "spec" },
  { legacy: "specification", canonical: "spec" },
];

const SUSPICIOUS_TEMPLATE_NAME_RE = /^(?:_?templates?|_?sample(?:s)?|sample-template)$/i;

export async function validateRepositoryHygiene(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const qfaiRoot = path.join(root, ".qfai");
  const specsRoot = resolvePath(root, config, "specsDir");
  const issues: Issue[] = [];

  for (const rule of LEGACY_DIR_RULES) {
    const legacyPath = path.join(qfaiRoot, rule.legacy);
    if (legacyPath === specsRoot) continue;
    if (!(await isDirectory(legacyPath))) {
      continue;
    }
    issues.push(
      issue(
        "QFAI-HYG-001",
        `Legacy directory detected: .qfai/${rule.legacy}/`,
        "error",
        legacyPath,
        "hygiene.legacyDirectory",
        [rule.legacy, rule.canonical],
        "change",
        `Rename the directory to .qfai/${rule.canonical}/ and point generation and validation at the canonical name.`,
      ),
    );
  }

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
