import { readFile } from "node:fs/promises";

import { parseStructuredContract } from "../contracts.js";
import { stripContractDeclarationLines } from "../contractsDecl.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/**
 * Cross-contract consistency checks.
 *
 * Per-file contract validation (`validateContracts`) never compares one contract with another, so
 * an API contract that mandates an outcome the paired DB contract cannot represent passes every
 * gate until an implementation test tries to satisfy both.
 *
 * This validator implements the mechanizable slice of that reconciliation: state/status domains.
 * It compares the enum domain an API contract declares for a state-like field against the domain
 * the DB contracts declare for the same field (`CHECK (... IN (...))`, `CREATE TYPE ... AS ENUM`,
 * or an inline column `ENUM(...)`), and reports API-mandated values with no representable DB
 * counterpart.
 *
 * It is deliberately conservative: a finding is only emitted when *both* sides declare a domain
 * for the same normalized field name. A field only one side knows about is not a contradiction.
 */
export async function validateContractConsistency(
  apiFiles: string[],
  dbFiles: string[],
): Promise<Issue[]> {
  if (apiFiles.length === 0 || dbFiles.length === 0) {
    return [];
  }

  const dbDomains = await collectDbStateDomains(dbFiles);
  if (dbDomains.size === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const file of apiFiles) {
    issues.push(...(await validateApiFileAgainstDb(file, dbDomains)));
  }
  return issues;
}

type DbDomain = {
  /** Values the DB contract can actually store for this field. */
  values: Set<string>;
  /** Contract files that declared the domain. */
  files: Set<string>;
};

async function validateApiFileAgainstDb(
  file: string,
  dbDomains: Map<string, DbDomain>,
): Promise<Issue[]> {
  let doc: Record<string, unknown>;
  try {
    const text = await readFile(file, "utf-8");
    doc = parseStructuredContract(file, stripContractDeclarationLines(text));
  } catch {
    // Parse failures are already reported as QFAI-CONTRACT-021 by validateContracts.
    return [];
  }

  const issues: Issue[] = [];
  for (const [normalized, api] of collectApiStateEnums(doc).entries()) {
    const db = dbDomains.get(normalized);
    if (!db) {
      continue;
    }
    const unrepresentable = Array.from(api.values)
      .filter((value) => !db.values.has(value.toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
    if (unrepresentable.length === 0) {
      continue;
    }
    const dbFileList = Array.from(db.files).sort((a, b) => a.localeCompare(b));
    issues.push(
      issue(
        "QFAI-CONTRACT-040",
        `API 契約が要求する ${api.fieldName} の値が、対になる DB 契約で表現できません: ` +
          `${unrepresentable.join(", ")} (DB 側の許容値: ${Array.from(db.values).sort().join(", ")}; ` +
          `DB 契約: ${dbFileList.join(", ")})`,
        "warning",
        file,
        "contracts.crossContract.stateDomain",
        [api.fieldName, ...unrepresentable],
        "canonical",
        "API 契約が要求する terminal state / status enum ごとに、対になる DB 契約へ表現可能な値を追加するか、" +
          "API 側の terminal semantics を訂正してください。",
      ),
    );
  }
  return issues;
}

type ApiStateEnum = {
  fieldName: string;
  values: Set<string>;
};

/**
 * Walks a parsed OpenAPI document and collects `enum` domains declared for state-like fields.
 * Keyed by the normalized field name so `transactionState` and `transaction_state` reconcile.
 */
export function collectApiStateEnums(doc: unknown): Map<string, ApiStateEnum> {
  const found = new Map<string, ApiStateEnum>();
  walk(doc, null, found, new Set());
  return found;
}

function walk(
  node: unknown,
  key: string | null,
  out: Map<string, ApiStateEnum>,
  seen: Set<object>,
): void {
  if (!node || typeof node !== "object") {
    return;
  }
  if (seen.has(node as object)) {
    return;
  }
  seen.add(node as object);

  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, key, out, seen);
    }
    return;
  }

  const record = node as Record<string, unknown>;
  if (key && isStateLikeFieldName(key)) {
    const values = readStringEnum(record.enum);
    if (values.length > 0) {
      const normalized = normalizeFieldName(key);
      const existing = out.get(normalized);
      if (existing) {
        values.forEach((value) => existing.values.add(value));
      } else {
        out.set(normalized, { fieldName: key, values: new Set(values) });
      }
    }
  }

  for (const [childKey, childValue] of Object.entries(record)) {
    walk(childValue, childKey, out, seen);
  }
}

function readStringEnum(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

/** `state`, `status`, `transaction_state`, `transactionStatus`, ... */
export function isStateLikeFieldName(name: string): boolean {
  return /(^|[^a-z])(state|status)$/i.test(name.replace(/([a-z0-9])([A-Z])/g, "$1_$2"));
}

/** Drops case and separators so `transaction_state` === `transactionState`. */
export function normalizeFieldName(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

const CHECK_IN_PATTERN = /\bCHECK\s*\(\s*\(?\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s+IN\s*\(([^)]*)\)/gi;
const CREATE_TYPE_ENUM_PATTERN =
  /\bCREATE\s+TYPE\s+(?:[A-Za-z_][A-Za-z0-9_]*\s*\.\s*)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+AS\s+ENUM\s*\(([^)]*)\)/gi;
const INLINE_ENUM_PATTERN = /^\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s+ENUM\s*\(([^)]*)\)/gim;

async function collectDbStateDomains(dbFiles: string[]): Promise<Map<string, DbDomain>> {
  const domains = new Map<string, DbDomain>();
  for (const file of dbFiles) {
    let text: string;
    try {
      text = await readFile(file, "utf-8");
    } catch {
      continue;
    }
    for (const [name, values] of collectSqlEnumDomains(text).entries()) {
      if (!isStateLikeFieldName(name)) {
        continue;
      }
      const normalized = normalizeFieldName(name);
      const existing = domains.get(normalized);
      if (existing) {
        values.forEach((value) => existing.values.add(value));
        existing.files.add(file);
      } else {
        domains.set(normalized, { values: new Set(values), files: new Set([file]) });
      }
    }
  }
  return domains;
}

/**
 * Extracts `name -> allowed values` from the SQL forms a DB contract uses to bound a domain.
 * Values are lower-cased; comparison is case-insensitive on both sides.
 */
export function collectSqlEnumDomains(text: string): Map<string, string[]> {
  const domains = new Map<string, string[]>();
  const patterns = [CHECK_IN_PATTERN, CREATE_TYPE_ENUM_PATTERN, INLINE_ENUM_PATTERN];

  for (const pattern of patterns) {
    const scoped = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null = scoped.exec(text);
    while (match !== null) {
      const name = match[1];
      const literals = readSqlStringLiterals(match[2] ?? "");
      if (name && literals.length > 0) {
        const existing = domains.get(name);
        domains.set(name, existing ? Array.from(new Set([...existing, ...literals])) : literals);
      }
      match = scoped.exec(text);
    }
  }

  return domains;
}

function readSqlStringLiterals(list: string): string[] {
  const values: string[] = [];
  for (const match of list.matchAll(/'([^']*)'/g)) {
    const value = match[1];
    if (value && !values.includes(value.toLowerCase())) {
      values.push(value.toLowerCase());
    }
  }
  return values;
}
