import { readFile } from "node:fs/promises";

import { loadConfig, resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import { extractAllIds } from "../ids.js";
import type { Issue } from "../types.js";

export async function validateTraceability(root: string): Promise<Issue[]> {
  const config = await loadConfig(root);
  const specsRoot = resolvePath(root, config, "specsDir");
  const scenariosRoot = resolvePath(root, config, "scenariosDir");
  const srcRoot = resolvePath(root, config, "srcDir");
  const testsRoot = resolvePath(root, config, "testsDir");

  const specFiles = await collectFiles(specsRoot, { extensions: [".md"] });
  const scenarioFiles = await collectFiles(scenariosRoot, {
    extensions: [".md"],
  });
  const ids = new Set<string>();

  for (const file of [...specFiles, ...scenarioFiles]) {
    const text = await readFile(file, "utf-8");
    extractAllIds(text).forEach((id) => ids.add(id));
  }

  if (ids.size === 0) {
    return [issue("QFAI-TRACE-000", "上流 ID が見つかりません。", specsRoot)];
  }

  const codeFiles = await collectFiles(srcRoot, {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  });
  const testFiles = await collectFiles(testsRoot, {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  });
  const targetFiles = [...codeFiles, ...testFiles];

  if (targetFiles.length === 0) {
    return [
      issue(
        "QFAI-TRACE-001",
        "参照対象のコード/テストが見つかりません。",
        srcRoot,
      ),
    ];
  }

  const pattern = buildIdPattern(Array.from(ids));
  let found = false;

  for (const file of targetFiles) {
    const text = await readFile(file, "utf-8");
    if (pattern.test(text)) {
      found = true;
      break;
    }
  }

  if (!found) {
    return [
      issue(
        "QFAI-TRACE-002",
        "上流 ID がコード/テストに参照されていません。",
        srcRoot,
      ),
    ];
  }

  return [];
}

function buildIdPattern(ids: string[]): RegExp {
  const escaped = ids.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${escaped.join("|")})\\b`);
}

function issue(
  code: string,
  message: string,
  file?: string,
  refs?: string[],
): Issue {
  const issue: Issue = {
    code,
    severity: "warning",
    message,
  };
  if (file) {
    issue.file = file;
  }
  if (refs && refs.length > 0) {
    issue.refs = refs;
  }
  return issue;
}
