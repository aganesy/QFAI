import path from "node:path";

import { validateProject } from "../../core/validate.js";
import type { Issue } from "../../core/types.js";
import { info, warn } from "../lib/logger.js";

export type ValidateOptions = {
  root: string;
};

export async function runValidate(options: ValidateOptions): Promise<Issue[]> {
  const root = path.resolve(options.root);
  const result = await validateProject(root);
  printIssues(result.issues);

  info(`warnings: ${result.issues.length}`);
  return result.issues;
}

function printIssues(issues: Issue[]): void {
  for (const item of issues) {
    const location = item.file ? ` (${item.file})` : "";
    const refs =
      item.refs && item.refs.length > 0 ? ` refs=${item.refs.join(",")}` : "";
    warn(`WARN [${item.code}] ${item.message}${location}${refs}`);
  }
}
