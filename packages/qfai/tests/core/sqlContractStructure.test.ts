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

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  collectCreatedObjects,
  DOLLAR_QUOTE_MARKER,
  findRedefinitions,
  IDENTIFIER_CHAR,
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

  it("ignores a parenthesis or `;` inside a MySQL backtick identifier", () => {
    const { statements, errors } = parseSqlContract(
      "CREATE TABLE t (`a)` int);\nCREATE TABLE u (`b(` int, `c;``d` int);\n",
    );
    expect(errors).toEqual([]);
    expect(statements.map((statement) => statement.line)).toEqual([1, 2]);
  });

  it("ignores a parenthesis or `;` inside a SQL Server bracket identifier", () => {
    const { statements, errors } = parseSqlContract(
      "CREATE TABLE t ([a)] int);\nCREATE TABLE u ([b(] int, [c;d] int);\n",
    );
    expect(errors).toEqual([]);
    expect(statements.map((statement) => statement.line)).toEqual([1, 2]);
  });

  it("reports a backtick or bracket identifier that never closes", () => {
    expect(parseSqlContract("SELECT 1;\nSELECT `a FROM t;\n").errors).toEqual([
      { kind: "unterminated-string", line: 2, detail: "quoted identifier is never closed" },
    ]);
    expect(parseSqlContract("SELECT 1;\nSELECT [a FROM t;\n").errors).toEqual([
      { kind: "unbalanced-brackets", line: 2, detail: '1 unclosed "[" at end of file' },
    ]);
  });

  it("still reads PostgreSQL array brackets, nested and holding strings", () => {
    // `]]` closes two nested subscripts in PostgreSQL, so it is not read as
    // SQL Server's escaped `]`, and a `]` inside a string closes nothing.
    const { statements, errors } = parseSqlContract(
      "CREATE TABLE t (m int[][] DEFAULT ARRAY[[1,2],[3,4]], s text[] DEFAULT ARRAY['a]', 'b(']);\nSELECT 2;\n",
    );
    expect(errors).toEqual([]);
    expect(statements).toHaveLength(2);
  });
});

describe("the identifier character class is written with escapes", () => {
  it("matches the ASCII identifier characters and every character above ASCII", () => {
    expect(IDENTIFIER_CHAR.source).toBe(String.raw`[A-Za-z0-9_$\u0080-\uFFFF]`);
    for (const char of ["a", "Z", "0", "_", "$", "\u0080", "\uD800", String.fromCharCode(0xffff)]) {
      expect(IDENTIFIER_CHAR.test(char)).toBe(true);
    }
    for (const char of ["\u007F", " ", "-", "'", ""]) {
      expect(IDENTIFIER_CHAR.test(char)).toBe(false);
    }
  });

  it("is the class the dollar-quote marker's lookbehind uses", () => {
    expect(DOLLAR_QUOTE_MARKER.source).toBe(
      String.raw`(?<![A-Za-z0-9_$\u0080-\uFFFF])\$(?:[A-Za-z_\u0080-\uFFFF][A-Za-z0-9_\u0080-\uFFFF]*)?\$`,
    );
    expect(DOLLAR_QUOTE_MARKER.source.startsWith(`(?<!${IDENTIFIER_CHAR.source})`)).toBe(true);
  });

  it("leaves no raw U+FFFF in the module source", async () => {
    const source = await readFile(
      fileURLToPath(new URL("../../src/core/sqlContract.ts", import.meta.url)),
      "utf-8",
    );
    expect(source).not.toContain(String.fromCharCode(0xffff));
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
    // PostgreSQL resolves a routine by its argument types after mapping each
    // alias to one type and dropping every type modifier.
    ["the alias int for integer", "f(a int)", "f(a integer)"],
    ["the alias int4 for integer", "f(a int4)", "f(a integer)"],
    ["the alias int8 for bigint", "f(a int8)", "f(a bigint)"],
    ["the alias bool for boolean", "f(a bool)", "f(a boolean)"],
    ["the alias varchar for character varying", "f(a varchar)", "f(a character varying)"],
    ["the alias decimal for numeric", "f(a decimal(10,2))", "f(a numeric)"],
    ["the alias float8 for double precision", "f(a float8)", "f(a double precision)"],
    ["the alias float for double precision", "f(a float)", "f(a float8)"],
    ["a float precision that names real", "f(a float(10))", "f(a real)"],
    ["the alias timestamptz", "f(a timestamptz)", "f(a timestamp with time zone)"],
    ["an omitted without time zone", "f(a timestamp)", "f(a timestamp without time zone)"],
    ["a length modifier", "f(a varchar(10))", "f(a varchar(20))"],
    ["a precision and scale modifier", "f(a numeric(10,2))", "f(a numeric)"],
    ["a precision on a zoned type", "f(a timestamp(3) with time zone)", "f(a timestamptz)"],
    ["the fields of an interval", "f(a interval day to second)", "f(a interval)"],
    ["an array bound", "f(a int[3])", "f(a integer[])"],
    ["the SQL-standard array spelling", "f(a int ARRAY)", "f(a int[])"],
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
    ["integer width", "f(a int)", "f(a bigint)"],
    ["fixed versus varying characters", "f(a char(10))", "f(a varchar(10))"],
    ["floating-point width", "f(a real)", "f(a double precision)"],
    // `float(p)` names real up to 24 bits of precision, so its modifier picks
    // the type rather than modifying it.
    ["the precision of a float", "f(a float(24))", "f(a float(25))"],
    ["an array of a type versus the type", "f(a int[])", "f(a int)"],
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

  // A regular and a unique index share PostgreSQL's relation namespace, so one
  // name used for both is the same collision as one name used twice. Keying
  // `INDEX` and `UNIQUE INDEX` as two kinds let the pair through.
  it("reports a regular and a unique index that share a name", () => {
    const { statements } = parseSqlContract(
      `CREATE INDEX orders_idx ON orders (a);\nCREATE UNIQUE INDEX orders_idx ON orders (b);\n`,
    );
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([
      { kind: "INDEX", name: "orders_idx", lines: [1, 2] },
    ]);
  });

  it("treats a quoted identifier case-sensitively and a bare one not", () => {
    const { statements } = parseSqlContract(
      `CREATE TABLE Orders (a int);\nCREATE TABLE orders (b int);\n`,
    );
    expect(findRedefinitions(collectCreatedObjects(statements))).toHaveLength(1);
  });

  // The name pattern stopped after a quoted schema, so every table in `"app"`
  // was keyed as `app` and two different tables were reported as one.
  it("reads every part of a name whose schema is quoted", () => {
    const { statements } = parseSqlContract(
      `CREATE TABLE "app".users (a int);\nCREATE TABLE "app".orders (a int);\n`,
    );
    expect(collectCreatedObjects(statements).map((object) => object.name)).toEqual([
      "app.users",
      "app.orders",
    ]);
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([]);
  });

  it("folds each bare part and keeps each quoted part as written", () => {
    const { statements } = parseSqlContract(
      `CREATE TABLE App."Users" (a int);\n` +
        `CREATE TABLE "app".users (a int);\n` +
        `CREATE TABLE app . "Users" (a int);\n`,
    );
    expect(collectCreatedObjects(statements).map((object) => object.name)).toEqual([
      "app.Users",
      "app.users",
      "app.Users",
    ]);
    expect(findRedefinitions(collectCreatedObjects(statements))[0]?.lines).toEqual([1, 3]);
  });

  // A quoted part may hold a dot or a doubled quote; neither is a separator or
  // a terminator, and `"a.b"` is one name where `a.b` is a schema and a table.
  it("keeps a quoted part holding a dot or a doubled quote distinct", () => {
    const { statements } = parseSqlContract(
      `CREATE TABLE "a.b" (x int);\nCREATE TABLE a.b (x int);\n` +
        `CREATE TABLE "s""q".t (x int);\nCREATE TABLE "s".t (x int);\n`,
    );
    expect(collectCreatedObjects(statements).map((object) => object.name)).toEqual([
      '"a.b"',
      "a.b",
      '"s""q".t',
      "s.t",
    ]);
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([]);
  });

  // PostgreSQL folds only ASCII A-Z in a bare name under UTF-8; `Äpfel` and
  // `äpfel` are two tables there. Folding every Unicode letter merged them.
  it("folds only ASCII letters in a bare name", () => {
    const { statements } = parseSqlContract(
      `CREATE TABLE Äpfel (a int);\nCREATE TABLE äpfel (a int);\nCREATE TABLE ÄPFEL (a int);\n`,
    );
    expect(collectCreatedObjects(statements).map((object) => object.name)).toEqual([
      "Äpfel",
      "äpfel",
      "Äpfel",
    ]);
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([
      { kind: "TABLE", name: "Äpfel", lines: [1, 3] },
    ]);
  });

  // A quoted part that never closes, or whose last quote is one half of a
  // doubled `""`, names nothing; reading a prefix of it would key a wrong name.
  it.each([
    ["an unclosed quoted name", `CREATE TABLE "app.users (a int);\n`],
    ["an unpaired doubled quote", `CREATE TABLE "a"" (x int);\n`],
    ["an unclosed part after a schema", `CREATE TABLE app."users (a int);\n`],
  ])("records no object for %s", (_label, sql) => {
    const { statements } = parseSqlContract(sql);
    expect(collectCreatedObjects(statements)).toEqual([]);
  });

  // `ON` and `CONCURRENTLY` are keywords of `CREATE INDEX`, not its name: an
  // index without a name is named by PostgreSQL, so two of them never collide.
  it("records no index name for an index created without one", () => {
    const { statements } = parseSqlContract(
      `CREATE INDEX ON t (a);\nCREATE INDEX ON t (b);\n` +
        `CREATE UNIQUE INDEX CONCURRENTLY ON t (c);\nCREATE INDEX CONCURRENTLY ON t (d);\n`,
    );
    expect(collectCreatedObjects(statements)).toEqual([]);
  });

  it("reads the index name after CONCURRENTLY and IF NOT EXISTS", () => {
    const { statements } = parseSqlContract(
      `CREATE INDEX CONCURRENTLY i ON t (a);\n` +
        `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS j ON t (b);\n` +
        `CREATE INDEX CONCURRENTLY k ON t (c);\nCREATE INDEX "on" ON t (d);\n`,
    );
    expect(collectCreatedObjects(statements).map((object) => object.name)).toEqual([
      "i",
      "j",
      "k",
      "on",
    ]);
    expect(findRedefinitions(collectCreatedObjects(statements))).toEqual([]);
  });

  // A `U&"…"` name holds Unicode escapes this reader does not decode; it was
  // read as `u`, so every such table collided with every other.
  it("records no object for a U& quoted name", () => {
    const { statements } = parseSqlContract(
      `CREATE TABLE U&"d\\0061ta" (a int);\nCREATE TABLE u&"other" (a int);\n`,
    );
    expect(collectCreatedObjects(statements)).toEqual([]);
  });

  // The argument list was read from the statement's first `(`, which a quoted
  // routine name may hold, so both overloads below were read with no
  // arguments and reported as one routine defined twice.
  it("reads a routine's arguments after a quoted name holding a parenthesis", () => {
    const { statements } = parseSqlContract(
      `CREATE FUNCTION "f(x"(a int) RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;\n` +
        `CREATE FUNCTION "f(x"(a text) RETURNS int AS $$ SELECT 2 $$ LANGUAGE sql;\n` +
        `CREATE PROCEDURE "s(".p(a bigint) LANGUAGE sql AS $$ SELECT 3 $$;\n`,
    );
    const created = collectCreatedObjects(statements);
    expect(created.map((object) => [object.name, object.signature])).toEqual([
      ["f(x", "integer"],
      ["f(x", "text"],
      ["s(.p", "bigint"],
    ]);
    expect(findRedefinitions(created)).toEqual([]);
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

  // The check read the raw file, so a keyword in a comment or a string, or an
  // `ALTER TABLE` in one statement and a `DROP` in a later one, warned on a
  // contract that destroys nothing.
  it.each([
    [
      "a line comment",
      "-- DROP TABLE orders is how we reset locally\nCREATE TABLE orders (id int);\n",
    ],
    ["a block comment", "/* TRUNCATE orders */ CREATE TABLE orders (id int);\n"],
    ["a string literal", "COMMENT ON TABLE orders IS 'never DROP TABLE orders';\n"],
    ["an escape string", "COMMENT ON TABLE orders IS E'it\\'s TRUNCATE-safe';\n"],
    ["a quoted name", 'CREATE TABLE "truncate" (id int);\n'],
    [
      "a function body",
      "CREATE FUNCTION reset() RETURNS void AS $$ TRUNCATE orders; $$ LANGUAGE sql;\n",
    ],
    [
      "two separate statements",
      "ALTER TABLE orders ADD COLUMN note text;\nDROP INDEX orders_note_idx;\n",
    ],
  ])("does not warn on a keyword in %s", async (_where, sql) => {
    const issues = await runOn(`${HEADER}${sql}`);
    expect(issues.filter((i) => i.code === "QFAI-DB-001")).toEqual([]);
  });

  it("warns on a destructive statement that follows a comment or string holding a keyword", async () => {
    const issues = await runOn(
      `${HEADER}COMMENT ON TABLE orders IS 'DROP TABLE';\nALTER TABLE orders DROP COLUMN note;\n`,
    );
    expect(issues.filter((i) => i.code === "QFAI-DB-001").map((i) => i.message)).toEqual([
      expect.stringContaining("ALTER TABLE ... DROP"),
    ]);
  });

  // A DO block runs its body when the contract is applied.
  it("warns on a destructive statement inside a DO block", async () => {
    const issues = await runOn(`${HEADER}DO $$ BEGIN TRUNCATE orders; END $$;\n`);
    expect(issues.filter((i) => i.code === "QFAI-DB-001").map((i) => i.message)).toEqual([
      expect.stringContaining("TRUNCATE"),
    ]);
  });

  // EXECUTE in a DO block runs its string as SQL when the file is applied.
  it("warns on a destructive statement a DO block runs through EXECUTE", async () => {
    const issues = await runOn(`${HEADER}DO $$ BEGIN EXECUTE 'TRUNCATE orders'; END $$;\n`);
    expect(issues.filter((i) => i.code === "QFAI-DB-001").map((i) => i.message)).toEqual([
      expect.stringContaining("TRUNCATE"),
    ]);
  });

  // Only a quoted body is a literal; a SQL-standard body is statements.
  it("warns on a destructive statement in a BEGIN ATOMIC function body", async () => {
    const issues = await runOn(
      `${HEADER}CREATE FUNCTION reset() RETURNS void LANGUAGE sql BEGIN ATOMIC TRUNCATE orders; END;\n`,
    );
    expect(issues.filter((i) => i.code === "QFAI-DB-001").map((i) => i.message)).toEqual([
      expect.stringContaining("TRUNCATE"),
    ]);
  });

  // Creating a function runs nothing, but calling it later in the same file
  // runs its body when the file is applied.
  it.each([
    [
      "a SELECT of a function",
      "CREATE FUNCTION reset() RETURNS void AS $$ TRUNCATE orders; $$ LANGUAGE sql;\nSELECT reset();\n",
      "TRUNCATE",
    ],
    [
      "a CALL of a procedure",
      "CREATE PROCEDURE wipe() LANGUAGE sql AS $$ DROP TABLE orders; $$;\nCALL wipe();\n",
      "DROP TABLE",
    ],
    [
      "a PERFORM in a DO block",
      "CREATE FUNCTION reset() RETURNS void AS $$ TRUNCATE orders; $$ LANGUAGE sql;\nDO $$ BEGIN PERFORM reset(); END $$;\n",
      "TRUNCATE",
    ],
    [
      "a schema-qualified call in another case",
      "CREATE FUNCTION app.reset() RETURNS void AS $$ TRUNCATE orders; $$ LANGUAGE sql;\nSELECT App.Reset();\n",
      "TRUNCATE",
    ],
    [
      "a call of a function whose body calls a destructive one",
      "CREATE FUNCTION reset() RETURNS void AS $$ TRUNCATE orders; $$ LANGUAGE sql;\n" +
        "CREATE FUNCTION reset_all() RETURNS void AS $$ SELECT reset(); $$ LANGUAGE sql;\nSELECT reset_all();\n",
      "TRUNCATE",
    ],
  ])("warns on a destructive function body run by %s", async (_how, sql, label) => {
    const issues = await runOn(`${HEADER}${sql}`);
    expect(issues.filter((i) => i.code === "QFAI-DB-001").map((i) => i.message)).toEqual([
      expect.stringContaining(`Dangerous SQL operation found: ${label}.`),
    ]);
  });

  it.each([
    [
      "a call before the definition",
      "SELECT reset();\nCREATE FUNCTION reset() RETURNS void AS $$ TRUNCATE orders; $$ LANGUAGE sql;\n",
    ],
    [
      "a call of a harmless function",
      "CREATE FUNCTION touch() RETURNS void AS $$ UPDATE orders SET note = ''; $$ LANGUAGE sql;\nSELECT touch();\n",
    ],
    [
      "a call of a function with a longer name",
      "CREATE FUNCTION reset() RETURNS void AS $$ TRUNCATE orders; $$ LANGUAGE sql;\nSELECT reset_all();\n",
    ],
    [
      "a name in a string",
      "CREATE FUNCTION reset() RETURNS void AS $$ TRUNCATE orders; $$ LANGUAGE sql;\nSELECT 'reset()';\n",
    ],
  ])("does not warn on %s", async (_where, sql) => {
    const issues = await runOn(`${HEADER}${sql}`);
    expect(issues.filter((i) => i.code === "QFAI-DB-001")).toEqual([]);
  });

  it("reports each dangerous operation once per file", async () => {
    const issues = await runOn(`${HEADER}DROP TABLE a;\nDROP TABLE b;\n`);
    expect(issues.filter((i) => i.code === "QFAI-DB-001")).toHaveLength(1);
  });

  it("still requires the contract id declaration", async () => {
    const issues = await runOn("CREATE TABLE t (a int);\n");
    expect(issues.map((i) => i.code)).toContain("QFAI-CONTRACT-010");
  });
});
