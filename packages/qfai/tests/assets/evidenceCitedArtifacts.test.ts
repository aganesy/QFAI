import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
  // The legacy output tree, ignored like the rest. Production still reads
  // `.qfai/output/verify.json` as a fallback, so a record citing one of its
  // files is the same unsupported provenance as any other.
  ".qfai/output/",
] as const;

/**
 * A path into one of those trees, as an evidence file writes it.
 *
 * The wildcard is inside the character class on purpose. Without it a match
 * stops at the first wildcard, so a glob naming a set of packs is measured as
 * the prefix before it — a path nothing has, recorded as an entry a later exact
 * citation could inherit. Matching the whole token is what lets the filter below
 * recognise a glob at all. The plus is in it for the same reason: a report
 * scoped to several specs is named `validate.spec-0003+0004.json`, and a class
 * stopping at the plus measures a prefix nothing has while the real file is
 * tracked.
 */
const CITED_GENERATED_PATH =
  /\.qfai\/(?:review|review_archive|report|discussion|output)\/[A-Za-z0-9._/*+-]+/g;

/**
 * A line that says a path is not provenance.
 *
 * A record explaining why an artifact is absent, or saying it is deliberately
 * not cited, writes the path like any other. Without a way to say so it would
 * either fail this guard or need a backlog entry claiming a citation it just
 * disclaimed. The marker is per line, so it covers what a reader can see it
 * covering.
 */
const NOT_A_CITATION = "<!-- qfai:not-a-citation -->";

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

/**
 * How many citations the first census measured.
 *
 * Exact, not a ceiling. A ceiling alone lets one repair pay for one new record:
 * the length stays where it was, every entry is still recorded, and nothing is
 * stale. Repairing an entry moves it to `CLEARED` below and leaves this list
 * untouched, so the only way to reach this number after adding a citation is to
 * remove one that was really there — and either edit is visible.
 */
const INITIAL_CENSUS_SIZE = 93;

/**
 * The census keys themselves, as one digest.
 *
 * A length alone is not the no-growth rule: replacing a repaired entry with a
 * new one keeps it at 93, and every other check then passes while a fresh
 * citation inherits the retired slot. The digest moves for any substitution, and
 * does not move when an entry is repaired — repair adds to `CLEARED` and leaves
 * the census alone.
 */
const INITIAL_CENSUS_DIGEST = "f0754587d775d81ffddaf020f6f49d44629489c25a07337e1e83a9b20eef7763";

/**
 * Every citation the first census found unresolved. **Append nothing here.**
 *
 * A record added today does not belong to a census taken before it existed. When
 * one of these is repaired, its key goes to `CLEARED`; this list stays as
 * measured.
 */
const INITIAL_CENSUS: ReadonlyArray<readonly [string, string]> = [
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/review/review-2026082*/R0*.md"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-*"],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/review/review-20260818*"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260414195449523/**"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/discussion/discussion-20260418093755100/**"],
  [".qfai/evidence/sdd-spec-0012.md", ".qfai/review/review-20260416195500000/**"],
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

/**
 * Census entries that have since been repaired.
 *
 * An entry leaves the backlog by arriving here, and the case below holds that it
 * really is repaired — the path resolves, or the record no longer cites it. The
 * list is the progress the census is meant to produce, and it is the only list
 * that grows.
 */
const CLEARED: ReadonlyArray<readonly [string, string]> = [
  [".qfai/evidence/atdd-spec-0017.md", ".qfai/report/validate.log"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/review/review-*"],
  [".qfai/evidence/implement-spec-0003.md", ".qfai/report/validate.log"],
  [".qfai/evidence/implement-spec-0006.md", ".qfai/report/validate.log"],
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
    for (const line of text.split("\n")) {
      if (line.includes(NOT_A_CITATION)) continue;
      for (const match of line.match(CITED_GENERATED_PATH) ?? []) {
        const cited = match.replace(/[.,;:]+$/, "").replace(/\/+$/, "");
        if (seen.has(cited) || !namesSomethingInside(cited)) continue;
        seen.add(cited);
        measured.push([file, cited]);
      }
    }
  }
  return measured;
}

/**
 * True when the path names something inside a generated tree rather than the
 * tree itself.
 *
 * `.qfai/review/*` and `.qfai/review/**` are how the ignore rules and the
 * exclusion lists spell the directory, and a record quoting one is describing
 * what is ignored — there is no artifact being claimed. A glob whose first
 * segment carries a literal, `review-2026082*`, names a set of packs and claims
 * that set exists.
 */
function namesSomethingInside(cited: string): boolean {
  const root = GENERATED_ROOTS.find((candidate) => cited.startsWith(candidate));
  if (root === undefined) return false;
  // Those two spellings and no others. Removing every wildcard and separator
  // before deciding exempts `review/*/*` and `review/**/*` as well, and those
  // name descendants: when the tree tracks none, the citation is dropped before
  // it can be reported unresolved.
  const inside = cited.slice(root.length);
  return inside !== "" && inside !== "*" && inside !== "**";
}

const escapeForRegExp = (literal: string): string => literal.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

/**
 * A glob as a regular expression over a whole path.
 *
 * Only the two forms an evidence record uses: `**` for any number of segments,
 * `*` for part of one. A record naming a set still claims the set exists, so a
 * glob is resolved like a single path rather than skipped — the tree carried
 * three matching nothing at all, and skipping them let that provenance through
 * as green.
 */
function globToRegExp(cited: string): RegExp {
  // `**/` is translated as a whole, and as optional: `report/**/*.json` names
  // every JSON under the tree including one sitting directly in it, and a
  // translation that leaves the separator behind demands a directory nobody
  // wrote.
  const source = cited
    .split(/(\*\*\/|\*\*|\*)/)
    .map((part) => {
      if (part === "**/") return "(?:[^/]+/)*";
      if (part === "**") return ".*";
      if (part === "*") return "[^/]*";
      return escapeForRegExp(part);
    })
    .join("");
  return new RegExp(`^${source}$`);
}

/**
 * A cited path resolves when git tracks it, or tracks something under it.
 *
 * A glob resolves when it matches at least one tracked path, which is the whole
 * of what a set-naming citation claims.
 */
function resolves(cited: string): boolean {
  const root = GENERATED_ROOTS.find((candidate) => cited.startsWith(candidate));
  if (root === undefined || !staysInsideRoot(cited, root)) return false;
  if (cited.includes("*")) {
    // Directories as well as files: `.qfai/discussion/discussion-*` names a set
    // of packs, and an anchored pattern matches no file below one of them — so
    // reading files alone reports a citation unresolved while the tree holds
    // every pack it names.
    const pattern = globToRegExp(cited);
    for (const candidate of [...tracked.files, ...tracked.directories]) {
      if (pattern.test(candidate)) return true;
    }
    return false;
  }
  return tracked.files.has(cited) || tracked.directories.has(cited);
}

const key = ([file, cited]: readonly [string, string]): string => `${file} -> ${cited}`;

/** The census, minus what has been repaired since. */
const UNRESOLVED_CITATION_BACKLOG: ReadonlyArray<readonly [string, string]> = INITIAL_CENSUS.filter(
  (entry) => !new Set(CLEARED.map(key)).has(key(entry)),
);

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

  it("keeps the census at what it measured", () => {
    // Exact. A repair moves its key to `CLEARED` and leaves this list alone, so
    // the length only moves when a citation is added to a census taken before
    // that record existed — which is the edit this refuses.
    expect(
      INITIAL_CENSUS.length,
      "the census is not the size it was measured at. A record added today does not belong in it: " +
        "repair moves a key to CLEARED and leaves the census as it stands",
    ).toBe(INITIAL_CENSUS_SIZE);
    expect(
      createHash("sha256").update(INITIAL_CENSUS.map(key).sort().join("|")).digest("hex"),
      "the census holds a key it was not measured with. Swapping one entry for another keeps the " +
        "length and hands a new citation a retired slot, which is what this digest refuses",
    ).toBe(INITIAL_CENSUS_DIGEST);
  });

  it("clears only what is really repaired", async () => {
    const measured = new Set((await measureCitations()).map(key));
    const notRepaired: string[] = [];
    for (const entry of CLEARED) {
      if (measured.has(key(entry)) && !resolves(entry[1])) notRepaired.push(key(entry));
    }
    expect(
      notRepaired.sort(),
      "a cleared entry is still cited and still unresolved — it is in the backlog, not out of it",
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

describe("what the scan counts as a citation", () => {
  const matches = (line: string): string[] =>
    line.includes(NOT_A_CITATION) ? [] : (line.match(CITED_GENERATED_PATH) ?? []);

  it("takes a scoped report's whole filename", () => {
    // A class stopping at the plus measures a prefix nothing has, and reports
    // the real file as missing while git tracks it.
    expect(matches("- `.qfai/report/validate.spec-0003+0004.json` — scoped run")).toEqual([
      ".qfai/report/validate.spec-0003+0004.json",
    ]);
  });

  it("reads the legacy output tree", () => {
    expect(matches("Fallback: `.qfai/output/verify.json`")).toEqual([".qfai/output/verify.json"]);
  });

  it("counts nothing on a line that says the path is not provenance", () => {
    // A record explaining why an artifact is absent writes the path like any
    // other, and would otherwise need a backlog entry for a citation it just
    // disclaimed.
    expect(matches(`\`.qfai/report/validate.log\` is not cited here. ${NOT_A_CITATION}`)).toEqual(
      [],
    );
  });
});

describe("a glob is a claim about a set", () => {
  it("resolves when at least one tracked path matches", () => {
    // `.qfai/specs/**` is not a generated root, so a glob under one of those is
    // the case: the tree carries packs, and a glob naming them resolves.
    // A glob matching no tracked path is the unsupported provenance the guard
    // exists to refuse, and skipping globs let it through as green.
    expect(resolves(".qfai/review/review-2026082*/R0*.md")).toBe(false);
    expect(
      globToRegExp(".qfai/review/review-2026082*/R0*.md").test(
        ".qfai/review/review-20260820200000000/R01_x.md",
      ),
    ).toBe(true);
    expect(
      globToRegExp(".qfai/review/review-2026082*/R0*.md").test(
        ".qfai/review/review-20260820200000000/sub/R01_x.md",
      ),
    ).toBe(false);
    expect(
      globToRegExp(".qfai/discussion/discussion-1/**").test(
        ".qfai/discussion/discussion-1/a/b/c.md",
      ),
    ).toBe(true);
  });

  it("does not measure a path that names the tree itself", () => {
    // `.qfai/review/*` and `.qfai/review/**` are how the ignore rules and the
    // exclusion lists spell the directory, so a record quoting one is
    // describing what is ignored rather than claiming an artifact.
    expect(namesSomethingInside(".qfai/review/*")).toBe(false);
    expect(namesSomethingInside(".qfai/review/**")).toBe(false);
    // A deeper all-wildcard glob names descendants rather than the tree, so it
    // is measured and has to resolve like any other set-naming citation.
    expect(namesSomethingInside(".qfai/review/*/*")).toBe(true);
    expect(namesSomethingInside(".qfai/review/**/*")).toBe(true);
    expect(namesSomethingInside(".qfai/review/review-2026082*")).toBe(true);
    expect(namesSomethingInside(".qfai/report/validate.json")).toBe(true);
    // A literal after the wildcard-only segment is still a claim about a set.
    expect(namesSomethingInside(".qfai/review/**/*.json")).toBe(true);
    expect(namesSomethingInside(".qfai/review/**/summary.json")).toBe(true);
  });
});

describe("a globstar can match no segment at all", () => {
  it("resolves a file sitting directly in the tree the glob names", () => {
    // `report/**/*.json` names every JSON under the tree, including one in the
    // tree itself. A translation that keeps the separator demands a directory
    // nobody wrote, and reports a tracked file as missing.
    const pattern = globToRegExp(".qfai/report/**/*.json");
    expect(pattern.test(".qfai/report/validate.spec-0017.json")).toBe(true);
    expect(pattern.test(".qfai/report/run-1/validate.json")).toBe(true);
    expect(pattern.test(".qfai/report/a/b/validate.json")).toBe(true);
    expect(pattern.test(".qfai/report/validate.log")).toBe(false);
  });
});
