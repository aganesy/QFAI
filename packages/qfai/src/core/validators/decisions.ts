import { readFile } from "node:fs/promises";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import { parseAdr } from "../parse/adr.js";
import type { Issue, IssueSeverity } from "../types.js";

const REQUIRED_FIELDS: Array<{
  key: keyof ReturnType<typeof parseAdr>["fields"];
  label: string;
}> = [
  { key: "status", label: "Status" },
  { key: "context", label: "Context" },
  { key: "decision", label: "Decision" },
  { key: "consequences", label: "Consequences" },
];

export async function validateDecisions(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const decisionsRoot = resolvePath(root, config, "decisionsDir");
  const files = await collectFiles(decisionsRoot, { extensions: [".md"] });
  if (files.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf-8");
    const parsed = parseAdr(text, file);
    const missing = REQUIRED_FIELDS.filter(
      (field) => !parsed.fields[field.key],
    );
    if (missing.length > 0) {
      issues.push(
        issue(
          "QFAI-ADR-001",
          `ADR 必須フィールドが不足しています: ${missing
            .map((field) => field.label)
            .join(", ")}`,
          "error",
          file,
          "adr.requiredFields",
        ),
      );
    }
  }

  return issues;
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
