/**
 * A ledger row reporting work as outstanding, read against the test that exists.
 *
 * `todo`, `blocked` and `red` all say the same thing to a reader: this row is
 * not finished. `QFAI-ATDD-112` reads the annotation, so once a test carries
 * `QFAI:SPEC-NNNN:TC-NNNN-NNNN` the obligation is discharged as far as that
 * gate is concerned — without the row's own `Status` having to agree, and with
 * no check between the two. The ledger is what a reader consults to answer
 * "what is left", and held this way one pack reported nineteen open rows where
 * nine were open.
 *
 * **An annotation carrier is not a test.** A `qfai-traceability.md` under the
 * test trees is a list of obligations, and being named on it is what
 * `QFAI-ATDD-119` already reports. Counting it here would turn 23 findings into
 * 47, and the extra 24 would all be the case that document exists to record.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SPECS = path.join(repoRoot, ".qfai", "specs");

/** The directories scanned for annotations, relative to the repository root. */
const TEST_TREES = [path.join("packages", "qfai", "tests"), path.join("tests")];

/** Every status that tells a reader the row is not finished. */
const OPEN_STATUSES = new Set(["todo", "blocked", "red"]);

/**
 * The rows already reporting work a test has covered.
 *
 * A backlog, not permission. `Status` is `/qfai-implement`'s column, so moving
 * a row is a stage run rather than an edit, and this list is what stops a
 * another row joining them while those runs are outstanding.
 *
 * An approved change may reset a tested row to todo; add it here with that
 * change. A repair strikes its entry in the same change: the
 * assertion is an equality, so a row that leaves the set without leaving this
 * list fails exactly as a new one does.
 */
const KNOWN_OPEN_BUT_TESTED: readonly string[] = [
  "spec-0006 TDD-0041 todo TC-0006-0036",
  "spec-0008 TDD-0015 todo TC-0008-0015",
  "spec-0008 TDD-0016 todo TC-0008-0016",
  "spec-0008 TDD-0017 todo TC-0008-0017",
  "spec-0008 TDD-0018 todo TC-0008-0018",
  "spec-0012 TDD-0436 todo TC-0012-0416",
  "spec-0013 TDD-0003 todo TC-0013-0003",
  "spec-0013 TDD-0011 todo TC-0013-0011",
  "spec-0013 TDD-0012 todo TC-0013-0012",
  "spec-0013 TDD-0013 todo TC-0013-0013",
  "spec-0013 TDD-0014 todo TC-0013-0021",
  "spec-0013 TDD-0015 todo TC-0013-0020",
  "spec-0013 TDD-0016 todo TC-0013-0022",
  "spec-0013 TDD-0018 todo TC-0013-0024",
  "spec-0013 TDD-0019 blocked TC-0013-0025",
  "spec-0013 TDD-0020 todo TC-0013-0026",
  "spec-0013 TDD-0021 todo TC-0013-0027",
  "spec-0013 TDD-0023 todo TC-0013-0028",
  "spec-0013 TDD-0024 todo TC-0013-0029",
  "spec-0013 TDD-0025 blocked TC-0013-0030",
  "spec-0013 TDD-0026 blocked TC-0013-0031",
  "spec-0013 TDD-0027 blocked TC-0013-0032",
  "spec-0013 TDD-0028 blocked TC-0013-0033",
  "spec-0013 TDD-0029 todo TC-0013-0034",
  "spec-0013 TDD-0030 todo TC-0013-0035",
  "spec-0013 TDD-0044 todo TC-0013-0014",
  "spec-0013 TDD-0045 todo TC-0013-0015",
  "spec-0013 TDD-0046 todo TC-0013-0015",
  "spec-0013 TDD-0047 todo TC-0013-0016",
  "spec-0013 TDD-0048 todo TC-0013-0016",
  "spec-0013 TDD-0049 todo TC-0013-0017",
  "spec-0013 TDD-0050 todo TC-0013-0018",
  "spec-0013 TDD-0051 todo TC-0013-0018",
  "spec-0013 TDD-0052 todo TC-0013-0018",
  "spec-0013 TDD-0053 todo TC-0013-0018",
  "spec-0013 TDD-0054 todo TC-0013-0018",
  "spec-0013 TDD-0055 todo TC-0013-0018",
  "spec-0013 TDD-0056 todo TC-0013-0019",
  "spec-0013 TDD-0057 todo TC-0013-0022",
  "spec-0013 TDD-0058 todo TC-0013-0024",
  "spec-0013 TDD-0059 todo TC-0013-0028",
  "spec-0013 TDD-0060 todo TC-0013-0003",
  "spec-0013 TDD-0061 todo TC-0013-0025",
  "spec-0013 TDD-0062 todo TC-0013-0026",
  "spec-0013 TDD-0063 todo TC-0013-0027",
  "spec-0013 TDD-0064 blocked TC-0013-0027",
  "spec-0013 TDD-0065 todo TC-0013-0029",
  "spec-0013 TDD-0066 blocked TC-0013-0030",
  "spec-0013 TDD-0067 blocked TC-0013-0031",
  "spec-0013 TDD-0068 blocked TC-0013-0032",
  "spec-0013 TDD-0069 blocked TC-0013-0032",
  "spec-0013 TDD-0070 blocked TC-0013-0033",
  "spec-0013 TDD-0071 blocked TC-0013-0033",
  "spec-0013 TDD-0072 blocked TC-0013-0033",
  "spec-0013 TDD-0073 todo TC-0013-0034",
  "spec-0013 TDD-0074 todo TC-0013-0035",
  "spec-0013 TDD-0075 todo TC-0013-0035",
  "spec-0013 TDD-0076 todo TC-0013-0035",
  "spec-0013 TDD-0081 todo TC-0013-0036",
  "spec-0013 TDD-0082 todo TC-0013-0037",
  "spec-0013 TDD-0083 todo TC-0013-0037",
  "spec-0015 TDD-0006 todo TC-0015-0006",
  "spec-0015 TDD-0007 todo TC-0015-0007",
  "spec-0015 TDD-0036 todo TC-0015-0035",
  "spec-0015 TDD-0037 todo TC-0015-0036",
  "spec-0015 TDD-0038 todo TC-0015-0034",
  "spec-0015 TDD-0039 todo TC-0015-0007",
  "spec-0017 TDD-0007 todo TC-0017-0007",
  "spec-0017 TDD-0012 todo TC-0017-0012",
  "spec-0017 TDD-0043 todo TC-0017-0043",
  "spec-0017 TDD-0062 todo TC-0017-0062",
  "spec-0017 TDD-0064 todo TC-0017-0064",
  "spec-0017 TDD-0099 todo TC-0017-0090",
  "spec-0017 TDD-0100 todo TC-0017-0091",
  "spec-0017 TDD-0102 todo TC-0017-0007",
  "spec-0017 TDD-0103 todo TC-0017-0007",
  "spec-0017 TDD-0104 todo TC-0017-0043",
  "spec-0017 TDD-0105 todo TC-0017-0062",
  "spec-0017 TDD-0106 todo TC-0017-0064",
  "spec-0017 TDD-0107 todo TC-0017-0090",
  "spec-0017 TDD-0108 todo TC-0017-0090",
  "spec-0017 TDD-0109 todo TC-0017-0091",
  "spec-0017 TDD-0110 todo TC-0017-0091",
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
      // A tree this repository does not have is simply not scanned.
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
      // The carrier lists obligations; it declares no test. See the docblock.
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

type Row = { pack: string; tdd: string; status: string; refs: string[] };

/** Every ledger row in every pack, with the cells this check reads. */
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
      rows.push({
        pack,
        tdd,
        status: at("Status").toLowerCase(),
        refs: at("TC-Refs")
          .split(/[,\s]+/)
          .filter((token) => /^TC-\d{4}-\d{4}$/.test(token)),
      });
    }
  }
  return rows;
}

describe("a row reporting work as outstanding has no test for it yet", () => {
  it("reports every open row whose test case a test file already annotates", async () => {
    const homes = await annotationHomes();
    expect(homes.size, "no annotations were read").toBeGreaterThan(0);

    const rows = await ledgerRows();
    expect(rows.length, "no ledger rows were read").toBeGreaterThan(0);

    const covered = rows
      .filter(({ status }) => OPEN_STATUSES.has(status))
      .flatMap(({ pack, tdd, status, refs }) =>
        refs.filter((ref) => homes.has(ref)).map((ref) => `${pack} ${tdd} ${status} ${ref}`),
      )
      .sort();

    expect([...new Set(covered)]).toEqual([...KNOWN_OPEN_BUT_TESTED].sort());
  });

  it("does not count the annotation carrier as a test", async () => {
    // The distinction this check rests on. A carrier names obligations and
    // declares no test, so reading it here would report every obligation
    // `QFAI-ATDD-119` already counts as carrier-only coverage.
    const files = await testFiles(path.join("tests"));
    expect(files.some((file) => file.endsWith("qfai-traceability.md"))).toBe(false);
  });
});
