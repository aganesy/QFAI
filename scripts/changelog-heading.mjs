/**
 * The one reading of a `CHANGELOG.md` release heading, shared by every job that
 * acts on one.
 *
 * Three jobs read the heading for a version, and each used to read it its own
 * way. `tag-release.yml` accepted any line starting `## [X.Y.Z]`, `release.yml`
 * also required the ` - ` after it, and `check-release-notes.mjs` required a
 * date-shaped heading. So `## [1.2.3]` with no date was tagged, and the publish
 * started from that tag then refused it: a tag left behind for a release that
 * could not be published. Reading the heading in one place means a heading the
 * publish would refuse is refused before the tag exists.
 *
 * ## What a released heading is
 *
 * `## [X.Y.Z] - YYYY-MM-DD`, with nothing after the date but whitespace. The
 * dash has exactly one space on each side, because `release.yml` cuts the
 * release notes at the literal prefix `## [X.Y.Z] - `: a wider or tab
 * separator would pass here, publish to npm, and then leave the GitHub Release
 * with no body. The date is checked for shape only: it is the day the release
 * was prepared, and nothing downstream reads it as a calendar date.
 *
 * ## Which line names a version
 *
 * The first line that starts with `## [X.Y.Z]`, compared literally. Under a
 * regex the dots in `1.10.2` match any character, so `## [1010.2]` would name
 * `1.10.2`. A line that names the version and is not a released heading is
 * malformed rather than absent: somebody meant to release that version and
 * wrote the heading wrong, and saying "nothing to tag" would hide that.
 *
 * Usage:
 *   node scripts/changelog-heading.mjs <version> <file>    # `-` reads stdin
 *
 * Prints the recorded date on success and the reason otherwise, on stdout, so a
 * workflow step can capture either with one command substitution.
 *
 * Exit codes: 0 released, 1 malformed, 2 the check could not be made, 3 absent.
 */
/* global console, process */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** `## [1.11.0] - 2026-09-07`: a released section, as opposed to `[Unreleased]`. */
export const RELEASED_HEADING_RE = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})[ \t]*$/u;

/** `X.Y.Z`, the only shape a version takes in a release heading. */
const VERSION_RE = /^\d+\.\d+\.\d+$/u;

/** A released heading's version and date, or `null` when the line is not one. */
export function parseReleasedHeading(line) {
  const match = RELEASED_HEADING_RE.exec(line);
  if (match === null) return null;
  return { version: match[1] ?? "", date: match[2] ?? "" };
}

/**
 * What a changelog says about one version.
 *
 * `released` carries the date, `malformed` the line that named the version, and
 * `absent` means no line names it.
 */
export function versionHeading(changelog, version) {
  const prefix = `## [${version}]`;
  for (const line of changelog.split(/\r?\n/u)) {
    if (!line.startsWith(prefix)) continue;
    const released = parseReleasedHeading(line);
    if (released !== null && released.version === version) {
      return { state: "released", date: released.date, line };
    }
    return { state: "malformed", line };
  }
  return { state: "absent" };
}

/** The exit code and the line to print for one version of one changelog. */
export function describeHeading(changelog, version, label) {
  const expected = `'## [${version}] - YYYY-MM-DD'`;
  const heading = versionHeading(changelog, version);
  if (heading.state === "released") return { code: 0, message: heading.date };
  if (heading.state === "malformed") {
    // Control characters dropped: the line goes into a `::error::` annotation, and a
    // lone `\r` survives the line split.
    const shown = Array.from(heading.line)
      .filter((char) => {
        const code = char.codePointAt(0) ?? 0;
        return code >= 0x20 && code !== 0x7f;
      })
      .join("");
    return {
      code: 1,
      message: `${label} names ${version} as '${shown}', which is not a released heading; expected ${expected}`,
    };
  }
  return { code: 3, message: `${label} has no heading for ${version}; expected ${expected}` };
}

/** Reads the arguments and the changelog, and answers for one version. */
export function main(args, readStdin = () => readFileSync(0, "utf-8")) {
  const [version, file] = args;
  if (version === undefined || file === undefined || args.length !== 2) {
    return {
      code: 2,
      message: "usage: changelog-heading.mjs <version> <file>, where - reads stdin",
    };
  }
  if (!VERSION_RE.test(version)) {
    return { code: 2, message: `'${version}' is not an X.Y.Z version` };
  }
  const label = file === "-" ? "CHANGELOG.md" : path.basename(file);
  let changelog;
  try {
    changelog = file === "-" ? readStdin() : readFileSync(file, "utf-8");
  } catch (cause) {
    return {
      code: 2,
      message: `could not read ${label}: ${cause instanceof Error ? cause.message : String(cause)}`,
    };
  }
  return describeHeading(changelog, version, label);
}

// `pathToFileURL`, not `file://` + the path: on Windows `process.argv[1]` is a
// drive-letter path with backslashes, which concatenation turns into a string no
// `import.meta.url` ever equals.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { code, message } = main(process.argv.slice(2));
  console.log(message);
  process.exit(code);
}
