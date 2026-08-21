/**
 * `- SSOT modules:` link-integrity validator for `.qfai/contracts/**`.
 *
 * Every contract may open with an `- SSOT modules:` block naming the
 * implementation files that carry the truth for the documented surface. The
 * block is a routing device: it tells whoever is about to change behaviour
 * which file to edit alongside the contract. Nothing resolved those paths, so
 * a renamed — or never written — module left the contract asserting a plausible
 * path forever, and the reader got no error, only a dead end.
 *
 * The check is deliberately narrow: it only resolves entries that *look* like
 * repository-relative paths, so parenthetical prose and symbol names inside the
 * block ("`MAX_ITERATIONS = 10`") are never mistaken for a file.
 */
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe } from "./utils.js";

/** Opening line of the block; a top-level list item, no indentation. */
const BLOCK_HEADER_RE = /^-\s+SSOT modules:\s*$/;

/** One entry inside the block: an indented list item whose first token is backticked. */
const ENTRY_RE = /^\s+-\s+`([^`]+)`/;

/** Any indented list item — used to detect an entry that carries no backtick. */
const INDENTED_ITEM_RE = /^\s+-\s+/;

/**
 * A backticked token is treated as a path only when it is slash-separated and
 * made purely of path-safe characters. `packages/qfai/src/core/doctor.ts` is a
 * path; `resolvePlaywrightLauncher` and `MAX_ITERATIONS = 10` are not.
 */
const PATH_LIKE_RE = /^[A-Za-z0-9_@.-]+(?:\/[A-Za-z0-9_@.-]+)+\/?$/;

export type SsotModuleEntry = {
  /** Path exactly as written in the contract. */
  readonly modulePath: string;
  /** 1-based line number of the entry inside the contract file. */
  readonly line: number;
};

/**
 * Extract the path-like entries of every `- SSOT modules:` block in `text`.
 *
 * The block ends at the first line that is neither an indented list item nor an
 * indented continuation of the previous entry — i.e. at the next top-level list
 * item, heading, or blank line. Continuation lines are skipped rather than
 * parsed, so a backtick in a parenthetical never becomes a phantom entry.
 */
export function extractSsotModuleEntries(text: string): SsotModuleEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: SsotModuleEntry[] = [];

  for (let index = 0; index < lines.length; index++) {
    if (!BLOCK_HEADER_RE.test(lines[index] ?? "")) {
      continue;
    }
    let cursor = index + 1;
    for (; cursor < lines.length; cursor++) {
      const line = lines[cursor] ?? "";
      if (line.trim().length === 0 || !/^\s/.test(line)) {
        break;
      }
      if (!INDENTED_ITEM_RE.test(line)) {
        continue; // continuation line of the previous entry
      }
      const modulePath = ENTRY_RE.exec(line)?.[1];
      if (modulePath !== undefined && PATH_LIKE_RE.test(modulePath)) {
        entries.push({ modulePath, line: cursor + 1 });
      }
    }
    index = cursor;
  }

  return entries;
}

/**
 * Report every `- SSOT modules:` entry under the contracts root that does not
 * resolve on disk, relative to the project root.
 */
export async function validateContractSsotModules(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const files = await collectFiles(contractsRoot, { extensions: [".md"] });
  const issues: Issue[] = [];

  for (const file of files.sort((a, b) => a.localeCompare(b))) {
    const text = await readSafe(file);
    if (text.trim().length === 0) {
      continue;
    }
    const relFile = path.relative(root, file).replace(/\\/g, "/");
    for (const entry of extractSsotModuleEntries(text)) {
      if (await exists(path.join(root, entry.modulePath))) {
        continue;
      }
      issues.push(
        issue(
          "QFAI-CONTRACT-050",
          `契約の SSOT modules が存在しないパスを参照しています: ${entry.modulePath}`,
          "error",
          relFile,
          "contracts.ssotModuleExists",
          [entry.modulePath],
          "canonical",
          "実装の現在地に合わせてパスを修正するか、未実装の分割案であればパスではなく意図として記述してください。",
          { loc: { line: entry.line } },
        ),
      );
    }
  }

  return issues;
}
