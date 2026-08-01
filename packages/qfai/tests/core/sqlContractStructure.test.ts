/**
 * `.sql` was the only contract kind qfai never parsed.
 *
 * `validateContractFile` returned immediately after `lintSql` when
 * `kind === "DB"`, skipping the `QFAI-CONTRACT-021` block that raises at
 * `error` for UI and API. So the one contract kind that is actually executed
 * against a database got an ID-declaration check plus four dangerous-keyword
 * regexes at `warning`, and `--profile sdd --fail-on error` — the gate
 * `qfai-sdd` stops on for the phase that authors these files — passed a
 * contract that cannot run.
 *
 * Scope of the new lane is apply-ability, not semantic correctness.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  collectCreatedObjects,
  findRedefinitions,
  parseSqlContract,
} from "../../src/core/sqlContract.js";
import { validateContracts } from "../../src/core/validators/contracts.js";

async function runOn(sql: string): Promise<Array<{ code: string; severity: string }>> {
  const root = path.join(
    os.tmpdir(),
    `qfai-sql-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await mkdir(path.join(root, ".qfai", "contracts", "db"), { recursive: true });
  try {
    await writeFile(path.join(root, ".qfai", "contracts", "db", "schema.sql"), sql, "utf-8");
    const issues = await validateContracts(root, defaultConfig);
    return issues.map((i) => ({ code: i.code, severity: i.severity }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const HEADER = "-- QFAI-CONTRACT-ID: CON-DB-0001\n";

describe("the statement splitter knows SQL's quoting rules", () => {
  // A naive split(";") would report a valid PL/pgSQL function as a dozen
  // malformed fragments, which is worse than not checking at all.
  it("does not split on a `;` inside a dollar-quoted body", () => {
    const { statements, errors } = parseSqlContract(
      `CREATE FUNCTION f() RETURNS int AS $$ BEGIN a := 1; RETURN 2; END $$ LANGUAGE plpgsql;`,
    );
    expect(errors).toEqual([]);
    expect(statements).toHaveLength(1);
  });

  it("does not split on a `;` inside a string literal", () => {
    const { statements } = parseSqlContract(`INSERT INTO t VALUES ('a;b'); SELECT 1;`);
    expect(statements).toHaveLength(2);
  });

  it("handles a doubled quote as an escape, not a terminator", () => {
    const { statements, errors } = parseSqlContract(`SELECT 'it''s fine; really'; SELECT 2;`);
    expect(errors).toEqual([]);
    expect(statements).toHaveLength(2);
  });

  it("does not split inside a comment", () => {
    const { statements } = parseSqlContract(`-- a; b\nSELECT 1;\n/* c; d */\nSELECT 2;`);
    expect(statements).toHaveLength(2);
  });

  it("handles nested block comments, which PostgreSQL allows", () => {
    const { errors } = parseSqlContract(`/* outer /* inner */ still outer */ SELECT 1;`);
    expect(errors).toEqual([]);
  });

  it("does not split on a `;` inside parentheses", () => {
    const { statements } = parseSqlContract(`CREATE TABLE t (a int, b text DEFAULT 'x;y');`);
    expect(statements).toHaveLength(1);
  });
});

describe("QFAI-CONTRACT-021 now reaches DB contracts", () => {
  for (const [label, sql] of [
    ["an unterminated string literal", `${HEADER}INSERT INTO t VALUES ('oops);\n`],
    ["an unterminated block comment", `${HEADER}/* never closed\nCREATE TABLE t (a int);\n`],
    ["an unterminated dollar quote", `${HEADER}CREATE FUNCTION f() AS $$ BEGIN\n`],
    ["unbalanced parentheses", `${HEADER}CREATE TABLE t (a int, b text;\n`],
  ] as const) {
    it(`errors on ${label}`, async () => {
      const issues = await runOn(sql);
      const parseError = issues.find((i) => i.code === "QFAI-CONTRACT-021");
      expect(parseError, label).toBeDefined();
      // `error`, matching the UI/API lane: it is the same claim about the same
      // class of artifact, and `--fail-on error` is the gate that must catch it.
      expect(parseError?.severity).toBe("error");
    });
  }

  it("stays silent on a contract that parses", async () => {
    const issues = await runOn(
      `${HEADER}CREATE TABLE orders (id text PRIMARY KEY, note text DEFAULT 'a;b');\n` +
        `CREATE FUNCTION touch() RETURNS trigger AS $$ BEGIN RETURN NEW; END $$ LANGUAGE plpgsql;\n`,
    );
    expect(issues.map((i) => i.code)).not.toContain("QFAI-CONTRACT-021");
  });
});

describe("QFAI-DB-002 — same-name redefinition inside one file", () => {
  it("errors when one name is created twice", async () => {
    // Only the last can be in force, so the earlier one states something the
    // applied contract does not do.
    const issues = await runOn(
      `${HEADER}CREATE OR REPLACE FUNCTION f() RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;\n` +
        `CREATE OR REPLACE FUNCTION f() RETURNS int AS $$ SELECT 2 $$ LANGUAGE sql;\n`,
    );
    const found = issues.find((i) => i.code === "QFAI-DB-002");
    expect(found?.severity).toBe("error");
  });

  it("reports every line so the contradiction is locatable", () => {
    const { statements } = parseSqlContract(`CREATE TABLE t (a int);\n\nCREATE TABLE t (b int);\n`);
    const redefined = findRedefinitions(collectCreatedObjects(statements));
    expect(redefined).toHaveLength(1);
    expect(redefined[0]?.lines).toEqual([1, 3]);
  });

  // PostgreSQL overloading makes these two distinct objects, so reporting them
  // would be a false positive on correct SQL.
  it("does not report two functions that differ by argument list", () => {
    const { statements } = parseSqlContract(
      `CREATE FUNCTION f(a int) RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;\n` +
        `CREATE FUNCTION f(a text) RETURNS int AS $$ SELECT 2 $$ LANGUAGE sql;\n`,
    );
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([]);
  });

  it("does not confuse two kinds sharing a name", () => {
    // A table and an index may legitimately share a name in some dialects; they
    // are different objects either way.
    const { statements } = parseSqlContract(
      `CREATE TABLE t (a int);\nCREATE INDEX t ON other (a);\n`,
    );
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([]);
  });

  it("treats a quoted identifier case-sensitively and a bare one not", () => {
    const { statements } = parseSqlContract(
      `CREATE TABLE Orders (a int);\nCREATE TABLE orders (b int);\n`,
    );
    expect(findRedefinitions(collectCreatedObjects(statements))).toHaveLength(1);
  });

  it("stays silent on a file that defines each object once", async () => {
    const issues = await runOn(
      `${HEADER}CREATE TABLE a (x int);\nCREATE TABLE b (y int);\nCREATE INDEX i ON a (x);\n`,
    );
    expect(issues.map((i) => i.code)).not.toContain("QFAI-DB-002");
  });
});

describe("the existing DB checks are unchanged", () => {
  it("still reports a dangerous statement at warning", async () => {
    const issues = await runOn(`${HEADER}DROP TABLE orders;\n`);
    expect(issues.find((i) => i.code === "QFAI-DB-001")?.severity).toBe("warning");
  });

  it("still requires the contract id declaration", async () => {
    const issues = await runOn("CREATE TABLE t (a int);\n");
    expect(issues.map((i) => i.code)).toContain("QFAI-CONTRACT-010");
  });
});
