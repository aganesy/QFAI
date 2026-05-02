/**
 * Config reference integrity validator.
 *
 * Verifies that values in `qfai.config.yaml` resolve to real filesystem
 * entities:
 *   - QFAI-CFG-LINK-001: prototyping.primarySpecId points to a missing spec dir
 *   - QFAI-CFG-LINK-002: paths.* points to a missing directory (warning)
 *   - QFAI-CFG-LINK-003: prototyping.calibration.packPath points to a missing dir
 *
 * Catches dangling IDs in config that would otherwise go undetected.
 */

import { stat } from "node:fs/promises";
import path from "node:path";

import { defaultConfig, type QfaiConfig, type ConfigPathKey } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

async function isDirectory(absolutePath: string): Promise<boolean> {
  try {
    const s = await stat(absolutePath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * `paths.*` keys whose existence is verified. `outDir` is excluded because
 * QFAI creates it lazily on first write; checking it would emit warnings on
 * fresh repos that have never run validate.
 */
const VERIFIED_PATH_KEYS: ReadonlyArray<ConfigPathKey> = [
  "specsDir",
  "contractsDir",
  "discussionDir",
  "skillsDir",
  "srcDir",
  "testsDir",
];

const DEFAULT_SKILL_CREATED_PATH_KEYS = new Set<ConfigPathKey>([
  "specsDir",
  "contractsDir",
  "discussionDir",
]);

function isDefaultSkillCreatedPath(key: ConfigPathKey, relPath: string): boolean {
  return DEFAULT_SKILL_CREATED_PATH_KEYS.has(key) && relPath === defaultConfig.paths[key];
}

export async function validateConfigReferenceIntegrity(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  // ─── QFAI-CFG-LINK-001: primarySpecId existence ──────────────────────────
  const primarySpecId = config.prototyping?.primarySpecId;
  if (primarySpecId !== undefined) {
    const specDir = path.join(path.resolve(root, config.paths.specsDir), `spec-${primarySpecId}`);
    if (!(await isDirectory(specDir))) {
      const relSpecDir = path.relative(root, specDir).replace(/\\/g, "/");
      issues.push(
        issue(
          "QFAI-CFG-LINK-001",
          `qfai.config.yaml: prototyping.primarySpecId="${primarySpecId}" but ${relSpecDir} does not exist.`,
          "error",
          "qfai.config.yaml",
          "config.prototyping.primarySpecId.reality",
          undefined,
          "canonical",
          "prototyping.primarySpecId を実在する spec-NNNN ディレクトリに合わせるか、対応する spec を `.qfai/specs/spec-NNNN/` に作成してください。",
        ),
      );
    }
  }

  // ─── QFAI-CFG-LINK-002: paths.* directory existence (warning) ────────────
  for (const key of VERIFIED_PATH_KEYS) {
    const relPath = config.paths[key];
    const absolutePath = path.resolve(root, relPath);
    if (!(await isDirectory(absolutePath))) {
      if (isDefaultSkillCreatedPath(key, relPath)) {
        continue;
      }
      issues.push(
        issue(
          "QFAI-CFG-LINK-002",
          `qfai.config.yaml: paths.${key}="${relPath}" but the directory does not exist.`,
          "warning",
          "qfai.config.yaml",
          `config.paths.${key}.reality`,
          undefined,
          "canonical",
          `paths.${key} を実在するディレクトリに合わせるか、対応するディレクトリを作成してください。`,
        ),
      );
    }
  }

  // ─── QFAI-CFG-LINK-003: calibration.packPath existence ───────────────────
  // packPath may be either a YAML file (legacy: pack as single file) or a
  // directory (new: pack as directory tree). Accept either; reject only
  // when neither resolves on disk.
  const packPath = config.prototyping?.calibration?.packPath;
  if (packPath !== undefined) {
    const defaultPackPath = defaultConfig.prototyping?.calibration?.packPath;
    if (packPath === defaultPackPath) {
      return issues;
    }
    const absolutePackPath = path.resolve(root, packPath);
    const exists = await pathExists(absolutePackPath);
    if (!exists) {
      issues.push(
        issue(
          "QFAI-CFG-LINK-003",
          `qfai.config.yaml: prototyping.calibration.packPath="${packPath}" but the path does not exist on disk.`,
          "error",
          "qfai.config.yaml",
          "config.prototyping.calibration.packPath.reality",
          undefined,
          "canonical",
          "prototyping.calibration.packPath を実在する calibration pack (YAML ファイル または ディレクトリ) に合わせてください。",
        ),
      );
    }
  }

  return issues;
}
