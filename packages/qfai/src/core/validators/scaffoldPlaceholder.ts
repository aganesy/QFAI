import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import { SCAFFOLD_PLACEHOLDER_MARKER } from "../atdd/scaffold.js";
import {
  SCAFFOLD_PLACEHOLDER_GLOBS,
  scaffoldPlaceholderBasenameMatchers,
} from "../atdd/scaffoldDialect.js";
import {
  listValidateCycleKeys,
  recordValidateCycle,
  resetValidateCycle,
  resolveEscalateThreshold,
  shouldEscalate,
} from "../atdd/scaffoldEscalation.js";
import { resolvePath, type QfaiConfig } from "../config.js";
import { flowScopeContainsId, type FlowScope } from "../flowScope.js";
import { isStoryTreeId } from "../storyTree/ids.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const TODO_MARKER_RE =
  /(?:\/\/|#)\s*TODO:\s*implement assertion for\s+((?:AC-\d{4}-\d{4}-\d{2}|BF-\d{4}))(?![\d-])/g;

function placeholderIds(body: string): string[] {
  return [...new Set([...body.matchAll(TODO_MARKER_RE)].map((match) => match[1] ?? ""))]
    .filter((id) => isStoryTreeId(id, "AC") || isStoryTreeId(id, "BF"))
    .sort();
}

export function scaffoldPlaceholderReportsBody(body: string): boolean {
  return body.includes(SCAFFOLD_PLACEHOLDER_MARKER) && placeholderIds(body).length > 0;
}

export function scaffoldPlaceholderScanDirs(testsDir: string): string[] {
  return ["integration", "api", "e2e"].map((kind) => path.join(testsDir, kind));
}

function isUnderScannedDir(absolute: string, scanned: readonly string[]): boolean {
  return scanned.some((dir) => {
    const inside = path.relative(dir, absolute);
    return (
      inside !== "" &&
      !inside.startsWith("..") &&
      !path.isAbsolute(inside) &&
      !inside.split(path.sep).some((segment) => segment.startsWith("."))
    );
  });
}

export function scaffoldPlaceholderReportedFilter(
  root: string,
  config: QfaiConfig,
): (relativePath: string, body: string) => boolean {
  const scanned = scaffoldPlaceholderScanDirs(resolvePath(root, config, "testsDir"));
  const basenames = scaffoldPlaceholderBasenameMatchers();
  return (relativePath, body) =>
    scaffoldPlaceholderReportsBody(body) &&
    basenames.some((matcher) => matcher.test(path.basename(relativePath))) &&
    isUnderScannedDir(path.resolve(root, relativePath), scanned);
}

export async function validateScaffoldPlaceholder(
  root: string,
  config: QfaiConfig,
  options: { flowScope?: FlowScope } = {},
): Promise<Issue[]> {
  const scanned = scaffoldPlaceholderScanDirs(resolvePath(root, config, "testsDir"));
  const patterns = scanned.flatMap((dir) =>
    SCAFFOLD_PLACEHOLDER_GLOBS.map((glob) => path.posix.join(dir.replace(/\\/g, "/"), glob)),
  );
  const files = [
    ...new Set(await fg(patterns, { dot: false, absolute: true, suppressErrors: true })),
  ].sort();
  const threshold = resolveEscalateThreshold(config.atdd?.scaffoldEscalateCycles);
  const observed = new Set<string>();
  const recorded = new Map<string, number>();
  const issues: Issue[] = [];
  let counterAvailable = true;

  for (const file of files) {
    let body: string;
    try {
      body = await readFile(file, "utf8");
    } catch {
      continue;
    }
    if (!scaffoldPlaceholderReportsBody(body)) continue;
    const ids = placeholderIds(body).filter(
      (id) => options.flowScope === undefined || flowScopeContainsId(options.flowScope, id),
    );
    if (ids.length === 0) continue;
    let maxCycles = 0;
    for (const id of ids) {
      observed.add(id);
      if (!counterAvailable) continue;
      try {
        let cycles = recorded.get(id);
        if (cycles === undefined) {
          cycles = await recordValidateCycle(root, id);
          recorded.set(id, cycles);
        }
        maxCycles = Math.max(maxCycles, cycles);
      } catch {
        counterAvailable = false;
      }
    }
    const relative = path.relative(root, file).replace(/\\/g, "/");
    issues.push(
      issue(
        "D-SCAFFOLD-PLACEHOLDER",
        `Scaffold placeholder remains in ${relative} for ${ids.join(", ")}. Replace its TODO with an assertion.${counterAvailable ? ` ${maxCycles}/${threshold} validate cycles observed.` : " Counter unavailable."}`,
        counterAvailable && shouldEscalate(maxCycles, threshold) ? "error" : "warning",
        relative,
        "scaffoldPlaceholder.unfilled",
        ids,
        "change",
        `Implement the assertions for ${ids.join(", ")} and re-run validate.`,
      ),
    );
  }

  try {
    for (const id of await listValidateCycleKeys(root)) {
      if (options.flowScope !== undefined && !flowScopeContainsId(options.flowScope, id)) continue;
      if (!observed.has(id)) await resetValidateCycle(root, id);
    }
  } catch {
    // The finding remains visible when auxiliary counter state cannot be updated.
  }
  return issues;
}
