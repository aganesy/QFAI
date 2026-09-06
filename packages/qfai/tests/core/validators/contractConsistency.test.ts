/**
 * Cross-contract state-domain reconciliation (`QFAI-CONTRACT-040`).
 *
 * Focus: the two indirection edges an API/DB pairing normally travels
 * through, both of which silently turned the check into a no-op:
 *   - OpenAPI `status: { $ref: "#/components/schemas/OrderStatus" }`
 *   - PostgreSQL `CREATE TYPE order_status AS ENUM (...)` + `status order_status`
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  collectApiStateEnums,
  collectSqlEnumDomains,
  validateContractConsistency,
} from "../../../src/core/validators/contractConsistency.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-contract-040-"));
  tempDirs.push(dir);
  return dir;
}

async function seedPair(apiYaml: string, dbSql: string): Promise<{ api: string; db: string }> {
  const root = await newTempDir();
  const api = path.join(root, "api-0001.yaml");
  const db = path.join(root, "db-0001.sql");
  await writeFile(api, apiYaml, "utf-8");
  await writeFile(db, dbSql, "utf-8");
  return { api, db };
}

const INLINE_ENUM_API = [
  "openapi: 3.0.3",
  "components:",
  "  schemas:",
  "    Order:",
  "      type: object",
  "      properties:",
  "        status:",
  "          type: string",
  "          enum: [pending, paid, failed]",
  "",
].join("\n");

const REF_ENUM_API = [
  "openapi: 3.0.3",
  "components:",
  "  schemas:",
  "    Order:",
  "      type: object",
  "      properties:",
  "        status:",
  '          $ref: "#/components/schemas/OrderStatus"',
  "    OrderStatus:",
  "      type: string",
  "      enum: [pending, paid, failed]",
  "",
].join("\n");

const CHECK_IN_DB = [
  "CREATE TABLE orders (",
  "  id uuid PRIMARY KEY,",
  "  status text NOT NULL,",
  "  CONSTRAINT orders_status_chk CHECK (status IN ('pending', 'paid'))",
  ");",
  "",
].join("\n");

const NAMED_TYPE_DB = [
  "CREATE TYPE order_status AS ENUM ('pending', 'paid');",
  "",
  "CREATE TABLE orders (",
  "  id uuid PRIMARY KEY,",
  "  status order_status NOT NULL DEFAULT 'pending'",
  ");",
  "",
].join("\n");

describe("collectApiStateEnums — local $ref resolution", () => {
  it("keys a $ref'd enum by the referencing field name", () => {
    const doc = {
      components: {
        schemas: {
          Order: { properties: { status: { $ref: "#/components/schemas/OrderStatus" } } },
          OrderStatus: { type: "string", enum: ["pending", "paid", "failed"] },
        },
      },
    };
    const found = collectApiStateEnums(doc);
    expect(found.has("status")).toBe(true);
    expect(Array.from(found.get("status")?.values ?? []).sort()).toEqual([
      "failed",
      "paid",
      "pending",
    ]);
  });

  it("follows a chain of local $refs", () => {
    const doc = {
      components: {
        schemas: {
          Order: { properties: { state: { $ref: "#/components/schemas/StateAlias" } } },
          StateAlias: { $ref: "#/components/schemas/OrderState" },
          OrderState: { enum: ["open", "closed"] },
        },
      },
    };
    expect(Array.from(collectApiStateEnums(doc).get("state")?.values ?? []).sort()).toEqual([
      "closed",
      "open",
    ]);
  });

  it("terminates on a self-referential $ref cycle", () => {
    const doc = {
      components: { schemas: { Loop: { $ref: "#/components/schemas/Loop" } } },
      properties: { status: { $ref: "#/components/schemas/Loop" } },
    };
    expect(collectApiStateEnums(doc).has("status")).toBe(false);
  });

  it("ignores a remote $ref it cannot honestly resolve", () => {
    const doc = { properties: { status: { $ref: "other.yaml#/components/schemas/Status" } } };
    expect(collectApiStateEnums(doc).has("status")).toBe(false);
  });

  it("prefers an inline enum over the $ref", () => {
    const doc = {
      components: { schemas: { S: { enum: ["a"] } } },
      properties: { status: { enum: ["x", "y"], $ref: "#/components/schemas/S" } },
    };
    expect(Array.from(collectApiStateEnums(doc).get("status")?.values ?? []).sort()).toEqual([
      "x",
      "y",
    ]);
  });

  it("collects a shared schema object under every field that points at it", () => {
    // A YAML anchor reused by a second field (`state: &s {...}` then
    // `status: *s`) parses to ONE object both fields reference. Guarding the
    // walk on the node alone made that a one-shot: the second field was
    // skipped and its domain never reached the reconciliation, so
    // QFAI-CONTRACT-040 could not fire on it at all.
    const shared = { enum: ["open", "closed"] };
    const doc = { properties: { state: shared, status: shared } };
    const found = collectApiStateEnums(doc);
    expect(Array.from(found.get("state")?.values ?? []).sort()).toEqual(["closed", "open"]);
    expect(Array.from(found.get("status")?.values ?? []).sort()).toEqual(["closed", "open"]);
  });

  it("still terminates when a shared object participates in a cycle", () => {
    const node: Record<string, unknown> = { enum: ["a"] };
    node.status = node;
    expect(() => collectApiStateEnums({ properties: { status: node } })).not.toThrow();
    expect(Array.from(collectApiStateEnums({ properties: { status: node } }).keys())).toContain(
      "status",
    );
  });
});

describe("collectSqlEnumDomains — named enum type usage", () => {
  it("carries a CREATE TYPE domain onto the column declared with it", () => {
    const domains = collectSqlEnumDomains(NAMED_TYPE_DB);
    expect(domains.get("status")).toEqual(["pending", "paid"]);
    // The type name is not republished once it resolved to a column: keeping both would report
    // the same contradiction twice, as `status` and again as `order_status`.
    expect(domains.has("order_status")).toBe(false);
  });

  it("keeps the type-name entry when no column usage is visible in this file", () => {
    const domains = collectSqlEnumDomains(
      "CREATE TYPE order_status AS ENUM ('pending', 'paid');\n",
    );
    expect(domains.get("order_status")).toEqual(["pending", "paid"]);
  });

  it("resolves a schema-qualified type and a single-line table body", () => {
    const sql = [
      "CREATE TYPE public.order_status AS ENUM ('pending', 'paid');",
      "CREATE TABLE orders (id uuid PRIMARY KEY, status public.order_status NOT NULL);",
    ].join("\n");
    expect(collectSqlEnumDomains(sql).get("status")).toEqual(["pending", "paid"]);
  });

  it("resolves ADD COLUMN and ALTER COLUMN ... TYPE usages", () => {
    const sql = [
      "CREATE TYPE order_status AS ENUM ('pending', 'paid');",
      "ALTER TABLE orders ADD COLUMN status order_status NOT NULL;",
      "ALTER TABLE shipments ALTER COLUMN delivery_status TYPE order_status;",
    ].join("\n");
    const domains = collectSqlEnumDomains(sql);
    expect(domains.get("status")).toEqual(["pending", "paid"]);
    expect(domains.get("delivery_status")).toEqual(["pending", "paid"]);
  });

  it("ignores a commented-out domain", () => {
    // The DB contract template ships full-line `-- QFAI-CONTRACT-ID:` headers,
    // so raw-text scanning carries comment content into the extractor and
    // QFAI-CONTRACT-040 can fire on a domain nobody declared.
    const sql = [
      "-- QFAI-CONTRACT-ID: db-0001",
      "-- CREATE TYPE legacy_status AS ENUM ('ghost');",
      "/* CHECK (status IN ('phantom')) */",
      "CREATE TABLE orders (",
      "  status text CHECK (status IN ('pending', 'paid'))",
      ");",
    ].join("\n");
    const domains = collectSqlEnumDomains(sql);
    expect(domains.get("status")).toEqual(["pending", "paid"]);
    expect(domains.has("legacy_status")).toBe(false);
  });

  it("does not treat a comment marker inside a string literal as a comment", () => {
    const sql = "CREATE TABLE t (status text CHECK (status IN ('a--b', 'c')));";
    expect(collectSqlEnumDomains(sql).get("status")).toEqual(["a--b", "c"]);
  });

  it("reads a quote-escaped enum value as one value", () => {
    // `''` is SQL's escaped quote. Splitting on a bare `'` turned `don''t`
    // into fragments and dropped the rest of the list.
    const sql = "CREATE TYPE mood AS ENUM ('don''t', 'ok'); CREATE TABLE t (status mood);";
    expect(collectSqlEnumDomains(sql).get("status")).toEqual(["don't", "ok"]);
  });

  it("does not invent a column domain when no named type is declared", () => {
    const domains = collectSqlEnumDomains(CHECK_IN_DB);
    expect(Array.from(domains.keys())).toEqual(["status"]);
  });
});

describe("validateContractConsistency (QFAI-CONTRACT-040)", () => {
  it("reports an API value the CHECK-IN domain cannot store", async () => {
    const { api, db } = await seedPair(INLINE_ENUM_API, CHECK_IN_DB);
    const issues = await validateContractConsistency([api], [db]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-CONTRACT-040");
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("failed");
  });

  it("reports across a $ref'd API enum and a named DB enum type", async () => {
    const { api, db } = await seedPair(REF_ENUM_API, NAMED_TYPE_DB);
    const issues = await validateContractConsistency([api], [db]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-CONTRACT-040");
    expect(issues[0]?.message).toContain("failed");
  });

  it("raises an ENUM-backed contradiction to error", async () => {
    // The severity is the point of #1100. A Postgres ENUM rejects an
    // out-of-domain value at insert time, so the two contracts cannot both be
    // implemented — and every gate qfai prescribes is `--fail-on error`, so at
    // `warning` this never blocked anything and Postgres found it first.
    const { api, db } = await seedPair(REF_ENUM_API, NAMED_TYPE_DB);
    const issues = await validateContractConsistency([api], [db]);
    expect(issues[0]?.severity).toBe("error");
    // The message says which form the bound is, because that is what the
    // severity turns on — a reader seeing `error` on one field and `warning`
    // on another should not have to open the SQL to find out why.
    expect(issues[0]?.message).toContain("ENUM");
    // And the remedy names the canonical side rather than offering both
    // directions symmetrically, which was the whole judgement call.
    expect(issues[0]?.suggested_action).toContain("ENUM が正です");
  });

  it("keeps a CHECK-constraint contradiction a warning", async () => {
    // A check constraint is a bound the DB currently asserts, not the shape of
    // the column: it can be dropped, replaced, or declared `NOT VALID`. Raising
    // it too would lose the distinction between "impossible" and "currently
    // disallowed", which is the distinction the issue asked to keep.
    const { api, db } = await seedPair(INLINE_ENUM_API, CHECK_IN_DB);
    const issues = await validateContractConsistency([api], [db]);
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("CHECK");
    // Both directions stay open here, and the remedy says how to choose.
    expect(issues[0]?.suggested_action).toContain("Contracts 表");
  });

  it("takes the enum severity when both forms bound one field", async () => {
    // The strictest constraint is the one an implementation has to satisfy, so
    // a column that is an ENUM *and* carries a redundant CHECK is still
    // impossible to violate.
    const both = [
      "CREATE TYPE order_status AS ENUM ('pending', 'paid');",
      "CREATE TABLE orders (",
      "  id uuid PRIMARY KEY,",
      "  status order_status NOT NULL,",
      "  CONSTRAINT status_ck CHECK (status IN ('pending', 'paid'))",
      ");",
    ].join("\n");
    const { api, db } = await seedPair(REF_ENUM_API, both);
    const issues = await validateContractConsistency([api], [db]);
    expect(issues[0]?.severity).toBe("error");
  });

  /**
   * The pairing is by field NAME across every DB contract; the severity and
   * the domain are then attributed to one specific API field. Merging the
   * bindings before that attribution let a `status` ENUM on an unrelated table
   * decide the severity of a `status` column bounded by a plain CHECK — and
   * the message asserted `insert 時に拒絶される物理制約` of a field that has no
   * such constraint (#1162, reported against published 1.10.2).
   */
  describe("a field name several contracts declare", () => {
    const SIM_LINE_API = [
      "openapi: 3.0.3",
      "components:",
      "  schemas:",
      "    SimLine:",
      "      type: object",
      "      properties:",
      "        status:",
      "          type: string",
      "          enum: [active, inactive, in_call, standby, powered_off, error]",
      "",
    ].join("\n");

    /** The contract that actually bounds `sim_lines.status`: a plain CHECK. */
    const SIM_LINES_DB = [
      "CREATE TABLE sim_lines (",
      "  id uuid PRIMARY KEY,",
      "  status TEXT NOT NULL",
      "    CHECK (status IN ('active', 'inactive', 'in_call', 'error'))",
      ");",
      "",
    ].join("\n");

    /** A different table, in a different contract, whose column is also `status`. */
    const CALL_LISTS_DB = [
      "CREATE TYPE call_list_status AS ENUM ('pending', 'running', 'completed');",
      "",
      "CREATE TABLE call_lists (",
      "  id uuid PRIMARY KEY,",
      "  status call_list_status NOT NULL",
      ");",
      "",
    ].join("\n");

    async function seedMany(
      apiYaml: string,
      dbByName: Record<string, string>,
    ): Promise<{ api: string; dbs: string[] }> {
      const root = await newTempDir();
      const api = path.join(root, "api-0003-sim-lines.yaml");
      await writeFile(api, apiYaml, "utf-8");
      const dbs: string[] = [];
      for (const [name, sql] of Object.entries(dbByName)) {
        const target = path.join(root, name);
        await writeFile(target, sql, "utf-8");
        dbs.push(target);
      }
      return { api, dbs };
    }

    it("stays a warning when one candidate binding is a CHECK", async () => {
      const { api, dbs } = await seedMany(SIM_LINE_API, {
        "db-0002-call-lists.sql": CALL_LISTS_DB,
        "db-0003-sim-lines.sql": SIM_LINES_DB,
      });

      const issues = await validateContractConsistency([api], dbs);

      expect(issues).toHaveLength(1);
      // `standby` and `powered_off` are in neither domain, so the finding is
      // real — it is the SEVERITY that was borrowed from another table.
      expect(issues[0]?.message).toContain("powered_off, standby");
      expect(issues[0]?.severity).toBe("warning");
    });

    it("does not claim a physical constraint the field does not have", async () => {
      const { api, dbs } = await seedMany(SIM_LINE_API, {
        "db-0002-call-lists.sql": CALL_LISTS_DB,
        "db-0003-sim-lines.sql": SIM_LINES_DB,
      });

      const issues = await validateContractConsistency([api], dbs);

      expect(issues[0]?.message).not.toContain("insert 時に拒絶される物理制約");
      // Names the contract the ENUM came from, so the reader can see it is not
      // the one bounding their field. Read off the constraint clause alone:
      // every contract's path appears earlier in the message, so a whole-
      // message assertion would pass on either name.
      const message = issues[0]?.message ?? "";
      const constraintClause = message.slice(message.indexOf("DB 側の制約: "));
      expect(constraintClause).toContain("CHECK と ENUM の混在");
      expect(constraintClause).toContain("db-0002-call-lists.sql");
      expect(constraintClause).not.toContain("db-0003-sim-lines.sql");
      expect(issues[0]?.suggested_action).toContain("db-0002-call-lists.sql");
      expect(issues[0]?.suggested_action).toContain("db-0003-sim-lines.sql");
    });

    it("attributes the allowed values per contract, not as one domain", async () => {
      const { api, dbs } = await seedMany(SIM_LINE_API, {
        "db-0002-call-lists.sql": CALL_LISTS_DB,
        "db-0003-sim-lines.sql": SIM_LINES_DB,
      });

      const issues = await validateContractConsistency([api], dbs);

      // A flat union reported `completed`, `pending`, `running` as allowed
      // values for `SimLine.status`, which accepts four. The breakdown is what
      // lets a reader see which side each value came from.
      expect(issues[0]?.message).toContain("DB 側の許容値 (契約ごと)");
      expect(issues[0]?.message).toContain("db-0002-call-lists.sql: completed, pending, running");
      expect(issues[0]?.message).toContain(
        "db-0003-sim-lines.sql: active, error, in_call, inactive",
      );
    });

    it("still raises to error when every candidate binding is an ENUM", async () => {
      // The mix is what removes the claim. Where nothing can store the value,
      // the finding #1100 raised is unchanged.
      const OTHER_ENUM_DB = [
        "CREATE TYPE sim_line_status AS ENUM ('active', 'inactive', 'in_call', 'error');",
        "",
        "CREATE TABLE sim_lines (",
        "  id uuid PRIMARY KEY,",
        "  status sim_line_status NOT NULL",
        ");",
        "",
      ].join("\n");
      const { api, dbs } = await seedMany(SIM_LINE_API, {
        "db-0002-call-lists.sql": CALL_LISTS_DB,
        "db-0003-sim-lines.sql": OTHER_ENUM_DB,
      });

      const issues = await validateContractConsistency([api], dbs);

      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.message).toContain("ENUM (insert 時に拒絶される物理制約)");
    });

    /**
     * The same conflation, one level down: `collectSqlDomainBounds` keys on the
     * column NAME, so two tables in ONE contract that each have a `status`
     * column collapse to a single bound with `enumBacked` OR-ed — and the
     * per-contract split above cannot see inside it.
     */
    it("stays a warning when the two forms are on different tables in one contract", async () => {
      const twoTables = [
        "CREATE TYPE call_list_status AS ENUM ('pending', 'running', 'completed');",
        "",
        "CREATE TABLE call_lists (",
        "  id uuid PRIMARY KEY,",
        "  status call_list_status NOT NULL",
        ");",
        "",
        "CREATE TABLE sim_lines (",
        "  id uuid PRIMARY KEY,",
        "  status TEXT NOT NULL",
        "    CHECK (status IN ('active', 'inactive', 'in_call', 'error'))",
        ");",
        "",
      ].join("\n");
      const { api, dbs } = await seedMany(SIM_LINE_API, { "db-0009-both.sql": twoTables });

      const issues = await validateContractConsistency([api], dbs);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.severity).toBe("warning");
      // The ENUM is still named: it is what the reader has to look at to settle
      // which table the API field pairs with.
      const message = issues[0]?.message ?? "";
      expect(message.slice(message.indexOf("DB 側の制約: "))).toContain("CHECK と ENUM の混在");
    });

    it("still raises to error when the redundant CHECK is on the only table", async () => {
      // #1100's case, and the reason the tie is broken on the table count
      // rather than on the mere presence of both forms: with one table there is
      // one column of that name, so the CHECK is redundant on the ENUM column
      // and the value is refused at insert time either way.
      const oneTable = [
        "CREATE TYPE sim_line_status AS ENUM ('active', 'inactive', 'in_call', 'error');",
        "",
        "CREATE TABLE sim_lines (",
        "  id uuid PRIMARY KEY,",
        "  status sim_line_status NOT NULL,",
        "  CONSTRAINT sim_lines_status_ck",
        "    CHECK (status IN ('active', 'inactive', 'in_call', 'error'))",
        ");",
        "",
      ].join("\n");
      const { api, dbs } = await seedMany(SIM_LINE_API, { "db-0003-sim-lines.sql": oneTable });

      const issues = await validateContractConsistency([api], dbs);

      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.message).toContain("ENUM (insert 時に拒絶される物理制約)");
    });

    it("does not let a commented-out CREATE TABLE make one table look like two", async () => {
      const oneTable = [
        "-- CREATE TABLE archived_sim_lines (status TEXT);",
        "CREATE TYPE sim_line_status AS ENUM ('active', 'inactive', 'in_call', 'error');",
        "",
        "CREATE TABLE sim_lines (",
        "  id uuid PRIMARY KEY,",
        "  status sim_line_status NOT NULL,",
        "  CONSTRAINT sim_lines_status_ck",
        "    CHECK (status IN ('active', 'inactive', 'in_call', 'error'))",
        ");",
        "",
      ].join("\n");
      const { api, dbs } = await seedMany(SIM_LINE_API, { "db-0003-sim-lines.sql": oneTable });

      const issues = await validateContractConsistency([api], dbs);

      expect(issues[0]?.severity).toBe("error");
    });

    it("keeps the single-contract message flat", async () => {
      const { api, dbs } = await seedMany(SIM_LINE_API, {
        "db-0003-sim-lines.sql": SIM_LINES_DB,
      });

      const issues = await validateContractConsistency([api], dbs);

      expect(issues[0]?.severity).toBe("warning");
      expect(issues[0]?.message).toContain("DB 側の許容値: active, error, in_call, inactive");
      expect(issues[0]?.message).not.toContain("契約ごと");
    });
  });

  it("reports a $ref'd API enum against a CHECK-IN column", async () => {
    const { api, db } = await seedPair(REF_ENUM_API, CHECK_IN_DB);
    const issues = await validateContractConsistency([api], [db]);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-CONTRACT-040"]);
  });

  it("reports an inline API enum against a named DB enum type", async () => {
    const { api, db } = await seedPair(INLINE_ENUM_API, NAMED_TYPE_DB);
    const issues = await validateContractConsistency([api], [db]);
    expect(issues.map((i) => i.code)).toEqual(["QFAI-CONTRACT-040"]);
  });

  it("stays silent when the DB domain covers every API value", async () => {
    const covering = [
      "CREATE TYPE order_status AS ENUM ('pending', 'paid', 'failed');",
      "CREATE TABLE orders (id uuid PRIMARY KEY, status order_status NOT NULL);",
    ].join("\n");
    const { api, db } = await seedPair(REF_ENUM_API, covering);
    expect(await validateContractConsistency([api], [db])).toEqual([]);
  });

  it("stays silent when only one side declares a domain", async () => {
    const { api, db } = await seedPair(
      REF_ENUM_API,
      "CREATE TABLE orders (id uuid PRIMARY KEY, note text);\n",
    );
    expect(await validateContractConsistency([api], [db])).toEqual([]);
  });
});
