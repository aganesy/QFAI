/**
 * A multi-file schema had no way to state its own composition.
 *
 * `QFAI-CONTRACT-011` makes a second `QFAI-CONTRACT-ID` in one file a hard
 * `error`, so any schema larger than a single table necessarily becomes N
 * cross-referencing contract files. qfai then provided nowhere to say which
 * ones must be applied first: no rule in `contract-artifact-rules.md`, no
 * column in the shipped Contract Index, and a `ContractIndex` that modelled only
 * `id -> files`.
 *
 * Every consumer had to reconstruct the apply graph by reading the DDL, and
 * getting it wrong is **silent** — the wrong contract subset still applies
 * cleanly and the tests still go green, against a schema that lacks the tables
 * under test.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { buildContractIndex } from "../../src/core/contractIndex.js";
import {
  extractDeclaredDependencies,
  hasDependencyDeclaration,
} from "../../src/core/contractsDecl.js";
import { validateContracts } from "../../src/core/validators/contracts.js";

async function withContracts<T>(
  files: { db?: Record<string, string>; api?: Record<string, string> },
  fn: (root: string) => Promise<T>,
): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-condeps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await mkdir(path.join(root, ".qfai", "contracts", "db"), { recursive: true });
  await mkdir(path.join(root, ".qfai", "contracts", "api"), { recursive: true });
  try {
    for (const [name, body] of Object.entries(files.db ?? {})) {
      await writeFile(path.join(root, ".qfai", "contracts", "db", name), body, "utf-8");
    }
    for (const [name, body] of Object.entries(files.api ?? {})) {
      await writeFile(path.join(root, ".qfai", "contracts", "api", name), body, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("the dependency declaration is parsed in each kind's own idiom", () => {
  it("reads a SQL comment line", () => {
    expect(
      extractDeclaredDependencies(
        "-- QFAI-CONTRACT-ID: CON-DB-0001\n-- Depends on: CON-DB-0002, CON-DB-0003\n",
      ),
    ).toEqual(["CON-DB-0002", "CON-DB-0003"]);
  });

  it("reads a YAML flow sequence", () => {
    expect(extractDeclaredDependencies("x-qfai-depends-on: [CON-API-0002, CON-DB-0001]\n")).toEqual(
      ["CON-API-0002", "CON-DB-0001"],
    );
  });

  it("reads a YAML block sequence", () => {
    expect(
      extractDeclaredDependencies("x-qfai-depends-on:\n  - CON-API-0002\n  - CON-API-0003\n"),
    ).toEqual(["CON-API-0002", "CON-API-0003"]);
  });

  it("reads `-` as no dependencies rather than as a malformed one", () => {
    // The shipped template writes `-` for the empty case; parsing it as a
    // dependency would make every scaffolded contract fail the new rule.
    expect(extractDeclaredDependencies("-- Depends on: -\n")).toEqual([]);
  });

  it("returns nothing when the file declares none", () => {
    expect(extractDeclaredDependencies("CREATE TABLE t (a int);\n")).toEqual([]);
  });
});

describe("the index records the composition", () => {
  it("maps a contract id to what it depends on", async () => {
    await withContracts(
      {
        db: {
          "a.sql": "-- QFAI-CONTRACT-ID: CON-DB-0001\n-- Depends on: CON-DB-0002\n",
          "b.sql": "-- QFAI-CONTRACT-ID: CON-DB-0002\nCREATE TABLE b (x int);\n",
        },
      },
      async (root) => {
        const index = await buildContractIndex(root, defaultConfig);
        expect([...(index.idToDependencies.get("CON-DB-0001") ?? [])]).toEqual(["CON-DB-0002"]);
        expect(index.idToDependencies.has("CON-DB-0002")).toBe(false);
      },
    );
  });

  it("drops a self-reference, which is a typo and not a dependency", async () => {
    // Recording it would make every such graph trivially cyclic.
    await withContracts(
      { db: { "a.sql": "-- QFAI-CONTRACT-ID: CON-DB-0001\n-- Depends on: CON-DB-0001\n" } },
      async (root) => {
        const index = await buildContractIndex(root, defaultConfig);
        expect(index.idToDependencies.get("CON-DB-0001")?.size ?? 0).toBe(0);
      },
    );
  });
});

describe("QFAI-CONTRACT-014 — a declared dependency must resolve", () => {
  it("errors on a dependency naming no existing contract", async () => {
    await withContracts(
      { db: { "a.sql": "-- QFAI-CONTRACT-ID: CON-DB-0001\n-- Depends on: CON-DB-0099\n" } },
      async (root) => {
        const issues = await validateContracts(root, defaultConfig);
        const found = issues.find((i) => i.code === "QFAI-CONTRACT-014");
        expect(found?.severity).toBe("error");
        expect(found?.refs).toEqual(["CON-DB-0099"]);
      },
    );
  });

  it("stays silent when every dependency resolves", async () => {
    await withContracts(
      {
        db: {
          "a.sql": "-- QFAI-CONTRACT-ID: CON-DB-0001\n-- Depends on: CON-DB-0002\n",
          "b.sql": "-- QFAI-CONTRACT-ID: CON-DB-0002\nCREATE TABLE b (x int);\n",
        },
      },
      async (root) => {
        const issues = await validateContracts(root, defaultConfig);
        expect(issues.map((i) => i.code)).not.toContain("QFAI-CONTRACT-014");
      },
    );
  });

  it("resolves across contract kinds", async () => {
    // An API contract may legitimately require a table to exist first.
    await withContracts(
      {
        db: { "b.sql": "-- QFAI-CONTRACT-ID: CON-DB-0002\nCREATE TABLE b (x int);\n" },
        api: {
          "a.yaml":
            "# QFAI-CONTRACT-ID: CON-API-0001\nopenapi: 3.0.0\nx-qfai-depends-on: [CON-DB-0002]\n",
        },
      },
      async (root) => {
        const issues = await validateContracts(root, defaultConfig);
        expect(issues.map((i) => i.code)).not.toContain("QFAI-CONTRACT-014");
      },
    );
  });

  it("does not collide with the duplicate-id rule's code", async () => {
    // `QFAI-CONTRACT-013` was already taken by duplicate ids; sharing it would
    // make the two unfilterable apart.
    await withContracts(
      {
        db: {
          "a.sql": "-- QFAI-CONTRACT-ID: CON-DB-0001\nCREATE TABLE a (x int);\n",
          "b.sql": "-- QFAI-CONTRACT-ID: CON-DB-0001\nCREATE TABLE b (x int);\n",
        },
      },
      async (root) => {
        const issues = await validateContracts(root, defaultConfig);
        expect(issues.map((i) => i.code)).toContain("QFAI-CONTRACT-013");
        expect(issues.map((i) => i.code)).not.toContain("QFAI-CONTRACT-014");
      },
    );
  });
});

describe("the declaration itself is distinguishable from its absence", () => {
  it("reads `-` as a declaration, not as silence", () => {
    // `extractDeclaredDependencies` returns `[]` for both, which is why the
    // presence check cannot be derived from it.
    expect(hasDependencyDeclaration("-- Depends on: -\n")).toBe(true);
    expect(hasDependencyDeclaration("x-qfai-depends-on: []\n")).toBe(true);
  });

  it("reads the YAML block form", () => {
    expect(hasDependencyDeclaration("x-qfai-depends-on:\n  - CON-API-0002\n")).toBe(true);
  });

  it("reports a file that says nothing about apply order", () => {
    expect(
      hasDependencyDeclaration("-- QFAI-CONTRACT-ID: CON-DB-0001\nCREATE TABLE a (x int);\n"),
    ).toBe(false);
  });

  it("reads a valueless key as silence, not as a declaration", () => {
    // The key alone states nothing, so accepting it would suppress
    // `QFAI-CONTRACT-015` for exactly the file the rule is about.
    expect(hasDependencyDeclaration("-- Depends on:\nCREATE TABLE a (x int);\n")).toBe(false);
    expect(hasDependencyDeclaration("x-qfai-depends-on:\nopenapi: 3.0.0\n")).toBe(false);
    expect(hasDependencyDeclaration("-- Depends on: TBD\n")).toBe(false);
  });
});

describe("QFAI-CONTRACT-015 — a contract must state its apply order", () => {
  it("warns on a contract that declares none at all", async () => {
    await withContracts(
      { db: { "a.sql": "-- QFAI-CONTRACT-ID: CON-DB-0001\nCREATE TABLE a (x int);\n" } },
      async (root) => {
        const issues = await validateContracts(root, defaultConfig);
        const found = issues.find((i) => i.code === "QFAI-CONTRACT-015");
        expect(found?.severity).toBe("warning");
        expect(found?.refs).toEqual(["CON-DB-0001"]);
      },
    );
  });

  it("stays silent when the contract writes `-` for none", async () => {
    await withContracts(
      {
        db: {
          "a.sql": "-- QFAI-CONTRACT-ID: CON-DB-0001\n-- Depends on: -\nCREATE TABLE a (x int);\n",
        },
      },
      async (root) => {
        const issues = await validateContracts(root, defaultConfig);
        expect(issues.map((i) => i.code)).not.toContain("QFAI-CONTRACT-015");
      },
    );
  });

  it("stays silent on an API contract declaring in its own idiom", async () => {
    await withContracts(
      {
        api: {
          "a.yaml":
            "# QFAI-CONTRACT-ID: CON-API-0001\nopenapi: 3.0.0\nx-qfai-depends-on: [CON-API-0002]\n",
          "b.yaml": "# QFAI-CONTRACT-ID: CON-API-0002\nopenapi: 3.0.0\nx-qfai-depends-on: []\n",
        },
      },
      async (root) => {
        const issues = await validateContracts(root, defaultConfig);
        expect(issues.map((i) => i.code)).not.toContain("QFAI-CONTRACT-015");
      },
    );
  });

  it("leaves a file with no contract id to QFAI-CONTRACT-010", async () => {
    // Two findings on one file would only dilute the one that matters.
    await withContracts({ db: { "a.sql": "CREATE TABLE a (x int);\n" } }, async (root) => {
      const issues = await validateContracts(root, defaultConfig);
      expect(issues.map((i) => i.code)).toContain("QFAI-CONTRACT-010");
      expect(issues.map((i) => i.code)).not.toContain("QFAI-CONTRACT-015");
    });
  });
});
