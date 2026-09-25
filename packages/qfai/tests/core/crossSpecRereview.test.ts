/**
 * The cross-spec re-review input: which completed rows a change blocks, and
 * each row's current proof.
 *
 * A one-off classifier missed two kinds of row on a large change: a row reset
 * and completed again, and a row whose proof sits in a later round. Both come
 * down to reading the proof from the latest round of the entry the ledger
 * points at, which the proof rows below pin.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { crossSpecRereview, owningModuleMatches } from "../../src/core/crossSpecRereview.js";

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function write(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf-8");
}

const HEADER =
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | Owning module |\n" +
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n";

function ledgerRow(
  id: string,
  testFile: string,
  status: string,
  owningModule = "-",
  layer = "Unit",
): string {
  const anchor = `.qfai/evidence/implement-spec-0001.md#${id.toLowerCase()}`;
  return `| ${id} | TC-0001 | ${layer} | ${testFile} | ${testFile} | ${status} | - | evidence at \`${anchor}\` | ${owningModule} |\n`;
}

const EVIDENCE = `# Implement evidence

### TDD-0001

- Round 1: Revision: abc1234
- Round 1: GREEN command: npx vitest run tests/login.test.ts
- Round 1: Oracle proof: removed the session check; the test failed
- Round 1: reviewer verdict: REVISE

#### Round 2

- Round 2: Revision: def5678
- Round 2: GREEN command: npx vitest run tests/login.test.ts -t "logs in"
- Round 2: Oracle proof: returned early from login; the test failed

### TDD-0002

- Round 1: Revision: abc1234
- Round 1: GREEN command: npx vitest run tests/billing.test.ts
- Round 1: Satisfied-by: src/billing.ts charge
- Round 1: Falsifiability command: npx vitest run tests/billing.test.ts
- Round 1: Falsifiability result: FAIL expected 1 to be 2

### TDD-0004

- GREEN command: npx vitest run packages/a/tests/dyn.test.ts
- Oracle proof: legacy unprefixed proof
`;

/** A project with two specs' worth of rows, one of them only in a package. */
async function project(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cross-spec-"));
  dirs.push(root);
  await write(root, "src/session.ts", "export const open = 1;\n");
  await write(root, "src/login.ts", 'import { open } from "./session.js";\nexport const login = open;\n');
  await write(root, "src/billing.ts", "export const charge = 1;\n");
  await write(root, "tests/helpers/fixture.ts", "export const user = {};\n");
  await write(
    root,
    "tests/login.test.ts",
    'import { login } from "../src/login.js";\nimport { user } from "./helpers/fixture.js";\nit("logs in", () => [login, user]);\n',
  );
  await write(
    root,
    "tests/billing.test.ts",
    'import { charge } from "../src/billing.js";\nit("charges", () => charge);\n',
  );
  await write(root, "packages/a/package.json", "{}\n");
  await write(root, "packages/b/package.json", "{}\n");
  await write(root, "packages/a/src/other.ts", "export const other = 1;\n");
  await write(root, "packages/b/src/far.ts", "export const far = 1;\n");
  await write(
    root,
    "packages/a/tests/dyn.test.ts",
    'const name = "../src/other.js";\nawait import(name);\n',
  );
  await write(
    root,
    ".qfai/specs/spec-0001/tdd/test-list.md",
    "# Test list\n\n" +
      HEADER +
      ledgerRow("TDD-0001", "tests/login.test.ts", "done") +
      ledgerRow("TDD-0002", "tests/billing.test.ts", "done", "src/billing.ts") +
      ledgerRow("TDD-0003", "tests/login.test.ts", "todo") +
      ledgerRow("TDD-0004", "packages/a/tests/dyn.test.ts", "done"),
  );
  await write(root, ".qfai/evidence/implement-spec-0001.md", EVIDENCE);
  return root;
}

describe("owningModuleMatches", () => {
  it("compares a path whole, extension included", () => {
    expect(owningModuleMatches("src/parser.ts", "src/parser.ts")).toBe(true);
    expect(owningModuleMatches("src/parser.ts", "src/parser.py")).toBe(false);
    expect(owningModuleMatches("src/foo.bar.ts", "src/foo/bar.ts")).toBe(false);
  });

  it("lines a dotted module up with a path on whole segments", () => {
    expect(
      owningModuleMatches("shirube.domain.notification", "src/shirube/domain/notification.ts"),
    ).toBe(true);
    expect(owningModuleMatches("domain.notification.x", "src/domain/notifications/x.ts")).toBe(
      false,
    );
  });

  it("matches nothing for an undeclared seam", () => {
    expect(owningModuleMatches("-", "src/parser.ts")).toBe(false);
    expect(owningModuleMatches("", "src/parser.ts")).toBe(false);
  });
});

describe("crossSpecRereview", () => {
  it("blocks a done row whose test reaches the changed file, and no other row", async () => {
    const root = await project();
    const rows = await crossSpecRereview(root, defaultConfig, ["src/session.ts"]);
    expect(rows.map((row) => [row.tddId, row.blockedBy, row.files])).toEqual([
      ["TDD-0001", "reach", ["src/session.ts"]],
    ]);
  });

  it("reaches a test helper outside the source directory", async () => {
    const root = await project();
    const rows = await crossSpecRereview(root, defaultConfig, ["tests/helpers/fixture.ts"]);
    expect(rows.map((row) => row.tddId)).toEqual(["TDD-0001"]);
  });

  it("blocks a row that owns the changed module", async () => {
    const root = await project();
    const rows = await crossSpecRereview(root, defaultConfig, ["src/billing.ts"]);
    expect(rows.map((row) => [row.tddId, row.blockedBy])).toEqual([["TDD-0002", "owning-module"]]);
  });

  it("takes the proof from the latest round, not the first", async () => {
    const root = await project();
    const [row] = await crossSpecRereview(root, defaultConfig, ["src/session.ts"]);
    expect(row?.round).toBe(2);
    expect(row?.greenCommand).toBe('npx vitest run tests/login.test.ts -t "logs in"');
    expect(row?.proof).toEqual({
      kind: "oracle-proof",
      round: 2,
      proof: "returned early from login; the test failed",
    });
    expect(row?.evidence).toBe(".qfai/evidence/implement-spec-0001.md#tdd-0001");
  });

  it("reads a falsifiability round's mutation run as its proof", async () => {
    const root = await project();
    const [row] = await crossSpecRereview(root, defaultConfig, ["src/billing.ts"]);
    expect(row?.proof).toEqual({
      kind: "falsifiability",
      round: 1,
      command: "npx vitest run tests/billing.test.ts",
      result: "FAIL expected 1 to be 2",
    });
  });

  it("falls back to the package only for a row whose reach cannot be walked", async () => {
    const root = await project();
    const inPackage = await crossSpecRereview(root, defaultConfig, ["packages/a/src/other.ts"]);
    expect(inPackage.map((row) => [row.tddId, row.blockedBy])).toEqual([
      ["TDD-0004", "package-fallback"],
    ]);
    expect(inPackage[0]?.fallbackReason).toContain("computed path");
    expect(inPackage[0]?.proof).toEqual({
      kind: "oracle-proof",
      round: null,
      proof: "legacy unprefixed proof",
    });

    const elsewhere = await crossSpecRereview(root, defaultConfig, ["packages/b/src/far.ts"]);
    expect(elsewhere).toEqual([]);
  });

  it("reports a blocked row whose evidence entry cannot be found", async () => {
    const root = await project();
    await write(root, ".qfai/evidence/implement-spec-0001.md", "# Implement evidence\n");
    const [row] = await crossSpecRereview(root, defaultConfig, ["src/session.ts"]);
    expect(row?.evidence).toBeNull();
    expect(row?.proof).toEqual({ kind: "none" });
  });
});
