/**
 * The contracts and the migrations, applied to a real database and compared.
 *
 * Both artifacts are applied to a Postgres of their own and the columns are read
 * back, so what the comparison sees is the schema each one actually builds. A
 * tree can differ by dozens of columns while every contract gate stays green,
 * because every one of them is a presence check on a file.
 *
 * Here rather than beside the ordering and diff cases: the engine starts a
 * database per side, which is seconds, and the decisions those cases hold need
 * no database at all.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { compareSchemas, defaultDatabaseFactory } from "../../src/core/dbSchemaDrift.js";

const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-db-drift-engine-"));
  tempDirs.push(root);
  return root;
}

async function write(root: string, relative: string, body: string): Promise<string> {
  const abs = path.join(root, relative);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
  return abs;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("reading two schemas and comparing them", () => {
  it("reports a column the migrations added and the contracts never did", async () => {
    const root = await newRoot();
    const contract = await write(
      root,
      ".qfai/contracts/db/CON-DB-0001.sql",
      "-- QFAI-CONTRACT-ID: CON-DB-0001\nCREATE TABLE orders (id TEXT PRIMARY KEY);\n",
    );
    const migration = await write(
      root,
      "migrations/0001_orders.sql",
      "CREATE TABLE orders (id TEXT PRIMARY KEY, cancelled_at TIMESTAMP);\n",
    );

    const result = await compareSchemas({
      root,
      contractFiles: [contract],
      migrationFiles: [migration],
      createDatabase: defaultDatabaseFactory,
    });

    expect(result.failures).toEqual([]);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]).toMatchObject({
      kind: "only-in-migrations",
      table: "orders",
      column: "cancelled_at",
    });
  });

  it("reports a column the contracts declare and no migration builds", async () => {
    const root = await newRoot();
    const contract = await write(
      root,
      ".qfai/contracts/db/CON-DB-0001.sql",
      "-- QFAI-CONTRACT-ID: CON-DB-0001\nCREATE TABLE orders (id TEXT PRIMARY KEY, note TEXT);\n",
    );
    const migration = await write(
      root,
      "migrations/0001_orders.sql",
      "CREATE TABLE orders (id TEXT PRIMARY KEY);\n",
    );

    const result = await compareSchemas({
      root,
      contractFiles: [contract],
      migrationFiles: [migration],
      createDatabase: defaultDatabaseFactory,
    });

    expect(result.differences).toMatchObject([
      { kind: "only-in-contracts", table: "orders", column: "note" },
    ]);
  });

  it("reports a column both sides declare with a different type", async () => {
    const root = await newRoot();
    const contract = await write(
      root,
      ".qfai/contracts/db/CON-DB-0001.sql",
      "-- QFAI-CONTRACT-ID: CON-DB-0001\nCREATE TABLE orders (id TEXT PRIMARY KEY, total NUMERIC);\n",
    );
    const migration = await write(
      root,
      "migrations/0001_orders.sql",
      "CREATE TABLE orders (id TEXT PRIMARY KEY, total INTEGER);\n",
    );

    const result = await compareSchemas({
      root,
      contractFiles: [contract],
      migrationFiles: [migration],
      createDatabase: defaultDatabaseFactory,
    });

    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]).toMatchObject({ kind: "differs", fields: ["type"] });
  });

  it("says nothing when the two build the same schema", async () => {
    const root = await newRoot();
    const ddl = "CREATE TABLE orders (id TEXT PRIMARY KEY, total NUMERIC NOT NULL DEFAULT 0);\n";
    const contract = await write(
      root,
      ".qfai/contracts/db/CON-DB-0001.sql",
      `-- QFAI-CONTRACT-ID: CON-DB-0001\n${ddl}`,
    );
    const migration = await write(root, "migrations/0001_orders.sql", ddl);

    const result = await compareSchemas({
      root,
      contractFiles: [contract],
      migrationFiles: [migration],
      createDatabase: defaultDatabaseFactory,
    });

    expect(result).toMatchObject({ differences: [], failures: [] });
  });

  it("records a file that would not apply against the file that carries it", async () => {
    const root = await newRoot();
    const contract = await write(
      root,
      ".qfai/contracts/db/CON-DB-0001.sql",
      "-- QFAI-CONTRACT-ID: CON-DB-0001\nCREATE TABLE orders (id TEXT PRIMARY KEY);\n",
    );
    const migration = await write(root, "migrations/0001_orders.sql", "CREATE TABL orders (;\n");

    const result = await compareSchemas({
      root,
      contractFiles: [contract],
      migrationFiles: [migration],
      createDatabase: defaultDatabaseFactory,
    });

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.side).toBe("migrations");
    expect(result.failures[0]?.file).toBe("migrations/0001_orders.sql");
    expect(result.applied.migrations).toEqual([]);
  });

  it("gives each side its own database, so neither can build on the other", async () => {
    const root = await newRoot();
    // The migration references a table only the contracts create. It fails —
    // which it could not do if both sides shared one database.
    const contract = await write(
      root,
      ".qfai/contracts/db/CON-DB-0001.sql",
      "-- QFAI-CONTRACT-ID: CON-DB-0001\nCREATE TABLE customers (id TEXT PRIMARY KEY);\n",
    );
    const migration = await write(
      root,
      "migrations/0001_orders.sql",
      "CREATE TABLE orders (customer_id TEXT REFERENCES customers (id));\n",
    );

    const result = await compareSchemas({
      root,
      contractFiles: [contract],
      migrationFiles: [migration],
      createDatabase: defaultDatabaseFactory,
    });

    expect(result.failures.map((f) => f.side)).toEqual(["migrations"]);
  });
});
