import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file rather than to `process.cwd()`, for the reason the
// clarification-budget suite gives: a runner launched from the repo root would
// otherwise resolve `../..` above the repo.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const EVIDENCE_DIR = path.join(repoRoot, ".qfai", "evidence");

/**
 * A path under one of the generated trees, as an evidence file writes it.
 *
 * `.qfai/review/`, `.qfai/review_archive/` and `.qfai/report/` are ignored, and
 * the records that cite them are committed. A clone therefore has the claim
 * without its subject: a reader cannot open what the record points at, and
 * neither can a gate — `hasSealedStageStatus` resolves the recorded
 * `Review pack` under the repository root and returns false when it is not
 * there, so on every clone but the author's a stage seal cannot be recomputed.
 *
 * A glob is not a citation of one artifact, so it is not measured here.
 */
const CITED_GENERATED_PATH = /\.qfai\/(?:review|review_archive|report)\/[A-Za-z0-9._/-]+/g;

/**
 * Citations that do not resolve in this tree, as measured.
 *
 * A backlog, not permission. Two rules hold it, both below: a citation that is
 * not here fails, and an entry that now resolves fails too. So the list may
 * only shrink, and a record added today cannot take a slot an old one vacated.
 *
 * Clearing an entry needs what the absent artifact would have supplied — the
 * reviewer role, the verdict, the revision, the audited hash — recorded beside
 * the name so the claim stands without the directory. Most of these packs were
 * never tracked at all, so that content is not recoverable from this
 * repository: it has to come from whoever holds the run.
 */
const UNRESOLVED_CITATION_BACKLOG: ReadonlyArray<readonly [string, string]> = [
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/run-20260822024224027"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/specs-coverage/spec-0017.md"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/validate.log"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-2026082"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260820200000000"],
  [
    ".qfai/evidence/atdd-spec-0017.md",
    ".qfai/review/review-20260820200000000/R02_completion-reviewer.md",
  ],
  [
    ".qfai/evidence/atdd-spec-0017.md",
    ".qfai/review/review-20260820200000000/R03_qa-gatekeeper.md",
  ],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260820220000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821000000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821020000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821040000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821060000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821080000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821100000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821120000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821140000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821160000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821180000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260821200000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822030000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822060000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822090000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822120000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822150000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260822180000000"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-20260823000000000"],
  [".qfai/evidence/coverage-depth-spec-0002.md", ".qfai/report/atdd-traceability/summary.json"],
  [".qfai/evidence/discussion-20260415203030886.md", ".qfai/review/review-20260415203030887"],
  [".qfai/evidence/discussion-20260416023323603.md", ".qfai/review/review-20260416023323603"],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/review/review-20260416023323603/R01_completion-reviewer.md",
  ],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/review/review-20260416023323603/R02_requirements-reviewer.md",
  ],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/review/review-20260416023323603/R03_architecture-reviewer.md",
  ],
  [".qfai/evidence/discussion-20260416092414328.md", ".qfai/review/review-20260416092414328"],
  [".qfai/evidence/discussion-20260416195444737.md", ".qfai/review/review-20260416195500000"],
  [
    ".qfai/evidence/discussion-20260418170937652.md",
    ".qfai/review/review-20260418170937652/R03_architecture-reviewer.md",
  ],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/report/validate.log"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805190301000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805190302000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805192001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805192002000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805193501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805195501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805202001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805204501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805210001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805212001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805214501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805221501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805224501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260805224502000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806001501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806001502000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806010001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806014501000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806023001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806073001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806220001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260806220002000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260807030001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260807120001000"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-20260807180001000"],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/report/atdd-traceability/summary.json"],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/report/validate.json"],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/report/validate.log"],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/review/review-20260818"],
  [".qfai/evidence/implement-spec-0017.md", ".qfai/review/review-20260820140000000"],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/report/preflight/run-20260911090607227/preflight_summary.md",
  ],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/run-20260518132742559"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/run-20260518175405426"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate-sdd.json"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.json"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/report/validate.log"],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/review/review-20260415060932/R01_completion-reviewer.md",
  ],
  [
    ".qfai/evidence/sdd-spec-0012.md",
    ".qfai/review/review-20260415060932/R02_architecture-reviewer.md",
  ],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260415060932/review_request.md"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260415060932/summary.json"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260415161758193"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260416070000000/summary.json"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260416195500000"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260417070000000"],
];

/** Every citation this tree carries, as `[evidence file, cited path]`. */
async function measureCitations(): Promise<[string, string][]> {
  const files = (await readdir(EVIDENCE_DIR)).filter((name) => name.endsWith(".md")).sort();
  const measured: [string, string][] = [];
  for (const name of files) {
    const text = await readFile(path.join(EVIDENCE_DIR, name), "utf-8");
    // Per file, so the same path cited twice in one record is one obligation.
    const seen = new Set<string>();
    for (const match of text.match(CITED_GENERATED_PATH) ?? []) {
      const cited = match.replace(/[.,;:]+$/, "").replace(/\/+$/, "");
      if (cited.includes("*") || seen.has(cited)) continue;
      seen.add(cited);
      measured.push([`.qfai/evidence/${name}`, cited]);
    }
  }
  return measured;
}

const resolves = (cited: string): Promise<boolean> =>
  stat(path.join(repoRoot, ...cited.split("/"))).then(
    () => true,
    () => false,
  );

const key = ([file, cited]: readonly [string, string]): string => `${file} -> ${cited}`;

describe("a committed record cites what the repository has", () => {
  it("names no artifact this tree does not carry", async () => {
    // A name that resolves nowhere still reads as provenance, and it costs a
    // reader a search to find out otherwise. The backlog is the exception, and
    // the test below is what keeps it an exception rather than a licence.
    const recorded = new Set(UNRESOLVED_CITATION_BACKLOG.map(key));
    const unlisted: string[] = [];
    for (const citation of await measureCitations()) {
      if (await resolves(citation[1])) continue;
      if (!recorded.has(key(citation))) unlisted.push(key(citation));
    }
    expect(
      unlisted.sort(),
      "a committed evidence file cites a path this tree does not have. Record beside the name " +
        "what a reader needs from it — the reviewer role, the verdict, the revision, the audited " +
        "hash — or cite the command that regenerates it and the output that command gave",
    ).toEqual([]);
  });

  it("keeps the backlog to what is still unresolved", async () => {
    // An entry for a path that now resolves is a slot: remove it in the change
    // that fixed it, or the next unresolved citation inherits it silently.
    const measured = new Set((await measureCitations()).map(key));
    const stale: string[] = [];
    for (const entry of UNRESOLVED_CITATION_BACKLOG) {
      if (!measured.has(key(entry))) {
        stale.push(`${key(entry)} (no longer cited)`);
        continue;
      }
      if (await resolves(entry[1])) stale.push(`${key(entry)} (now resolves)`);
    }
    expect(
      stale.sort(),
      "the backlog may only shrink — drop the entry in the same change that fixes it",
    ).toEqual([]);
  });
});
