import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const BP_ID_RE = /^BP-\d{4}$/;
const AP_ID_RE = /^AP-\d{4}$/;
const VALID_SEVERITIES = ["critical", "major", "minor"];
const VALID_PLATFORMS = [
  "common",
  "web",
  "windows",
  "mobile-ios",
  "mobile-android",
  "cross-platform",
];
const VALID_DETECTION_METHODS = ["auto", "manual"];

const BP_REQUIRED_FIELDS = [
  "id",
  "category",
  "title",
  "description",
  "severity",
  "auto_check",
  "validation_method",
  "platform",
];

const AP_REQUIRED_FIELDS = [
  "id",
  "category",
  "title",
  "description",
  "severity",
  "detection_method",
  "fix_guidance",
  "platform",
];

export async function validateBpApDb(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const designDir = path.join(root, config.paths.contractsDir, "design");
  const bpPattern = path.posix.join(designDir.replace(/\\/g, "/"), "best-practices*.yaml");
  const apPattern = path.posix.join(designDir.replace(/\\/g, "/"), "anti-patterns*.yaml");

  const bpFiles = await fg(bpPattern, { absolute: true });
  const apFiles = await fg(apPattern, { absolute: true });

  if (bpFiles.length === 0 && apFiles.length === 0) {
    return [];
  }

  const seenBpIds = new Set<string>();
  const seenApIds = new Set<string>();

  for (const filePath of bpFiles) {
    const rel = path.relative(root, filePath).replace(/\\/g, "/");
    const entries = await parseRuleFile(filePath, rel, issues);
    for (const entry of entries) {
      validateBpEntry(entry, rel, seenBpIds, issues);
    }
  }

  for (const filePath of apFiles) {
    const rel = path.relative(root, filePath).replace(/\\/g, "/");
    const entries = await parseRuleFile(filePath, rel, issues);
    for (const entry of entries) {
      validateApEntry(entry, rel, seenApIds, issues);
    }
  }

  return issues;
}

async function parseRuleFile(
  filePath: string,
  rel: string,
  issues: Issue[],
): Promise<Record<string, unknown>[]> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    issues.push(
      issue("QFAI-BPAP-001", `BP/AP file unreadable: ${rel}`, "error", rel, "bpApDb.readFile"),
    );
    return [];
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    issues.push(
      issue(
        "QFAI-BPAP-002",
        `BP/AP YAML parse error: ${error instanceof Error ? error.message : String(error)}`,
        "error",
        rel,
        "bpApDb.yamlParse",
      ),
    );
    return [];
  }

  if (!Array.isArray(parsed)) {
    issues.push(
      issue(
        "QFAI-BPAP-003",
        `BP/AP file must contain a YAML array: ${rel}`,
        "error",
        rel,
        "bpApDb.structure",
      ),
    );
    return [];
  }

  return parsed.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === "object" && !Array.isArray(item),
  );
}

function validateBpEntry(
  entry: Record<string, unknown>,
  file: string,
  seenIds: Set<string>,
  issues: Issue[],
): void {
  const id = toSafeString(entry.id);

  if (!BP_ID_RE.test(id)) {
    issues.push(
      issue(
        "QFAI-BPAP-004",
        `Invalid BP ID format: "${id}" (expected BP-XXXX)`,
        "error",
        file,
        "bpApDb.bpIdFormat",
        [id],
      ),
    );
  }

  if (seenIds.has(id)) {
    issues.push(
      issue("QFAI-BPAP-005", `Duplicate BP ID: ${id}`, "error", file, "bpApDb.duplicateId", [id]),
    );
  }
  seenIds.add(id);

  for (const field of BP_REQUIRED_FIELDS) {
    const value = entry[field];
    if (value === undefined || value === null || toSafeString(value).trim() === "") {
      issues.push(
        issue(
          "QFAI-BPAP-006",
          `Missing required field "${field}" in BP entry ${id}`,
          "error",
          file,
          "bpApDb.bpRequiredField",
          [id],
        ),
      );
    }
  }

  validateCommonFields(entry, id, file, issues);
}

function validateApEntry(
  entry: Record<string, unknown>,
  file: string,
  seenIds: Set<string>,
  issues: Issue[],
): void {
  const id = toSafeString(entry.id);

  if (!AP_ID_RE.test(id)) {
    issues.push(
      issue(
        "QFAI-BPAP-007",
        `Invalid AP ID format: "${id}" (expected AP-XXXX)`,
        "error",
        file,
        "bpApDb.apIdFormat",
        [id],
      ),
    );
  }

  if (seenIds.has(id)) {
    issues.push(
      issue("QFAI-BPAP-008", `Duplicate AP ID: ${id}`, "error", file, "bpApDb.duplicateId", [id]),
    );
  }
  seenIds.add(id);

  for (const field of AP_REQUIRED_FIELDS) {
    const value = entry[field];
    if (value === undefined || value === null || toSafeString(value).trim() === "") {
      issues.push(
        issue(
          "QFAI-BPAP-009",
          `Missing required field "${field}" in AP entry ${id}`,
          "error",
          file,
          "bpApDb.apRequiredField",
          [id],
        ),
      );
    }
  }

  const detectionMethod = toSafeString(entry.detection_method);
  if (detectionMethod && !VALID_DETECTION_METHODS.includes(detectionMethod)) {
    issues.push(
      issue(
        "QFAI-BPAP-010",
        `Invalid detection_method "${detectionMethod}" in AP entry ${id}. Expected: ${VALID_DETECTION_METHODS.join(", ")}`,
        "error",
        file,
        "bpApDb.detectionMethod",
        [id],
      ),
    );
  }

  validateCommonFields(entry, id, file, issues);
}

function validateCommonFields(
  entry: Record<string, unknown>,
  id: string,
  file: string,
  issues: Issue[],
): void {
  const severity = toSafeString(entry.severity);
  if (severity && !VALID_SEVERITIES.includes(severity)) {
    issues.push(
      issue(
        "QFAI-BPAP-011",
        `Invalid severity "${severity}" in entry ${id}. Expected: ${VALID_SEVERITIES.join(", ")}`,
        "error",
        file,
        "bpApDb.severity",
        [id],
      ),
    );
  }

  const platform = toSafeString(entry.platform);
  if (platform && !VALID_PLATFORMS.includes(platform)) {
    issues.push(
      issue(
        "QFAI-BPAP-012",
        `Invalid platform "${platform}" in entry ${id}. Expected: ${VALID_PLATFORMS.join(", ")}`,
        "warning",
        file,
        "bpApDb.platform",
        [id],
      ),
    );
  }
}

function toSafeString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}
