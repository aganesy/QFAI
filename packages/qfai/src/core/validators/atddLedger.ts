import { access } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import { collectSpecEntries } from "../specLayout.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

export async function validateAtddCoverageLedgers(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  if (entries.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const entry of entries) {
    const ledgerPath = path.join(entry.dir, "atdd", "coverage-ledger.md");
    try {
      await access(ledgerPath);
    } catch (error) {
      if (isEnoent(error)) {
        issues.push(
          issue(
            "QFAI-ATDD-001",
            "ATDD coverage-ledger.md が見つかりません。",
            "warning",
            ledgerPath,
            "atddLedger.exists",
          ),
        );
        continue;
      }
      throw error;
    }
  }

  return issues;
}
