/**
 * `D-SCAFFOLD-PLACEHOLDER` validator (BR-0008-0008).
 *
 * `qfai atdd scaffold` emits one test skeleton per declared Test-Case
 * containing the `SCAFFOLD_PLACEHOLDER_MARKER` sentinel and a per-TC
 * `// TODO: implement assertion for <TC-ID>` line. Until those
 * markers are removed (the file has been authored with a real
 * assertion), `qfai validate --profile atdd` (and `full`) surfaces
 * `D-SCAFFOLD-PLACEHOLDER` at severity `warning` so unfilled
 * scaffolds are visible to the gate. After
 * `atdd.scaffoldEscalateCycles` (default 3, configurable) cycles of
 * the same placeholder persisting, the escalation path in
 * `core/atdd/scaffoldEscalation.ts` upgrades the per-TC warning to
 * `error`.
 *
 * Scan scope: `tests/atdd/**\/*.test.*` (and the configured
 * `tests/atdd/**` glob through `config.paths.testsDir`). Non-atdd
 * tests are out of scope. The validator uses fast-glob and is a
 * pure read of the test tree — never modifies disk state.
 */
import fg from "fast-glob";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { resolvePath, type QfaiConfig } from "../config.js";
import { SCAFFOLD_PLACEHOLDER_MARKER } from "../atdd/scaffold.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/**
 * Matches the per-TC `// TODO: implement assertion for <TC-ID>`
 * comment that `qfai atdd scaffold` emits inside each skeleton.
 * Captures the TC-ID so the validator finding can name it.
 */
const TODO_MARKER_RE = /\/\/\s*TODO:\s*implement assertion for\s+(TC-\d{4}-\d{4})\b/g;

export async function validateScaffoldPlaceholder(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  // Honor `config.paths.testsDir`; default `tests` covers the legacy
  // `tests/atdd/<spec-id>/<TC>.test.*` layout. The atdd subdirectory
  // is fixed by the scaffold contract; only the parent is configurable.
  const testsDir = resolvePath(root, config, "testsDir");
  const atddDir = path.join(testsDir, "atdd");
  // Glob for any test extension the project uses (`.test.ts`,
  // `.test.tsx`, `.test.mts`, `.test.js`, `.test.mjs`). fast-glob
  // returns absolute paths when the pattern is absolute.
  const globPattern = path.posix.join(
    atddDir.replace(/\\/g, "/"),
    "**/*.test.{ts,tsx,mts,js,mjs,jsx,cts,cjs}",
  );
  const files = await fg(globPattern, { dot: false, absolute: true });
  for (const file of files) {
    let body: string;
    try {
      body = await readFile(file, "utf-8");
    } catch {
      continue;
    }
    // A file is "still placeholder" when it contains BOTH the
    // sentinel AND the per-TC TODO marker. Mirrors the
    // `isStillPlaceholder` logic in `core/atdd/scaffold.ts` so the
    // emit-side and validate-side agree on the same definition.
    if (!body.includes(SCAFFOLD_PLACEHOLDER_MARKER)) {
      continue;
    }
    const matches = Array.from(body.matchAll(TODO_MARKER_RE));
    if (matches.length === 0) {
      continue;
    }
    const tcIds = Array.from(
      new Set(matches.map((m) => m[1]).filter((id): id is string => typeof id === "string")),
    );
    const relPath = path.relative(root, file).replace(/\\/g, "/");
    issues.push(
      issue(
        "D-SCAFFOLD-PLACEHOLDER",
        `Scaffold placeholder still present in ${relPath} (TC: ${tcIds.join(", ")}). ` +
          "Replace the `// TODO: implement assertion for <TC-ID>` block with " +
          "a real assertion to clear this warning. After " +
          "`atdd.scaffoldEscalateCycles` (default 3) cycles of the same " +
          "placeholder the warning escalates to error per the scaffold " +
          "contract.",
        "warning",
        relPath,
        "scaffoldPlaceholder.unfilled",
        tcIds,
        "change",
        `Implement an assertion for ${tcIds.join(", ")} in ${relPath}, then re-run validate.`,
      ),
    );
  }
  return issues;
}
