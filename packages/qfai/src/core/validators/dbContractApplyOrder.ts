/**
 * Apply-order dependencies a `db/` contract's own DDL implies (QFAI-CONTRACT-036).
 *
 * `-- Depends on:` states the order the contracts must be applied in. Three
 * rules read that line — one requires it to be present, one requires the ids in
 * it to resolve, one compares it with the contract index — and none of them
 * reads the SQL underneath. So a contract whose `REFERENCES` names a table
 * another contract creates, without naming that contract, satisfies all three
 * and fails the moment anybody applies the set in the stated order.
 *
 * That is the gap this closes, and it needs no database. A foreign key names
 * the table it points at, a `CREATE TABLE` names the table it makes, and both
 * are in files this validator already reads.
 *
 * Deliberately narrow. Only a `REFERENCES` clause is treated as an apply-order
 * edge, because in Postgres the target must exist when the statement runs. The
 * shipped sample says a reference resolved at run time — a view a later query
 * reads — is not one, and nothing here reads those. A referenced table that no
 * contract creates is left alone as well: this rule names the contract that
 * should have been listed, and there is none to name.
 */

import path from "node:path";

import { declaredContractId, extractDeclaredDependencies } from "../contractsDecl.js";
import { DOLLAR_QUOTE_MARKER } from "../sqlContract.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

/** Waivable as `QFAI-CONTRACT-036`; `CONTRACT-036` also resolves (`waivers.ts#resolveRuleKeys`). */
export const DB_CONTRACT_APPLY_ORDER_RULE_ID = "QFAI-CONTRACT-036";

/** A double-quoted identifier, with `""` standing for one `"` inside it. */
const QUOTED_IDENTIFIER = String.raw`"(?:[^"]|"")*"`;

/**
 * One part of a table name: a double-quoted, backtick-quoted or bracketed
 * identifier, or a plain one. A plain identifier may hold `$` after its first
 * character, as PostgreSQL allows, and any non-ASCII letter.
 */
const NAME_PART =
  String.raw`"(?:[^"]|"")+"|` +
  "`[^`]+`" +
  String.raw`|\[[^\]]+\]|[A-Za-z_\u0080-\uFFFF][\w$\u0080-\uFFFF]*`;
const TABLE_NAME = String.raw`(?:${NAME_PART})(?:\s*\.\s*(?:${NAME_PART}))*`;
const NAME_PARTS = new RegExp(NAME_PART, "g");

/**
 * A double-quoted identifier, `CREATE TABLE [IF NOT EXISTS] <name>`, or
 * `REFERENCES <name>`, whichever starts first.
 *
 * The quoted identifier is an alternative of its own so that a scan steps over
 * it whole: a `REFERENCES` spelled inside one is part of a name, not a clause.
 * `REFERENCES` is matched without requiring the column list, because a
 * single-column key may omit it and inherit the primary key.
 */
const TABLE_EDGE = new RegExp(
  QUOTED_IDENTIFIER +
    String.raw`|\bCREATE\s+(?:\w+\s+)*?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?<created>${TABLE_NAME})` +
    String.raw`|\bREFERENCES\s+(?<referenced>${TABLE_NAME})`,
  "gi",
);

/**
 * A table name as PostgreSQL resolves it.
 *
 * `schema` is the qualifier, or undefined when the name has none. A catalog
 * qualifier before it is dropped, because a contract set applies into one
 * database. `key` spells the whole name in one canonical form, so two
 * spellings of one table share it and two different tables never do.
 */
export type TableName = { schema: string | undefined; name: string; key: string };

/**
 * One identifier part as PostgreSQL stores it.
 *
 * A double-quoted part is kept exactly, so `"Orders"` and `orders` stay two
 * tables. An unquoted part is folded to lower case in ASCII only, as PostgreSQL
 * does under UTF-8. A backtick-quoted or bracketed part is not PostgreSQL
 * quoting; it folds like an unquoted one, so `[Orders]` is still `orders`.
 */
function identifierPart(raw: string): string {
  if (raw.startsWith('"')) {
    return raw.slice(1, -1).replace(/""/g, '"');
  }
  const bare = raw.startsWith("`") || raw.startsWith("[") ? raw.slice(1, -1) : raw;
  return bare.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

/** A part spelled so that reading it back gives the same part. */
function canonicalPart(part: string): string {
  return /^[a-z_][a-z0-9_$]*$/.test(part) ? part : `"${part.replace(/"/g, '""')}"`;
}

/** The table `raw` names, its qualifier kept and each part folded as PostgreSQL folds it. */
export function tableName(raw: string): TableName {
  const parts = [...raw.matchAll(NAME_PARTS)].map((match) => identifierPart(match[0]));
  const name = parts.at(-1) ?? "";
  const schema = parts.length > 1 ? parts.at(-2) : undefined;
  const key = (schema === undefined ? [name] : [schema, name]).map(canonicalPart).join(".");
  return { schema, name, key };
}

/**
 * A line comment, a block comment, a quoted string, a double-quoted
 * identifier, or a dollar-quoted literal.
 *
 * A dollar-quoted literal opens with `$$` or `$tag$` and closes at the same
 * marker, so the marker is captured and matched again by backreference. A
 * quoted identifier is matched so that a `$tag$`, `'` or `--` inside it opens
 * nothing; it is kept, not blanked, because it may be the table a key names.
 */
const SQL_NOISE = new RegExp(
  String.raw`--[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^']|'')*'|${QUOTED_IDENTIFIER}|(${DOLLAR_QUOTE_MARKER.source})[\s\S]*?\1`,
  "g",
);

/**
 * SQL with its comments and string literals blanked, keeping every offset.
 *
 * A `REFERENCES` inside a comment is prose, and one inside a quoted string is
 * data. Removing the text would move the rest; replacing each character with a
 * space leaves the file the same length, so a later match still lands where the
 * reader sees it. Double-quoted identifiers are left as they are.
 */
export function blankSqlNoise(sql: string): string {
  return sql.replace(SQL_NOISE, (matched) =>
    matched.startsWith('"') ? matched : matched.replace(/[^\n]/g, " "),
  );
}

/** Every table `sql` creates, and every table it points a foreign key at, by {@link TableName.key}. */
export function readTableEdges(sql: string): {
  creates: Map<string, TableName>;
  references: Map<string, TableName>;
} {
  const creates = new Map<string, TableName>();
  const references = new Map<string, TableName>();
  for (const match of blankSqlNoise(sql).matchAll(TABLE_EDGE)) {
    const { created, referenced } = match.groups ?? {};
    if (created !== undefined) {
      const table = tableName(created);
      creates.set(table.key, table);
    }
    if (referenced !== undefined) {
      const table = tableName(referenced);
      references.set(table.key, table);
    }
  }
  return { creates, references };
}

type ContractFile = {
  rel: string;
  contractId: string;
  declared: Set<string>;
  creates: Map<string, TableName>;
  references: Map<string, TableName>;
};

async function readContractFiles(
  root: string,
  dbFiles: readonly string[],
): Promise<ContractFile[]> {
  const read: ContractFile[] = [];
  for (const file of dbFiles) {
    const text = await readSafe(file);
    if (!text) {
      continue;
    }
    const contractId = declaredContractId(file, text);
    if (contractId === null || !contractId.startsWith("DB-")) {
      // A `db/` file that declares no ID, several IDs or an ID of another kind is
      // already reported by the declaration checks. It neither owns a table nor
      // receives a finding here, so a correct file is not blamed for it.
      continue;
    }
    const { creates, references } = readTableEdges(text);
    read.push({
      rel: path.relative(root, file).replace(/\\/g, "/"),
      contractId,
      declared: new Set(extractDeclaredDependencies(text, file)),
      creates,
      references,
    });
  }
  return read;
}

/** Every created table, with the contracts that create it. */
type TableClaims = {
  /** Contract IDs by {@link TableName.key}. */
  byKey: Map<string, Set<string>>;
  /** Created tables by their unqualified {@link TableName.name}. */
  byName: Map<string, TableName[]>;
};

function claimTables(files: readonly ContractFile[]): TableClaims {
  const byKey = new Map<string, Set<string>>();
  const byName = new Map<string, TableName[]>();
  for (const file of files) {
    for (const table of file.creates.values()) {
      const claimants = byKey.get(table.key);
      if (claimants === undefined) {
        byKey.set(table.key, new Set([file.contractId]));
        byName.set(table.name, [...(byName.get(table.name) ?? []), table]);
      } else {
        claimants.add(file.contractId);
      }
    }
  }
  return { byKey, byName };
}

/**
 * The one contract that creates the table `reference` names, or undefined.
 *
 * The candidates are the created tables of the same name that are spelled
 * the same way, qualifier included, or where one side has no qualifier. An
 * unqualified name resolves through a search path this check cannot see:
 * `orders` may be `public.orders` or `sales.orders`, and a contract creating
 * `public.orders` may be creating the `orders` another one references. A
 * qualified name never matches a different qualifier.
 *
 * When the candidates belong to more than one contract the reference is
 * ambiguous and is attributed to none of them, as is a table two contracts
 * both create. Which is the apply-order parent is not derivable, and naming
 * the wrong one sends the author to edit a line that is already right.
 */
function ownerOf(reference: TableName, claims: TableClaims): string | undefined {
  const candidates = new Set(
    (claims.byName.get(reference.name) ?? [])
      .filter(
        (table) =>
          table.key === reference.key ||
          reference.schema === undefined ||
          table.schema === undefined,
      )
      .flatMap((table) => [...(claims.byKey.get(table.key) ?? [])]),
  );
  return candidates.size === 1 ? [...candidates][0] : undefined;
}

/**
 * @param dbFiles - Absolute paths of the `db/` contract files already collected
 *   by `validateContracts`, so the directory is walked once.
 */
export async function validateDbContractApplyOrder(
  root: string,
  dbFiles: readonly string[],
): Promise<Issue[]> {
  if (dbFiles.length === 0) {
    return [];
  }

  const files = await readContractFiles(root, dbFiles);
  const claims = claimTables(files);

  const severity = "error";

  const issues: Issue[] = [];
  for (const file of files) {
    const undeclared = new Map<string, string[]>();
    for (const table of file.references.values()) {
      if (file.creates.has(table.key)) {
        // The contract creates it itself, so nothing has to be applied first.
        continue;
      }
      const owner = ownerOf(table, claims);
      if (owner === undefined || owner === file.contractId || file.declared.has(owner)) {
        continue;
      }
      undeclared.set(owner, [...(undeclared.get(owner) ?? []), table.key].sort());
    }
    if (undeclared.size === 0) {
      continue;
    }
    const named = [...undeclared.keys()].sort();
    const detail = named
      .map((owner) => `${owner} (${undeclared.get(owner)?.join(", ")})`)
      .join(", ");
    issues.push(
      issue(
        DB_CONTRACT_APPLY_ORDER_RULE_ID,
        `DB contract references a table another contract creates without declaring it: ${file.rel} — ${detail}.`,
        severity,
        file.rel,
        "contracts.db.applyOrder",
        [file.contractId, ...named],
        "canonical",
        `Add ${named.join(", ")} to this file's \`-- Depends on:\` line. A foreign key's target must exist ` +
          `when the statement runs, so applying the set in the stated order fails here today.`,
      ),
    );
  }

  return issues;
}
