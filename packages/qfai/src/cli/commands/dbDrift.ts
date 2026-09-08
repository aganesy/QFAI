/**
 * `qfai db-drift` — the contracts and the migrations, compared as schemas.
 *
 * A project states its schema in `.qfai/contracts/db/**` and builds its
 * database from migrations. Every gate that reads the contracts is a presence
 * check, so the two can disagree about 58 columns and report nothing.
 *
 * The comparison needs a database, which is why it is a command rather than a
 * `validate` rule: `validate` starts no processes, and that is worth keeping.
 *
 * A project that has not said where its migrations are is out of scope, not in
 * violation — the command says so and exits 0.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig, resolvePath } from "../../core/config.js";
import type { ColumnDifference, DatabaseFactory } from "../../core/dbSchemaDrift.js";
import {
  compareSchemas,
  contractApplyOrder,
  defaultDatabaseFactory,
  migrationApplyOrder,
} from "../../core/dbSchemaDrift.js";
import { error, info } from "../lib/logger.js";

export type DbDriftOptions = {
  root: string;
  format?: "text" | "json";
  outPath?: string;
  /** `never` reports the differences and still exits 0. */
  failOn?: "error" | "never";
  /** Injected by tests so the comparison can run without a WASM build. */
  createDatabase?: DatabaseFactory;
};

/** Exit codes this command uses, named where they are decided. */
const EXIT_OK = 0;
const EXIT_DRIFT = 1;
const EXIT_CANNOT_RUN = 2;

export async function runDbDrift(options: DbDriftOptions): Promise<number> {
  const root = path.resolve(options.root);
  const { config } = await loadConfig(root);
  const migrationsDir = config.paths.migrationsDir;
  const asJson = options.format === "json";

  if (migrationsDir === undefined || migrationsDir.trim() === "") {
    const message =
      "No migrations directory is configured, so there is nothing to compare the contracts against. Set `paths.migrationsDir` in qfai.config.yaml to the directory holding the project's migrations.";
    if (asJson) {
      info(JSON.stringify({ status: "out-of-scope", reason: message }, null, 2));
    } else {
      info(`qfai db-drift: ${message}`);
    }
    return EXIT_OK;
  }

  const contractFiles = await contractApplyOrder(
    path.join(resolvePath(root, config, "contractsDir"), "db"),
  );
  const migrationFiles = await migrationApplyOrder(path.resolve(root, migrationsDir));

  if (contractFiles.length === 0 || migrationFiles.length === 0) {
    const missing = contractFiles.length === 0 ? "DB contracts" : "migrations";
    const message = `Found no ${missing} to apply, so a comparison would report every column of the other side as a difference.`;
    if (asJson) {
      info(JSON.stringify({ status: "out-of-scope", reason: message }, null, 2));
    } else {
      info(`qfai db-drift: ${message}`);
    }
    return EXIT_OK;
  }

  let result;
  try {
    result = await compareSchemas({
      root,
      contractFiles,
      migrationFiles,
      createDatabase: options.createDatabase ?? defaultDatabaseFactory,
    });
  } catch (cause) {
    error(`qfai db-drift: ${cause instanceof Error ? cause.message : String(cause)}`);
    return EXIT_CANNOT_RUN;
  }

  const rendered = asJson
    ? `${JSON.stringify(result, null, 2)}\n`
    : `${renderText(result.differences, result.failures)}\n`;
  if (options.outPath !== undefined) {
    const out = path.resolve(root, options.outPath);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, rendered, "utf-8");
    info(`qfai db-drift: wrote ${path.relative(root, out).split(path.sep).join("/")}`);
  } else {
    info(rendered.trimEnd());
  }

  if (options.failOn === "never") {
    return EXIT_OK;
  }
  // A file that would not apply is not a clean run either: the schema it was
  // meant to contribute is missing from one side, so every column it declares
  // reads as a difference against a comparison that never had it.
  if (result.failures.length > 0) {
    return EXIT_CANNOT_RUN;
  }
  return result.differences.length > 0 ? EXIT_DRIFT : EXIT_OK;
}

/** One line per difference, grouped by table, with a count at the top. */
export function renderText(
  differences: readonly ColumnDifference[],
  failures: ReadonlyArray<{ side: string; file: string; message: string }>,
): string {
  const lines: string[] = [];
  if (failures.length > 0) {
    lines.push(`${failures.length} file(s) would not apply:`);
    for (const failure of failures) {
      lines.push(`  ${failure.side}: ${failure.file} — ${failure.message}`);
    }
    lines.push("");
  }

  if (differences.length === 0) {
    lines.push("The contracts and the migrations declare the same columns.");
    return lines.join("\n");
  }

  const counts = {
    "only-in-migrations": 0,
    "only-in-contracts": 0,
    differs: 0,
  };
  for (const difference of differences) {
    counts[difference.kind] += 1;
  }
  lines.push(
    `${differences.length} column difference(s): ` +
      `${counts["only-in-migrations"]} only in the migrations, ` +
      `${counts["only-in-contracts"]} only in the contracts, ` +
      `${counts.differs} declared differently.`,
  );

  let table = "";
  for (const difference of differences) {
    if (difference.table !== table) {
      table = difference.table;
      lines.push(`\n${table}`);
    }
    lines.push(`  ${describeDifference(difference)}`);
  }
  return lines.join("\n");
}

/** One difference, said in the order a reader asks it: what, where, how. */
function describeDifference(difference: ColumnDifference): string {
  switch (difference.kind) {
    case "only-in-migrations":
      return `${difference.column}: in the migrations only (${difference.migrations.type})`;
    case "only-in-contracts":
      return `${difference.column}: in the contracts only (${difference.contracts.type})`;
    case "differs":
      return (
        `${difference.column}: ${difference.fields.join(", ")} — ` +
        `contracts ${facts(difference.contracts)}, migrations ${facts(difference.migrations)}`
      );
  }
}

/** A column's three compared attributes, in one phrase. */
function facts(column: { type: string; nullable: boolean; columnDefault: string | null }): string {
  const parts = [column.type, column.nullable ? "null" : "not null"];
  if (column.columnDefault !== null) parts.push(`default ${column.columnDefault}`);
  return parts.join(" ");
}
