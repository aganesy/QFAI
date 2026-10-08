import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { parseStructuredContract } from "../contracts.js";
import { buildContractIndex, type ContractIndex } from "../contractIndex.js";
import {
  extractDeclaredContractIds,
  hasDependencyDeclaration,
  stripContractDeclarationLines,
} from "../contractsDecl.js";
import {
  collectApiContractFiles,
  collectDbContractFiles,
  collectUiContractFiles,
} from "../discovery.js";
import {
  collectCreatedObjects,
  findRedefinitions,
  parseSqlContract,
  type SqlParseError,
} from "../sqlContract.js";
import type { Issue } from "../types.js";
import { validateContractConsistency } from "./contractConsistency.js";
import { validateDbContractApplyOrder } from "./dbContractApplyOrder.js";
import { validateUiMarkerPresence } from "./uiMarkerPresence.js";
import { validateUiPrototypeMode } from "./uiPrototypeMode.js";
import { validateUiScreenCopy } from "./uiScreenCopy.js";
import { validateUiScreenEntries } from "./uiScreenEntries.js";
import { issue } from "./utils.js";

const SQL_DANGEROUS_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bDROP\s+TABLE\b/i, label: "DROP TABLE" },
  { pattern: /\bDROP\s+DATABASE\b/i, label: "DROP DATABASE" },
  { pattern: /\bTRUNCATE\b/i, label: "TRUNCATE" },
  {
    pattern: /\bALTER\s+TABLE\b[\s\S]*\bDROP\b/i,
    label: "ALTER TABLE ... DROP",
  },
];

type ContractKind = "UI" | "API" | "DB";

export async function validateContracts(root: string, config: QfaiConfig): Promise<Issue[]> {
  const issues: Issue[] = [];
  const contractsRoot = resolvePath(root, config, "contractsDir");
  const uiRoot = path.join(contractsRoot, "ui");
  const apiRoot = path.join(contractsRoot, "api");
  const dbRoot = path.join(contractsRoot, "db");

  const [uiFiles, apiFiles, dbFiles] = await Promise.all([
    collectUiContractFiles(uiRoot),
    collectApiContractFiles(apiRoot),
    collectDbContractFiles(dbRoot),
  ]);

  if (uiFiles.length === 0) {
    issues.push(
      issue(
        "QFAI-CONTRACT-000",
        "No UI contract files were found.",
        "info",
        uiRoot,
        "contracts.ui.files",
      ),
    );
  }
  if (apiFiles.length === 0) {
    issues.push(
      issue(
        "QFAI-CONTRACT-000",
        "No API contract files were found.",
        "info",
        apiRoot,
        "contracts.api.files",
      ),
    );
  }
  if (dbFiles.length === 0) {
    issues.push(
      issue(
        "QFAI-CONTRACT-000",
        "No DB contract files were found.",
        "info",
        dbRoot,
        "contracts.db.files",
      ),
    );
  }

  // Resolved once for the whole run rather than per contract file: the promotion
  // window is a property of the tool, not of the file being read.
  for (const file of uiFiles) {
    issues.push(...(await validateContractFile(file, "UI")));
  }
  for (const file of apiFiles) {
    issues.push(...(await validateContractFile(file, "API")));
  }
  for (const file of dbFiles) {
    issues.push(...(await validateContractFile(file, "DB")));
  }

  const contractIndex = await buildContractIndex(root, config);
  issues.push(...validateDuplicateContractIds(contractIndex.idToFiles));
  issues.push(...validateDependencyRefs(contractIndex));

  issues.push(...(await validateContractConsistency(apiFiles, dbFiles)));
  issues.push(...(await validateDbContractApplyOrder(root, dbFiles)));
  // The reverse of the marker traceability: declared and rendered by nothing.
  // The forward direction cannot see it — an element nobody built is an element
  // no test names, so the absence appears on neither side of that check.
  issues.push(...(await validateUiMarkerPresence(root, config)));
  // The other half of what a UI contract declares outside `screens[]`: the
  // marker rule checks the selectors under `prototype`, this one the word
  // beside them.
  issues.push(...(await validateUiPrototypeMode(root, config)));
  // The entries every consumer reads past: a screen with no `id` or `route`, and
  // the second entry for an `id`.
  issues.push(...(await validateUiScreenEntries(root, config)));
  // The words each of those screens says it shows: the supplements it declares,
  // and the groups it is read in.
  issues.push(...(await validateUiScreenCopy(root, config)));

  return issues;
}

async function validateContractFile(file: string, kind: ContractKind): Promise<Issue[]> {
  const issues: Issue[] = [];
  const text = await readFile(file, "utf-8");
  const declaredIds = extractDeclaredContractIds(text);
  issues.push(...validateDeclaredContractIds(declaredIds, file, kind));
  issues.push(...validateDependencyDeclaration(text, declaredIds, file));

  if (kind === "DB") {
    issues.push(...lintSql(text, file));
    // A `.sql` contract used to return here, which is what made it the only
    // contract kind qfai never parsed — the `QFAI-CONTRACT-021` block below is
    // unreachable from this branch. DB gets its own structural lane instead of
    // no lane at all: the executable contract kind is now held to the same
    // "does it parse" bar as the declarative ones.
    issues.push(...validateSqlStructure(text, file));
    return issues;
  }

  const parsed = parseContract(file, kind, text);
  if (!parsed.ok) {
    issues.push(parsed.failure);
  } else if (kind === "API" && !hasOpenApi(parsed.contract)) {
    issues.push(
      issue(
        "QFAI-CONTRACT-020",
        "No openapi definition was found in the API contract file.",
        "error",
        file,
        "contracts.api.openapi",
      ),
    );
  }

  return issues;
}

/** A structured contract's content, or the finding that says it does not parse. */
type ContractParse =
  { ok: true; contract: Record<string, unknown> } | { ok: false; failure: Issue };

function parseContract(file: string, kind: ContractKind, text: string): ContractParse {
  try {
    return {
      ok: true,
      contract: parseStructuredContract(file, stripContractDeclarationLines(text)),
    };
  } catch (error) {
    return {
      ok: false,
      failure: issue(
        "QFAI-CONTRACT-021",
        `Failed to parse the ${kind} contract file: ${formatError(error)}`,
        "error",
        file,
        "contracts.parse",
      ),
    };
  }
}

/**
 * Every UI contract that does not parse, and nothing else of the contract checks.
 *
 * The prototyping profile reads its screens from these files and runs none of
 * the contract checks, so without this a malformed contract reached
 * certification with its screens unchecked and no finding at all. `full` runs
 * {@link validateContracts}, which reports the same finding, and does not call
 * this.
 */
export async function validateUiContractParse(root: string, config: QfaiConfig): Promise<Issue[]> {
  const uiRoot = path.join(resolvePath(root, config, "contractsDir"), "ui");
  const issues: Issue[] = [];
  for (const file of await collectUiContractFiles(uiRoot)) {
    const parsed = parseContract(file, "UI", await readFile(file, "utf-8"));
    if (!parsed.ok) issues.push(parsed.failure);
  }
  return issues;
}

/** Wording for each structural failure of a SQL contract. */
const SQL_PARSE_ERROR_MESSAGE: Record<SqlParseError["kind"], string> = {
  "unterminated-string": "A string literal (or quoted identifier) is not closed",
  "unterminated-comment": "The block comment /* is not closed",
  "unterminated-dollar-quote": "A body opened with a dollar quote is not closed",
  "unbalanced-parens": "There is an unclosed parenthesis",
};

/**
 * The structural lane for `.sql` contracts.
 *
 * Scope is **apply-ability, not semantic correctness**: whether the file could
 * be handed to a database at all, and whether it contradicts itself about what
 * it defines. It does not type-check a query or resolve a column, and the
 * shipped catalog note says so, so the gate's promise stays honest.
 */
function validateSqlStructure(text: string, file: string): Issue[] {
  const issues: Issue[] = [];
  const { statements, errors } = parseSqlContract(text);

  for (const error of errors) {
    issues.push(
      issue(
        // Same rule id the UI/API lane uses for "this contract does not parse",
        // because it is the same claim about the same class of artifact.
        "QFAI-CONTRACT-021",
        `Failed to parse the DB contract file (line ${error.line}): ${SQL_PARSE_ERROR_MESSAGE[error.kind]}`,
        "error",
        file,
        "contracts.parse",
        undefined,
        "change",
        "Fix the unterminated string, comment or dollar quote, or the unclosed parenthesis.",
      ),
    );
  }

  for (const redefinition of findRedefinitions(collectCreatedObjects(statements))) {
    issues.push(
      issue(
        "QFAI-DB-002",
        `${redefinition.kind} "${redefinition.name}" is defined ${redefinition.lines.length} times in the same file (lines ${redefinition.lines.join(", ")}). Only the last definition takes effect, so the earlier ones disagree with the contract as applied`,
        "error",
        file,
        "contracts.db.redefinition",
        [redefinition.name],
        "change",
        "Merge the duplicate CREATE statements into one, or rename them if they are intentionally different objects.",
      ),
    );
  }

  return issues;
}

export function lintSql(text: string, file: string): Issue[] {
  const issues: Issue[] = [];
  for (const { pattern, label } of SQL_DANGEROUS_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(
        issue(
          "QFAI-DB-001",
          `Dangerous SQL operation found: ${label}`,
          "warning",
          file,
          "contracts.db.sql",
        ),
      );
    }
  }
  return issues;
}

function validateDeclaredContractIds(ids: string[], file: string, kind: ContractKind): Issue[] {
  if (ids.length === 0) {
    return [
      issue(
        "QFAI-CONTRACT-010",
        "The contract file has no QFAI-CONTRACT-ID.",
        "error",
        file,
        "contracts.declaration",
      ),
    ];
  }

  if (ids.length > 1) {
    return [
      issue(
        "QFAI-CONTRACT-011",
        `The contract file declares more than one QFAI-CONTRACT-ID: ${ids.join(", ")}`,
        "error",
        file,
        "contracts.declaration",
        ids,
      ),
    ];
  }

  const id = ids[0] ?? "";
  const expectedPrefix = `${kind}-`;
  if (!id.startsWith(expectedPrefix)) {
    return [
      issue(
        "QFAI-CONTRACT-012",
        `The QFAI-CONTRACT-ID of the contract file does not start with ${expectedPrefix}: ${id}`,
        "error",
        file,
        "contracts.declarationPrefix",
        [id],
      ),
    ];
  }

  return [];
}

/**
 * A contract must state its apply order, even when the answer is "nothing".
 *
 * `QFAI-CONTRACT-014` only inspects dependencies that were already declared, so
 * a contract that declares none contributes no entry to `idToDependencies` and
 * the referential loop never reaches it — the very failure the rule was written
 * to prevent (an apply graph nobody stated) was the one case with no finding.
 * `-` is the explicit way to say "none", which is what the shipped rule's
 * `(or `-`)` already implied.
 *
 * Existing contract sets predate the requirement, so every contract written
 * before the rule states none and the finding arrives on the whole set at once.
 */
function validateDependencyDeclaration(text: string, ids: string[], file: string): Issue[] {
  // `QFAI-CONTRACT-010` / `-011` already own a file with no id or several; a
  // second finding on the same file would only dilute theirs.
  if (ids.length !== 1) {
    return [];
  }
  if (hasDependencyDeclaration(text, file)) {
    return [];
  }
  const dependencyDeclarationSeverity = "error";
  const id = ids[0] ?? "";
  return [
    issue(
      "QFAI-CONTRACT-015",
      `Contract file declares no apply-order dependency: ${id}.` +
        " Until it does, an index row reading `-` for this contract agrees with it by default:" +
        " QFAI-CONTRACT-033 compares the two, so such a row is unmeasured rather than agreed," +
        " and reports as soon as this declaration names anything.",
      dependencyDeclarationSeverity,
      file,
      "contracts.dependencyDeclaration",
      [id],
      "change",
      "Add `-- Depends on: DB-0002` to a `.sql` file, or `x-qfai-depends-on: [API-0002]` " +
        "to a `.yaml` / `.json` one. Write `-` when no contract has to be applied first.",
    ),
  ];
}

/**
 * Every declared apply-order dependency must name a contract that exists.
 *
 * `QFAI-CONTRACT-011` forces any schema larger than one table into N
 * cross-referencing files, and nothing checked that the references between them
 * resolve. Getting the set wrong is silent: the wrong subset still applies
 * cleanly and the tests still pass, against a schema missing the tables under
 * test. This is the cheap half of that — a dangling id is always wrong.
 */
function validateDependencyRefs(index: ContractIndex): Issue[] {
  const issues: Issue[] = [];
  for (const [id, dependencies] of index.idToDependencies) {
    const missing = Array.from(dependencies)
      .filter((dependency) => !index.ids.has(dependency))
      .sort();
    if (missing.length === 0) continue;
    const file = Array.from(index.idToFiles.get(id) ?? [])[0] ?? id;
    issues.push(
      issue(
        "QFAI-CONTRACT-014",
        `${id} declares a dependency on contracts that do not exist: ${missing.join(", ")}`,
        "error",
        file,
        "contracts.dependencyRefs",
        missing,
        "change",
        "Correct the contract IDs listed in `Depends on:` / `x-qfai-depends-on` to existing ones, or add the missing contracts.",
      ),
    );
  }
  return issues;
}

function validateDuplicateContractIds(idToFiles: Map<string, Set<string>>): Issue[] {
  const issues: Issue[] = [];
  for (const [id, files] of idToFiles.entries()) {
    if (files.size <= 1) {
      continue;
    }
    const sorted = Array.from(files).sort((a, b) => a.localeCompare(b));
    issues.push(
      issue(
        "QFAI-CONTRACT-013",
        `Duplicate contract ID: ${id} (${sorted.join(", ")})`,
        "error",
        sorted[0],
        "contracts.idDuplicate",
        [id, ...sorted],
      ),
    );
  }
  return issues;
}

function hasOpenApi(doc: Record<string, unknown>): boolean {
  return typeof doc.openapi === "string" && doc.openapi.length > 0;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
