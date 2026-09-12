import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file rather than to `process.cwd()`, for the reason the
// clarification-budget suite gives: a runner launched from the repo root would
// otherwise resolve `../..` above the repo.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/**
 * The generated trees a committed record may not point into blindly.
 *
 * Each is ignored, and the records that cite them are committed. A clone has the
 * claim without its subject: a reader cannot open what the record points at, and
 * neither can a gate — the stage seal resolves the recorded `Review pack` under
 * the repository root and returns false when the directory is not there, so on
 * every clone but the author's a seal cannot be recomputed.
 */
const GENERATED_ROOTS = [
  ".qfai/review/",
  ".qfai/review_archive/",
  ".qfai/report/",
  ".qfai/discussion/",
] as const;

/**
 * A path into one of those trees, as an evidence file writes it.
 *
 * The wildcard is inside the character class on purpose. Without it a match
 * stops at the first wildcard, so a glob naming a set of packs is measured as
 * the prefix before it — a path nothing has, recorded as an entry a later exact
 * citation could inherit. Matching the whole token is what lets the filter below
 * recognise a glob at all.
 */
const CITED_GENERATED_PATH =
  /\.qfai\/(?:review|review_archive|report|discussion)\/[A-Za-z0-9._/*-]+/g;

/**
 * Citations that do not resolve in the committed tree, as measured.
 *
 * A backlog, not permission. Two rules hold it, both below: a citation that is
 * not here fails, and an entry that resolves or is no longer cited fails too. So
 * the list may only shrink, and a record added today cannot take a slot an old
 * one vacated.
 *
 * An entry leaves when the path resolves — the artifact is committed — or when
 * the record stops citing it. Recording the reviewer role, verdict, revision and
 * audited hash beside the name is what makes the second safe, and for most of
 * these packs that content is not in this repository at all: it has to come from
 * whoever holds the run.
 */
const UNRESOLVED_CITATION_BACKLOG: ReadonlyArray<readonly [string, string]> = [
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/run-20260822024224027"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/specs-coverage/spec-0017.md"],
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/validate.log"],
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
  [".qfai/evidence/discussion-20260330153902875.md", ".qfai/discussion/README.md"],
  [".qfai/evidence/discussion-20260415161758193.md", ".qfai/discussion/README.md"],
  [".qfai/evidence/discussion-20260415203030886.md", ".qfai/review/review-20260415203030887"],
  [
    ".qfai/evidence/discussion-20260416023323603.md",
    ".qfai/discussion/discussion-20260416023323603/01..14",
  ],
  [".qfai/evidence/discussion-20260416023323603.md", ".qfai/discussion/README.md"],
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
  [".qfai/evidence/discussion-20260416195444737.md", ".qfai/discussion/README.md"],
  [".qfai/evidence/discussion-20260416195444737.md", ".qfai/review/review-20260416195500000"],
  [".qfai/evidence/discussion-20260418170937652.md", ".qfai/discussion/README.md"],
  [
    ".qfai/evidence/discussion-20260418170937652.md",
    ".qfai/review/review-20260418170937652/R03_architecture-reviewer.md",
  ],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/report/validate.log"],
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
  [".qfai/evidence/implement-spec-0017.md", ".qfai/review/review-20260820140000000"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260415014056471"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260516144141078"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/README.md"],
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

/** Every path git tracks, and every directory one of them lies under. */
function trackedPaths(): { files: ReadonlySet<string>; directories: ReadonlySet<string> } {
  // `git ls-files`, not `readdir`: these trees are ignored, so a developer
  // checkout holds artifacts its own QFAI runs generated. Walking the disk would
  // fail on an uncommitted evidence file and pass on a citation that resolves
  // only here — the opposite of the guard's purpose, in both directions.
  const listed = execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  })
    .toString("utf-8")
    .split("\0")
    .filter((entry) => entry !== "");

  const directories = new Set<string>();
  for (const file of listed) {
    const parts = file.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join("/"));
    }
  }
  return { files: new Set(listed), directories };
}

const tracked = trackedPaths();

/** Evidence files the repository carries, in path order. */
const evidenceFiles = [...tracked.files]
  .filter((file) => file.startsWith(".qfai/evidence/") && file.endsWith(".md"))
  .sort();

/**
 * True when the cited path stays inside the generated root it opened with.
 *
 * `.qfai/report/../../package.json` normalises to a file that exists, so a
 * resolution check alone would accept it as provenance for something no record
 * cited.
 */
function staysInsideRoot(cited: string, root: string): boolean {
  const normalized = path.posix.normalize(cited);
  return !normalized.split("/").includes("..") && normalized.startsWith(root);
}

/** Every citation the committed evidence carries, as `[evidence file, path]`. */
async function measureCitations(): Promise<[string, string][]> {
  const measured: [string, string][] = [];
  for (const file of evidenceFiles) {
    const text = await readFile(path.join(repoRoot, file), "utf-8");
    // Per file, so the same path cited twice in one record is one obligation.
    const seen = new Set<string>();
    for (const match of text.match(CITED_GENERATED_PATH) ?? []) {
      const cited = match.replace(/[.,;:]+$/, "").replace(/\/+$/, "");
      // A glob names a set, not an artifact, so there is nothing to resolve.
      if (cited.includes("*") || seen.has(cited)) continue;
      seen.add(cited);
      measured.push([file, cited]);
    }
  }
  return measured;
}

/** A cited path resolves when git tracks it, or tracks something under it. */
function resolves(cited: string): boolean {
  const root = GENERATED_ROOTS.find((candidate) => cited.startsWith(candidate));
  if (root === undefined || !staysInsideRoot(cited, root)) return false;
  return tracked.files.has(cited) || tracked.directories.has(cited);
}

const key = ([file, cited]: readonly [string, string]): string => `${file} -> ${cited}`;

describe("a committed record cites what the repository has", () => {
  it("reads the evidence the repository carries", async () => {
    // An empty read passes both cases below without asking anything, and the two
    // ways to get one — a moved directory, a filter that matches nothing — look
    // identical to a green run.
    expect(evidenceFiles.length, "git tracks no evidence file").toBeGreaterThan(0);
    expect((await measureCitations()).length, "no citation was measured").toBeGreaterThan(0);
  });

  it("names no artifact the committed tree does not carry", async () => {
    // A name that resolves nowhere still reads as provenance, and it costs a
    // reader a search to find out otherwise. The backlog is the exception, and
    // the case below is what keeps it an exception rather than a licence.
    const recorded = new Set(UNRESOLVED_CITATION_BACKLOG.map(key));
    const unlisted = (await measureCitations())
      .filter((citation) => !resolves(citation[1]))
      .map(key)
      .filter((entry) => !recorded.has(entry));
    expect(
      unlisted.sort(),
      "a committed evidence file cites a path the committed tree does not have. Commit the " +
        "artifact, or record beside the name what a reader needs from it — the reviewer role, " +
        "the verdict, the revision, the audited hash — and stop writing it as a path",
    ).toEqual([]);
  });

  it("keeps the backlog to what is still unresolved", async () => {
    // An entry for a path that now resolves is a slot: remove it in the change
    // that fixed it, or the next unresolved citation inherits it silently.
    const measured = new Set((await measureCitations()).map(key));
    const stale: string[] = [];
    for (const entry of UNRESOLVED_CITATION_BACKLOG) {
      if (!measured.has(key(entry))) stale.push(`${key(entry)} (no longer cited)`);
      else if (resolves(entry[1])) stale.push(`${key(entry)} (now resolves)`);
    }
    expect(
      stale.sort(),
      "the backlog may only shrink — drop the entry in the same change that fixes it",
    ).toEqual([]);
  });

  it("refuses a citation that climbs out of the tree it names", () => {
    // The path exists, so a resolution check alone reads it as provenance for an
    // artifact under `.qfai/report/` that no record ever cited.
    expect(resolves(".qfai/report/../../package.json")).toBe(false);
    expect(staysInsideRoot(".qfai/report/validate.json", ".qfai/report/")).toBe(true);
  });
});
