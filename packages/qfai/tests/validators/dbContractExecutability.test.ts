/**
 * QFAI-CONTRACT-031 — DB contracts must have been run, and say so (#384).
 *
 * `contract-artifact-rules.md` calls `.qfai/contracts/**` "downstream execution
 * truth", and the complete set of quality properties qfai asserted about a
 * `db/` contract was one unique ID plus four dangerous-SQL regexes at
 * `warning`. Nothing required the contract to ever be run, so a declared write
 * path that is unreachable at runtime passed every SDD gate.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateDbContractExecutability } from "../../src/core/validators/dbContractExecutability.js";

const tempDirs: string[] = [];

async function write(root: string, rel: string, content: string): Promise<string> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf-8");
  return abs;
}

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-db-exec-"));
  tempDirs.push(root);
  return root;
}

const CONTRACT_SQL = "-- QFAI-CONTRACT-ID: CON-DB-0007\nCREATE TABLE t (id int);\n";

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("validateDbContractExecutability", () => {
  it("reports a DB contract with no executability record", async () => {
    const root = await newRoot();
    const file = await write(root, ".qfai/contracts/db/CON-DB-0007.sql", CONTRACT_SQL);

    const issues = await validateDbContractExecutability(root, [file]);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-CONTRACT-031");
    // A presence check, not a defect claim — the severity says so.
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.refs).toEqual(["CON-DB-0007"]);
    expect(issues[0]?.suggested_action).toContain("driven twice");
    expect(issues[0]?.suggested_action).toContain("at least twice");
  });

  it("is satisfied by an Executability line naming the contract", async () => {
    const root = await newRoot();
    const file = await write(root, ".qfai/contracts/db/CON-DB-0007.sql", CONTRACT_SQL);
    await write(
      root,
      ".qfai/evidence/sdd-spec-0001.md",
      "# Evidence\n\n- Executability: CON-DB-0007 — applied to scratch DB; every declared write path driven twice; `psql -f …` / 0 errors\n",
    );

    await expect(validateDbContractExecutability(root, [file])).resolves.toEqual([]);
  });

  it("is not satisfied by a passing mention of the ID", async () => {
    // The whole point is a record that the contract was driven; an ID appearing
    // in prose is what the check has to distinguish itself from.
    const root = await newRoot();
    const file = await write(root, ".qfai/contracts/db/CON-DB-0007.sql", CONTRACT_SQL);
    await write(
      root,
      ".qfai/evidence/sdd-spec-0001.md",
      "# Evidence\n\nCON-DB-0007 was reviewed and looks fine.\n",
    );

    const issues = await validateDbContractExecutability(root, [file]);

    expect(issues).toHaveLength(1);
  });

  it("is not satisfied by an Executability line for a different contract", async () => {
    const root = await newRoot();
    const a = await write(root, ".qfai/contracts/db/CON-DB-0007.sql", CONTRACT_SQL);
    const b = await write(
      root,
      ".qfai/contracts/db/CON-DB-0008.sql",
      "-- QFAI-CONTRACT-ID: CON-DB-0008\nCREATE TABLE u (id int);\n",
    );
    await write(
      root,
      ".qfai/evidence/sdd-spec-0001.md",
      "- Executability: CON-DB-0007 — applied; driven twice\n",
    );

    const issues = await validateDbContractExecutability(root, [a, b]);

    expect(issues.map((i) => i.refs?.[0])).toEqual(["CON-DB-0008"]);
  });

  it("accepts one line attesting several contracts", async () => {
    const root = await newRoot();
    const a = await write(root, ".qfai/contracts/db/CON-DB-0007.sql", CONTRACT_SQL);
    const b = await write(
      root,
      ".qfai/contracts/db/CON-DB-0008.sql",
      "-- QFAI-CONTRACT-ID: CON-DB-0008\nCREATE TABLE u (id int);\n",
    );
    await write(
      root,
      ".qfai/evidence/sdd-spec-0001.md",
      "- Executability: CON-DB-0007, CON-DB-0008 — applied; each declared write path driven twice\n",
    );

    await expect(validateDbContractExecutability(root, [a, b])).resolves.toEqual([]);
  });

  it("stays silent for a db file that declares no contract ID", async () => {
    // `QFAI-CONTRACT-010` already reports that; two findings for one omission
    // is noise.
    const root = await newRoot();
    const file = await write(root, ".qfai/contracts/db/stray.sql", "CREATE TABLE t (id int);\n");

    await expect(validateDbContractExecutability(root, [file])).resolves.toEqual([]);
  });

  it("stays silent when the project has no DB contracts", async () => {
    const root = await newRoot();

    await expect(validateDbContractExecutability(root, [])).resolves.toEqual([]);
  });

  it("finds the record anywhere under the evidence directory", async () => {
    const root = await newRoot();
    const file = await write(root, ".qfai/contracts/db/CON-DB-0007.sql", CONTRACT_SQL);
    await write(
      root,
      ".qfai/evidence/archive/2026/sdd-spec-0001.md",
      "* Executability: CON-DB-0007 — applied; driven twice\n",
    );

    await expect(validateDbContractExecutability(root, [file])).resolves.toEqual([]);
  });
});
