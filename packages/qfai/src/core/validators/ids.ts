import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import {
  collectApiContractFiles,
  collectDataContractFiles,
  collectSpecFiles,
  collectUiContractFiles,
} from "../discovery.js";
import { collectFiles } from "../fs.js";
import { extractIds } from "../ids.js";
import type { Issue, IssueSeverity } from "../types.js";

export async function validateDefinedIds(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const specRoot = resolvePath(root, config, "specDir");
  const scenarioRoot = resolvePath(root, config, "scenariosDir");
  const uiRoot = resolvePath(root, config, "uiContractsDir");
  const apiRoot = resolvePath(root, config, "apiContractsDir");
  const dataRoot = resolvePath(root, config, "dataContractsDir");

  const specFiles = await collectSpecFiles(specRoot);
  const scenarioFiles = await collectFiles(scenarioRoot, {
    extensions: [".feature"],
  });
  const uiFiles = await collectUiContractFiles(uiRoot);
  const apiFiles = await collectApiContractFiles(apiRoot);
  const dataFiles = await collectDataContractFiles(dataRoot);

  const defined = new Map<string, Set<string>>();

  await collectSpecDefinitionIds(specFiles, defined);
  await collectScenarioDefinitionIds(scenarioFiles, defined);
  await collectUiDefinitionIds(uiFiles, defined);
  await collectApiDefinitionIds(apiFiles, defined);
  await collectDataDefinitionIds(dataFiles, defined);

  for (const [id, files] of defined.entries()) {
    if (files.size <= 1) {
      continue;
    }
    const sorted = Array.from(files).sort();
    issues.push(
      issue(
        "QFAI-ID-001",
        `ID が重複しています: ${id} (${formatFileList(sorted, root)})`,
        "error",
        sorted[0],
        "id.duplicate",
      ),
    );
  }

  return issues;
}

async function collectSpecDefinitionIds(
  files: string[],
  out: Map<string, Set<string>>,
): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    extractIds(text, "SPEC").forEach((id) => recordId(out, id, file));
    extractIds(text, "BR").forEach((id) => recordId(out, id, file));
  }
}

async function collectScenarioDefinitionIds(
  files: string[],
  out: Map<string, Set<string>>,
): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    extractIds(text, "SC").forEach((id) => recordId(out, id, file));
  }
}

async function collectUiDefinitionIds(
  files: string[],
  out: Map<string, Set<string>>,
): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    try {
      const doc = parseYaml(text) as Record<string, unknown>;
      const id = typeof doc.id === "string" ? doc.id : "";
      extractIds(id, "UI").forEach((value) => recordId(out, value, file));
    } catch {
      continue;
    }
  }
}

async function collectApiDefinitionIds(
  files: string[],
  out: Map<string, Set<string>>,
): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    let doc: Record<string, unknown> | null = null;
    try {
      const ext = path.extname(file).toLowerCase();
      doc =
        ext === ".json"
          ? (JSON.parse(text) as Record<string, unknown>)
          : (parseYaml(text) as Record<string, unknown>);
    } catch {
      doc = null;
    }
    if (!doc) {
      continue;
    }
    const operationIds = new Set<string>();
    collectOperationIds(doc, operationIds);
    for (const operationId of operationIds) {
      extractIds(operationId, "API").forEach((id) => recordId(out, id, file));
    }
  }
}

async function collectDataDefinitionIds(
  files: string[],
  out: Map<string, Set<string>>,
): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    extractIds(text, "DATA").forEach((id) => recordId(out, id, file));
  }
}

function collectOperationIds(value: unknown, out: Set<string>): void {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectOperationIds(item, out);
    }
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (key === "operationId" && typeof entry === "string") {
      out.add(entry);
      continue;
    }
    collectOperationIds(entry, out);
  }
}

function recordId(
  out: Map<string, Set<string>>,
  id: string,
  file: string,
): void {
  const current = out.get(id) ?? new Set<string>();
  current.add(file);
  out.set(id, current);
}

function formatFileList(files: string[], root: string): string {
  return files
    .map((file) => {
      const relative = path.relative(root, file);
      return relative.length > 0 ? relative : file;
    })
    .join(", ");
}

function issue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file?: string,
  rule?: string,
  refs?: string[],
): Issue {
  const issue: Issue = {
    code,
    severity,
    message,
  };
  if (file) {
    issue.file = file;
  }
  if (rule) {
    issue.rule = rule;
  }
  if (refs && refs.length > 0) {
    issue.refs = refs;
  }
  return issue;
}
