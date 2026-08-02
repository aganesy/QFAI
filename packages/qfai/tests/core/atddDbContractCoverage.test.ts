/**
 * `CON-DB-*` was a first-class authored contract kind with no downstream test
 * obligation.
 *
 * `contract-artifact-rules.md` mandates the prefix, `qfai init` ships a
 * `db-contract.sample.sql`, the Contract Index has a DB row, and the
 * `solution-architect` charter promises DB contracts "that make requirements
 * executable". But `/qfai-atdd` was never given `.qfai/contracts/db/**` to
 * read, `test-layers.md` defined no annotation form, and the string `CON-DB`
 * appeared zero times in `packages/qfai/src/`.
 *
 * The consequence is the one worth pinning: a `QFAI:CON-DB-0002` written into
 * a test matched nothing AND — because `AtddUnknownRefKind` had no DB member —
 * was not reported as an unknown reference either. It was silently invisible.
 * In a real project that left 18,210 lines of DB contract, 65% of the surface,
 * never driven at all, with `qfai validate` green throughout.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

const DB_CONTRACT = `-- QFAI-CONTRACT-ID: CON-DB-0001
CREATE TABLE orders (id TEXT PRIMARY KEY);
`;

type Project = {
  /** Extra `.sql` files under `.qfai/contracts/db/`. */
  db?: Record<string, string>;
  /** Test files, keyed by path relative to the project root. */
  tests?: Record<string, string>;
};

async function withProject<T>(spec: Project, fn: (root: string) => Promise<T>): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-condb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  await mkdir(path.join(root, ".qfai", "contracts", "db"), { recursive: true });
  try {
    // A minimal spec pack: enough for spec discovery, with no US/TC of its own
    // so the only findings under test are the CON-DB ones.
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["06_Test-Cases.md", "# TC\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    for (const [name, body] of Object.entries(spec.db ?? { "orders.sql": DB_CONTRACT })) {
      await writeFile(path.join(root, ".qfai", "contracts", "db", name), body, "utf-8");
    }
    for (const [rel, body] of Object.entries(spec.tests ?? {})) {
      const file = path.join(root, rel);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = async (root: string): Promise<string[]> =>
  (await validateAtddCodeTraceability(root, defaultConfig)).map((i) => i.code);

describe("QFAI-ATDD-115 — CON-DB coverage from integration tests", () => {
  it("errors when a declared CON-DB is referenced by no test", async () => {
    await withProject({}, async (root) => {
      expect(await codes(root)).toContain("QFAI-ATDD-115");
    });
  });

  it("is satisfied by a QFAI:CON-DB annotation in tests/integration/**", async () => {
    await withProject(
      { tests: { "tests/integration/orders.test.ts": "// QFAI:CON-DB-0001\n" } },
      async (root) => {
        const found = await codes(root);
        expect(found).not.toContain("QFAI-ATDD-115");
        expect(found).not.toContain("QFAI-ATDD-104");
      },
    );
  });

  // The layer choice is load-bearing, not cosmetic: L3 is the layer whose
  // declared scope is real infrastructure. An end-to-end assertion that never
  // touches the schema must not be able to close a DB contract.
  for (const dir of ["tests/e2e", "tests/api"]) {
    it(`does not count a CON-DB annotation in ${dir}/**`, async () => {
      await withProject(
        { tests: { [`${dir}/orders.test.ts`]: "// QFAI:CON-DB-0001\n" } },
        async (root) => {
          expect(await codes(root)).toContain("QFAI-ATDD-115");
        },
      );
    });
  }

  it("defers on a `-- x-qfai-status: planned` comment line, at info", async () => {
    await withProject(
      { db: { "orders.sql": `-- x-qfai-status: planned\n${DB_CONTRACT}` } },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.map((i) => i.code)).not.toContain("QFAI-ATDD-115");
        const deferred = issues.find((i) => i.code === "QFAI-ATDD-116");
        // Reported, not silent: a deferral that shrinks the gate invisibly is
        // the failure mode #274 describes for the API side.
        expect(deferred?.severity).toBe("info");
        expect(deferred?.refs).toEqual(["CON-DB-0001"]);
      },
    );
  });

  it("only honours the marker on its own comment line", async () => {
    // A mention inside a statement must not defer every contract in the file.
    await withProject(
      {
        db: {
          "orders.sql": `${DB_CONTRACT}INSERT INTO notes VALUES ('x-qfai-status: planned');\n`,
        },
      },
      async (root) => {
        expect(await codes(root)).toContain("QFAI-ATDD-115");
      },
    );
  });
});

describe("QFAI-ATDD-104 — an unknown CON-DB reference is now visible", () => {
  it("reports an annotation naming a contract that does not exist", async () => {
    // This is the defect's sharpest edge: before, this annotation was neither
    // counted nor reported. It simply did nothing.
    await withProject(
      { tests: { "tests/integration/orders.test.ts": "// QFAI:CON-DB-0002\n" } },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        const unknown = issues.find((i) => i.code === "QFAI-ATDD-104");
        expect(unknown?.severity).toBe("error");
        expect(unknown?.refs).toEqual(["QFAI:CON-DB-0002"]);
      },
    );
  });

  it("does not report a deferred contract as unknown", async () => {
    // Deferral suspends the obligation; it does not un-declare the contract, so
    // a test written ahead of the slice must not become an unknown reference.
    await withProject(
      {
        db: { "orders.sql": `-- x-qfai-status: planned\n${DB_CONTRACT}` },
        tests: { "tests/integration/orders.test.ts": "// QFAI:CON-DB-0001\n" },
      },
      async (root) => {
        expect(await codes(root)).not.toContain("QFAI-ATDD-104");
      },
    );
  });
});

describe("the scan result exposes the DB kind", () => {
  it("collects declared, active and deferred sets", async () => {
    await withProject(
      {
        db: {
          "orders.sql": DB_CONTRACT,
          "audit.sql": "-- x-qfai-status: planned\n-- QFAI-CONTRACT-ID: CON-DB-0002\n",
        },
      },
      async (root) => {
        const result = await evaluateAtddCodeTraceability(root, defaultConfig);
        expect([...result.dbContractIds].sort()).toEqual(["CON-DB-0001", "CON-DB-0002"]);
        expect([...result.activeDbContractIds]).toEqual(["CON-DB-0001"]);
        expect([...result.deferredDbContractIds]).toEqual(["CON-DB-0002"]);
      },
    );
  });
});
