/**
 * The two decisions the comparison rests on: what order the files apply in, and
 * what counts as a difference.
 *
 * Held here without a database, so a wrong answer in either is a fast failure
 * naming the decision. The comparison against a real Postgres schema is in the
 * integration suite, where the engine's start-up cost belongs.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { ColumnFacts, SchemaDatabase } from "../../src/core/dbSchemaDrift.js";
import {
  compareColumns,
  compareSchemas,
  contractApplyOrder,
  differingFields,
  migrationApplyOrder,
  orderByDeclaredDependencies,
} from "../../src/core/dbSchemaDrift.js";

const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-db-drift-"));
  tempDirs.push(root);
  return root;
}

async function write(root: string, relative: string, body: string): Promise<string> {
  const abs = path.join(root, relative);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
  return abs;
}

/** One column reading, for the pure comparison cases. */
function column(facts: Partial<ColumnFacts> & { table: string; column: string }): ColumnFacts {
  return {
    type: "text",
    nullable: true,
    columnDefault: null,
    ...facts,
  };
}

/** The two sides, as the maps `compareColumns` reads. */
function sides(
  contracts: readonly ColumnFacts[],
  migrations: readonly ColumnFacts[],
): [Map<string, ColumnFacts>, Map<string, ColumnFacts>] {
  const index = (facts: readonly ColumnFacts[]): Map<string, ColumnFacts> =>
    new Map(facts.map((f) => [`${f.table}.${f.column}`, f]));
  return [index(contracts), index(migrations)];
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("the order the contracts are applied in", () => {
  it("puts a contract after the one its apply order names", () => {
    const ordered = orderByDeclaredDependencies([
      { file: "b.sql", ids: ["CON-DB-0002"], dependsOn: ["CON-DB-0001"] },
      { file: "a.sql", ids: ["CON-DB-0001"], dependsOn: [] },
    ]);

    expect(ordered).toEqual(["a.sql", "b.sql"]);
  });

  it("keeps a contract whose dependency is a cycle rather than dropping it", () => {
    const ordered = orderByDeclaredDependencies([
      { file: "a.sql", ids: ["CON-DB-0001"], dependsOn: ["CON-DB-0002"] },
      { file: "b.sql", ids: ["CON-DB-0002"], dependsOn: ["CON-DB-0001"] },
    ]);

    expect([...ordered].sort()).toEqual(["a.sql", "b.sql"]);
  });

  it("keeps a contract whose dependency names nothing in the set", () => {
    const ordered = orderByDeclaredDependencies([
      { file: "a.sql", ids: ["CON-DB-0001"], dependsOn: ["CON-DB-0099"] },
    ]);

    expect(ordered).toEqual(["a.sql"]);
  });

  it("is read off the files, so a declared order applies cleanly", async () => {
    const root = await newRoot();
    await write(
      root,
      ".qfai/contracts/db/CON-DB-0002.sql",
      [
        "-- QFAI-CONTRACT-ID: CON-DB-0002",
        "-- Depends on: CON-DB-0001",
        "CREATE TABLE orders (customer_id TEXT REFERENCES customers (id));",
        "",
      ].join("\n"),
    );
    await write(
      root,
      ".qfai/contracts/db/CON-DB-0001.sql",
      "-- QFAI-CONTRACT-ID: CON-DB-0001\n-- Depends on: -\nCREATE TABLE customers (id TEXT PRIMARY KEY);\n",
    );

    const ordered = await contractApplyOrder(path.join(root, ".qfai/contracts/db"));

    expect(ordered.map((f) => path.basename(f))).toEqual(["CON-DB-0001.sql", "CON-DB-0002.sql"]);
  });
});

describe("the order the migrations are applied in", () => {
  it("is the filename order every migration tool encodes", async () => {
    const root = await newRoot();
    await write(root, "migrations/0010_later.sql", "SELECT 1;\n");
    await write(root, "migrations/0002_earlier.sql", "SELECT 1;\n");

    const ordered = await migrationApplyOrder(path.join(root, "migrations"));

    expect(ordered.map((f) => path.basename(f))).toEqual(["0002_earlier.sql", "0010_later.sql"]);
  });

  it("is empty for a directory that is not there", async () => {
    const root = await newRoot();

    expect(await migrationApplyOrder(path.join(root, "migrations"))).toEqual([]);
  });
});

describe("what counts as a difference", () => {
  it("is the type, the nullability and the default, and nothing else", () => {
    const contracts = column({
      table: "orders",
      column: "total",
      type: "numeric",
      nullable: false,
      columnDefault: "0",
    });

    expect(differingFields(contracts, contracts)).toEqual([]);
    expect(differingFields(contracts, { ...contracts, type: "integer" })).toEqual(["type"]);
    expect(differingFields(contracts, { ...contracts, nullable: true })).toEqual(["nullable"]);
    expect(differingFields(contracts, { ...contracts, columnDefault: null })).toEqual(["default"]);
  });

  it("names every field two readings disagree about", () => {
    const contracts = column({ table: "orders", column: "total", type: "numeric" });
    const migrations = column({
      table: "orders",
      column: "total",
      type: "integer",
      nullable: false,
      columnDefault: "0",
    });

    expect(differingFields(contracts, migrations)).toEqual(["type", "nullable", "default"]);
  });

  it("reports a column both sides declare, naming what they disagree about", () => {
    const [contracts, migrations] = sides(
      [column({ table: "orders", column: "total", type: "numeric" })],
      [column({ table: "orders", column: "total", type: "integer", nullable: false })],
    );

    expect(compareColumns(contracts, migrations)).toMatchObject([
      { kind: "differs", table: "orders", column: "total", fields: ["type", "nullable"] },
    ]);
  });

  it("says nothing about a column both sides declare the same way", () => {
    const [contracts, migrations] = sides(
      [column({ table: "orders", column: "total", type: "numeric" })],
      [column({ table: "orders", column: "total", type: "numeric" })],
    );

    expect(compareColumns(contracts, migrations)).toEqual([]);
  });

  it("orders the report by table and column, whichever side each came from", () => {
    const [contracts, migrations] = sides(
      [column({ table: "orders", column: "note" }), column({ table: "customers", column: "id" })],
      [column({ table: "orders", column: "cancelled_at" })],
    );

    expect(compareColumns(contracts, migrations).map((d) => `${d.table}.${d.column}`)).toEqual([
      "customers.id",
      "orders.cancelled_at",
      "orders.note",
    ]);
  });
});

describe("a database that cannot be read", () => {
  it("returns no differences rather than inventing them", async () => {
    const root = await newRoot();
    const file = await write(root, "migrations/0001.sql", "SELECT 1;\n");
    const empty: SchemaDatabase = {
      exec: () => Promise.resolve(undefined),
      query: () => Promise.resolve({ rows: [{ unexpected: "shape" }] }),
      close: () => Promise.resolve(),
    };

    const result = await compareSchemas({
      root,
      contractFiles: [file],
      migrationFiles: [file],
      createDatabase: () => Promise.resolve(empty),
    });

    expect(result.differences).toEqual([]);
  });

  it("closes both databases even when the comparison throws", async () => {
    const root = await newRoot();
    const file = await write(root, "migrations/0001.sql", "SELECT 1;\n");
    let closed = 0;
    const failing: SchemaDatabase = {
      exec: () => Promise.resolve(undefined),
      query: () => Promise.reject(new Error("the connection went away")),
      close: () => {
        closed += 1;
        return Promise.resolve();
      },
    };

    await expect(
      compareSchemas({
        root,
        contractFiles: [file],
        migrationFiles: [file],
        createDatabase: () => Promise.resolve(failing),
      }),
    ).rejects.toThrow("the connection went away");
    expect(closed).toBe(2);
  });
});
