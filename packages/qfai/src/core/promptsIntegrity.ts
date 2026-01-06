import { readFile } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../shared/assets.js";
import { collectFiles } from "./fs.js";

export type PromptsIntegrityStatus =
  | "ok"
  | "modified"
  | "skipped_missing_prompts"
  | "skipped_missing_assets";

export type PromptsIntegrityDiff = {
  status: PromptsIntegrityStatus;
  promptsDir: string;
  templateDir: string;
  missing: string[];
  extra: string[];
  changed: string[];
};

export async function diffProjectPromptsAgainstInitAssets(
  root: string,
): Promise<PromptsIntegrityDiff> {
  const promptsDir = path.resolve(root, ".qfai", "prompts");

  let templateDir: string;
  try {
    templateDir = path.join(getInitAssetsDir(), ".qfai", "prompts");
  } catch {
    return {
      status: "skipped_missing_assets",
      promptsDir,
      templateDir: "",
      missing: [],
      extra: [],
      changed: [],
    };
  }

  const projectFiles = await collectFiles(promptsDir);
  if (projectFiles.length === 0) {
    return {
      status: "skipped_missing_prompts",
      promptsDir,
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
    projectByRel.set(toRel(promptsDir, abs), abs);
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
    const [a, b] = await Promise.all([
      readFile(templateAbs, "utf-8"),
      readFile(projectAbs, "utf-8"),
    ]);
    if (normalizeNewlines(a) !== normalizeNewlines(b)) {
      changed.push(rel);
    }
  }

  const status: PromptsIntegrityStatus =
    missing.length > 0 || extra.length > 0 || changed.length > 0
      ? "modified"
      : "ok";

  return {
    status,
    promptsDir,
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

function intersectKeys(
  a: Map<string, string>,
  b: Map<string, string>,
): string[] {
  const out: string[] = [];
  for (const key of a.keys()) {
    if (b.has(key)) {
      out.push(key);
    }
  }
  return out;
}
