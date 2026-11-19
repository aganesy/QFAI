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
 * the section at an entry boundary and appends a note saying so, and the note
 * records how many entries it kept. Such a body legitimately lacks the tail of
 * its section, so the comparison asks that it carries the first that many
 * entries of the section, in the section's order.
 *
 * The count is read from the note rather than from the body. Taken from the
 * entries the body still carries, a body cut down to the note alone would cover
 * nothing and so be missing nothing. A cut body whose note records no count is
 * held to the whole section, because nothing says where its cut was.
 *
 * ## What it does about a difference
 *
 * Reports it. Rewriting a published body is a wider permission than any lane
 * here holds, and a body can also carry an edit somebody made on purpose —
 * which a rewrite would silently discard.
 *
 * ## How the bodies are read
 *
 * From the release list, a hundred to a page, rather than one request per
 * section. The list carries `tag_name` and `body` together, so what decides
 * the request count is how many releases exist, not how many sections the
 * changelog holds.
 *
 * The figures, so the margin can be read rather than guessed at: 7 published
 * releases against 192 released sections, which is `ceil(7 / 100)` — one
 * request, about 1.2 s. The workflow's budget is ten minutes. A request joins
 * the run on the hundredth release after this one, so the margin moves per
 * hundred releases and not per release, which is what the per-section loop it
 * replaced did.
 *
 * A draft is skipped. It carries a tag name and no tag, it is readable only to
 * whoever can push, and it is the one thing the list shows that a read by tag
 * would not — so comparing against one would make the answer depend on which
 * token ran the check.
 *
 * Usage:
 *   node scripts/check-release-notes.mjs                # every released section
 *   node scripts/check-release-notes.mjs --version 1.11.0
 *
 * Reads `GITHUB_TOKEN` (or `GH_TOKEN`) and `GITHUB_REPOSITORY`.
 *
 * Exit codes: 0 clean, 1 drift, 2 the comparison could not be made.
 */
/* global console, process, fetch, AbortSignal, URL */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** `## [1.11.0] - 2026-09-07` — a released section, as opposed to `[Unreleased]`. */
const RELEASED_HEADING_RE = /^## \[(\d+\.\d+\.\d+)\][ \t]+-[ \t]+\d{4}-\d{2}-\d{2}[ \t]*$/;

/** The sentence `release.yml` appends when it had to cut the section. */
export const TRUNCATION_MARKER = "**These notes are not the whole section.**";

/** The sentence in that note, written by the same step, that records how many entries the cut kept. */
const CUTOFF_RE = /stopped at an entry boundary after its first (\d+) entr(?:y|ies)\./u;

/** Whether a published body says it is a cut of its section. */
export function saysItWasCut(releaseBody) {
  return releaseBody.includes(TRUNCATION_MARKER);
}

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
 * How many entries the workflow kept when it cut a body, as its note records,
 * or `null` when the body records no count.
 */
export function recordedCutoff(releaseBody) {
  const recorded = CUTOFF_RE.exec(releaseBody);
  if (recorded === null) return null;
  return Number(recorded[1]);
}

/**
 * The entries of `required` that do not sit in a longest run of them `published`
 * carries in the same order.
 *
 * Longest, not first-come: a walk that matches the first title it can would
 * read a hand-added line repeating a later title as that entry, or one entry
 * moved to the front as every entry behind it being out of place. On a tie the
 * published line is the one passed over, since a published line may be an
 * addition and a required one may not.
 */
function unmatchedInOrder(required, published) {
  const rows = required.length;
  const cols = published.length;
  // `longest[i][j]`: the longest common run of `required[i..]` and `published[j..]`.
  const longest = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      longest[i][j] =
        required[i] === published[j]
          ? longest[i + 1][j + 1] + 1
          : Math.max(longest[i + 1][j], longest[i][j + 1]);
    }
  }
  const unmatched = [];
  let i = 0;
  let j = 0;
  while (i < rows) {
    if (j < cols && required[i] === published[j]) {
      i += 1;
      j += 1;
    } else if (j < cols && longest[i][j + 1] >= longest[i + 1][j]) {
      j += 1;
    } else {
      unmatched.push(required[i]);
      i += 1;
    }
  }
  return unmatched;
}

/**
 * What a section carries and its published body does not, as
 * `{ missing, outOfOrder, cut, cutoff }`.
 *
 * A body that was not cut is compared as a set: it can be edited by hand, and
 * only an entry it lacks is drift.
 *
 * A truncated body is the first entries of its section, in the section's order,
 * as many as its note says it kept. It is missing the tail by construction, so
 * only that prefix is required. The body is read up to its note, and the prefix
 * is matched against it in order with any other line passed over, so an entry
 * somebody added is not drift. A required entry the body does not carry at all
 * is `missing`; one it carries outside the matched order is `outOfOrder`, so a
 * reordered cut is drift rather than agreement.
 *
 * `cutoff` is read from the note onward, never from the entries above it: an
 * entry quoting the note's sentence would otherwise set the count.
 */
export function entryDrift(sectionBody, releaseBody) {
  const wanted = entryTitles(sectionBody);
  const markerAt = releaseBody.indexOf(TRUNCATION_MARKER);
  if (markerAt < 0) {
    const published = new Set(entryTitles(releaseBody));
    return {
      missing: wanted.filter((title) => !published.has(title)),
      outOfOrder: [],
      cut: false,
      cutoff: null,
    };
  }
  const published = entryTitles(releaseBody.slice(0, markerAt));
  const cutoff = recordedCutoff(releaseBody.slice(markerAt));
  const required = cutoff === null ? wanted : wanted.slice(0, cutoff);
  const carried = new Set(published);
  const unmatched = unmatchedInOrder(required, published);
  return {
    missing: unmatched.filter((title) => !carried.has(title)),
    outOfOrder: unmatched.filter((title) => carried.has(title)),
    cut: true,
    cutoff,
  };
}

/**
 * The `rel="next"` target of a `Link` header, or `null` when the page is the
 * last one.
 *
 * Followed rather than counted. The endpoint states where the next page is, and
 * a run that built page numbers itself would have to decide when to stop from
 * the size of the page it just read — which is a guess the header removes.
 */
export function nextPageLink(header) {
  if (typeof header !== "string") return null;
  // Split only where a comma introduces another target, so a comma inside a URL
  // does not cut one target into two.
  for (const target of header.split(/,\s*(?=<)/u)) {
    const parsed = /^\s*<([^>]+)>\s*;\s*(.+)$/u.exec(target);
    if (parsed === null) continue;
    // The whole parameter, not a prefix of one: `rel="nextish"` names something
    // else, and matching it would end the paging on a page that has a next.
    const marked = (parsed[2] ?? "")
      .split(";")
      .some((parameter) => /^\s*rel\s*=\s*"?next"?\s*$/u.test(parameter));
    if (marked) return parsed[1] ?? null;
  }
  return null;
}

/**
 * Where the page after this one is, resolved against the page it came from and
 * required to stay on that host.
 *
 * The header is part of the response, so whatever answers chooses where the run
 * sends its next request — and the request carries the token in an
 * `Authorization` header. Left unchecked, a rewritten `Link` hands a repository
 * token to a host of its choosing.
 */
export function nextPageUrl(header, current) {
  const target = nextPageLink(header);
  if (target === null) return null;
  const from = new URL(current);
  let resolved;
  try {
    resolved = new URL(target, from);
  } catch {
    throw new Error(`the next-page link is not a URL: ${target}`);
  }
  if (resolved.origin !== from.origin) {
    throw new Error(`the next-page link leaves ${from.origin}: ${resolved.href}`);
  }
  return resolved.href;
}

/**
 * One release as the comparison reads it, or a reason the entry cannot be read.
 *
 * `body` is absent on a release published with no notes, and that is an empty
 * body rather than a missing one. Any other shape is something else answering,
 * and reading it as an empty body would report the whole section as drift.
 */
function readRelease(release) {
  if (typeof release !== "object" || release === null)
    return { error: "an entry is not an object" };
  const tag = Reflect.get(release, "tag_name");
  if (typeof tag !== "string") return { error: "an entry has no tag name" };
  const body = Reflect.get(release, "body");
  if (body !== null && body !== undefined && typeof body !== "string") {
    return { error: `the body of ${tag} is not text` };
  }
  return { draft: Reflect.get(release, "draft") === true, tag, body: body ?? "" };
}

/**
 * How long one page may take to answer.
 *
 * The list endpoint answers a hundred-item page in well under a second, so
 * thirty is more than an order of magnitude above anything ordinary and cuts no
 * slow response. The run makes one request per page and there are two, so even
 * both at this ceiling spend a tenth of the job's ten-minute budget — which is
 * the bound that matters, because past the budget the runner kills the job and a
 * killed job prints no verdict of its own.
 *
 * A read that times out is not retried. This lane runs weekly, so a red run is
 * followed by another on its own; retrying would double the wait before the
 * failure is reported and would hide, in the output, that a read failed at all.
 */
const READ_TIMEOUT_MS = 30_000;

/** One page of releases, and where the page after it is. */
export async function fetchReleasePage(url, token, timeoutMs = READ_TIMEOUT_MS) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "user-agent": "qfai-release-notes-check",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    // Named rather than left as the runtime's abort message, which says a
    // timeout happened without saying what the ceiling was.
    if (cause instanceof Error && cause.name === "TimeoutError") {
      throw new Error(`no answer within ${String(Math.round(timeoutMs / 1000))}s`, { cause });
    }
    throw cause;
  }
  if (!response.ok) {
    throw new Error(`GitHub answered ${String(response.status)}`);
  }
  return { releases: await response.json(), next: nextPageUrl(response.headers.get("link"), url) };
}

/**
 * Every published release body, by tag.
 *
 * A tag the map does not carry has no release. That is the same set a read by
 * tag answered 404 for: both endpoints show a published release and neither
 * shows a draft, which has a tag name and no tag.
 *
 * A draft is dropped here rather than left to the token's permissions. The list
 * shows drafts to whoever can push, so a run holding such a token would
 * otherwise compare a section against notes nobody can read.
 */
async function releaseBodies(repository, token, readPage) {
  const bodies = new Map();
  // A page whose `next` names a page already read ends the paging with a
  // failure. Followed, a self-referential link spends the job's whole budget
  // and the run is killed without a verdict of its own.
  const read = new Set();
  // A hundred to a page is the most the endpoint serves.
  let url = `https://api.github.com/repos/${repository}/releases?per_page=100`;
  while (url !== null) {
    if (read.has(url)) {
      throw new Error(`reading ${url}: this page was already read, so the pages form a loop`);
    }
    read.add(url);
    let page;
    try {
      page = await readPage(url, token);
    } catch (cause) {
      // Named here rather than in the read, so a page that never answered at
      // all is reported against the same request a refusal would have been.
      throw new Error(`reading ${url}: ${cause instanceof Error ? cause.message : String(cause)}`, {
        cause,
      });
    }
    // A 2xx whose payload is not a list is not an empty list. Read as one, every
    // section below it looks unreleased, and the run exits 0 having compared
    // nothing — a false clean over whatever answered instead of the endpoint.
    if (!Array.isArray(page.releases)) {
      throw new Error(`reading ${url}: the response is not a list of releases`);
    }
    for (const release of page.releases) {
      const entry = readRelease(release);
      // Stopped rather than skipped. An entry skipped for its shape leaves its
      // section looking unreleased, which is the ordinary state and reads as a
      // clean run — so the one payload nobody can compare reports as agreement.
      if (entry.error !== undefined) {
        throw new Error(`reading ${url}: ${entry.error}`);
      }
      if (entry.draft) continue;
      bodies.set(entry.tag, entry.body);
    }
    // A page that names no next one ends the paging. Read as anything but
    // `null` the loop would ask for the same page again, forever.
    url = page.next ?? null;
  }
  return bodies;
}

/**
 * Reports what a section's published body does not carry, or carries out of
 * the section's order, and says whether there was anything to report.
 */
function reportSection(tag, section, body) {
  const { missing, outOfOrder, cut, cutoff } = entryDrift(section.body, body);
  if (missing.length === 0 && outOfOrder.length === 0) {
    return false;
  }
  if (cut && cutoff === null) {
    console.error(
      `${tag}: the body says it was cut and does not record how many entries it kept, so it is held to the whole section.`,
    );
  }
  if (missing.length > 0) {
    console.error(
      `${tag}: ${String(missing.length)} entr(y|ies) the published body does not carry:`,
    );
    for (const title of missing) {
      console.error(`  ${title}`);
    }
  }
  if (outOfOrder.length > 0) {
    console.error(
      `${tag}: ${String(outOfOrder.length)} entr(y|ies) the published body carries out of the section's order:`,
    );
    for (const title of outOfOrder) {
      console.error(`  ${title}`);
    }
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
    readPage = fetchReleasePage,
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

  // Read before anything is compared, so a page that never arrived cannot be
  // mistaken for the tags it carried having no release. Nothing is reported on
  // the way: a partial list makes every section below the failure look
  // unreleased, and that reads as a clean run rather than as the failure it is.
  let bodies;
  try {
    bodies = await releaseBodies(repository, token, readPage);
  } catch (cause) {
    console.error(`check-release-notes: ${cause instanceof Error ? cause.message : String(cause)}`);
    return 2;
  }

  let drifted = 0;
  let compared = 0;
  for (const section of sections) {
    const body = bodies.get(`v${section.version}`);
    if (body === undefined) {
      // A section with no release is an ordinary state: a version tagged but
      // not released, or a changelog that predates the workflow.
      continue;
    }
    compared += 1;
    if (reportSection(`v${section.version}`, section, body)) drifted += 1;
  }

  if (drifted > 0) {
    console.error(
      "A released section gained an entry after its release was built. The repository " +
        "has it and the release page does not, so nobody reading the notes is told. " +
        "Edit the published body to match; the section is the authority.",
    );
    return 1;
  }

  if (compared === 0) {
    // Said plainly rather than as a clean run: no section here has a release,
    // which is ordinary for a changelog predating the workflow and is also what
    // a read of the wrong repository looks like.
    console.log("No released section has a published release; nothing was compared.");
    return 0;
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
