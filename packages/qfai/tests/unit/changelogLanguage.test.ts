/**
 * Meta-test: `CHANGELOG.md` is written in English, in every section.
 *
 * `repository-language.md` says this repository is written in English, and
 * `cliMessageLanguage.test.ts` holds that for the strings `src/**` emits.
 * `CHANGELOG.md` is the surface an outside reader meets first, so it is held
 * to the same rule: no Japanese line anywhere in the document, in `## [Unreleased]`
 * or in a released section. There is no allowlist.
 *
 * A failure names the section each offending line sits in, so a reader can
 * find it without searching the whole file.
 *
 * Japanese samples below are written as \uXXXX escapes so this file holds no
 * Japanese text itself.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CHANGELOG_PREAMBLE, sectionOfEachLine } from "../helpers/changelogSections.js";
import { findJapaneseTextLines } from "../helpers/japaneseMessageScan.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// tests/unit/<this file> -> tests -> packages/qfai -> packages -> repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const CHANGELOG_MD = path.join(REPO_ROOT, "CHANGELOG.md");

/** A sample Japanese phrase: "Japanese text". */
const JAPANESE = "\u65e5\u672c\u8a9e";

/** `CHANGELOG.md:<line>: <text>`, prefixed with the section that holds the line. */
function reportJapaneseLines(text: string): string[] {
  const sections = sectionOfEachLine(text);
  return findJapaneseTextLines(text).map(
    (found) =>
      // `sectionOfEachLine` is indexed from 0 and line numbers from 1.
      `[${sections[found.line - 1] ?? CHANGELOG_PREAMBLE}] CHANGELOG.md:${found.line}: ${found.text}`,
  );
}

describe("changelog language", () => {
  it("keeps every section of the changelog in English", async () => {
    const text = await readFile(CHANGELOG_MD, "utf-8");

    expect(
      reportJapaneseLines(text),
      "Japanese in CHANGELOG.md. A changelog entry must be English " +
        "(.agents/rules/repository-language.md)",
    ).toEqual([]);
  });

  it("reads Japanese out of a changelog that has some", () => {
    // The positive control. The case above passes when the scan finds nothing,
    // so a scan that always finds nothing would pass it whatever the changelog
    // held. This puts a known changelog through the same helpers.
    const sample = ["# Changelog", "", "## [1.0.0] - 2026-01-01", "", `- ${JAPANESE}`, ""].join(
      "\n",
    );

    expect(reportJapaneseLines(sample)).toEqual([
      `[[1.0.0] - 2026-01-01] CHANGELOG.md:5: - ${JAPANESE}`,
    ]);
  });

  it("assigns a line to the section heading above it", () => {
    const sections = sectionOfEachLine(
      ["# Changelog", "", "## [Unreleased]", "- one", "## [1.0.0] - 2026-01-01", "- two"].join(
        "\n",
      ),
    );

    expect(sections).toEqual([
      CHANGELOG_PREAMBLE,
      CHANGELOG_PREAMBLE,
      "[Unreleased]",
      "[Unreleased]",
      "[1.0.0] - 2026-01-01",
      "[1.0.0] - 2026-01-01",
    ]);
  });

  it("reads a deeper heading as content of the section it sits in", () => {
    // `### Added` and friends fill a release section. Treating one as a
    // section of its own would spread a release's entries across keys.
    const sections = sectionOfEachLine(
      ["## [1.0.0] - 2026-01-01", "### Added", "- one"].join("\n"),
    );

    expect(sections).toEqual([
      "[1.0.0] - 2026-01-01",
      "[1.0.0] - 2026-01-01",
      "[1.0.0] - 2026-01-01",
    ]);
  });

  it("reads a document line as prose, not as code with comments", () => {
    // The operator-message scan blanks comments before looking, because a
    // `//` there opens one. In a document every line is content a reader
    // sees, so nothing may be blanked first.
    const found = findJapaneseTextLines(
      [`- see src/a.ts // ${JAPANESE}`, `- \`/* ${JAPANESE} */\``].join("\n"),
    );

    expect(found.map((entry) => entry.line)).toEqual([1, 2]);
  });
});
