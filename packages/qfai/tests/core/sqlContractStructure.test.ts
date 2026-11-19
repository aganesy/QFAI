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
import type { Issue } from "../../src/core/types.js";
import { validateContracts } from "../../src/core/validators/contracts.js";

async function runOn(sql: string): Promise<Issue[]> {
  const root = path.join(
    os.tmpdir(),
    `qfai-sql-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await mkdir(path.join(root, ".qfai", "spec", "03_contract", "db"), { recursive: true });
  try {
    await writeFile(
      path.join(root, ".qfai", "spec", "03_contract", "db", "schema.sql"),
      sql,
      "utf-8",
    );
    return await validateContracts(root, defaultConfig);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const HEADER = "-- QFAI-CONTRACT-ID: DB-0001\n";

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

  it("splits after an identifier that holds a tag-like run", () => {
    // `foo$tag$` is one identifier, since `$` continues a name. Read as an
    // opener, it would swallow every statement up to the next `foo$tag$`.
    const { statements, errors } = parseSqlContract(
      "CREATE TABLE foo$tag$ (id int); SELECT 1; COMMENT ON TABLE foo$tag$ IS 'x';",
    );
    expect(errors).toEqual([]);
    expect(statements).toHaveLength(3);
  });

  it("does not split on a `;` inside a body tagged with non-ASCII letters", () => {
    const { statements, errors } = parseSqlContract(
      "CREATE FUNCTION f() RETURNS int AS $é$ BEGIN RETURN 1; END $é$ LANGUAGE plpgsql;",
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

  it("reads a backslash-escaped quote inside an E string as part of the literal", () => {
    const { statements, errors } = parseSqlContract(
      `SELECT E'it\\'s fine; really'; SELECT e'a\\\\'; SELECT 3;`,
    );
    expect(errors).toEqual([]);
    expect(statements.map((statement) => statement.text)).toEqual([
      `SELECT E'it\\'s fine; really'`,
      `SELECT e'a\\\\'`,
      "SELECT 3",
    ]);
  });

  it("keeps a backslash literal in a standard string and in an identifier ending in E", () => {
    const { statements, errors } = parseSqlContract(`SELECT 'a\\'; SELECT name'b\\'; SELECT 3;`);
    expect(errors).toEqual([]);
    expect(statements).toHaveLength(3);
  });

  it("counts a newline escaped inside an E string", () => {
    const { statements, errors } = parseSqlContract(`SELECT E'a\\\nb';\nSELECT 2;`);
    expect(errors).toEqual([]);
    expect(statements.map((statement) => statement.line)).toEqual([1, 3]);
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

  it("reports each closing parenthesis outside any open group at its own line", () => {
    // Clamping the depth at zero accepted a stray `)` silently. The `)` on
    // line 4 that closes the group opened on line 3 is not reported.
    const { errors } = parseSqlContract(`SELECT 1;\nCREATE TABLE t (a int));\nSELECT (2;\n) ) ;\n`);
    expect(errors).toEqual([
      { kind: "unmatched-close-paren", line: 2, detail: 'unmatched ")" with no open "("' },
      { kind: "unmatched-close-paren", line: 4, detail: 'unmatched ")" with no open "("' },
    ]);
  });

  it("ignores a closing parenthesis inside a string, quoted identifier, comment or dollar quote", () => {
    const { errors } = parseSqlContract(`SELECT ')', ")" FROM t; -- )\n/* ) */ SELECT $$ ) $$;\n`);
    expect(errors).toEqual([]);
  });
});

describe("QFAI-CONTRACT-021 now reaches DB contracts", () => {
  for (const [label, sql] of [
    ["an unterminated string literal", `${HEADER}INSERT INTO t VALUES ('oops);\n`],
    ["an unterminated block comment", `${HEADER}/* never closed\nCREATE TABLE t (a int);\n`],
    ["an unterminated dollar quote", `${HEADER}CREATE FUNCTION f() AS $$ BEGIN\n`],
    ["unbalanced parentheses", `${HEADER}CREATE TABLE t (a int, b text;\n`],
    ["an unmatched closing parenthesis", `${HEADER}CREATE TABLE t (a int));\n`],
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

  // PostgreSQL identifies a routine by its name and input argument types.
  // Argument names, DEFAULT expressions, OUT arguments of a function and
  // spacing are not part of that identity, so a difference in them alone
  // still declares the same routine twice.
  it.each([
    ["a default value", "f(a int DEFAULT 1)", "f(a int DEFAULT 2)"],
    ["a default written with =", "f(a int = 1, b text)", "f(a int, b text)"],
    ["argument names", "f(a int, b text)", "f(x int, y text)"],
    ["a named versus an unnamed argument", "f(a int)", "f(int)"],
    ["spacing and case", "f(a INT,b  numeric(10, 2))", "f( a int , b numeric(10,2) )"],
    ["an OUT argument of a function", "f(a int, OUT b int)", "f(IN a int)"],
    ["a multi-word type", "f(double precision)", "f(x double precision DEFAULT 0)"],
    ["a mode written after the name", "f(a IN int)", "f(INOUT b int)"],
    ["a default holding a comma", "f(a text DEFAULT 'x,y', b int)", "f(a text, b int)"],
    ["a spaced type modifier on an unnamed argument", "f(numeric(10, 2))", "f(x numeric(10,2))"],
    [
      "the name of a precision-qualified zoned type",
      "f(ts timestamp(3) with time zone)",
      "f(timestamp(3) with time zone)",
    ],
    ["the name of an SQL-standard array type", "f(a int ARRAY)", "f(int ARRAY)"],
  ])("reports two functions that differ only by %s", (_label, left, right) => {
    const { statements } = parseSqlContract(
      `CREATE OR REPLACE FUNCTION ${left} RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;\n` +
        `CREATE OR REPLACE FUNCTION ${right} RETURNS int AS $$ SELECT 2 $$ LANGUAGE sql;\n`,
    );
    const redefined = findRedefinitions(collectCreatedObjects(statements));
    expect(redefined).toHaveLength(1);
    expect(redefined[0]?.lines).toEqual([1, 2]);
  });

  it("does not report two functions whose input types differ in order", () => {
    const { statements } = parseSqlContract(
      `CREATE FUNCTION f(a int, b text) RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;\n` +
        `CREATE FUNCTION f(a text, b int) RETURNS int AS $$ SELECT 2 $$ LANGUAGE sql;\n`,
    );
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([]);
  });

  it.each([
    [
      "a precision-qualified time zone qualifier",
      "f(timestamp(3) with time zone)",
      "f(timestamp(3) without time zone)",
    ],
    [
      "a precision-qualified time type",
      "f(time(3) with time zone)",
      "f(timestamp(3) with time zone)",
    ],
    ["the element type of an SQL-standard array", "f(int ARRAY)", "f(text ARRAY)"],
    ["the element type of a sized SQL-standard array", "f(int ARRAY[3])", "f(text ARRAY[3])"],
  ])("does not report two functions whose input types differ by %s", (_label, left, right) => {
    const { statements } = parseSqlContract(
      `CREATE FUNCTION ${left} RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;\n` +
        `CREATE FUNCTION ${right} RETURNS int AS $$ SELECT 2 $$ LANGUAGE sql;\n`,
    );
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([]);
  });

  it("does not report two functions where one has a VARIADIC input", () => {
    const { statements } = parseSqlContract(
      `CREATE FUNCTION f(a int) RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;\n` +
        `CREATE FUNCTION f(a int, VARIADIC b int[]) RETURNS int AS $$ SELECT 2 $$ LANGUAGE sql;\n`,
    );
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([]);
  });

  // A procedure's OUT arguments are part of its identity in PostgreSQL, unlike
  // a function's.
  it("does not report two procedures that differ by an OUT argument", () => {
    const { statements } = parseSqlContract(
      `CREATE PROCEDURE p(a int, OUT b int) LANGUAGE sql AS $$ SELECT 1 $$;\n` +
        `CREATE PROCEDURE p(a int) LANGUAGE sql AS $$ SELECT 1 $$;\n`,
    );
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([]);
  });

  // A PostgreSQL trigger name is unique per TABLE, not per schema, so two
  // same-named triggers on different tables are correct SQL. Keying on the name
  // alone would report them — a false positive on valid input.
  it("does not report same-named triggers on different tables", () => {
    const { statements } = parseSqlContract(
      `CREATE TRIGGER touch BEFORE UPDATE ON a FOR EACH ROW EXECUTE FUNCTION f();\n` +
        `CREATE TRIGGER touch BEFORE UPDATE ON b FOR EACH ROW EXECUTE FUNCTION f();\n`,
    );
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([]);
  });

  // A comment separates tokens. Dropping it outright joined them, so this
  // statement became `CREATETABLE` and left the redefinition scan entirely.
  it("still sees a CREATE whose keywords are split by a block comment", () => {
    const { statements } = parseSqlContract(
      `CREATE/* note */TABLE t (a int);\nCREATE TABLE t (b int);\n`,
    );
    expect(findRedefinitions(collectCreatedObjects(statements))).toHaveLength(1);
  });

  it("keeps line numbers true across a multi-line comment", () => {
    const { statements } = parseSqlContract(`/* one\ntwo\nthree */\nCREATE TABLE t (a int);\n`);
    expect(statements[0]?.line).toBe(4);
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

  // A reviewed TRUNCATE warned on every validate with no hint of why, what to
  // write instead, or that the waiver file can record the review.
  it("says why a dangerous statement is flagged and how to resolve or waive it", async () => {
    const issues = await runOn(`${HEADER}TRUNCATE orders;\n`);
    const finding = issues.find((i) => i.code === "QFAI-DB-001");
    expect(finding?.message).toContain("Dangerous SQL operation found: TRUNCATE");
    expect(finding?.message).toContain("applying this statement destroys data or structure");
    expect(finding?.suggested_action).toContain("move a data reset to test setup or fixtures");
    expect(finding?.suggested_action).toContain(".qfai/waivers.yml");
    expect(finding?.suggested_action).toContain("reason, evidence and expiry date");
    expect(finding?.category).toBe("canonical");
  });

  it("still requires the contract id declaration", async () => {
    const issues = await runOn("CREATE TABLE t (a int);\n");
    expect(issues.map((i) => i.code)).toContain("QFAI-CONTRACT-010");
  });
});
