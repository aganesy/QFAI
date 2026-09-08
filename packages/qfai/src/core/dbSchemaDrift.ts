/**
 * The contracts and the migrations, compared as schemas.
 *
 * `.qfai/contracts/db/**` is the schema a project declares. Its migrations are
 * what actually builds the database. Nothing compared them, so the two drift
 * and every signal stays green: a suite that passes against the migration
 * schema proves nothing about the contracts, and the contract gates are all
 * presence checks that cannot see a column.
 *
 * Contracts are frozen early and implementation moves, so drift is the ordinary
 * outcome of a long-lived project rather than an unusual one.
 *
 * ## Why this is not part of `validate`
 *
 * Answering the question needs a database. `validate` is static and starts no
 * processes, and that guarantee is worth more than folding one more rule into
 * it, so this is a command a project runs on its own.
 *
 * The engine is an in-process Postgres build, loaded only when the command
 * runs. Nothing is installed, no service is started, and a project that never
 * runs the command never pays for it.
 *
 * ## What it reports
 *
 * A column on one side and not the other, and a column both sides declare with
 * a different type, nullability or default. Those are the differences that
 * change what the database can store. Ordering, comments and index names are
 * not compared: they differ for reasons that are not drift.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { extractDeclaredContractIds, extractDeclaredDependencies } from "./contractsDecl.js";
import { collectDbContractFiles } from "./discovery.js";
import { collectFiles } from "./fs.js";

/** One column, as the database reports it. */
export type ColumnFacts = {
  table: string;
  column: string;
  type: string;
  nullable: boolean;
  /** The default expression, or `null` where the column has none. */
  columnDefault: string | null;
};

/** What the two schemas disagree about, in one column. */
export type ColumnDifference =
  | { kind: "only-in-migrations"; table: string; column: string; migrations: ColumnFacts }
  | { kind: "only-in-contracts"; table: string; column: string; contracts: ColumnFacts }
  | {
      kind: "differs";
      table: string;
      column: string;
      contracts: ColumnFacts;
      migrations: ColumnFacts;
      /** The attributes that disagree: `type`, `nullable`, `default`. */
      fields: string[];
    };

/** A statement that would not apply, and the file it came from. */
export type ApplyFailure = { side: "contracts" | "migrations"; file: string; message: string };

export type DbSchemaDriftResult = {
  differences: ColumnDifference[];
  failures: ApplyFailure[];
  /** Files applied per side, in the order they were applied. */
  applied: { contracts: string[]; migrations: string[] };
};

/**
 * A database this module can apply SQL to and read a schema back from.
 *
 * Narrower than the engine's own type on purpose: the module needs three
 * operations, and naming them keeps the engine replaceable and the tests able
 * to drive the comparison without a WASM build.
 */
export type SchemaDatabase = {
  exec(sql: string): Promise<unknown>;
  query(sql: string): Promise<{ rows: unknown[] }>;
  close(): Promise<void>;
};

/** Makes one empty database. Injected so the engine is the caller's choice. */
export type DatabaseFactory = () => Promise<SchemaDatabase>;

/** The columns of every table in the public schema, in a stable order. */
const COLUMN_QUERY = `
  SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, column_name
`;

/**
 * The default Postgres build, loaded only when a run reaches it.
 *
 * A static import would put a WASM engine in the module graph of every command,
 * including the ones that never touch a database. The message on failure names
 * the package rather than the import error, because the operator's next step is
 * to install it.
 */
export async function defaultDatabaseFactory(): Promise<SchemaDatabase> {
  let pglite: { PGlite: new () => SchemaDatabase };
  try {
    pglite = await import("@electric-sql/pglite");
  } catch {
    throw new Error(
      "qfai db-drift needs an in-process Postgres engine. Install it with `npm i -D @electric-sql/pglite` and run the command again.",
    );
  }
  return new pglite.PGlite();
}

/**
 * Contract files in the order their `-- Depends on:` lines put them.
 *
 * A cycle or an unresolvable id is not this module's finding to report — two
 * `validate` rules already read that line — so an entry this cannot place is
 * appended rather than dropped. Applying it may then fail, which is reported as
 * a failure against the file that carries it, not as silence.
 */
export function orderByDeclaredDependencies(
  files: ReadonlyArray<{ file: string; ids: string[]; dependsOn: string[] }>,
): string[] {
  const byId = new Map<string, string>();
  for (const entry of files) {
    for (const id of entry.ids) {
      if (!byId.has(id)) byId.set(id, entry.file);
    }
  }
  const dependencies = new Map<string, string[]>(
    files.map((entry) => [
      entry.file,
      entry.dependsOn.map((id) => byId.get(id)).filter((f): f is string => f !== undefined),
    ]),
  );

  const ordered: string[] = [];
  const placed = new Set<string>();
  const visiting = new Set<string>();
  const visit = (file: string): void => {
    if (placed.has(file) || visiting.has(file)) return;
    visiting.add(file);
    for (const next of dependencies.get(file) ?? []) {
      visit(next);
    }
    visiting.delete(file);
    placed.add(file);
    ordered.push(file);
  };
  for (const entry of [...files].sort((a, b) => a.file.localeCompare(b.file))) {
    visit(entry.file);
  }
  return ordered;
}

/** Reads each contract's id and declared apply order, then orders the set. */
export async function contractApplyOrder(dbRoot: string): Promise<string[]> {
  const files = await collectDbContractFiles(dbRoot);
  const entries = await Promise.all(
    files.map(async (file) => {
      const text = await readFile(file, "utf-8").catch(() => "");
      return {
        file,
        ids: extractDeclaredContractIds(text),
        dependsOn: extractDeclaredDependencies(text, file),
      };
    }),
  );
  return orderByDeclaredDependencies(entries);
}

/**
 * Migration files, in filename order.
 *
 * Every migration tool this could meet encodes the order in the name, and none
 * of them agrees on a manifest. Sorting the names is the one rule they share.
 */
export async function migrationApplyOrder(migrationsRoot: string): Promise<string[]> {
  const files = await collectFiles(migrationsRoot, { extensions: [".sql"] });
  return [...files].sort((a, b) => a.localeCompare(b));
}

/** Applies each file in turn, recording the ones that would not apply. */
async function applyAll(
  db: SchemaDatabase,
  files: readonly string[],
  side: "contracts" | "migrations",
  root: string,
  failures: ApplyFailure[],
): Promise<string[]> {
  const applied: string[] = [];
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    let text: string;
    try {
      text = await readFile(file, "utf-8");
    } catch (cause) {
      failures.push({ side, file: rel, message: `could not be read: ${describe(cause)}` });
      continue;
    }
    try {
      await db.exec(text);
      applied.push(rel);
    } catch (cause) {
      failures.push({ side, file: rel, message: describe(cause) });
    }
  }
  return applied;
}

/** The columns one database holds, keyed `table.column`. */
async function readColumns(db: SchemaDatabase): Promise<Map<string, ColumnFacts>> {
  const result = await db.query(COLUMN_QUERY);
  const columns = new Map<string, ColumnFacts>();
  for (const row of result.rows) {
    const facts = toColumnFacts(row);
    if (facts) columns.set(`${facts.table}.${facts.column}`, facts);
  }
  return columns;
}

/** One `information_schema.columns` row, or `null` when it is not one. */
function toColumnFacts(row: unknown): ColumnFacts | null {
  if (typeof row !== "object" || row === null) return null;
  const record: Record<string, unknown> = { ...row };
  const table = record["table_name"];
  const column = record["column_name"];
  const type = record["data_type"];
  const nullable = record["is_nullable"];
  const columnDefault = record["column_default"];
  if (typeof table !== "string" || typeof column !== "string" || typeof type !== "string") {
    return null;
  }
  return {
    table,
    column,
    type,
    nullable: nullable !== "NO",
    columnDefault: typeof columnDefault === "string" ? columnDefault : null,
  };
}

/** The attributes two readings of one column disagree about. */
export function differingFields(contracts: ColumnFacts, migrations: ColumnFacts): string[] {
  const fields: string[] = [];
  if (contracts.type !== migrations.type) fields.push("type");
  if (contracts.nullable !== migrations.nullable) fields.push("nullable");
  if (contracts.columnDefault !== migrations.columnDefault) fields.push("default");
  return fields;
}

/** Compares two readings of the same schema, in a stable order. */
export function compareColumns(
  contracts: ReadonlyMap<string, ColumnFacts>,
  migrations: ReadonlyMap<string, ColumnFacts>,
): ColumnDifference[] {
  const differences: ColumnDifference[] = [];
  for (const key of [...new Set([...contracts.keys(), ...migrations.keys()])].sort()) {
    const inContracts = contracts.get(key);
    const inMigrations = migrations.get(key);
    if (inContracts && !inMigrations) {
      differences.push({
        kind: "only-in-contracts",
        table: inContracts.table,
        column: inContracts.column,
        contracts: inContracts,
      });
      continue;
    }
    if (inMigrations && !inContracts) {
      differences.push({
        kind: "only-in-migrations",
        table: inMigrations.table,
        column: inMigrations.column,
        migrations: inMigrations,
      });
      continue;
    }
    if (!inContracts || !inMigrations) continue;
    const fields = differingFields(inContracts, inMigrations);
    if (fields.length > 0) {
      differences.push({
        kind: "differs",
        table: inContracts.table,
        column: inContracts.column,
        contracts: inContracts,
        migrations: inMigrations,
        fields,
      });
    }
  }
  return differences;
}

/**
 * Applies both sets to their own database and reports what they disagree about.
 *
 * Each side gets a database of its own, so neither can leave anything behind
 * for the other, and both are closed whatever the comparison does.
 */
export async function compareSchemas(options: {
  root: string;
  contractFiles: readonly string[];
  migrationFiles: readonly string[];
  createDatabase: DatabaseFactory;
}): Promise<DbSchemaDriftResult> {
  const failures: ApplyFailure[] = [];
  const contractDb = await options.createDatabase();
  try {
    const migrationDb = await options.createDatabase();
    try {
      const appliedContracts = await applyAll(
        contractDb,
        options.contractFiles,
        "contracts",
        options.root,
        failures,
      );
      const appliedMigrations = await applyAll(
        migrationDb,
        options.migrationFiles,
        "migrations",
        options.root,
        failures,
      );
      const differences = compareColumns(
        await readColumns(contractDb),
        await readColumns(migrationDb),
      );
      return {
        differences,
        failures,
        applied: { contracts: appliedContracts, migrations: appliedMigrations },
      };
    } finally {
      await migrationDb.close().catch(() => undefined);
    }
  } finally {
    await contractDb.close().catch(() => undefined);
  }
}

/** An error's message, for a value that may not be an `Error`. */
function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
