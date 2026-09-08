/**
 * `qfai db-drift` — what it says, and what it exits with.
 *
 * The command answers a question `validate` cannot: whether the DB contracts
 * and the migrations build the same schema. It needs a database, so it is not a
 * `validate` rule, and it is not something every project can be asked to run —
 * a project that has not said where its migrations live is out of scope rather
 * than in violation.
 *
 * The comparison itself is held in the core suites. These cases hold the three
 * decisions the command owns: when it declines, what its exit code means, and
 * whether the report reads.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { renderText, runDbDrift } from "../../src/cli/commands/dbDrift.js";
import type { ColumnDifference, SchemaDatabase } from "../../src/core/dbSchemaDrift.js";

const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-db-drift-cli-"));
  tempDirs.push(root);
  return root;
}

async function write(root: string, relative: string, body: string): Promise<void> {
  const abs = path.join(root, relative);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
}

/**
 * A project with one contract, one migration, and a config pointing at both.
 *
 * `migrations` selects whether `paths.migrationsDir` is written, which is the
 * one thing that decides whether the command runs at all.
 */
async function project(options: { migrationsDir?: string } = {}): Promise<string> {
  const root = await newRoot();
  await write(
    root,
    "qfai.config.yaml",
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      ...(options.migrationsDir !== undefined ? [`  migrationsDir: ${options.migrationsDir}`] : []),
      "",
    ].join("\n"),
  );
  await write(
    root,
    ".qfai/contracts/db/CON-DB-0001.sql",
    "-- QFAI-CONTRACT-ID: CON-DB-0001\nCREATE TABLE orders (id TEXT PRIMARY KEY);\n",
  );
  await write(root, "migrations/0001_orders.sql", "CREATE TABLE orders (id TEXT PRIMARY KEY);\n");
  return root;
}

/** A database that reports exactly the columns it was handed. */
function databaseOf(rows: ReadonlyArray<Record<string, unknown>>): SchemaDatabase {
  return {
    exec: () => Promise.resolve(undefined),
    query: () => Promise.resolve({ rows: [...rows] }),
    close: () => Promise.resolve(),
  };
}

/** Two databases in the order `compareSchemas` asks for them: contracts, then migrations. */
function twoDatabases(
  contracts: ReadonlyArray<Record<string, unknown>>,
  migrations: ReadonlyArray<Record<string, unknown>>,
): () => Promise<SchemaDatabase> {
  const queue = [databaseOf(contracts), databaseOf(migrations)];
  return () => Promise.resolve(queue.shift() ?? databaseOf([]));
}

function columnRow(name: string, type = "text"): Record<string, unknown> {
  return {
    table_name: "orders",
    column_name: name,
    data_type: type,
    is_nullable: "YES",
    column_default: null,
  };
}

/** Everything the command wrote to stdout while `run` was awaited. */
async function captured(run: () => Promise<number>): Promise<{ exitCode: number; said: string }> {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  });
  try {
    return { exitCode: await run(), said: chunks.join("") };
  } finally {
    spy.mockRestore();
  }
}

afterEach(async () => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("a project the command is not for", () => {
  it("declines when no migrations directory is configured, and exits 0", async () => {
    const root = await project();

    const { exitCode, said } = await captured(() =>
      runDbDrift({ root, createDatabase: () => Promise.resolve(databaseOf([])) }),
    );

    expect(exitCode).toBe(0);
    expect(said).toContain("paths.migrationsDir");
  });

  it("declines when the configured directory holds no migrations", async () => {
    const root = await project({ migrationsDir: "db/changes" });

    const { exitCode, said } = await captured(() =>
      runDbDrift({ root, createDatabase: () => Promise.resolve(databaseOf([])) }),
    );

    expect(exitCode).toBe(0);
    expect(said).toContain("no migrations");
  });

  it("declines when the project has no DB contracts", async () => {
    const root = await project({ migrationsDir: "migrations" });
    await rm(path.join(root, ".qfai/contracts/db"), { recursive: true, force: true });

    const { exitCode, said } = await captured(() =>
      runDbDrift({ root, createDatabase: () => Promise.resolve(databaseOf([])) }),
    );

    expect(exitCode).toBe(0);
    expect(said).toContain("no DB contracts");
  });
});

describe("what the exit code says", () => {
  it("is 0 when the two schemas agree", async () => {
    const root = await project({ migrationsDir: "migrations" });

    const exitCode = await runDbDrift({
      root,
      createDatabase: twoDatabases([columnRow("id")], [columnRow("id")]),
    });

    expect(exitCode).toBe(0);
  });

  it("is 1 when they differ", async () => {
    const root = await project({ migrationsDir: "migrations" });

    const exitCode = await runDbDrift({
      root,
      createDatabase: twoDatabases([columnRow("id")], [columnRow("id"), columnRow("note")]),
    });

    expect(exitCode).toBe(1);
  });

  it("is 0 for a difference under --fail-on never", async () => {
    const root = await project({ migrationsDir: "migrations" });

    const exitCode = await runDbDrift({
      root,
      failOn: "never",
      createDatabase: twoDatabases([columnRow("id")], [columnRow("id"), columnRow("note")]),
    });

    expect(exitCode).toBe(0);
  });

  it("is 2 when the engine cannot be reached at all", async () => {
    const root = await project({ migrationsDir: "migrations" });

    const exitCode = await runDbDrift({
      root,
      createDatabase: () => Promise.reject(new Error("no engine here")),
    });

    expect(exitCode).toBe(2);
  });

  it("is 2 when a file would not apply, because the comparison then saw less", async () => {
    const root = await project({ migrationsDir: "migrations" });
    let calls = 0;
    const refusing: SchemaDatabase = {
      exec: () => {
        calls += 1;
        return calls === 2 ? Promise.reject(new Error("syntax error")) : Promise.resolve(undefined);
      },
      query: () => Promise.resolve({ rows: [columnRow("id")] }),
      close: () => Promise.resolve(),
    };

    const exitCode = await runDbDrift({ root, createDatabase: () => Promise.resolve(refusing) });

    expect(exitCode).toBe(2);
  });
});

describe("the report", () => {
  it("goes to the file --out names", async () => {
    const root = await project({ migrationsDir: "migrations" });

    await runDbDrift({
      root,
      outPath: ".qfai/report/db-drift.txt",
      createDatabase: twoDatabases([columnRow("id")], [columnRow("id"), columnRow("note")]),
    });

    const written = await readFile(path.join(root, ".qfai/report/db-drift.txt"), "utf-8");
    expect(written).toContain("note");
  });

  it("is parseable JSON under --format json", async () => {
    const root = await project({ migrationsDir: "migrations" });

    const { said } = await captured(() =>
      runDbDrift({
        root,
        format: "json",
        createDatabase: twoDatabases([columnRow("id")], [columnRow("id"), columnRow("note")]),
      }),
    );

    const parsed: unknown = JSON.parse(said);
    expect(parsed).toMatchObject({ differences: [{ kind: "only-in-migrations", column: "note" }] });
  });

  it("says so plainly when there is nothing to report", () => {
    expect(renderText([], [])).toContain("the same columns");
  });

  it("counts the three kinds and groups the lines by table", () => {
    const differences: ColumnDifference[] = [
      {
        kind: "only-in-migrations",
        table: "orders",
        column: "cancelled_at",
        migrations: {
          table: "orders",
          column: "cancelled_at",
          type: "timestamp",
          nullable: true,
          columnDefault: null,
        },
      },
      {
        kind: "differs",
        table: "orders",
        column: "total",
        fields: ["type"],
        contracts: {
          table: "orders",
          column: "total",
          type: "numeric",
          nullable: false,
          columnDefault: "0",
        },
        migrations: {
          table: "orders",
          column: "total",
          type: "integer",
          nullable: false,
          columnDefault: "0",
        },
      },
    ];

    const text = renderText(differences, []);

    expect(text).toContain("2 column difference(s)");
    expect(text).toContain("1 only in the migrations");
    expect(text).toContain("1 declared differently");
    expect(text.split("\n").filter((line) => line === "orders")).toHaveLength(1);
    expect(text).toContain("contracts numeric not null default 0");
  });

  it("names a file that would not apply, on the side it came from", () => {
    const text = renderText(
      [],
      [{ side: "migrations", file: "migrations/0002.sql", message: "syntax error" }],
    );

    expect(text).toContain("1 file(s) would not apply");
    expect(text).toContain("migrations: migrations/0002.sql");
  });
});
