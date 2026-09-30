import path from "node:path";
import { pathToFileURL } from "node:url";

import { getInitAssetsDir } from "../../shared/assets.js";
import { resolvePath, type QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const VIOLATION_CODE = "QFAI-DOCSCHEMA-001";
const UNAVAILABLE_CODE = "QFAI-DOCSCHEMA-002";
const RULE = "storyTree.documentSchema";

type Violation = { file: string; line: number; column: number; rule: string; message: string };
type CheckResult = { ok: true; violations: Violation[] } | { ok: false; reason: string };
type CheckDocuments = (root: string, paths: { specsDir: string; contractsDir: string }) => unknown;

/**
 * The shipped checker, `assets/scripts/check-mdschema.mjs`.
 *
 * Imported at run time from the package's assets rather than bundled: the
 * checker finds its schemas beside itself, and it is the same file the shipped
 * docs lane runs, so the lane and this validator give one answer.
 */
function checkerPath(): string {
  return path.join(getInitAssetsDir(), "..", "scripts", "check-mdschema.mjs");
}

async function loadCheckDocuments(): Promise<CheckDocuments | string> {
  const file = checkerPath();
  let loaded: unknown;
  try {
    loaded = await import(pathToFileURL(file).href);
  } catch (error) {
    return `the checker ${file} could not be loaded: ${error instanceof Error ? error.message : String(error)}`;
  }
  if (typeof loaded === "object" && loaded !== null && "checkDocuments" in loaded) {
    const run = loaded.checkDocuments;
    if (typeof run === "function") {
      return (root, paths): unknown => Reflect.apply(run, undefined, [root, paths]);
    }
  }
  return `the checker ${file} exports no checkDocuments function`;
}

function isViolation(value: unknown): value is Violation {
  return (
    typeof value === "object" &&
    value !== null &&
    "file" in value &&
    typeof value.file === "string" &&
    "line" in value &&
    typeof value.line === "number" &&
    "column" in value &&
    typeof value.column === "number" &&
    "rule" in value &&
    typeof value.rule === "string" &&
    "message" in value &&
    typeof value.message === "string"
  );
}

/** Reads what the checker returned, which crosses from untyped JavaScript. */
function readResult(value: unknown): CheckResult {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    return { ok: false, reason: "the checker returned no result" };
  }
  if (value.ok === false) {
    const reason = "reason" in value && typeof value.reason === "string" ? value.reason : "";
    return { ok: false, reason: reason || "the checker could not run" };
  }
  const list = "violations" in value ? value.violations : undefined;
  if (!Array.isArray(list) || !list.every(isViolation)) {
    return { ok: false, reason: "the checker returned violations of an unknown shape" };
  }
  return { ok: true, violations: list };
}

function treeRelative(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join("/");
}

/**
 * Checks every story-tree document against the schema the package ships for
 * its path, and reports each violation as an error.
 */
export async function validateDocumentSchema(root: string, config: QfaiConfig): Promise<Issue[]> {
  const specsDir = resolvePath(root, config, "specsDir");
  const checkDocuments = await loadCheckDocuments();
  if (typeof checkDocuments === "string") {
    return [unavailable(checkDocuments, specsDir, root)];
  }
  const result = checkDocuments(root, {
    specsDir: treeRelative(root, specsDir),
    contractsDir: treeRelative(root, resolvePath(root, config, "contractsDir")),
  });
  return documentSchemaIssues(result, root, specsDir);
}

/**
 * The findings for one result of the shipped checker.
 *
 * @param value what `checkDocuments` returned, read as untrusted
 * @param specsDir absolute; a check that did not run is reported against it
 */
export function documentSchemaIssues(value: unknown, root: string, specsDir: string): Issue[] {
  const result = readResult(value);
  if (!result.ok) {
    return [unavailable(result.reason, specsDir, root)];
  }
  return result.violations.map((violation) =>
    issue(
      VIOLATION_CODE,
      `${violation.file}:${violation.line}:${violation.column} [${violation.rule}] ${violation.message}`,
      "error",
      violation.file,
      RULE,
      undefined,
      "canonical",
      undefined,
      { loc: { line: violation.line, column: violation.column } },
    ),
  );
}

function unavailable(reason: string, specsDir: string, root: string): Issue {
  return issue(
    UNAVAILABLE_CODE,
    `The document-schema check did not run: ${reason}`,
    "error",
    treeRelative(root, specsDir),
    RULE,
  );
}
