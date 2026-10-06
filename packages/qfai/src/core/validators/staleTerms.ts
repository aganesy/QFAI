import { readFile } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const STALE_TERM_CODE = "QFAI-STORY-016";

/** The registers that name a rejected option on purpose; they are not read. */
const RECORD_FILES = new Set(["decisions.md", "open-questions.md"]);

function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "iu");
}

/**
 * Warns where a document of the spec tree still states a term the project lists in
 * `validation.staleTerms`. The check compares words only: it does not read whether the
 * sentence rejects the term or relies on it. The decision and open-question registers are
 * not read, because they record a rejected option by name.
 */
export async function validateStaleTerms(root: string, config: QfaiConfig): Promise<Issue[]> {
  const terms = [...new Set((config.validation.staleTerms ?? []).map((term) => term.trim()))]
    .filter((term) => term.length > 0)
    .map((term) => ({ term, pattern: termPattern(term) }));
  if (terms.length === 0) return [];
  const directories = new Set([
    resolvePath(root, config, "specsDir"),
    resolvePath(root, config, "contractsDir"),
  ]);
  const files = new Set<string>();
  for (const directory of directories) {
    for (const file of await collectFiles(directory, { extensions: [".md"] })) files.add(file);
  }
  const issues: Issue[] = [];
  for (const file of [...files].sort()) {
    if (RECORD_FILES.has(path.basename(file))) continue;
    const relative = path.relative(root, file).split(path.sep).join("/");
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { term, pattern } of terms) {
        if (!pattern.test(line)) continue;
        issues.push(
          issue(
            STALE_TERM_CODE,
            `${relative}:${index + 1} states "${term}", which validation.staleTerms lists as stale`,
            "warning",
            relative,
            "storyTree.staleTerm",
            [term],
            "canonical",
            undefined,
            { loc: { line: index + 1 } },
          ),
        );
      }
    });
  }
  return issues;
}
