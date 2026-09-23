/**
 * A ledger row read against the file that actually carries its annotation.
 *
 * Two columns answer "where is this row’s test": `Test file`, which a reader
 * follows, and the annotation, which `QFAI-ATDD-112` reads. Nothing compared
 * them, so covering a row silenced that gate without the row’s own column
 * having to agree — and the two then drifted with nothing between them. One
 * pack sent a reader to the wrong file for eight of its rows.
 *
 * A test case with no annotation anywhere is a different finding and is not
 * this one: that row is owed by the acceptance gate, which reports it. This
 * reads only rows whose case IS annotated, and asks whether the file the row
 * names is one of the files carrying it.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SPECS = path.join(repoRoot, ".qfai", "specs");

/** The trees scanned for annotations, relative to the repository root. */
const TEST_TREES = [path.join("packages", "qfai", "tests"), path.join("tests")];

/**
 * The rows already naming a file that does not carry their annotation.
 *
 * A backlog, not permission. `Test file` is writable while the row’s selector
 * does not resolve, so a repair is an ordinary edit for some of these and a
 * stage run for the rest — and this list is what stops a thirty-fifth joining
 * them meanwhile.
 *
 * The list may only shrink. A repair strikes its entry in the same change: the
 * assertion is an equality, so a row that leaves the set without leaving this
 * list fails exactly as a new one does.
 */
const KNOWN_TEST_FILE_DRIFT: readonly string[] = [
  "spec-0003 TDD-0018 TC-0003-0018",
  "spec-0003 TDD-0019 TC-0003-0019",
  "spec-0003 TDD-0020 TC-0003-0020",
  "spec-0004 TDD-0002 TC-0004-0002",
  "spec-0012 TDD-0453 TC-0012-0433",
  "spec-0012 TDD-0455 TC-0012-0435",
  "spec-0012 TDD-0456 TC-0012-0436",
  "spec-0012 TDD-0457 TC-0012-0437",
  "spec-0012 TDD-0459 TC-0012-0459",
  "spec-0012 TDD-0464 TC-0012-0438",
  "spec-0012 TDD-0465 TC-0012-0460",
  "spec-0012 TDD-0472 TC-0012-0467",
  "spec-0012 TDD-0480 TC-0012-0444",
  "spec-0012 TDD-0486 TC-0012-0457",
  "spec-0012 TDD-0489 TC-0012-0470",
  "spec-0012 TDD-0498 TC-0012-0450",
  "spec-0012 TDD-0499 TC-0012-0451",
  "spec-0012 TDD-0500 TC-0012-0452",
  "spec-0012 TDD-0506 TC-0012-0466",
  "spec-0012 TDD-0507 TC-0012-0468",
  "spec-0012 TDD-0508 TC-0012-0469",
  "spec-0017 TDD-0016 TC-0017-0016",
  "spec-0017 TDD-0030 TC-0017-0030",
  "spec-0017 TDD-0032 TC-0017-0032",
  "spec-0017 TDD-0033 TC-0017-0033",
  "spec-0017 TDD-0034 TC-0017-0034",
  "spec-0017 TDD-0035 TC-0017-0035",
  "spec-0017 TDD-0069 TC-0017-0069",
  "spec-0017 TDD-0070 TC-0017-0070",
];

const ANNOTATION = /QFAI:SPEC-\d{4}:(TC-\d{4}-\d{4})/g;

/** Every file under `root` this scan reads, repository-relative and POSIX. */
async function testFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        await walk(full);
        continue;
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".md")) continue;
      // A carrier lists obligations and declares no test, so naming one in
      // `Test file` would send a reader to a list rather than to a test.
      if (entry.name === "qfai-traceability.md") continue;
      found.push(path.relative(repoRoot, full).split(path.sep).join("/"));
    }
  }
  await walk(path.join(repoRoot, root));
  return found;
}

/** Which files carry an annotation for each test case. */
async function annotationHomes(): Promise<Map<string, string[]>> {
  const homes = new Map<string, string[]>();
  for (const tree of TEST_TREES) {
    for (const file of await testFiles(tree)) {
      const text = await readFile(path.join(repoRoot, file), "utf-8");
      for (const match of text.matchAll(ANNOTATION)) {
        const testCase = match[1];
        if (testCase === undefined) continue;
        homes.set(testCase, [...(homes.get(testCase) ?? []), file]);
      }
    }
  }
  return homes;
}

type Row = { pack: string; tdd: string; file: string; refs: string[] };

/** Every ledger row naming a test file, with the cells this check reads. */
async function ledgerRows(): Promise<Row[]> {
  const rows: Row[] = [];
  const packs = (await readdir(SPECS, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("spec-"))
    .map((entry) => entry.name)
    .sort();
  for (const pack of packs) {
    let text: string;
    try {
      text = await readFile(path.join(SPECS, pack, "tdd", "test-list.md"), "utf-8");
    } catch {
      continue;
    }
    let headers: string[] | null = null;
    for (const line of text.split(/\r?\n/)) {
      if (!line.trimStart().startsWith("|")) {
        headers = null;
        continue;
      }
      const cells = line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());
      if (cells[0] === "TDD-ID") {
        headers = cells;
        continue;
      }
      if (headers === null) continue;
      const at = (name: string): string => {
        const index = headers === null ? -1 : headers.indexOf(name);
        return index < 0 ? "" : (cells[index] ?? "");
      };
      const tdd = at("TDD-ID");
      if (!/^TDD-\d{4}$/.test(tdd)) continue;
      const file = at("Test file").replace(/^`|`$/g, "");
      if (file === "" || file === "-" || file === "—") continue;
      rows.push({
        pack,
        tdd,
        file,
        refs: at("TC-Refs")
          .split(/[,\s]+/)
          .filter((token) => /^TC-\d{4}-\d{4}$/.test(token)),
      });
    }
  }
  return rows;
}

describe("a row names the file that carries its test", () => {
  it("reports every row whose Test file carries no annotation for its case", async () => {
    const homes = await annotationHomes();
    expect(homes.size, "no annotations were read").toBeGreaterThan(0);

    const rows = await ledgerRows();
    expect(rows.length, "no ledger rows name a test file").toBeGreaterThan(0);

    const drifted = rows
      .flatMap(({ pack, tdd, file, refs }) =>
        refs
          .filter((ref) => {
            const carried = homes.get(ref);
            // A case nobody annotates is the acceptance gate’s finding, not this one.
            if (carried === undefined) return false;
            const full = file.startsWith("packages/") ? file : `packages/qfai/${file}`;
            return !carried.some((home) => home === full || home.endsWith(file));
          })
          .map((ref) => `${pack} ${tdd} ${ref}`),
      )
      .sort();

    expect([...new Set(drifted)]).toEqual([...KNOWN_TEST_FILE_DRIFT].sort());
  });
});
