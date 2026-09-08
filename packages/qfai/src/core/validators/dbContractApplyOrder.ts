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

import { extractDeclaredDependencies } from "../contractsDecl.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../sunset.js";
import { resolveToolVersion } from "../version.js";
import type { Issue } from "../types.js";
import { issue, readSafe } from "./utils.js";

/** Waivable as `QFAI-CONTRACT-036`; `CONTRACT-036` also resolves (`waivers.ts#resolveRuleKeys`). */
export const DB_CONTRACT_APPLY_ORDER_RULE_ID = "QFAI-CONTRACT-036";

const CONTRACT_ID = /\bCON-DB-[A-Za-z0-9_-]+/;

/**
 * `CREATE TABLE [IF NOT EXISTS] <name>` and `REFERENCES <name>`.
 *
 * The name may be quoted, schema-qualified, or both; {@link tableKey} reduces
 * the spellings to one. `REFERENCES` is matched without requiring the column
 * list, because a single-column key may omit it and inherit the primary key.
 */
const CREATE_TABLE = /\bCREATE\s+(?:\w+\s+)*?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`[\]]+)/gi;
const REFERENCES = /\bREFERENCES\s+([\w."`[\]]+)/gi;

/**
 * A table name reduced to what two spellings of it have in common.
 *
 * The schema qualifier is dropped rather than compared: a contract set applies
 * into one database, and `public.orders` and `orders` are the same table there.
 * Keeping it would split the map and report nothing for the pair that matters.
 */
function tableKey(raw: string): string {
  const bare = raw.replace(/["`[\]]/g, "");
  const last = bare.split(".").at(-1) ?? bare;
  return last.toLowerCase();
}

/**
 * SQL with its comments and string literals blanked, keeping every offset.
 *
 * A `REFERENCES` inside a comment is prose, and one inside a quoted string is
 * data. Removing the text would move the rest; replacing each character with a
 * space leaves the file the same length, so a later match still lands where the
 * reader sees it.
 */
export function blankSqlNoise(sql: string): string {
  return sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^']|'')*'|\$\$[\s\S]*?\$\$/g, (matched) =>
    matched.replace(/[^\n]/g, " "),
  );
}

/** Every table `sql` creates, and every table it points a foreign key at. */
export function readTableEdges(sql: string): { creates: Set<string>; references: Set<string> } {
  const scannable = blankSqlNoise(sql);
  const creates = new Set<string>();
  const references = new Set<string>();
  for (const match of scannable.matchAll(CREATE_TABLE)) {
    creates.add(tableKey(match[1] ?? ""));
  }
  for (const match of scannable.matchAll(REFERENCES)) {
    references.add(tableKey(match[1] ?? ""));
  }
  return { creates, references };
}

type ContractFile = {
  rel: string;
  contractId: string;
  declared: Set<string>;
  creates: Set<string>;
  references: Set<string>;
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
    const contractId = CONTRACT_ID.exec(text)?.[0];
    if (contractId === undefined) {
      // A `db/` file with no `CON-DB-*` id is already reported by
      // `QFAI-CONTRACT-010`; do not pile a second finding onto it.
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

/**
 * The contract that creates each table.
 *
 * A table two contracts both create is left out rather than attributed to one
 * of them. Which is the apply-order parent is not derivable, and naming the
 * wrong one sends the author to edit a line that is already right.
 */
function ownersOfTables(files: readonly ContractFile[]): Map<string, string> {
  const claims = new Map<string, Set<string>>();
  for (const file of files) {
    for (const table of file.creates) {
      const owners = claims.get(table) ?? new Set<string>();
      owners.add(file.contractId);
      claims.set(table, owners);
    }
  }
  const owners = new Map<string, string>();
  for (const [table, claimants] of claims) {
    const only = claimants.size === 1 ? [...claimants][0] : undefined;
    if (only !== undefined) {
      owners.set(table, only);
    }
  }
  return owners;
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
  const owners = ownersOfTables(files);

  // A window, and it is doing real work: the condition is invisible today, so
  // a project carrying it has never been told. Failing the gate on the release
  // that first makes it visible would fail it on a backlog nobody was warned
  // about. `resolveToolVersion` returns `"unknown"` rather than throwing when
  // it cannot read a version, and the comparator reads that as inside the
  // window, so an unreadable version never escalates this into a failure.
  const promotion = RULE_PROMOTIONS.dbContractApplyOrder.promoteAt;
  const severity = newRuleSeverity(await resolveToolVersion(), promotion);
  const windowNote =
    severity === "warning" ? ` Reported as a warning until ${promotion}, then an error.` : "";

  const issues: Issue[] = [];
  for (const file of files) {
    const undeclared = new Map<string, string[]>();
    for (const table of file.references) {
      if (file.creates.has(table)) {
        // The contract creates it itself, so nothing has to be applied first.
        continue;
      }
      const owner = owners.get(table);
      if (owner === undefined || owner === file.contractId || file.declared.has(owner)) {
        continue;
      }
      undeclared.set(owner, [...(undeclared.get(owner) ?? []), table].sort());
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
        `DB contract references a table another contract creates without declaring it: ${file.rel} — ${detail}.${windowNote}`,
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
