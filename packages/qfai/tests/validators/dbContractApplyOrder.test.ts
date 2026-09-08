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

    expect([...creates].sort()).toEqual(["order_lines", "orders"]);
    expect([...references].sort()).toEqual(["orders", "products"]);
  });

  it("reads a name through its quoting and its schema", () => {
    // One database, so `public.orders` and `"Orders"` are the same table. Kept
    // apart, the map splits and the pair that matters reports nothing.
    const { creates, references } = readTableEdges(
      'CREATE TABLE public."Orders" (id TEXT);\nCREATE TABLE l (o TEXT REFERENCES "orders");',
    );

    expect(creates.has("orders")).toBe(true);
    expect(references.has("orders")).toBe(true);
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
    const parent = await contract(root, "CON-DB-0026", "CREATE TABLE rate_state (id TEXT);\n");
    const child = await contract(
      root,
      "CON-DB-0024",
      "-- Depends on: CON-DB-0001\nCREATE TABLE windows (state TEXT REFERENCES rate_state (id));\n",
    );
    const base = await contract(root, "CON-DB-0001", "CREATE TABLE base (id TEXT);\n");

    const issues = await validateDbContractApplyOrder(root, [base, parent, child]);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-CONTRACT-036");
    expect(issues[0]?.file).toBe(".qfai/contracts/db/CON-DB-0024.sql");
    expect(issues[0]?.message).toContain("CON-DB-0026 (rate_state)");
    expect(issues[0]?.refs).toContain("CON-DB-0026");
  });

  it("stays silent when the dependency is declared", async () => {
    const root = await newRoot();
    const parent = await contract(root, "CON-DB-0026", "CREATE TABLE rate_state (id TEXT);\n");
    const child = await contract(
      root,
      "CON-DB-0024",
      "-- Depends on: CON-DB-0026\nCREATE TABLE windows (state TEXT REFERENCES rate_state (id));\n",
    );

    expect(await validateDbContractApplyOrder(root, [parent, child])).toEqual([]);
  });

  it("stays silent on a key pointing at a table the same file creates", async () => {
    // Nothing has to be applied first, so there is no dependency to declare.
    const root = await newRoot();
    const file = await contract(
      root,
      "CON-DB-0030",
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
      "CON-DB-0031",
      "-- Depends on: -\nCREATE TABLE t (u TEXT REFERENCES auth_users (id));\n",
    );

    expect(await validateDbContractApplyOrder(root, [file])).toEqual([]);
  });

  it("leaves a table two contracts both create unattributed", async () => {
    // Which of them is the apply-order parent is not derivable here, and naming
    // the wrong one sends the author to edit a line that is already right.
    const root = await newRoot();
    const one = await contract(root, "CON-DB-0040", "CREATE TABLE shared (id TEXT);\n");
    const two = await contract(root, "CON-DB-0041", "CREATE TABLE shared (id TEXT);\n");
    const child = await contract(
      root,
      "CON-DB-0042",
      "-- Depends on: -\nCREATE TABLE t (s TEXT REFERENCES shared (id));\n",
    );

    expect(await validateDbContractApplyOrder(root, [one, two, child])).toEqual([]);
  });

  it("names every undeclared parent in one finding, with the tables behind it", async () => {
    // One finding per file, because the remedy is one edit to one line.
    const root = await newRoot();
    const a = await contract(root, "CON-DB-0050", "CREATE TABLE alpha (id TEXT);\n");
    const b = await contract(root, "CON-DB-0051", "CREATE TABLE beta (id TEXT);\n");
    const child = await contract(
      root,
      "CON-DB-0052",
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
    expect(issues[0]?.message).toContain("CON-DB-0050 (alpha), CON-DB-0051 (beta)");
    expect(issues[0]?.suggested_action).toContain("CON-DB-0050, CON-DB-0051");
  });

  it("skips a file carrying no contract id, which another rule reports", async () => {
    const root = await newRoot();
    const abs = path.join(root, ".qfai/contracts/db/stray.sql");
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, "CREATE TABLE t (o TEXT REFERENCES orders (id));\n", "utf-8");
    const parent = await contract(root, "CON-DB-0060", "CREATE TABLE orders (id TEXT);\n");

    expect(await validateDbContractApplyOrder(root, [abs, parent])).toEqual([]);
  });

  it("says nothing when the project has no db contracts", async () => {
    expect(await validateDbContractApplyOrder(await newRoot(), [])).toEqual([]);
  });
});
