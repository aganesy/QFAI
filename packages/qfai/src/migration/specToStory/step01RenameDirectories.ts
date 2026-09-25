import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parseDocument } from "yaml";

import { isEnoent } from "../../core/fs/errno.js";
import {
  MigrationInputError,
  type MigrationContext,
  type MigrationOperation,
  type MigrationStep,
} from "./harness.js";

/** The old default paths whose contents move entry by entry. */
export const STEP01_RENAMES = [
  [".qfai/specs", ".qfai/spec"],
  [".qfai/contracts", ".qfai/spec/03_contract"],
  [".qfai/prototypes", ".qfai/prototype"],
  [".qfai/assistant/skills", ".qfai/assistant/skill"],
  [".qfai/assistant/skills.local", ".qfai/assistant/skill.local"],
  [".qfai/assistant/agents", ".qfai/assistant/agent"],
  [".qfai/assistant/prompts", ".qfai/assistant/prompt"],
  [".qfai/evidence/decisions", ".qfai/evidence/decision"],
  [".qfai/report/specs-coverage", ".qfai/report/spec-coverage"],
] as const;

const CONFIG_PATH_RENAMES = [
  ["specsDir", ".qfai/specs", ".qfai/spec"],
  ["contractsDir", ".qfai/contracts", ".qfai/spec/03_contract"],
  ["skillsDir", ".qfai/assistant/skills", ".qfai/assistant/skill"],
  ["promptsDir", ".qfai/assistant/prompts", ".qfai/assistant/prompt"],
] as const;

export async function shouldRenameSource(
  context: MigrationContext,
  sourceDir: string,
): Promise<boolean> {
  const key =
    sourceDir === ".qfai/specs"
      ? "specsDir"
      : sourceDir === ".qfai/contracts"
        ? "contractsDir"
        : null;
  if (key === null) return true;
  let raw: string;
  try {
    raw = await readFile(path.join(context.root, "qfai.config.yaml"), "utf8");
  } catch (error: unknown) {
    throw new MigrationInputError(
      `qfai.config.yaml: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const document = parseDocument(raw);
  if (document.errors.length > 0) {
    throw new MigrationInputError(
      `qfai.config.yaml: ${document.errors[0]?.message ?? "invalid YAML"}`,
    );
  }
  const configured = document.getIn(["paths", key]);
  return configured === undefined || configured === sourceDir;
}

async function exists(absolutePath: string): Promise<boolean> {
  try {
    await lstat(absolutePath);
    return true;
  } catch (error: unknown) {
    if (isEnoent(error)) return false;
    throw new MigrationInputError(
      `${absolutePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function availableLegacyTarget(
  root: string,
  sourceDir: string,
  name: string,
  reserved: ReadonlySet<string>,
): Promise<string> {
  const sourceName = path.posix.basename(sourceDir);
  const base = `.qfai/evidence/migration-spec-to-story/legacy/${sourceName}/${name}`;
  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (!reserved.has(candidate) && !(await exists(path.join(root, candidate)))) return candidate;
  }
}

async function planConfigRewrite(root: string): Promise<MigrationOperation | null> {
  const target = "qfai.config.yaml";
  let original: string;
  try {
    original = await readFile(path.join(root, target), "utf8");
  } catch (error: unknown) {
    throw new MigrationInputError(
      `${target}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const document = parseDocument(original, { keepSourceTokens: true });
  if (document.errors.length > 0) {
    throw new MigrationInputError(`${target}: ${document.errors[0]?.message ?? "invalid YAML"}`);
  }
  let changed = false;
  for (const [key, oldPath, newPath] of CONFIG_PATH_RENAMES) {
    if (document.getIn(["paths", key]) !== oldPath) continue;
    document.setIn(["paths", key], newPath);
    changed = true;
  }
  return changed ? { kind: "write", target, content: String(document) } : null;
}

export const step01: MigrationStep = {
  number: 1,
  writeSet: ["qfai", "specs", "contracts", "config"],
  async plan(context: MigrationContext) {
    const operations: MigrationOperation[] = [];
    const reserved = new Set<string>();
    for (const [sourceDir, targetDir] of STEP01_RENAMES) {
      if (!(await shouldRenameSource(context, sourceDir))) continue;
      const source = path.join(context.root, sourceDir);
      let entries: string[];
      try {
        entries = await readdir(source);
      } catch (error: unknown) {
        if (isEnoent(error)) continue;
        throw new MigrationInputError(
          `${sourceDir}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      for (const name of entries.sort()) {
        const originalTarget = `${targetDir}/${name}`;
        const target =
          reserved.has(originalTarget) || (await exists(path.join(context.root, originalTarget)))
            ? await availableLegacyTarget(context.root, sourceDir, name, reserved)
            : originalTarget;
        operations.push({ kind: "move", source: `${sourceDir}/${name}`, target });
        reserved.add(target);
      }
      operations.push({ kind: "remove-empty-directory", target: sourceDir });
    }
    const configRewrite = await planConfigRewrite(context.root);
    if (configRewrite) operations.push(configRewrite);
    return { operations };
  },
};
