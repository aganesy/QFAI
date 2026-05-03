/**
 * Test todo stub validator (QFAI-TEST-001).
 *
 * Detects `it.todo(...)` / `test.todo(...)` / `describe.todo(...)` stubs in
 * test files. These are silent placeholders in vitest/jest: they count as
 * "todo" (neither pass nor fail), so they do not block CI by default and
 * tend to rot as stale work-not-done markers.
 *
 * This validator closes the gap by emitting an `error` for each stub
 * found, making qfai validate / CI reject them. Projects that need to
 * migrate gradually can set `validation.testStrategy.forbidTestTodoStubs: false`
 * in qfai.config.yaml.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { collectFilesByGlobs, DEFAULT_GLOB_FILE_LIMIT } from "../fs.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "../traceability.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/**
 * Matches `it.todo(`, `test.todo(`, or `describe.todo(` anywhere on a line.
 *
 * We deliberately do NOT parse AST here: false positives are acceptable in
 * the rare case where a user writes `it.todo(` inside a string literal, and
 * the regex stays cheap (large monorepos can scan thousands of test files).
 * The common case — the stub written as executable code — is exactly what
 * we want to block, and regex catches it reliably.
 */
const TEST_TODO_PATTERN = /\b(it|test|describe)\.todo\s*\(/g;

export async function validateTestTodoStubs(root: string, config: QfaiConfig): Promise<Issue[]> {
  if (!config.validation.testStrategy.forbidTestTodoStubs) {
    return [];
  }

  const globs = config.validation.traceability.testFileGlobs;
  if (globs.length === 0) {
    return [];
  }

  const excludeGlobs = Array.from(
    new Set([
      ...DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
      ...config.validation.traceability.testFileExcludeGlobs,
    ]),
  );

  const { files } = await collectFilesByGlobs(root, {
    globs,
    ignore: excludeGlobs,
    limit: DEFAULT_GLOB_FILE_LIMIT,
  });

  const issues: Issue[] = [];
  for (const absFile of files) {
    const relFile = path.relative(root, absFile).replace(/\\/g, "/");
    let content: string;
    try {
      content = await readFile(absFile, "utf-8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      // The docstring promises one issue per stub occurrence. Walk every
      // match on the line via matchAll (the regex carries the `g` flag) so
      // a line like `it.todo(...); test.todo(...);` produces two issues
      // instead of just the first.
      const lineNumber = i + 1;
      for (const match of line.matchAll(TEST_TODO_PATTERN)) {
        const matchedKind = match[1]; // "it" | "test" | "describe"
        // Code follows the QFAI-<RULE-###> convention so waivers.ts:resolveRuleId
        // (^QFAI-([A-Z]+-\d{3})$) can match it; project-scoped waivers depend on
        // this. file is kept as the bare repo path so emitGitHub / waiver path
        // matchers (matchFindingPath in waivers.ts) work correctly; the line
        // number is carried in `loc.line`.
        const stubIssue = issue(
          "QFAI-TEST-001",
          `Test todo stub found: ${matchedKind}.todo at ${relFile}:${lineNumber}. ` +
            `Stubs are silent in vitest/jest and rot as missed work. ` +
            `Implement the body or delete the stub.`,
          "error",
          relFile,
          "validation.testStrategy.forbidTestTodoStubs",
          [`${matchedKind}.todo`],
          "canonical",
          "Implement the test body, or delete the stub entirely. " +
            "If you need to temporarily opt out of this check, set " +
            "`validation.testStrategy.forbidTestTodoStubs: false` in qfai.config.yaml.",
        );
        stubIssue.loc = { line: lineNumber };
        issues.push(stubIssue);
      }
    }
  }

  return issues;
}
