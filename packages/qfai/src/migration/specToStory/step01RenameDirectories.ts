import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { isMap, parseDocument, type Document } from "yaml";

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

/** The traceability keys no check reads any longer, which step 1 removes. */
const RETIRED_TRACEABILITY_KEYS = ["scMustHaveTest", "unknownContractIdSeverity"] as const;

/** Removes the retired keys, and a mapping the removal leaves empty; returns the keys removed. */
function removeRetiredTraceabilityKeys(document: Document): string[] {
  const removed: string[] = [];
  for (const key of RETIRED_TRACEABILITY_KEYS) {
    if (!document.hasIn(["validation", "traceability", key])) continue;
    document.deleteIn(["validation", "traceability", key]);
    removed.push(`validation.traceability.${key}`);
  }
  for (const mapping of [["validation", "traceability"], ["validation"]]) {
    const node = document.getIn(mapping, true);
    if (removed.length > 0 && isMap(node) && node.items.length === 0) document.deleteIn(mapping);
  }
  return removed;
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
  const removed = removeRetiredTraceabilityKeys(document);
  if (!changed && removed.length === 0) return null;
  return {
    kind: "write",
    target,
    content: String(document),
    notes: removed.map((key) => `${target}: remove ${key}`),
  };
}

export const step01: MigrationStep = {
  number: 1,
  writeSet: ["qfai", "specs", "contracts", "config"],
  async plan(context: MigrationContext) {
    const operations: MigrationOperation[] = [];
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
        const source = `${sourceDir}/${name}`;
        const target = `${targetDir}/${name}`;
        operations.push(
          (await exists(path.join(context.root, target)))
            ? { kind: "remove", target: source, description: "delete: the destination exists" }
            : { kind: "move", source, target },
        );
      }
      operations.push({ kind: "remove-empty-directory", target: sourceDir });
    }
    const configRewrite = await planConfigRewrite(context.root);
    if (configRewrite) operations.push(configRewrite);
    return { operations };
  },
};
