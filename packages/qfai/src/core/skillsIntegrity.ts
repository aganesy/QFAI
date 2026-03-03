import { readFile } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../shared/assets.js";
import type { QfaiConfig } from "./config.js";
import { collectFiles } from "./fs.js";

export type SkillsIntegrityStatus =
  | "ok"
  | "modified"
  | "skipped_missing_skills"
  | "skipped_missing_assets";

export type SkillsIntegrityDiff = {
  status: SkillsIntegrityStatus;
  skillsDir: string;
  templateDir: string;
  missing: string[];
  extra: string[];
  changed: string[];
};

export async function diffProjectSkillsAgainstInitAssets(
  root: string,
  config: QfaiConfig,
): Promise<SkillsIntegrityDiff> {
  const skillsDirConfig = config.paths.skillsDir;
  const skillsDir = path.isAbsolute(skillsDirConfig)
    ? skillsDirConfig
    : path.resolve(root, skillsDirConfig);

  let templateDir: string;
  try {
    const rel = path.isAbsolute(skillsDirConfig)
      ? path.relative(root, skillsDirConfig)
      : skillsDirConfig;
    const normalized = rel.replace(/^[\\/]+/, "");
    if (normalized.length === 0 || normalized.startsWith("..")) {
      return {
        status: "skipped_missing_assets",
        skillsDir,
        templateDir: "",
        missing: [],
        extra: [],
        changed: [],
      };
    }
    templateDir = path.join(getInitAssetsDir(), normalized);
  } catch {
    return {
      status: "skipped_missing_assets",
      skillsDir,
      templateDir: "",
      missing: [],
      extra: [],
      changed: [],
    };
  }

  const projectFiles = await collectFiles(skillsDir);
  if (projectFiles.length === 0) {
    return {
      status: "skipped_missing_skills",
      skillsDir,
      templateDir,
      missing: [],
      extra: [],
      changed: [],
    };
  }

  const templateFiles = await collectFiles(templateDir);

  const templateByRel = new Map<string, string>();
  for (const abs of templateFiles) {
    templateByRel.set(toRel(templateDir, abs), abs);
  }

  const projectByRel = new Map<string, string>();
  for (const abs of projectFiles) {
    projectByRel.set(toRel(skillsDir, abs), abs);
  }

  const missing: string[] = [];
  const extra: string[] = [];
  const changed: string[] = [];

  for (const rel of templateByRel.keys()) {
    if (!projectByRel.has(rel)) {
      missing.push(rel);
    }
  }
  for (const rel of projectByRel.keys()) {
    if (!templateByRel.has(rel)) {
      extra.push(rel);
    }
  }

  const common = intersectKeys(templateByRel, projectByRel);
  for (const rel of common) {
    const templateAbs = templateByRel.get(rel);
    const projectAbs = projectByRel.get(rel);
    if (!templateAbs || !projectAbs) {
      continue;
    }
    try {
      const [a, b] = await Promise.all([
        readFile(templateAbs, "utf-8"),
        readFile(projectAbs, "utf-8"),
      ]);
      if (normalizeNewlines(a) !== normalizeNewlines(b)) {
        changed.push(rel);
      }
    } catch {
      // If either file cannot be read (e.g., permission error),
      // treat it as changed so that validation can continue.
      changed.push(rel);
    }
  }

  const status: SkillsIntegrityStatus =
    missing.length > 0 || extra.length > 0 || changed.length > 0 ? "modified" : "ok";

  return {
    status,
    skillsDir,
    templateDir,
    missing: missing.sort(),
    extra: extra.sort(),
    changed: changed.sort(),
  };
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function toRel(base: string, abs: string): string {
  const rel = path.relative(base, abs);
  return rel.replace(/[\\/]+/g, "/");
}

function intersectKeys(a: Map<string, string>, b: Map<string, string>): string[] {
  const out: string[] = [];
  for (const key of a.keys()) {
    if (b.has(key)) {
      out.push(key);
    }
  }
  return out;
}
