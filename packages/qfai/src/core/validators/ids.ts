import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import { collectSpecFiles } from "../discovery.js";
import { collectFiles } from "../fs.js";
import { parseGherkinFeature } from "../parse/gherkin.js";
import { parseSpec } from "../parse/spec.js";
import type { Issue, IssueSeverity } from "../types.js";

const SC_TAG_RE = /^SC-\d{4}$/;

export async function validateDefinedIds(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const specRoot = resolvePath(root, config, "specDir");
  const scenarioRoot = resolvePath(root, config, "scenariosDir");

  const specFiles = await collectSpecFiles(specRoot);
  const scenarioFiles = await collectFiles(scenarioRoot, {
    extensions: [".feature"],
  });

  const defined = new Map<string, Set<string>>();

  await collectSpecDefinitionIds(specFiles, defined);
  await collectScenarioDefinitionIds(scenarioFiles, defined);
  const contractIndex = await buildContractIndex(root, config);
  for (const [id, files] of contractIndex.idToFiles.entries()) {
    for (const file of files) {
      recordId(defined, id, file);
    }
  }

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
    const parsed = parseSpec(text, file);
    if (parsed.specId) {
      recordId(out, parsed.specId, file);
    }
    parsed.brs.forEach((br) => recordId(out, br.id, file));
  }
}

async function collectScenarioDefinitionIds(
  files: string[],
  out: Map<string, Set<string>>,
): Promise<void> {
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    const parsed = parseGherkinFeature(text, file);
    for (const scenario of parsed.scenarios) {
      for (const tag of scenario.tags) {
        if (SC_TAG_RE.test(tag)) {
          recordId(out, tag, file);
        }
      }
    }
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
