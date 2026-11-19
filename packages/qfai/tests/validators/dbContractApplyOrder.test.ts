/**
 * QFAI-CONTRACT-036 — a foreign key names an apply-order dependency the
 * `-- Depends on:` line does not.
 *
 * Three rules read that line: one requires it to be present, one requires the
 * ids in it to resolve, one compares it with the contract index. None reads the
 * SQL under it. So a contract set whose stated order does not work satisfies
 * every gate, and the failure arrives when somebody applies it — reported as a
 * missing relation, in a run that has no idea which line was wrong.
 *
 * The reading these cases hold: a `REFERENCES` clause is an apply-order edge
 * because its target must exist when the statement runs, and every such edge to
 * another contract's table has to appear in the declaration.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  blankSqlNoise,
  readTableEdges,
  tableName,
  validateDbContractApplyOrder,
} from "../../src/core/validators/dbContractApplyOrder.js";

const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-db-apply-order-"));
  tempDirs.push(root);
  return root;
}

/** Writes one `db/` contract and returns its absolute path. */
async function contract(root: string, id: string, body: string): Promise<string> {
  const abs = path.join(root, ".qfai/contracts/db", `${id}.sql`);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `-- QFAI-CONTRACT-ID: ${id}\n${body}`, "utf-8");
  return abs;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("reading a contract's own DDL", () => {
  it("finds the tables it creates and the tables it points at", () => {
    const { creates, references } = readTableEdges(
      [
        "CREATE TABLE orders (id TEXT PRIMARY KEY);",
        "CREATE TABLE order_lines (",
        "  order_id TEXT NOT NULL REFERENCES orders (id),",
        "  sku TEXT NOT NULL REFERENCES products",
        ");",
      ].join("\n"),
    );

    expect([...creates.keys()].sort()).toEqual(["order_lines", "orders"]);
    expect([...references.keys()].sort()).toEqual(["orders", "products"]);
  });

  it("keeps a name's schema and the case of its quoted parts", () => {
    // PostgreSQL folds only unquoted identifiers, so `"Orders"` and `orders` are
    // two tables, while `"orders"` and `ORDERS` are one. The schema is part of
    // the name: `audit.orders` is not `sales.orders`.
    const { creates, references } = readTableEdges(
      [
        'CREATE TABLE public."Orders" (id TEXT);',
        "CREATE TABLE Audit . Orders (id TEXT);",
        'CREATE TABLE l (a TEXT REFERENCES "orders", b TEXT REFERENCES "Sales"."Orders",',
        '  c TEXT REFERENCES "odd""name", d TEXT REFERENCES db.sales.items);',
      ].join("\n"),
    );

    expect([...creates.keys()].sort()).toEqual(["audit.orders", 'public."Orders"', "l"].sort());
    expect([...references.keys()].sort()).toEqual(
      ['"Sales"."Orders"', '"odd""name"', "orders", "sales.items"].sort(),
    );
    expect(tableName('public."Orders"')).toEqual({
      schema: "public",
      name: "Orders",
      key: 'public."Orders"',
    });
    expect(tableName("ORDERS")).toEqual(tableName('"orders"'));
  });

  it("reads a quoted name that holds spaces, dots or a dollar sign", () => {
    const { creates, references } = readTableEdges(
      'CREATE TABLE "order lines" (o TEXT REFERENCES "a.b" (id), p TEXT REFERENCES "$x$" (id));',
    );

    expect([...creates.keys()]).toEqual(['"order lines"']);
    expect([...references.keys()].sort()).toEqual(['"$x$"', '"a.b"']);
  });

  it("does not read a dollar quote or a REFERENCES inside a quoted identifier", () => {
    // A `$a$` inside `"$a$"` is part of a name. Read as an opener, it blanks
    // everything up to the next `$a$`, including the real foreign key.
    const sql = [
      'CREATE TABLE "$a$" (parent_id int REFERENCES orders(id));',
      "COMMENT ON TABLE \"$a$\" IS 'x';",
      'CREATE TABLE "REFERENCES sessions" (id int);',
    ].join("\n");
    const { references } = readTableEdges(sql);

    expect([...references.keys()]).toEqual(["orders"]);
    expect(blankSqlNoise(sql)).toBe(sql.replace("'x'", "   "));
  });

  it("reads CREATE TABLE through the modifiers a statement may carry", () => {
    const { creates } = readTableEdges(
      "CREATE UNLOGGED TABLE IF NOT EXISTS staging_rows (id TEXT);",
    );

    expect(creates.has("staging_rows")).toBe(true);
  });

  it("does not read a REFERENCES inside a comment or a string", () => {
    // Prose and data. Counted, either would send the author to declare a
    // dependency the file does not have.
    const { references } = readTableEdges(
      [
        "-- REFERENCES audit_log is deliberate; see the note",
        "/* REFERENCES legacy_orders was dropped */",
        "CREATE TABLE t (note TEXT DEFAULT 'REFERENCES sessions');",
      ].join("\n"),
    );

    expect(references.size).toBe(0);
  });

  it("does not read a REFERENCES inside a tagged dollar-quoted literal", () => {
    // `$note$ … $note$` is as much a PostgreSQL literal as `$$ … $$`. Counted,
    // it makes the file depend on the contract that creates `orders`.
    const sql = [
      "CREATE TABLE t (note TEXT DEFAULT $note$ REFERENCES orders $note$);",
      "COMMENT ON TABLE t IS $a$ $b$ REFERENCES sessions $b$ $a$;",
    ].join("\n");
    const { references } = readTableEdges(sql);

    expect(references.size).toBe(0);
    expect(blankSqlNoise(sql)).toHaveLength(sql.length);
  });

  it("reads a REFERENCES after an identifier that holds a tag-like run", () => {
    // `$` continues an identifier in PostgreSQL, so `foo$tag$` is one name and
    // opens no literal. Read as an opener, the second `foo$tag$` would close it
    // and blank the real foreign key between them.
    const sql = [
      "CREATE TABLE foo$tag$ (parent_id int REFERENCES orders(id));",
      "COMMENT ON TABLE foo$tag$ IS 'child rows';",
    ].join("\n");
    const { references } = readTableEdges(sql);

    expect([...references.keys()]).toEqual(["orders"]);
  });

  it("does not read a REFERENCES inside a literal tagged with non-ASCII letters", () => {
    // A tag follows PostgreSQL's identifier rules, which accept any letter, so
    // `$é$ … $é$` is a literal just as `$note$ … $note$` is.
    const sql = "COMMENT ON TABLE t IS $é$ REFERENCES orders $é$;";
    const { references } = readTableEdges(sql);

    expect(references.size).toBe(0);
    expect(blankSqlNoise(sql)).toHaveLength(sql.length);
  });

  it("keeps every offset when it blanks a comment", () => {
    // The blanking is a mask, not a delete: a later match has to land where the
    // reader sees it.
    const sql = "-- a comment\nCREATE TABLE t (id TEXT);\n";

    expect(blankSqlNoise(sql)).toHaveLength(sql.length);
    expect(blankSqlNoise(sql).split("\n")).toHaveLength(sql.split("\n").length);
  });
});

describe("validateDbContractApplyOrder", () => {
  it("reports a foreign key whose target contract is not declared", async () => {
    // The shape reported from a real project: four columns pointing at a table
    // another contract creates, and a `Depends on:` line naming two others.
    const root = await newRoot();
    const parent = await contract(root, "DB-0026", "CREATE TABLE rate_state (id TEXT);\n");
    const child = await contract(
      root,
      "DB-0024",
      "-- Depends on: DB-0001\nCREATE TABLE windows (state TEXT REFERENCES rate_state (id));\n",
    );
    const base = await contract(root, "DB-0001", "CREATE TABLE base (id TEXT);\n");

    const issues = await validateDbContractApplyOrder(root, [base, parent, child]);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-CONTRACT-036");
    expect(issues[0]?.file).toBe(".qfai/contracts/db/DB-0024.sql");
    expect(issues[0]?.message).toContain("DB-0026 (rate_state)");
    expect(issues[0]?.refs).toContain("DB-0026");
  });

  it("stays silent when the dependency is declared", async () => {
    const root = await newRoot();
    const parent = await contract(root, "DB-0026", "CREATE TABLE rate_state (id TEXT);\n");
    const child = await contract(
      root,
      "DB-0024",
      "-- Depends on: DB-0026\nCREATE TABLE windows (state TEXT REFERENCES rate_state (id));\n",
    );

    expect(await validateDbContractApplyOrder(root, [parent, child])).toEqual([]);
  });

  it("stays silent on a key pointing at a table the same file creates", async () => {
    // Nothing has to be applied first, so there is no dependency to declare.
    const root = await newRoot();
    const file = await contract(
      root,
      "DB-0030",
      [
        "-- Depends on: -",
        "CREATE TABLE nodes (id TEXT PRIMARY KEY);",
        "CREATE TABLE edges (parent TEXT REFERENCES nodes (id));",
      ].join("\n"),
    );

    expect(await validateDbContractApplyOrder(root, [file])).toEqual([]);
  });

  it("stays silent on a table no contract in the set creates", async () => {
    // The rule names the contract that should have been listed. With none to
    // name, a finding would tell the author to declare something that does not
    // exist.
    const root = await newRoot();
    const file = await contract(
      root,
      "DB-0031",
      "-- Depends on: -\nCREATE TABLE t (u TEXT REFERENCES auth_users (id));\n",
    );

    expect(await validateDbContractApplyOrder(root, [file])).toEqual([]);
  });

  it("leaves a table two contracts both create unattributed", async () => {
    // Which of them is the apply-order parent is not derivable here, and naming
    // the wrong one sends the author to edit a line that is already right.
    const root = await newRoot();
    const one = await contract(root, "DB-0040", "CREATE TABLE shared (id TEXT);\n");
    const two = await contract(root, "DB-0041", "CREATE TABLE shared (id TEXT);\n");
    const child = await contract(
      root,
      "DB-0042",
      "-- Depends on: -\nCREATE TABLE t (s TEXT REFERENCES shared (id));\n",
    );

    expect(await validateDbContractApplyOrder(root, [one, two, child])).toEqual([]);
  });

  it("tells apart tables that differ only in schema or in a quoted name's case", async () => {
    // Folded to one key, each pair below became a table two contracts create,
    // and the undeclared dependency went unreported.
    const root = await newRoot();
    const audit = await contract(root, "DB-0080", "CREATE TABLE audit.events (id TEXT);\n");
    const sales = await contract(root, "DB-0081", "CREATE TABLE sales.events (id TEXT);\n");
    const quoted = await contract(root, "DB-0082", 'CREATE TABLE "Orders" (id TEXT);\n');
    const plain = await contract(root, "DB-0083", "CREATE TABLE orders (id TEXT);\n");
    const child = await contract(
      root,
      "DB-0084",
      [
        "-- Depends on: -",
        "CREATE TABLE t (",
        "  e TEXT REFERENCES audit.events (id),",
        '  o TEXT REFERENCES "Orders" (id)',
        ");",
      ].join("\n"),
    );

    const issues = await validateDbContractApplyOrder(root, [audit, sales, quoted, plain, child]);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('DB-0080 (audit.events), DB-0082 ("Orders")');
    expect(issues[0]?.refs).toEqual(["DB-0084", "DB-0080", "DB-0082"]);
  });

  it("matches a name with no schema to the one created table it can denote", async () => {
    // `orders` resolves through the search path, so it can be `public.orders`.
    // With one candidate there is one contract to name.
    const root = await newRoot();
    const parent = await contract(root, "DB-0090", "CREATE TABLE public.orders (id TEXT);\n");
    const child = await contract(
      root,
      "DB-0091",
      "-- Depends on: -\nCREATE TABLE t (o TEXT REFERENCES orders (id));\n",
    );

    const issues = await validateDbContractApplyOrder(root, [parent, child]);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("DB-0090 (orders)");
  });

  it("names no contract for a name with no schema that two contracts' tables share", async () => {
    // `orders` could be `audit.orders` or `sales.orders`; which one depends on
    // a search path the contracts do not state, so naming either may be wrong.
    const root = await newRoot();
    const audit = await contract(root, "DB-0092", "CREATE TABLE audit.orders (id TEXT);\n");
    const sales = await contract(root, "DB-0093", "CREATE TABLE sales.orders (id TEXT);\n");
    const child = await contract(
      root,
      "DB-0094",
      "-- Depends on: -\nCREATE TABLE t (o TEXT REFERENCES orders (id));\n",
    );

    expect(await validateDbContractApplyOrder(root, [audit, sales, child])).toEqual([]);
  });

  it("does not match a schema-qualified name to a table in another schema", async () => {
    const root = await newRoot();
    const parent = await contract(root, "DB-0095", "CREATE TABLE audit.orders (id TEXT);\n");
    const child = await contract(
      root,
      "DB-0096",
      "-- Depends on: -\nCREATE TABLE t (o TEXT REFERENCES sales.orders (id));\n",
    );

    expect(await validateDbContractApplyOrder(root, [parent, child])).toEqual([]);
  });

  it("names no contract when the referencing file may create the table itself", async () => {
    // `public.orders` and `orders` may be one table. The referencing file
    // creates one spelling and another contract the other, so the parent is
    // either itself or that contract, and naming that contract may be wrong.
    for (const [own, reference, other] of [
      ["public.orders", "orders", "orders"],
      ["orders", "public.orders", "public.orders"],
    ]) {
      const root = await newRoot();
      const parent = await contract(root, "DB-0097", `CREATE TABLE ${other} (id TEXT);\n`);
      const child = await contract(
        root,
        "DB-0098",
        `-- Depends on: -\nCREATE TABLE ${own} (id TEXT);\n` +
          `CREATE TABLE t (o TEXT REFERENCES ${reference} (id));\n`,
      );

      expect(await validateDbContractApplyOrder(root, [parent, child])).toEqual([]);
    }
  });

  it("folds a backtick-quoted or bracketed name like an unquoted one", () => {
    // Neither is PostgreSQL quoting, so neither keeps case.
    expect(tableName("[Orders]").key).toBe("orders");
    expect(tableName("`Sales`.`Orders`").key).toBe("sales.orders");
  });

  it("names every undeclared parent in one finding, with the tables behind it", async () => {
    // One finding per file, because the remedy is one edit to one line.
    const root = await newRoot();
    const a = await contract(root, "DB-0050", "CREATE TABLE alpha (id TEXT);\n");
    const b = await contract(root, "DB-0051", "CREATE TABLE beta (id TEXT);\n");
    const child = await contract(
      root,
      "DB-0052",
      [
        "-- Depends on: -",
        "CREATE TABLE t (",
        "  a TEXT REFERENCES alpha (id),",
        "  b TEXT REFERENCES beta (id)",
        ");",
      ].join("\n"),
    );

    const issues = await validateDbContractApplyOrder(root, [a, b, child]);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("DB-0050 (alpha), DB-0051 (beta)");
    expect(issues[0]?.suggested_action).toContain("DB-0050, DB-0051");
  });

  it("skips a file carrying no contract id, which another rule reports", async () => {
    const root = await newRoot();
    const abs = path.join(root, ".qfai/contracts/db/stray.sql");
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, "CREATE TABLE t (o TEXT REFERENCES orders (id));\n", "utf-8");
    const parent = await contract(root, "DB-0060", "CREATE TABLE orders (id TEXT);\n");

    expect(await validateDbContractApplyOrder(root, [abs, parent])).toEqual([]);
  });

  // QFAI:EX-0001-0052-08
  it("takes only a file declaring one DB- ID as a table owner", async () => {
    // A `db/` file declaring an `API-` ID, or two IDs, is a declaration error
    // another check reports. Taken as the owner of what it creates, it would
    // send a correct file to declare a contract that is not a DB contract.
    const root = await newRoot();
    const dbDir = path.join(root, ".qfai/contracts/db");
    await mkdir(dbDir, { recursive: true });
    const write = async (name: string, text: string): Promise<string> => {
      const abs = path.join(dbDir, name);
      await writeFile(abs, text, "utf-8");
      return abs;
    };
    const orders = await write(
      "db-0001-orders.sql",
      "-- QFAI-CONTRACT-ID: API-0001\nCREATE TABLE orders (id TEXT);\n",
    );
    const archive = await write(
      "db-0002-archive.sql",
      "-- QFAI-CONTRACT-ID: API-0003\n-- QFAI-CONTRACT-ID: DB-0002\nCREATE TABLE archive (id TEXT);\n",
    );
    const lines = await write(
      "db-0004-lines.sql",
      [
        "-- QFAI-CONTRACT-ID: DB-0004",
        "-- Depends on: -",
        "CREATE TABLE lines (",
        "  o TEXT REFERENCES orders (id),",
        "  a TEXT REFERENCES archive (id)",
        ");",
      ].join("\n"),
    );

    expect(await validateDbContractApplyOrder(root, [orders, archive, lines])).toEqual([]);

    await write(
      "db-0001-orders.sql",
      "-- QFAI-CONTRACT-ID: DB-0001\nCREATE TABLE orders (id TEXT);\n",
    );
    const issues = await validateDbContractApplyOrder(root, [orders, archive, lines]);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.file).toBe(".qfai/contracts/db/db-0004-lines.sql");
    expect(issues[0]?.message).toContain("DB-0001 (orders)");
    expect(issues[0]?.message).not.toContain("archive");
  });

  // QFAI:EX-0001-0052-08
  it("gives no finding to a file that does not declare one DB- ID", async () => {
    const root = await newRoot();
    const parent = await contract(root, "DB-0070", "CREATE TABLE orders (id TEXT);\n");
    const wrongKind = await contract(
      root,
      "API-0071",
      "-- Depends on: -\nCREATE TABLE t (o TEXT REFERENCES orders (id));\n",
    );

    expect(await validateDbContractApplyOrder(root, [parent, wrongKind])).toEqual([]);
  });

  it("says nothing when the project has no db contracts", async () => {
    expect(await validateDbContractApplyOrder(await newRoot(), [])).toEqual([]);
  });
});
