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
 * Answering the question needs a database. `validate` never starts a database
 * engine: it reads files, and the only processes it runs are short-lived
 * checkers such as the document schema checker. That guarantee is worth more
 * than folding one more rule into it, so this is a command a project runs on
 * its own.
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

/**
 * The columns of every table in the public schema, in a stable order.
 *
 * The type is the one `format_type` resolves from the column's type and its
 * modifier, not `information_schema.columns.data_type`: that column drops the
 * varchar length, the numeric precision and scale and the array element type,
 * and reads `USER-DEFINED` for every user-defined type, so two different
 * declarations read the same and their drift went unreported.
 */
const COLUMN_QUERY = `
  SELECT c.table_name, c.column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    c.is_nullable, c.column_default
  FROM information_schema.columns c
  JOIN pg_catalog.pg_namespace n ON n.nspname = c.table_schema
  JOIN pg_catalog.pg_class r ON r.relnamespace = n.oid AND r.relname = c.table_name
  JOIN pg_catalog.pg_attribute a ON a.attrelid = r.oid AND a.attname = c.column_name
  WHERE c.table_schema = 'public'
  ORDER BY c.table_name, c.column_name
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

/**
 * The search path both databases are read under.
 *
 * `format_type` drops the schema of a type the session's search path can see,
 * and the applied SQL may leave any search path behind — a dump ends with
 * `SET search_path = pg_catalog`. Fixing it before the read makes the type text
 * a function of the schema alone: every type outside `pg_catalog` reads
 * schema-qualified on both sides, `public.order_state` included.
 */
const READ_SEARCH_PATH = "SET search_path TO pg_catalog";

/**
 * The columns of a schema, keyed by table and then by column.
 *
 * Two levels rather than one joined key: a quoted Postgres identifier may hold
 * a period, so `"a.b".c` and `a."b.c"` would join to the same text and one
 * column would drop out of the comparison.
 */
export type ColumnsByTable = ReadonlyMap<string, ReadonlyMap<string, ColumnFacts>>;

/** The columns one database holds. */
async function readColumns(db: SchemaDatabase): Promise<ColumnsByTable> {
  await db.exec(READ_SEARCH_PATH);
  const result = await db.query(COLUMN_QUERY);
  const tables = new Map<string, Map<string, ColumnFacts>>();
  for (const row of result.rows) {
    const facts = toColumnFacts(row);
    if (!facts) continue;
    const columns = tables.get(facts.table) ?? new Map<string, ColumnFacts>();
    columns.set(facts.column, facts);
    tables.set(facts.table, columns);
  }
  return tables;
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
  contracts: ColumnsByTable,
  migrations: ColumnsByTable,
): ColumnDifference[] {
  const differences: ColumnDifference[] = [];
  for (const table of sortedUnion(contracts, migrations)) {
    const contractColumns = contracts.get(table) ?? new Map<string, ColumnFacts>();
    const migrationColumns = migrations.get(table) ?? new Map<string, ColumnFacts>();
    for (const name of sortedUnion(contractColumns, migrationColumns)) {
      const difference = compareColumn(contractColumns.get(name), migrationColumns.get(name));
      if (difference) differences.push(difference);
    }
  }
  return differences;
}

/** The keys of two maps, once each, in a stable order. */
function sortedUnion(a: ReadonlyMap<string, unknown>, b: ReadonlyMap<string, unknown>): string[] {
  return [...new Set([...a.keys(), ...b.keys()])].sort();
}

/** What two readings of one column disagree about, or `null` when nothing. */
function compareColumn(
  inContracts: ColumnFacts | undefined,
  inMigrations: ColumnFacts | undefined,
): ColumnDifference | null {
  if (inContracts && !inMigrations) {
    return {
      kind: "only-in-contracts",
      table: inContracts.table,
      column: inContracts.column,
      contracts: inContracts,
    };
  }
  if (inMigrations && !inContracts) {
    return {
      kind: "only-in-migrations",
      table: inMigrations.table,
      column: inMigrations.column,
      migrations: inMigrations,
    };
  }
  if (!inContracts || !inMigrations) return null;
  const fields = differingFields(inContracts, inMigrations);
  if (fields.length === 0) return null;
  return {
    kind: "differs",
    table: inContracts.table,
    column: inContracts.column,
    contracts: inContracts,
    migrations: inMigrations,
    fields,
  };
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
