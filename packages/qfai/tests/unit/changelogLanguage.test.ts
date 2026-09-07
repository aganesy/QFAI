/**
 * Meta-test: what is still being written in the changelog is written in
 * English.
 *
 * The document as a whole is not, and this check does not claim it is. What it
 * holds at zero is the part that is still open to writing; what already
 * shipped is a backlog it names line by line. The split is set out below.
 *
 * `repository-language.md` says this repository is written in English, and
 * `cliMessageLanguage.test.ts` holds that for the strings `src/**` emits. It
 * holds it for nothing else. Documents, tests and workflows have never been
 * scanned, so on those surfaces the rule rested on review alone — and a whole
 * set of release notes was written in Japanese without anything objecting.
 *
 * `CHANGELOG.md` is the surface an outside reader meets first, so it is the
 * one that gets a check first.
 *
 * The check is per section, not per file, because the document's two halves
 * have opposite rules:
 *
 *   - `## [Unreleased]` is open. Entries are written there before every
 *     release, so it is where new Japanese would enter. It is held at zero.
 *   - A released section is a record of what shipped. Its Japanese is the
 *     migration backlog, recorded in `changelogLanguage.allowlist.ts` by
 *     content.
 *
 * Content, not a per-section line count: a ceiling of "n Japanese lines in
 * this section" is satisfied just as well by n *different* ones, so
 * translating a line would free a slot for a brand-new Japanese line. Matching
 * content closes that, and it is the same rule — and the same
 * `diffAgainstAllowlist` — the operator-message check runs.
 *
 * Holding `## [Unreleased]` at zero is what makes the next release notes
 * English. When a release closes that section, its content moves under a new
 * heading, which is likewise absent from the allowlist and likewise held at
 * zero. So the list only ever shrinks.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CHANGELOG_PREAMBLE, sectionOfEachLine } from "../helpers/changelogSections.js";
import { diffAgainstAllowlist, findJapaneseTextLines } from "../helpers/japaneseMessageScan.js";

import { CHANGELOG_JAPANESE_ALLOWLIST } from "./changelogLanguage.allowlist.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// tests/unit/<this file> -> tests -> packages/qfai -> packages -> repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const CHANGELOG_MD = path.join(REPO_ROOT, "CHANGELOG.md");

/** The heading of the section that is open for writing. */
const UNRELEASED = "[Unreleased]";

/** Japanese lines of `CHANGELOG.md`, grouped by the section holding them. */
async function japaneseBySection(): Promise<Map<string, { line: number; text: string }[]>> {
  const text = await readFile(CHANGELOG_MD, "utf-8");
  const sections = sectionOfEachLine(text);

  const grouped = new Map<string, { line: number; text: string }[]>();
  for (const found of findJapaneseTextLines(text)) {
    // `sectionOfEachLine` is indexed from 0 and line numbers from 1.
    const section = sections[found.line - 1] ?? CHANGELOG_PREAMBLE;
    const bucket = grouped.get(section);
    if (bucket === undefined) {
      grouped.set(section, [found]);
      continue;
    }
    bucket.push(found);
  }
  return grouped;
}

describe("changelog language", () => {
  it("keeps the section that is open for writing in English", async () => {
    const grouped = await japaneseBySection();

    expect(
      (grouped.get(UNRELEASED) ?? []).map((found) => `CHANGELOG.md:${found.line}: ${found.text}`),
      `Japanese under ## ${UNRELEASED}. A changelog entry must be English ` +
        "(.agents/rules/repository-language.md)",
    ).toEqual([]);
  });

  it("keeps the text above the first release heading in English", async () => {
    const grouped = await japaneseBySection();

    expect(
      (grouped.get(CHANGELOG_PREAMBLE) ?? []).map(
        (found) => `CHANGELOG.md:${found.line}: ${found.text}`,
      ),
    ).toEqual([]);
  });

  it("reads Japanese out of a changelog that has some", () => {
    // The positive control. Every case below passes when the scan finds
    // nothing, so a scan that always finds nothing would pass the file
    // regardless of its content. This puts a known changelog through the same
    // two helpers instead of asserting that the real one still has Japanese —
    // an assertion that would turn a completed migration into a failure.
    const sample = ["# Changelog", "", "## [1.0.0] - 2026-01-01", "", "- 日本語の記述", ""].join(
      "\n",
    );

    const sections = sectionOfEachLine(sample);
    const found = findJapaneseTextLines(sample);

    expect(found.map((line) => line.text)).toEqual(["- 日本語の記述"]);
    // Line numbers are 1-based and the section array is indexed from 0, the
    // same offset `japaneseBySection` applies.
    expect(sections[(found[0]?.line ?? 0) - 1]).toBe("[1.0.0] - 2026-01-01");
  });

  it("admits no Japanese line the allowlist does not name", async () => {
    const grouped = await japaneseBySection();

    const added: string[] = [];
    const migrated: string[] = [];
    for (const [section, found] of grouped) {
      const diff = diffAgainstAllowlist(
        section,
        found,
        CHANGELOG_JAPANESE_ALLOWLIST[section] ?? [],
      );
      added.push(...diff.added);
      migrated.push(...diff.migrated);
    }

    const stale = Object.keys(CHANGELOG_JAPANESE_ALLOWLIST).filter(
      (section) => !grouped.has(section),
    );
    expect(stale, "allowlist sections with no Japanese left — drop them").toEqual([]);
    expect(
      added,
      "Japanese line the allowlist does not name. A new changelog entry must be English " +
        "(.agents/rules/repository-language.md)",
    ).toEqual([]);
    expect(
      migrated,
      "allowlist entries whose line is gone — delete them, do not leave a reusable slot",
    ).toEqual([]);
  });

  it("names every allowlisted section as a heading the document still has", async () => {
    // A renamed or removed heading silently parks its entries out of reach,
    // and the section's Japanese then reports as brand new under the new name.
    const text = await readFile(CHANGELOG_MD, "utf-8");
    const headings = new Set(sectionOfEachLine(text));

    expect(
      Object.keys(CHANGELOG_JAPANESE_ALLOWLIST).filter((section) => !headings.has(section)),
      "allowlist sections the changelog no longer has",
    ).toEqual([]);
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

  it("reports a new Japanese line that replaces a translated one", () => {
    const found = findJapaneseTextLines("- 新しい日本語の項目");

    const diff = diffAgainstAllowlist("[1.0.0] - 2026-01-01", found, ["古い日本語の項目"]);

    expect(diff.added).toEqual(["[1.0.0] - 2026-01-01:1: - 新しい日本語の項目"]);
    expect(diff.migrated).toEqual(["[1.0.0] - 2026-01-01: 古い日本語の項目"]);
  });

  it("reports an extra copy of a line the allowlist already names", () => {
    const found = findJapaneseTextLines(["- 同じ項目", "- 同じ項目"].join("\n"));

    const diff = diffAgainstAllowlist("[1.0.0] - 2026-01-01", found, ["同じ項目"]);

    expect(diff.added).toEqual(["[1.0.0] - 2026-01-01:2: - 同じ項目"]);
    expect(diff.migrated).toEqual([]);
  });

  it("reads a document line as prose, not as code with comments", () => {
    // The operator-message scan blanks comments before looking, because a
    // `//` there opens one. In a document every line is content a reader
    // sees, so nothing may be blanked first.
    const found = findJapaneseTextLines(
      ["- see src/a.ts // 日本語の説明", "- `/* 日本語 */`"].join("\n"),
    );

    expect(found.map((entry) => entry.line)).toEqual([1, 2]);
  });
});
