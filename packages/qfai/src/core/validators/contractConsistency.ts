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
  /**
   * Whether the bound is a Postgres ENUM rather than a check constraint.
   *
   * This decides the severity of `QFAI-CONTRACT-040`, so the two forms the
   * collector reads cannot be conflated. An ENUM — `CREATE TYPE … AS ENUM`, or
   * an inline `col ENUM(…)` — rejects an out-of-domain value at insert time, so
   * an API contract requiring one describes a pair no implementation can
   * satisfy. A `CHECK (col IN (…))` is a bound the DB currently asserts: it can
   * be dropped, replaced, or declared `NOT VALID`, and the column itself still
   * holds the value.
   *
   * Where a field's domain comes from both forms, the enum wins — the strictest
   * constraint is the one an implementation has to satisfy (#1100).
   */
  enumBacked: boolean;
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
    // `error` when the DB side is an ENUM, because then the two contracts
    // cannot both be implemented: Postgres rejects the value at insert time.
    // Every gate qfai prescribes is `--fail-on error`, so at `warning` this
    // never blocked anything and sat in a bucket ~95 entries deep — the
    // constraint violation was found by Postgres rather than by the gate that
    // exists to find it (#1100).
    //
    // A `CHECK` constraint stays `warning`: it is a bound the DB currently
    // asserts rather than the shape of the column, and it can be dropped,
    // replaced or declared `NOT VALID`. Raising both would lose the distinction
    // between "impossible" and "currently disallowed".
    const severity = db.enumBacked ? "error" : "warning";
    issues.push(
      issue(
        "QFAI-CONTRACT-040",
        `API 契約が要求する ${api.fieldName} の値が、同名フィールドを宣言する DB 契約で表現できません: ` +
          `${unrepresentable.join(", ")} (DB 側の許容値: ${Array.from(db.values).sort().join(", ")}; ` +
          `DB 契約: ${dbFileList.join(", ")}; DB 側の制約: ` +
          `${db.enumBacked ? "ENUM (insert 時に拒絶される物理制約)" : "CHECK (現在の制約。drop / NOT VALID で外せる)"})`,
        severity,
        file,
        "contracts.crossContract.stateDomain",
        [api.fieldName, ...unrepresentable],
        "canonical",
        (db.enumBacked
          ? `DB 契約 (${dbFileList.join(", ")}) の ENUM が正です — ` +
            "insert 時に拒絶される物理制約なので、この組み合わせを満たす実装は存在しません。" +
            "ENUM に値を追加するか (マイグレーションを伴います)、API 側の terminal semantics を訂正してください。"
          : `DB 契約 (${dbFileList.join(", ")}) の CHECK 制約との不一致です — ` +
            "制約側を広げる (drop / 再定義) と API 側を訂正するのどちらも取れます。" +
            "どちらを canonical とするかは、その entity を所有する spec の Contracts 表で判断してください。") +
          "照合は明示的なペア宣言でなく、正規化後のフィールド名が一致する DB 契約群のドメインに対して行われます。",
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
  walk(doc, null, found, new Map(), doc);
  return found;
}

/**
 * Recursion guard for {@link walk}: the property keys each node has already
 * been visited under.
 *
 * Keying on the node alone made a shared object a one-shot: a YAML anchor
 * (`state: &s {enum: [...]}` reused as `*s` for `status`) parses to ONE object
 * that both fields point at, so the second field was skipped entirely and its
 * domain never reached the reconciliation — `QFAI-CONTRACT-040` silently missed
 * the contradiction it exists to find. Keying on the (node, key) pair lets the
 * shared node contribute under every field name that reaches it while still
 * terminating on cycles, because a cycle necessarily revisits a pair.
 */
type WalkVisits = Map<object, Set<string>>;

function walk(
  node: unknown,
  key: string | null,
  out: Map<string, ApiStateEnum>,
  seen: WalkVisits,
  root: unknown,
): void {
  if (!node || typeof node !== "object") {
    return;
  }
  const visitKey = key ?? "";
  const visitedKeys = seen.get(node);
  if (visitedKeys) {
    if (visitedKeys.has(visitKey)) {
      return;
    }
    visitedKeys.add(visitKey);
  } else {
    seen.set(node, new Set([visitKey]));
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, key, out, seen, root);
    }
    return;
  }

  const record = node as Record<string, unknown>;
  if (key && isStateLikeFieldName(key)) {
    const values = readFieldEnum(record, root);
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
    walk(childValue, childKey, out, seen, root);
  }
}

/**
 * Enum domain a state-like property declares, whether inline or behind a local `$ref`.
 *
 * `status: { $ref: "#/components/schemas/OrderStatus" }` is the idiomatic OpenAPI shape and the
 * referencing site carries no `enum` of its own. Without resolving the pointer the domain is only
 * ever collected under the component name (`orderstatus`), which never reconciles with a DB
 * contract that bounds the column `status` — the pairing this validator exists to check silently
 * degrades to a no-op. Resolve it so the values are keyed by the *referencing field* name.
 */
function readFieldEnum(record: Record<string, unknown>, root: unknown): string[] {
  const direct = readStringEnum(record.enum);
  if (direct.length > 0) {
    return direct;
  }
  return readEnumThroughRef(record.$ref, root, new Set());
}

/**
 * Follows a chain of local (`#/...`) `$ref` pointers until one resolves to a node carrying an
 * `enum`. Remote refs (`other.yaml#/...`, URLs) are out of scope: the validator only reads the
 * contract files handed to it, so it cannot honestly resolve a pointer into a document it has not
 * loaded. The visited set makes a self-referential ref cycle terminate instead of recursing.
 */
function readEnumThroughRef(ref: unknown, root: unknown, seen: Set<string>): string[] {
  if (typeof ref !== "string" || !ref.startsWith("#/") || seen.has(ref)) {
    return [];
  }
  seen.add(ref);
  const target = resolveLocalRef(root, ref);
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return [];
  }
  const record = target as Record<string, unknown>;
  const direct = readStringEnum(record.enum);
  if (direct.length > 0) {
    return direct;
  }
  return readEnumThroughRef(record.$ref, root, seen);
}

/** Resolves a JSON-pointer fragment (`#/components/schemas/OrderStatus`) against `root`. */
function resolveLocalRef(root: unknown, ref: string): unknown {
  let current: unknown = root;
  for (const rawSegment of ref.slice(2).split("/")) {
    if (rawSegment.length === 0) {
      continue;
    }
    // RFC 6901 escaping: `~1` is `/`, `~0` is `~`. Order matters.
    const segment = rawSegment.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!current || typeof current !== "object") {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    const record = current as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(record, segment)) {
      return undefined;
    }
    current = record[segment];
  }
  return current;
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

// Column declarations that USE a named enum type. `CREATE TYPE ... AS ENUM` binds values to the
// type name, not to any column, so the domain has to be carried across the usage edge before it
// can be reconciled with an API field name. Each pattern captures (column, type):
//   1. a column line inside a CREATE TABLE body — `status order_status NOT NULL`
//   2. `ALTER TABLE ... ADD COLUMN status order_status`
//   3. `ALTER TABLE ... ALTER COLUMN status [SET DATA] TYPE order_status`
// A schema qualifier (`public.order_status`) is consumed and ignored: types are matched by their
// bare name, which is how the declaration side records them too.
const NAMED_TYPE_USAGE_PATTERNS = [
  /(?:^|[(,])\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\s+(?:"?[A-Za-z_][A-Za-z0-9_]*"?\s*\.\s*)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gim,
  /\bADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+(?:"?[A-Za-z_][A-Za-z0-9_]*"?\s*\.\s*)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi,
  /\bALTER\s+(?:COLUMN\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+(?:SET\s+DATA\s+)?TYPE\s+(?:"?[A-Za-z_][A-Za-z0-9_]*"?\s*\.\s*)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi,
] as const;

async function collectDbStateDomains(dbFiles: string[]): Promise<Map<string, DbDomain>> {
  const domains = new Map<string, DbDomain>();
  for (const file of dbFiles) {
    let text: string;
    try {
      text = await readFile(file, "utf-8");
    } catch {
      continue;
    }
    for (const [name, bound] of collectSqlDomainBounds(text).entries()) {
      if (!isStateLikeFieldName(name)) {
        continue;
      }
      const normalized = normalizeFieldName(name);
      const existing = domains.get(normalized);
      if (existing) {
        bound.values.forEach((value) => existing.values.add(value));
        existing.files.add(file);
        // Two contracts bounding one field: enum wins, for the reason on
        // `DbDomain.enumBacked` — the strictest constraint is the one an
        // implementation has to satisfy.
        existing.enumBacked = existing.enumBacked || bound.enumBacked;
      } else {
        domains.set(normalized, {
          values: new Set(bound.values),
          files: new Set([file]),
          enumBacked: bound.enumBacked,
        });
      }
    }
  }
  return domains;
}

/**
 * Extracts `name -> allowed values` from the SQL forms a DB contract uses to bound a domain.
 * Values are lower-cased; comparison is case-insensitive on both sides.
 */
export function collectSqlEnumDomains(rawText: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [name, bound] of collectSqlDomainBounds(rawText).entries()) {
    out.set(name, bound.values);
  }
  return out;
}

/** A field's allowed values, and whether the bound is a Postgres ENUM. */
export type SqlDomainBound = {
  values: string[];
  /**
   * True for `CREATE TYPE … AS ENUM` and inline `col ENUM(…)`; false for
   * `CHECK (col IN (…))`.
   *
   * The distinction decides `QFAI-CONTRACT-040`'s severity: an ENUM rejects an
   * out-of-domain value at insert time, so an API contract requiring one
   * describes a pair no implementation can satisfy. A check constraint is a
   * bound the DB currently asserts and can be dropped, replaced or declared
   * `NOT VALID` (#1100).
   */
  enumBacked: boolean;
};

/**
 * As {@link collectSqlEnumDomains}, and it also says which SQL form bound each
 * field.
 *
 * Where both forms bound one field, `enumBacked` is true: the strictest
 * constraint is the one an implementation has to satisfy, so a column that is
 * an ENUM *and* carries a redundant `CHECK` is still impossible to violate.
 */
export function collectSqlDomainBounds(rawText: string): Map<string, SqlDomainBound> {
  const text = stripSqlComments(rawText);
  const domains = new Map<string, SqlDomainBound>();
  const patterns = [CHECK_IN_PATTERN, CREATE_TYPE_ENUM_PATTERN, INLINE_ENUM_PATTERN];
  const namedTypes = new Map<string, { name: string; literals: string[] }>();

  const add = (name: string, literals: string[], enumBacked: boolean): void => {
    const existing = domains.get(name);
    domains.set(
      name,
      existing
        ? {
            values: Array.from(new Set([...existing.values, ...literals])),
            enumBacked: existing.enumBacked || enumBacked,
          }
        : { values: literals, enumBacked },
    );
  };

  for (const pattern of patterns) {
    const scoped = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null = scoped.exec(text);
    while (match !== null) {
      const name = match[1];
      const literals = readSqlStringLiterals(match[2] ?? "");
      if (name && literals.length > 0) {
        // `CREATE TYPE` binds values to a TYPE, not to a field. Hold it aside until the column
        // usages are known so the type name is not published as if it were a column.
        if (pattern === CREATE_TYPE_ENUM_PATTERN) {
          const key = name.toLowerCase();
          const existing = namedTypes.get(key);
          namedTypes.set(key, {
            name,
            literals: existing
              ? Array.from(new Set([...existing.literals, ...literals]))
              : literals,
          });
        } else {
          // `INLINE_ENUM_PATTERN` is an ENUM column; `CHECK_IN_PATTERN` is not.
          add(name, literals, pattern === INLINE_ENUM_PATTERN);
        }
      }
      match = scoped.exec(text);
    }
  }

  // Carry each named enum type's domain onto the columns declared with it. Without this the
  // values stay keyed by the type name (`order_status`), so a column `status order_status` is
  // invisible to a reconciliation keyed on the API field name `status`.
  const resolved = resolveNamedTypeColumns(text, namedTypes);
  for (const [column, literals] of resolved.columns.entries()) {
    // A column declared with a named enum type IS an enum column.
    add(column, literals, true);
  }
  // Fall back to the type name only for types whose column usage is not visible here (declared in
  // one contract file, used in another). Publishing it alongside a resolved column would report
  // the same contradiction twice — once as `status`, once as `order_status`.
  for (const [key, entry] of namedTypes.entries()) {
    if (!resolved.usedTypes.has(key)) {
      add(entry.name, entry.literals, true);
    }
  }

  return domains;
}

/**
 * Maps `column -> values` for every column declared with one of `namedTypes`, and reports which
 * type keys were consumed so the caller can suppress the now-redundant type-name entry.
 *
 * The type-name filter is what keeps the column patterns safe: they are permissive enough to
 * match ordinary DDL noise, but a capture is only kept when its second token is a type this file
 * actually declared as an enum, which no keyword or built-in type will be.
 */
function resolveNamedTypeColumns(
  text: string,
  namedTypes: Map<string, { name: string; literals: string[] }>,
): { columns: Map<string, string[]>; usedTypes: Set<string> } {
  const columns = new Map<string, string[]>();
  const usedTypes = new Set<string>();
  if (namedTypes.size === 0) {
    return { columns, usedTypes };
  }
  for (const pattern of NAMED_TYPE_USAGE_PATTERNS) {
    const scoped = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null = scoped.exec(text);
    while (match !== null) {
      const column = match[1];
      const typeKey = match[2]?.toLowerCase();
      const entry = typeKey ? namedTypes.get(typeKey) : undefined;
      if (column && typeKey && entry) {
        usedTypes.add(typeKey);
        const existing = columns.get(column);
        columns.set(
          column,
          existing ? Array.from(new Set([...existing, ...entry.literals])) : [...entry.literals],
        );
      }
      match = scoped.exec(text);
    }
  }
  return { columns, usedTypes };
}

function readSqlStringLiterals(list: string): string[] {
  const values: string[] = [];
  // `''` is SQL's escape for a literal quote, so a value may contain quote
  // pairs: `ENUM ('don''t', 'ok')` is two values, not four fragments. Matching
  // `'([^']*)'` split `don''t` into `don` + `t` and dropped the rest of the
  // list, which both invents values the contract never declared and loses ones
  // it did — false positives and false negatives from the same bug.
  for (const match of list.matchAll(/'((?:[^']|'')*)'/g)) {
    const value = match[1]?.replace(/''/g, "'");
    if (value && !values.includes(value.toLowerCase())) {
      values.push(value.toLowerCase());
    }
  }
  return values;
}

/**
 * Blank out SQL comments so a commented-out `CHECK (...)` or
 * `CREATE TYPE ... AS ENUM` cannot be read as a live domain.
 *
 * The DB contract template itself ships full-line `-- QFAI-CONTRACT-ID: ...`
 * headers, so scanning raw text means every contract carries comment content
 * into the domain extractor and `QFAI-CONTRACT-040` can fire on a domain
 * nobody declared.
 *
 * Comments are replaced with spaces rather than removed so byte offsets stay
 * aligned with the input — the caller runs several independent regex passes
 * over the same text and their captures must agree.
 *
 * A comment marker inside a string literal is not a comment (`'a--b'` is a
 * value), so the scan tracks quoting, including the `''` escape.
 */
export function stripSqlComments(text: string): string {
  const out = text.split("");
  let index = 0;
  let inString = false;
  while (index < text.length) {
    const ch = text[index];
    if (inString) {
      if (ch === "'") {
        // A doubled quote is an escaped quote, not the end of the literal.
        if (text[index + 1] === "'") {
          index += 2;
          continue;
        }
        inString = false;
      }
      index += 1;
      continue;
    }
    if (ch === "'") {
      inString = true;
      index += 1;
      continue;
    }
    if (ch === "-" && text[index + 1] === "-") {
      while (index < text.length && text[index] !== "\n") {
        out[index] = " ";
        index += 1;
      }
      continue;
    }
    if (ch === "/" && text[index + 1] === "*") {
      const end = text.indexOf("*/", index + 2);
      const stop = end === -1 ? text.length : end + 2;
      for (let i = index; i < stop; i += 1) {
        if (out[i] !== "\n") {
          out[i] = " ";
        }
      }
      index = stop;
      continue;
    }
    index += 1;
  }
  return out.join("");
}
