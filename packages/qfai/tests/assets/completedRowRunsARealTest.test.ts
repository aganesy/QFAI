/**
 * A row that claims completion names a test case a TEST carries.
 *
 * An annotation carrier — `qfai-traceability.md` under a test tree — is a list
 * of obligations. It declares no test, and being named on it is what
 * `QFAI-ATDD-119` already reports. So a case annotated only there is a case no
 * runner will ever select, while the ledger says the work is finished and the
 * traceability scan agrees because the annotation it reads is present.
 *
 * The two carriers this repository has hold 622 annotations between them and
 * sit in trees with no test file at all.
 *
 * **This is the row's side of a finding that already exists.** `QFAI-ATDD-119`
 * counts OBLIGATIONS, at `info`, in one notice of several hundred. What a row
 * adds is the claim: `done` says work happened, and this reports the rows whose
 * claim rests on a document.
 *
 * **Releasing a row is not this check's job.** `Status` is `/qfai-implement`'s
 * column under the Drift Protocol, so a row moves by a stage run. Reporting the
 * disagreement is what makes that run happen.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SPECS = path.join(repoRoot, ".qfai", "specs");

/** The trees scanned for annotations, relative to the repository root. */
const TEST_TREES = [path.join("packages", "qfai", "tests"), "tests"];

/** The document that lists obligations and declares no test. */
const CARRIER = "qfai-traceability.md";

/** The statuses that claim the row is finished. */
const COMPLETED = new Set(["done", "green", "refactor", "review-fix"]);

const ANNOTATION = /QFAI:SPEC-\d{4}:(TC-\d{4}-\d{4})/g;

/**
 * The completed rows whose case only a carrier names.
 *
 * A backlog, not permission. The list may only shrink: the assertion is an
 * equality, so a row that gains a test without its entry being struck fails
 * exactly as a new one does.
 *
 * One entry per row and case, because a row citing two cases can gain a test
 * for one of them — and a per-row entry would leave that half invisible.
 */
const KNOWN_CARRIER_ONLY: readonly string[] = [
  // The list is long because the condition is old. It is not a licence to add
  // to it: a row reaching `done` over a document is the thing this reports.
  "spec-0002 TDD-0001 TC-0002-0001",
  "spec-0003 TDD-0033 TC-0003-0033",
  "spec-0003 TDD-0055 TC-0003-0028",
  "spec-0004 TDD-0003 TC-0004-0003",
  "spec-0004 TDD-0004 TC-0004-0004",
  "spec-0004 TDD-0006 TC-0004-0006",
  "spec-0004 TDD-0009 TC-0004-0009",
  "spec-0004 TDD-0010 TC-0004-0010",
  "spec-0012 TDD-0340 TC-0012-0330",
  "spec-0012 TDD-0342 TC-0012-0332",
  "spec-0012 TDD-0342 TC-0012-0333",
  "spec-0012 TDD-0351 TC-0012-0342",
  "spec-0014 TDD-0033 TC-0014-0033",
];

interface Annotations {
  readonly real: Set<string>;
  readonly carrier: Set<string>;
}

/** Which cases a real test annotates, and which only a carrier names. */
async function annotations(): Promise<Annotations> {
  const real = new Set<string>();
  const carrier = new Set<string>();
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
      const into = entry.name === CARRIER ? carrier : real;
      for (const match of (await readFile(full, "utf-8")).matchAll(ANNOTATION)) {
        const testCase = match[1];
        if (testCase !== undefined) into.add(testCase);
      }
    }
  }
  for (const tree of TEST_TREES) await walk(path.join(repoRoot, tree));
  return { real, carrier };
}

describe("a row claiming completion rests on a test, not on a list of obligations", () => {
  it("reports every completed row whose case only an annotation carrier names", async () => {
    const { real, carrier } = await annotations();
    expect(real.size, "no test annotations were read").toBeGreaterThan(0);
    expect(carrier.size, "no carrier annotations were read").toBeGreaterThan(0);

    const packs = (await readdir(SPECS, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("spec-"))
      .map((entry) => entry.name)
      .sort();

    const found: string[] = [];
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
        if (!COMPLETED.has(at("Status").toLowerCase())) continue;
        const refs = at("TC-Refs")
          .split(/[,\s]+/)
          .filter((token) => /^TC-\d{4}-\d{4}$/.test(token));
        // A row with a test for ANY of its cases is not this check's subject.
        // The row's other cases are the annotation gate's to report.
        if (refs.length === 0 || refs.some((ref) => real.has(ref))) continue;
        for (const ref of refs.filter((candidate) => carrier.has(candidate))) {
          found.push(`${pack} ${tdd} ${ref}`);
        }
      }
    }

    expect([...new Set(found)].sort()).toEqual([...KNOWN_CARRIER_ONLY].sort());
  });

  it("does not read a real test file as a carrier", async () => {
    // The distinction the whole check rests on. If the carrier name stopped
    // matching, every annotation would count as a test's and the row above
    // would report nothing while the condition stood.
    const { carrier } = await annotations();
    expect(
      carrier.size,
      `no file named ${CARRIER} was read; the check would then find nothing whatever the tree holds`,
    ).toBeGreaterThan(0);
  });
});
