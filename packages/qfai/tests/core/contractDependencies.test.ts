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

  it("reads a YAML flow sequence carrying a trailing comment", () => {
    // `# …` is a comment, not part of the value, and explaining *why* the order
    // holds is the natural thing to write there. An end-of-line anchor made the
    // declaration invisible, so a conforming file earned `QFAI-CONTRACT-015`
    // and its correct index row `QFAI-CONTRACT-033`.
    expect(
      extractDeclaredDependencies("x-qfai-depends-on: [CON-DB-0001] # DB を先に適用\n", "a.yaml"),
    ).toEqual(["CON-DB-0001"]);
    expect(hasDependencyDeclaration("x-qfai-depends-on: [] # 依存なし\n", "a.yaml")).toBe(true);
  });

  it("reads the key from a JSON contract, quoted and across lines", () => {
    // `.json` is collected as an API contract, but every other lane here is a
    // regex over an unquoted YAML key on one line.
    expect(
      extractDeclaredDependencies(
        [
          "// QFAI-CONTRACT-ID: CON-API-0001",
          "{",
          '  "openapi": "3.1.0",',
          '  "x-qfai-depends-on": [',
          '    "CON-API-0002",',
          '    "CON-DB-0001"',
          "  ]",
          "}",
          "",
        ].join("\n"),
      ),
    ).toEqual(["CON-API-0002", "CON-DB-0001"]);
  });

  it("reads a YAML block sequence", () => {
    expect(
      extractDeclaredDependencies("x-qfai-depends-on:\n  - CON-API-0002\n  - CON-API-0003\n"),
    ).toEqual(["CON-API-0002", "CON-API-0003"]);
  });

  it("reads a YAML block sequence whose items carry trailing comments", () => {
    // Same comment, block spelling. The item pattern allowed only whitespace
    // after the value, so the sequence ended at the first commented item and
    // `CON-API-0002` was dropped — leaving a truncated apply order that
    // disagrees with the correct index row (`QFAI-CONTRACT-033`).
    expect(
      extractDeclaredDependencies(
        "x-qfai-depends-on:\n  - CON-DB-0001 # schema first\n  - CON-API-0002\n",
        "a.yaml",
      ),
    ).toEqual(["CON-API-0002", "CON-DB-0001"]);
    expect(
      hasDependencyDeclaration("x-qfai-depends-on:\n  - CON-DB-0001 # schema first\n", "a.yaml"),
    ).toBe(true);
  });

  it("does not read a contract id out of a block item's comment", () => {
    // The ids come from the item values, not from the matched block text: a
    // comment naming a contract says it is *not* a dependency.
    expect(
      extractDeclaredDependencies(
        "x-qfai-depends-on:\n  - CON-DB-0001 # replaces CON-DB-0002\n",
        "a.yaml",
      ),
    ).toEqual(["CON-DB-0001"]);
  });

  it("reads a YAML block sequence saved with CRLF line endings", () => {
    // The block form is the one declaration spanning several lines, so it was
    // the only one CRLF broke: the key's `\n` did not match `\r\n`, and past it
    // each item ended at its own `\r`, stopping the repetition after the first.
    // A contract saved on Windows declared its apply order to no effect —
    // `QFAI-CONTRACT-015` on a file that had declared, and `-033` against its
    // correct index row.
    const crlf = "openapi: 3.0.0\r\nx-qfai-depends-on:\r\n  - CON-DB-0001\r\n  - CON-API-0002\r\n";
    expect(extractDeclaredDependencies(crlf, "a.yaml")).toEqual(["CON-API-0002", "CON-DB-0001"]);
    expect(hasDependencyDeclaration(crlf, "a.yaml")).toBe(true);
    // The trailing-comment form has to survive CRLF too.
    expect(
      extractDeclaredDependencies(
        "x-qfai-depends-on:\r\n  - CON-DB-0001 # schema first\r\n",
        "a.yaml",
      ),
    ).toEqual(["CON-DB-0001"]);
  });

  it("reads the single-line forms saved with CRLF line endings", () => {
    // A pin, not a regression: `$` already matches before a `\r`, so these were
    // never broken and must not be disturbed by the block form's `\r?\n`.
    expect(extractDeclaredDependencies("-- Depends on: CON-DB-0002\r\n", "a.sql")).toEqual([
      "CON-DB-0002",
    ]);
    expect(extractDeclaredDependencies("x-qfai-depends-on: [CON-DB-0001]\r\n", "a.yaml")).toEqual([
      "CON-DB-0001",
    ]);
    expect(hasDependencyDeclaration("-- Depends on: -\r\n", "a.sql")).toBe(true);
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

  it("reads an empty JSON array as `none`, and its absence as silence", () => {
    const json = (body: string): string =>
      `// QFAI-CONTRACT-ID: CON-API-0001\n{\n  "openapi": "3.1.0"${body}\n}\n`;
    expect(hasDependencyDeclaration(json(',\n  "x-qfai-depends-on": []'))).toBe(true);
    expect(hasDependencyDeclaration(json(',\n  "x-qfai-depends-on": "-"'))).toBe(true);
    expect(hasDependencyDeclaration(json(""))).toBe(false);
  });

  it("does not accept a JSON value that is not an array", () => {
    // Reading ids out of a stringification of the whole value accepted anything
    // that merely *contained* one, so an object or a bare string suppressed
    // `QFAI-CONTRACT-015` and fed the id to the `-014` / `-033` checks as
    // though an apply order had been stated.
    const json = (value: string): string =>
      `// QFAI-CONTRACT-ID: CON-API-0001\n{\n  "x-qfai-depends-on": ${value}\n}\n`;
    expect(extractDeclaredDependencies(json('{ "note": "CON-API-0002" }'))).toEqual([]);
    expect(extractDeclaredDependencies(json('"CON-API-0002"'))).toEqual([]);
    expect(hasDependencyDeclaration(json('{ "note": "CON-API-0002" }'))).toBe(false);
    expect(hasDependencyDeclaration(json('"CON-API-0002"'))).toBe(false);
    expect(extractDeclaredDependencies(json('["CON-API-0002"]'))).toEqual(["CON-API-0002"]);
  });

  it("does not accept a JSON array holding no contract id", () => {
    // `["TBD"]` states no apply order: nothing to check referentially, so
    // accepting it would leave the order undetermined and unreported.
    const json = (value: string): string =>
      `// QFAI-CONTRACT-ID: CON-API-0001\n{\n  "x-qfai-depends-on": ${value}\n}\n`;
    expect(hasDependencyDeclaration(json('["TBD"]'))).toBe(false);
    expect(hasDependencyDeclaration(json("[null]"))).toBe(false);
    expect(hasDependencyDeclaration(json('["CON-API-0002"]'))).toBe(true);
  });

  it("does not accept a SQL or YAML list holding an element that is not an id", () => {
    // Harvesting the recognisable ids and discarding the rest let a half-written
    // declaration read as a finished one: the resolvable half satisfied
    // `QFAI-CONTRACT-014`, suppressed `-015`, and agreed under `-033` with an
    // index cell mirroring the same half — so the undetermined element left no
    // trace anywhere. `["TBD"]` was already rejected in the JSON lane; the other
    // three lanes now make the same judgement.
    expect(extractDeclaredDependencies("-- Depends on: CON-DB-0001, TBD\n", "a.sql")).toEqual([]);
    expect(hasDependencyDeclaration("-- Depends on: CON-DB-0001, TBD\n", "a.sql")).toBe(false);
    expect(
      extractDeclaredDependencies("x-qfai-depends-on: [CON-DB-0001, TBD]\n", "a.yaml"),
    ).toEqual([]);
    expect(hasDependencyDeclaration("x-qfai-depends-on: [CON-DB-0001, TBD]\n", "a.yaml")).toBe(
      false,
    );
    expect(
      extractDeclaredDependencies("x-qfai-depends-on:\n  - CON-DB-0001\n  - TBD\n", "a.yaml"),
    ).toEqual([]);
    expect(
      hasDependencyDeclaration("x-qfai-depends-on:\n  - CON-DB-0001\n  - TBD\n", "a.yaml"),
    ).toBe(false);
  });

  it("keeps reading a list whose every element is an id", () => {
    // The over-correction pin: rejecting a whole list on one bad element must
    // not touch a well-formed one, in any of the three text lanes, whichever
    // separator it uses.
    expect(
      extractDeclaredDependencies("-- Depends on: CON-DB-0002, CON-DB-0003\n", "a.sql"),
    ).toEqual(["CON-DB-0002", "CON-DB-0003"]);
    expect(
      extractDeclaredDependencies("-- Depends on: CON-DB-0002 CON-DB-0003\n", "a.sql"),
    ).toEqual(["CON-DB-0002", "CON-DB-0003"]);
    expect(
      extractDeclaredDependencies("x-qfai-depends-on: [CON-API-0002, CON-DB-0001]\n", "a.yaml"),
    ).toEqual(["CON-API-0002", "CON-DB-0001"]);
    expect(
      extractDeclaredDependencies(
        "x-qfai-depends-on:\n  - CON-DB-0001 # schema first\n  - CON-API-0002\n",
        "a.yaml",
      ),
    ).toEqual(["CON-API-0002", "CON-DB-0001"]);
    // `-` / `[]` still say "none" rather than naming a malformed element.
    expect(hasDependencyDeclaration("-- Depends on: -\n", "a.sql")).toBe(true);
    expect(hasDependencyDeclaration("x-qfai-depends-on: []\n", "a.yaml")).toBe(true);
  });

  it("ignores `Depends on:` written as prose in a YAML body", () => {
    // Without a comment marker the line is documentation, not a declaration —
    // and an OpenAPI `description` is where a *runtime* reference gets
    // explained, which this key must never list.
    const body = [
      "# QFAI-CONTRACT-ID: CON-API-0001",
      "openapi: 3.0.0",
      "info:",
      "  description: |",
      "    Depends on: CON-API-0002 at request time.",
      "",
    ].join("\n");
    expect(extractDeclaredDependencies(body, "api-0001.yaml")).toEqual([]);
    expect(hasDependencyDeclaration(body, "api-0001.yaml")).toBe(false);
  });

  it("ignores an `x-qfai-depends-on` nested below the top level", () => {
    const body = ["openapi: 3.0.0", "paths:", "  /orders:", "    x-qfai-depends-on: []", ""].join(
      "\n",
    );
    expect(hasDependencyDeclaration(body, "api-0001.yaml")).toBe(false);
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

  it("stays silent on a JSON API contract declaring `[]`", async () => {
    await withContracts(
      {
        api: {
          "a.json": [
            "// QFAI-CONTRACT-ID: CON-API-0001",
            "{",
            '  "openapi": "3.1.0",',
            '  "info": { "title": "Sample", "version": "0.1.0" },',
            '  "paths": {},',
            '  "x-qfai-depends-on": []',
            "}",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        const issues = await validateContracts(root, defaultConfig);
        expect(issues.map((i) => i.code)).not.toContain("QFAI-CONTRACT-015");
      },
    );
  });

  it("warns on a YAML contract whose only `Depends on:` is body prose", async () => {
    await withContracts(
      {
        api: {
          "a.yaml": [
            "# QFAI-CONTRACT-ID: CON-API-0001",
            "openapi: 3.0.0",
            "info:",
            "  description: |",
            "    Depends on: CON-API-0002 at request time.",
            "",
          ].join("\n"),
        },
      },
      async (root) => {
        const issues = await validateContracts(root, defaultConfig);
        const found = issues.find((i) => i.code === "QFAI-CONTRACT-015");
        expect(found?.refs).toEqual(["CON-API-0001"]);
        // The prose id must not reach the referential lane either.
        expect(issues.map((i) => i.code)).not.toContain("QFAI-CONTRACT-014");
      },
    );
  });

  it("warns on a contract whose list holds an undetermined element", async () => {
    await withContracts(
      {
        db: {
          "a.sql":
            "-- QFAI-CONTRACT-ID: CON-DB-0001\n-- Depends on: CON-DB-0002, TBD\nCREATE TABLE a (x int);\n",
          "b.sql": "-- QFAI-CONTRACT-ID: CON-DB-0002\n-- Depends on: -\nCREATE TABLE b (x int);\n",
        },
      },
      async (root) => {
        const issues = await validateContracts(root, defaultConfig);
        const found = issues.find((i) => i.code === "QFAI-CONTRACT-015");
        expect(found?.refs).toEqual(["CON-DB-0001"]);
        // The resolvable half must not reach the referential lane either — it
        // would resolve, and reporting nothing is what made the gap invisible.
        expect(issues.map((i) => i.code)).not.toContain("QFAI-CONTRACT-014");
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
