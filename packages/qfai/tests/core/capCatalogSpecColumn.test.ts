/**
 * Migrating a legacy CAP catalog onto the declared `Spec` column.
 *
 * The derivation a catalog without the column falls back to is row position,
 * and that is exactly what an approved DELETE breaks: the gap it leaves shifts
 * every later pairing. So the migration is worth having — and it is only honest
 * where the positions still describe the tree, which is what most of these
 * cases are about.
 *
 * Two properties carry the risk. The write is all rows or none, because the
 * column's presence selects the declared mapping however few cells are filled:
 * a half-migrated catalog reports a finding per empty cell instead of falling
 * back. And the plan is refused where a row's pairing is not evidenced on disk,
 * because a guessed pairing is one the validator is about to reject.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  applyCapCatalogSpecColumn,
  planCapCatalogSpecColumn,
} from "../../src/core/doctor/capCatalogSpecColumn.js";

/** A legacy catalog: a confirmed CAP table with no `Spec` column. */
const LEGACY = [
  "# 03 Capabilities",
  "",
  "## CAP Catalog",
  "",
  "| CAP ID   | Statement (what) | Notes |",
  "| -------- | ---------------- | ----- |",
  "| CAP-0001 | first            | -     |",
  "| CAP-0002 | second           | -     |",
  "",
].join("\n");

async function seed(files: Record<string, string>): Promise<{ root: string; specsRoot: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cap-catalog-"));
  const specsRoot = path.join(root, ".qfai", "specs");
  for (const [rel, body] of Object.entries(files)) {
    const file = path.join(specsRoot, rel);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, "utf-8");
  }
  return { root, specsRoot };
}

/** A minimal spec pack that names its CAP, which is what the pairing rests on. */
function specPack(capId: string): Record<string, string> {
  return { "01_Spec.md": `# Spec\n\n- Parent: ${capId}\n` };
}

function packFiles(specId: string, capId: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const [name, body] of Object.entries(specPack(capId))) {
    files[`${specId}/${name}`] = body;
  }
  return files;
}

describe("planning the CAP catalog Spec column", () => {
  it("pairs each row with the directory its position names", async () => {
    const { specsRoot } = await seed({
      "_policies/03_Capabilities.md": LEGACY,
      ...packFiles("spec-0001", "CAP-0001"),
      ...packFiles("spec-0002", "CAP-0002"),
    });
    try {
      const plan = await planCapCatalogSpecColumn(specsRoot);

      expect(plan.state).toBe("migratable");
      if (plan.state !== "migratable") return;
      expect(plan.pairs).toEqual([
        { capId: "CAP-0001", specId: "spec-0001" },
        { capId: "CAP-0002", specId: "spec-0002" },
      ]);
    } finally {
      await rm(specsRoot, { recursive: true, force: true });
    }
  });

  it("declines a row whose positional directory is not on disk", async () => {
    // The gap an approved DELETE leaves. Writing `spec-0002` here would record
    // a directory that does not exist; which one the row meant is precisely
    // what the file no longer says.
    const { specsRoot } = await seed({
      "_policies/03_Capabilities.md": LEGACY,
      ...packFiles("spec-0001", "CAP-0001"),
      ...packFiles("spec-0003", "CAP-0002"),
    });
    try {
      const plan = await planCapCatalogSpecColumn(specsRoot);

      expect(plan.state).toBe("ambiguous");
      if (plan.state !== "ambiguous") return;
      expect(plan.reasons.join(" ")).toContain("spec-0002 is not on disk");
    } finally {
      await rm(specsRoot, { recursive: true, force: true });
    }
  });

  it("declines a row whose spec does not name the CAP it is paired with", async () => {
    // The directory existing is not the pairing: the back-reference is the only
    // evidence in the tree that this row and this directory belong together,
    // and the validator reads the same one.
    const { specsRoot } = await seed({
      "_policies/03_Capabilities.md": LEGACY,
      ...packFiles("spec-0001", "CAP-0001"),
      ...packFiles("spec-0002", "CAP-0009"),
    });
    try {
      const plan = await planCapCatalogSpecColumn(specsRoot);

      expect(plan.state).toBe("ambiguous");
      if (plan.state !== "ambiguous") return;
      expect(plan.reasons.join(" ")).toContain("does not name CAP-0002");
    } finally {
      await rm(specsRoot, { recursive: true, force: true });
    }
  });

  it("reports a catalog that already declares the column as nothing to do", async () => {
    const { specsRoot } = await seed({
      "_policies/03_Capabilities.md": [
        "# 03 Capabilities",
        "",
        "## CAP Catalog",
        "",
        "| CAP ID   | Spec      | Statement |",
        "| -------- | --------- | --------- |",
        "| CAP-0001 | spec-0001 | first     |",
        "",
      ].join("\n"),
      ...packFiles("spec-0001", "CAP-0001"),
    });
    try {
      expect((await planCapCatalogSpecColumn(specsRoot)).state).toBe("declared");
    } finally {
      await rm(specsRoot, { recursive: true, force: true });
    }
  });

  it("reports a project with no catalog file as nothing to do", async () => {
    const { specsRoot } = await seed({ ...packFiles("spec-0001", "CAP-0001") });
    try {
      expect((await planCapCatalogSpecColumn(specsRoot)).state).toBe("no-catalog");
    } finally {
      await rm(specsRoot, { recursive: true, force: true });
    }
  });

  it("reads the catalog table, not a fenced example above it", async () => {
    // The catalog documents its own format. Reading the illustration would make
    // the migration edit a code block and leave the live table alone.
    const { specsRoot } = await seed({
      "_policies/03_Capabilities.md": [
        "# 03 Capabilities",
        "",
        "## How to fill this in",
        "",
        "```markdown",
        "| CAP ID   | Spec      |",
        "| -------- | --------- |",
        "| CAP-0001 | spec-0001 |",
        "```",
        "",
        "## CAP Catalog",
        "",
        "| CAP ID   | Statement |",
        "| -------- | --------- |",
        "| CAP-0001 | first     |",
        "",
      ].join("\n"),
      ...packFiles("spec-0001", "CAP-0001"),
    });
    try {
      const plan = await planCapCatalogSpecColumn(specsRoot);

      // The fenced table declares a Spec column; the live one does not. Reading
      // the fence would have answered `declared` and skipped the migration.
      expect(plan.state).toBe("migratable");
    } finally {
      await rm(specsRoot, { recursive: true, force: true });
    }
  });
});

describe("writing the CAP catalog Spec column", () => {
  it("gives every row a cell, in the column the template puts it in", async () => {
    const { specsRoot } = await seed({
      "_policies/03_Capabilities.md": LEGACY,
      ...packFiles("spec-0001", "CAP-0001"),
      ...packFiles("spec-0002", "CAP-0002"),
    });
    try {
      const plan = await planCapCatalogSpecColumn(specsRoot);
      await applyCapCatalogSpecColumn(plan);
      const written = await readFile(
        path.join(specsRoot, "_policies", "03_Capabilities.md"),
        "utf-8",
      );

      const rows = written.split("\n").filter((line) => line.startsWith("|"));
      expect(rows[0]).toContain("| CAP ID | Spec |");
      expect(rows[2]).toContain("| CAP-0001 | spec-0001 |");
      expect(rows[3]).toContain("| CAP-0002 | spec-0002 |");
      // Re-reading it finds the column, which is what ends the migration.
      expect((await planCapCatalogSpecColumn(specsRoot)).state).toBe("declared");
    } finally {
      await rm(specsRoot, { recursive: true, force: true });
    }
  });

  it("writes nothing for a plan that declined", async () => {
    // All rows or none. A partial column is worse than no column: its presence
    // selects the declared mapping, so every empty cell becomes a finding.
    const { specsRoot } = await seed({
      "_policies/03_Capabilities.md": LEGACY,
      ...packFiles("spec-0001", "CAP-0001"),
      ...packFiles("spec-0003", "CAP-0002"),
    });
    const file = path.join(specsRoot, "_policies", "03_Capabilities.md");
    try {
      await applyCapCatalogSpecColumn(await planCapCatalogSpecColumn(specsRoot));

      expect(await readFile(file, "utf-8")).toBe(LEGACY);
    } finally {
      await rm(specsRoot, { recursive: true, force: true });
    }
  });

  it("keeps an escaped pipe inside a cell", async () => {
    // The rewrite splits and rejoins every row it touches, so a cell that
    // legitimately holds `\\|` must come back with it. Losing the escape would
    // add a column to that row alone and shift its remaining cells.
    const { specsRoot } = await seed({
      "_policies/03_Capabilities.md": [
        "# 03 Capabilities",
        "",
        "## CAP Catalog",
        "",
        "| CAP ID   | Notes    |",
        "| -------- | -------- |",
        "| CAP-0001 | a \\| b   |",
        "",
      ].join("\n"),
      ...packFiles("spec-0001", "CAP-0001"),
    });
    try {
      await applyCapCatalogSpecColumn(await planCapCatalogSpecColumn(specsRoot));
      const written = await readFile(
        path.join(specsRoot, "_policies", "03_Capabilities.md"),
        "utf-8",
      );

      expect(written).toContain("| CAP-0001 | spec-0001 | a \\| b |");
    } finally {
      await rm(specsRoot, { recursive: true, force: true });
    }
  });
});
