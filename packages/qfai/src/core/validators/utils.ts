import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { hasErrnoCode, isEnoent } from "../fs/errno.js";
import type { Issue, IssueCategory, IssueLocation, IssueSeverity } from "../types.js";

/**
 * Whether `candidate` is `base` itself or sits under it.
 *
 * Shared rather than re-derived per validator: every caller asks the same
 * question of a resolved symlink target — does the thing this points at travel
 * with the project — and two hand-rolled `path.relative` comparisons drift on
 * the details (the `..` prefix, an absolute result across Windows drives) in
 * ways that quietly widen what a validator accepts.
 *
 * Both arguments should already be `realpath`-resolved: comparing a resolved
 * target against an unresolved base reports a link inside a symlinked project
 * root as outside it.
 */
export function isInside(base: string, candidate: string): boolean {
  const relative = path.relative(base, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function issue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file?: string,
  rule?: string,
  refs?: string[],
  category: IssueCategory = "canonical",
  suggested_action?: string,
  details?: {
    /** Other files this finding implicates when `file` is a representative. */
    relatedFiles?: string[];
    /** The CI job the producer reported, for a finding ingested from a lane. */
    job?: string;
    loc?: IssueLocation;
  },
): Issue {
  const issue: Issue = {
    code,
    severity,
    category,
    message,
  };
  if (suggested_action) {
    issue.suggested_action = suggested_action;
  }
  if (file) {
    issue.file = file;
  }
  if (rule) {
    issue.rule = rule;
  }
  if (refs && refs.length > 0) {
    issue.refs = refs;
  }
  if (details?.relatedFiles && details.relatedFiles.length > 0) {
    issue.relatedFiles = details.relatedFiles;
  }
  if (details?.job) {
    issue.job = details.job;
  }
  if (details?.loc) {
    issue.loc = details.loc;
  }
  return issue;
}

/**
 * True for the two errors that mean nothing is at the path: it does not exist,
 * or a parent of it is a file. Any other error says the path could not be
 * observed, which is not the same as absent.
 */
function isAbsent(error: unknown): boolean {
  return isEnoent(error) || (hasErrnoCode(error) && error.code === "ENOTDIR");
}

/** Whether the path is there. An unreadable path throws rather than reading as absent. */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error: unknown) {
    if (isAbsent(error)) {
      return false;
    }
    throw error;
  }
}

/** The file's text, or `""` where nothing is there. Any other read failure throws. */
export async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch (error: unknown) {
    if (isAbsent(error)) {
      return "";
    }
    throw error;
  }
}

export function to4(value: number): string {
  return `${value}`.padStart(4, "0");
}
