/**
 * A published release body, held against the changelog section it was built
 * from.
 *
 * `release.yml` checks out the tagged commit, cuts the `## [X.Y.Z] - …`
 * section out of `CHANGELOG.md` at that SHA, and creates the GitHub Release
 * once. Nothing reads the file again.
 *
 * So an entry added to a released section after its tag exists in the
 * repository and not in the notes anyone reads. `git log` shows the change;
 * the release page does not, and an operator deciding whether to upgrade reads
 * the page.
 *
 * ## What counts as a difference
 *
 * An entry, not a byte. The workflow writes the section verbatim, but a
 * release body can be edited by hand and GitHub normalises line endings, so a
 * text comparison would report formatting as drift and bury the one thing that
 * matters. An entry is a top-level `- ` bullet's own line, which is where the
 * bolded title lives, normalised for whitespace.
 *
 * The section's entries are the authority. A body missing one is drift; a body
 * carrying one the section does not is an edit somebody made on purpose, and
 * reporting it would make every deliberate note a failure.
 *
 * ## A body the workflow had to cut
 *
 * A release body is capped at 125,000 characters. Past that the workflow stops
 * the section at an entry boundary and appends a note saying so. Such a body
 * legitimately lacks the tail of its section, so the comparison asks only that
 * what it carries is a prefix of what the section carries.
 *
 * ## What it does about a difference
 *
 * Reports it. Rewriting a published body is a wider permission than any lane
 * here holds, and a body can also carry an edit somebody made on purpose —
 * which a rewrite would silently discard.
 *
 * Usage:
 *   node scripts/check-release-notes.mjs                # every released section
 *   node scripts/check-release-notes.mjs --version 1.11.0
 *
 * Reads `GITHUB_TOKEN` (or `GH_TOKEN`) and `GITHUB_REPOSITORY`.
 *
 * Exit codes: 0 clean, 1 drift, 2 the comparison could not be made.
 */
/* global console, process, fetch */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** `## [1.11.0] - 2026-09-07` — a released section, as opposed to `[Unreleased]`. */
const RELEASED_HEADING_RE = /^## \[(\d+\.\d+\.\d+)\][ \t]+-[ \t]+\d{4}-\d{2}-\d{2}[ \t]*$/;

/**
 * How many bodies are read at once.
 *
 * One request per released section, and the count only grows: one more with
 * every release. Read one at a time, the job's ten-minute budget is divided by
 * that count, so the time each request may take shrinks as the changelog grows
 * and the lane starts failing on a slow API with nothing having changed.
 *
 * Eight, and not all of them at once. The limit a fan-out would meet is the
 * cap of 100 requests in flight from one caller, and a run that put every
 * section against that cap would fail whole rather than run slowly. Eight stays
 * an order of magnitude below it and multiplies the time each request may take
 * by eight. The budgets that count requests rather than connections are out of
 * reach at any pool size: one request per section, against an hourly allowance
 * of a thousand and a per-minute one larger still.
 */
export const READS_AT_ONCE = 8;

/** The sentence `release.yml` appends when it had to cut the section. */
export const TRUNCATION_MARKER = "**These notes are not the whole section.**";

/**
 * Every released section of a changelog, newest first, as `{ version, body }`.
 *
 * `[Unreleased]` is skipped: it has no tag and therefore no published body to
 * disagree with.
 */
export function releasedSections(changelog) {
  const lines = changelog.split(/\r?\n/);
  const sections = [];
  let current = null;
  for (const line of lines) {
    const released = RELEASED_HEADING_RE.exec(line);
    if (released !== null) {
      current = { version: released[1] ?? "", lines: [] };
      sections.push(current);
      continue;
    }
    if (line.startsWith("## [")) {
      current = null;
      continue;
    }
    current?.lines.push(line);
  }
  return sections.map((section) => ({
    version: section.version,
    body: section.lines.join("\n").trim(),
  }));
}

/**
 * The entries a body or a section names, in document order.
 *
 * A top-level `- ` bullet's own line and nothing else: a nested bullet is part
 * of the entry above it, and a continuation line is the same entry wrapped. The
 * line is normalised for whitespace so a rewrap is not a difference.
 */
export function entryTitles(markdown) {
  const titles = [];
  /** The open fence, as `{ marker, length }`, or `null` outside one. */
  let open = null;
  for (const line of markdown.split(/\r?\n/)) {
    const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence !== null) {
      const run = fence[1] ?? "";
      const marker = run[0] ?? "";
      if (open === null) {
        open = { marker, length: run.length };
        continue;
      }
      // A block closes on its own character and at least its own length. A
      // shorter or different fence inside one is content, and reading it as a
      // close would let every entry below the block go unseen.
      if (marker === open.marker && run.length >= open.length) open = null;
      continue;
    }
    if (open !== null) continue;
    // `-` then any run of spaces: a changelog written with a wider gutter has
    // entries too, and an entry this does not see is one it can never report
    // as missing.
    if (!/^-[ \t]+\S/.test(line)) continue;
    titles.push(line.replace(/\s+/gu, " ").trim());
  }
  return titles;
}

/**
 * What a section carries and its published body does not.
 *
 * A truncated body is compared as a prefix: it is missing the tail of its
 * section by construction, and only an entry missing from the part it does
 * cover is drift.
 */
export function missingEntries(sectionBody, releaseBody) {
  const wanted = entryTitles(sectionBody);
  const published = new Set(entryTitles(releaseBody));
  const truncated = releaseBody.includes(TRUNCATION_MARKER);
  if (!truncated) {
    return wanted.filter((title) => !published.has(title));
  }
  // The covered part ends at the last section entry the body still carries.
  let covered = -1;
  for (let i = 0; i < wanted.length; i++) {
    if (published.has(wanted[i] ?? "")) covered = i;
  }
  return wanted.slice(0, covered + 1).filter((title) => !published.has(title));
}

/** Reads a release body by tag, or `null` when there is no such release. */
async function fetchReleaseBody(repository, tag, token) {
  const response = await fetch(`https://api.github.com/repos/${repository}/releases/tags/${tag}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "user-agent": "qfai-release-notes-check",
    },
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GitHub answered ${String(response.status)} for ${tag}`);
  }
  const payload = await response.json();
  return typeof payload?.body === "string" ? payload.body : "";
}

/**
 * Every section's published body, read at most `READS_AT_ONCE` at a time.
 *
 * The answer is indexed by the section's own position, so what the caller reads
 * is in changelog order whatever order the responses arrived in.
 *
 * A read that fails stops the workers claiming any further section, and the
 * failure carried back is the lowest section that failed rather than the first
 * one to answer. Both are what reading them one at a time did: the run ended at
 * that section, and the sections below it were never asked for.
 */
async function readBodies(sections, read) {
  /** Indexed by section, and holding only the sections a worker claimed. */
  const bodies = [];
  /** `{ index, tag, cause }` for the lowest section that failed, or `null`. */
  let failure = null;
  let next = 0;

  const worker = async () => {
    while (failure === null) {
      const index = next;
      const section = sections[index];
      if (section === undefined) return;
      next = index + 1;
      const tag = `v${section.version}`;
      try {
        bodies[index] = await read(tag);
      } catch (cause) {
        if (failure === null || index < failure.index) failure = { index, tag, cause };
        return;
      }
    }
  };

  const workers = [];
  for (let started = 0; started < Math.min(READS_AT_ONCE, sections.length); started++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return { bodies, failure };
}

/**
 * Reports what a section's published body does not carry, and says whether it
 * was missing anything.
 */
function reportSection(tag, section, body) {
  const missing = missingEntries(section.body, body);
  if (missing.length === 0) {
    return false;
  }
  console.error(`${tag}: ${String(missing.length)} entr(y|ies) the published body does not carry:`);
  for (const title of missing) {
    console.error(`  ${title}`);
  }
  return true;
}

/** Compares every released section against its published body. */
export async function run(options = {}) {
  const {
    changelogPath = "CHANGELOG.md",
    repository = process.env["GITHUB_REPOSITORY"],
    token = process.env["GITHUB_TOKEN"] ?? process.env["GH_TOKEN"],
    only = null,
    readBody = fetchReleaseBody,
  } = options;

  if (!repository || !token) {
    console.error(
      "check-release-notes: needs GITHUB_REPOSITORY and a token to read the published bodies; nothing was compared.",
    );
    return 2;
  }

  let changelog;
  try {
    changelog = readFileSync(changelogPath, "utf-8");
  } catch (cause) {
    console.error(
      `check-release-notes: could not read ${changelogPath}: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return 2;
  }

  const sections = releasedSections(changelog).filter(
    (section) => only === null || section.version === only,
  );
  if (sections.length === 0) {
    console.error(
      `check-release-notes: ${changelogPath} has no released section${only === null ? "" : ` for ${only}`}; nothing was compared.`,
    );
    return 2;
  }

  const { bodies, failure } = await readBodies(sections, (tag) => readBody(repository, tag, token));

  // Counted and reported here rather than as the responses land, so the two
  // counters have one writer and the report reads in changelog order. It stops
  // at a failed read, which is where reading one at a time stopped.
  let drifted = 0;
  let compared = 0;
  const reported = failure === null ? sections : sections.slice(0, failure.index);
  for (const [index, section] of reported.entries()) {
    const body = bodies[index];
    if (body === null) {
      // A section with no release is an ordinary state: a version tagged but
      // not released, or a changelog that predates the workflow.
      continue;
    }
    compared += 1;
    if (reportSection(`v${section.version}`, section, body)) drifted += 1;
  }

  if (failure !== null) {
    const { tag, cause } = failure;
    console.error(
      `check-release-notes: ${tag}: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return 2;
  }

  if (drifted > 0) {
    console.error(
      "A released section gained an entry after its release was built. The repository " +
        "has it and the release page does not, so nobody reading the notes is told. " +
        "Edit the published body to match; the section is the authority.",
    );
    return 1;
  }

  console.log(
    `Every published release body carries its section's entries (${String(compared)} compared).`,
  );
  return 0;
}

// `pathToFileURL`, not `file://` + the path: on Windows `process.argv[1]` is a
// drive-letter path with backslashes, which concatenation turns into a string no
// `import.meta.url` ever equals. The guard then never fires, the lane exits 0
// having scanned nothing, and a run that never looked reads as a run that passed.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = process.argv.indexOf("--version");
  const only = index < 0 ? null : (process.argv[index + 1] ?? "");
  if (only !== null && (only === "" || only.startsWith("--"))) {
    // Refused rather than read as "every version": a caller that meant to name
    // one and passed an empty value would be told its run was clean.
    console.error("check-release-notes: --version needs a version, for example --version 1.11.0");
    process.exit(2);
  }
  process.exit(await run(only === null ? {} : { only }));
}
