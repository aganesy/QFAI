/**
 * A published release body, held against the changelog section it was built
 * from.
 *
 * The release workflow cuts the section out of `CHANGELOG.md` at the tagged
 * commit and creates the release once. An entry added to that section
 * afterwards is in the repository and not in the notes anyone reads, and
 * nothing noticed.
 *
 * Four decisions carry the check, and the cases are about them: which sections
 * are compared, what counts as an entry, what a body the workflow had to cut is
 * allowed to be missing, and how the published bodies are read.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { maskFencedCodeBlocks } from "../../src/core/ids.js";
import {
  TRUNCATION_MARKER,
  entryTitles,
  missingEntries,
  nextPageLink,
  releasedSections,
  run,
} from "../../../../scripts/check-release-notes.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "check-release-notes.mjs");

const tempDirs: string[] = [];

/** One release as the list endpoint carries it. */
type Release = { tag_name: string; body: string | null; draft?: boolean };

/** A page of releases, and where the page after it is. */
type Page = { releases: Release[]; next: string | null };

/**
 * A stand-in for the list endpoint: the pages it serves, in order, and the URLs
 * it was asked for.
 *
 * The URLs are the record of how many requests a run costs and which one
 * failed, which is what the cases below read instead of counting fetches.
 */
function listing(pages: (Page | Error)[]): {
  readPage: (url: string, token: string) => Promise<Page>;
  asked: string[];
} {
  const asked: string[] = [];
  return {
    asked,
    readPage: (url: string) => {
      const page = pages[asked.length];
      asked.push(url);
      if (page === undefined) throw new Error(`no page prepared for ${url}`);
      return page instanceof Error ? Promise.reject(page) : Promise.resolve(page);
    },
  };
}

/** One page carrying `releases` and naming no page after it. */
const onePage = (releases: Release[]): Page => ({ releases, next: null });

/** The tags the report named, in the order it named them. */
const reportedTags = (output: string): string[] =>
  output.split("\n").flatMap((line) => {
    const match = /^(v\d+\.\d+\.\d+): \d+ entr/.exec(line);
    return match === null ? [] : [match[1] ?? ""];
  });

/** A changelog file holding the given text, and its path. */
async function changelogWith(text: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-release-notes-"));
  tempDirs.push(dir);
  const file = path.join(dir, "CHANGELOG.md");
  await writeFile(file, text, "utf-8");
  return file;
}

/** Captures what a run wrote, so the cases read the report rather than a code alone. */
async function capture(
  options: Parameters<typeof run>[0],
): Promise<{ status: number; output: string }> {
  const lines: string[] = [];
  const collect = (...args: unknown[]): void => {
    lines.push(args.map((arg) => String(arg)).join(" "));
  };
  const log = vi.spyOn(console, "log").mockImplementation(collect);
  const error = vi.spyOn(console, "error").mockImplementation(collect);
  const status = await run(options).finally(() => {
    log.mockRestore();
    error.mockRestore();
  });
  return { status, output: lines.join("\n") };
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("which sections are compared", () => {
  it("reads a released section and its version", () => {
    const sections = releasedSections(
      ["# Changelog", "", "## [1.2.0] - 2026-01-02", "", "### Added", "", "- **A thing**", ""].join(
        "\n",
      ),
    );

    expect(sections).toEqual([
      { version: "1.2.0", body: ["### Added", "", "- **A thing**"].join("\n") },
    ]);
  });

  it("skips `[Unreleased]`, which has no release to disagree with", () => {
    const sections = releasedSections(
      [
        "## [Unreleased]",
        "",
        "- **Not shipped**",
        "",
        "## [1.2.0] - 2026-01-02",
        "",
        "- **Shipped**",
        "",
      ].join("\n"),
    );

    expect(sections.map((s) => s.version)).toEqual(["1.2.0"]);
  });

  it("ends a section at the next heading, not at the end of the file", () => {
    const sections = releasedSections(
      [
        "## [1.2.0] - 2026-01-02",
        "",
        "- **Later**",
        "",
        "## [1.1.0] - 2026-01-01",
        "",
        "- **Earlier**",
        "",
      ].join("\n"),
    );

    expect(sections[0]?.body).toBe("- **Later**");
    expect(sections[1]?.body).toBe("- **Earlier**");
  });

  it("does not read a heading with no date as released", () => {
    // The workflow builds a body from `## [X.Y.Z] - YYYY-MM-DD` and nothing
    // else, so a dateless heading has no release either.
    expect(releasedSections("## [1.2.0]\n\n- **A thing**\n")).toEqual([]);
  });
});

describe("what counts as an entry", () => {
  it("is a top-level bullet's own line", () => {
    expect(entryTitles(["- **First**", "- **Second**"].join("\n"))).toEqual([
      "- **First**",
      "- **Second**",
    ]);
  });

  it("is not a nested bullet, which belongs to the entry above it", () => {
    expect(entryTitles(["- **First**", "  - a detail", "  - another"].join("\n"))).toEqual([
      "- **First**",
    ]);
  });

  it("is not a continuation line, which is the same entry wrapped", () => {
    expect(entryTitles(["- **First** and then", "  the rest of the sentence"].join("\n"))).toEqual([
      "- **First** and then",
    ]);
  });

  it("normalises whitespace, so a rewrap is not a difference", () => {
    expect(entryTitles("-   **First**   spaced\n")).toEqual(["- **First** spaced"]);
  });

  it("ignores a bullet inside a fenced block, which is an example", () => {
    expect(entryTitles(["```", "- **Not an entry**", "```", "- **An entry**"].join("\n"))).toEqual([
      "- **An entry**",
    ]);
  });

  it("does not let a fence inside a wider one close the block early", () => {
    // A block closes on its own character and at least its own length. Reading
    // the inner fence as the close would put the rest of the example back in
    // scope and, worse, take every real entry after it out.
    expect(
      entryTitles(
        ["````", "```", "- **Not an entry**", "```", "````", "- **An entry**"].join("\n"),
      ),
    ).toEqual(["- **An entry**"]);
  });

  it("does not let a tilde fence close a backtick block", () => {
    expect(
      entryTitles(["```", "~~~", "- **Not an entry**", "```", "- **An entry**"].join("\n")),
    ).toEqual(["- **An entry**"]);
  });
});

describe("what the published body is allowed to be missing", () => {
  it("nothing, when it was not cut", () => {
    const section = ["- **First**", "- **Second**"].join("\n");

    expect(missingEntries(section, "- **First**")).toEqual(["- **Second**"]);
  });

  it("the tail, when the workflow had to cut it", () => {
    const section = ["- **First**", "- **Second**", "- **Third**"].join("\n");
    const body = ["- **First**", "", TRUNCATION_MARKER].join("\n");

    expect(missingEntries(section, body)).toEqual([]);
  });

  it("but not a hole inside the part a cut body does cover", () => {
    // A cut body ends at an entry boundary, so it holds a PREFIX. An entry
    // missing from the middle of that prefix is drift, cut or not.
    const section = ["- **First**", "- **Second**", "- **Third**"].join("\n");
    const body = ["- **First**", "- **Third**", "", TRUNCATION_MARKER].join("\n");

    expect(missingEntries(section, body)).toEqual(["- **Second**"]);
  });

  it("and an entry the body adds is not reported", () => {
    // A release body can be edited on purpose. The section is the authority
    // for what must be there, not for what may not.
    expect(
      missingEntries("- **First**", ["- **First**", "- **A note somebody added**"].join("\n")),
    ).toEqual([]);
  });
});

describe("the run", () => {
  const changelog = [
    "# Changelog",
    "",
    "## [1.2.0] - 2026-01-02",
    "",
    "- **Shipped in the notes**",
    "- **Added to the section afterwards**",
    "",
  ].join("\n");

  it("reports the entry a published body does not carry, and exits 1", async () => {
    const file = await changelogWith(changelog);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: listing([onePage([{ tag_name: "v1.2.0", body: "- **Shipped in the notes**" }])])
        .readPage,
    });

    expect(status).toBe(1);
    expect(output).toContain("v1.2.0");
    expect(output).toContain("Added to the section afterwards");
  });

  it("is clean when the body carries every entry", async () => {
    const file = await changelogWith(changelog);

    const { status } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: listing([
        onePage([
          {
            tag_name: "v1.2.0",
            body: ["- **Shipped in the notes**", "- **Added to the section afterwards**"].join(
              "\n",
            ),
          },
        ]),
      ]).readPage,
    });

    expect(status).toBe(0);
  });

  it("passes over a section the list does not name, which is an ordinary state", async () => {
    const file = await changelogWith(changelog);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      // The list answered and carries no release for this tag. A read by tag
      // answered 404 for that same state, and neither is a finding.
      readPage: listing([onePage([])]).readPage,
    });

    expect(status).toBe(0);
    expect(output).toContain("0 compared");
  });

  it("says it compared nothing rather than reporting a clean run, with no token", async () => {
    const file = await changelogWith(changelog);
    const list = listing([onePage([{ tag_name: "v1.2.0", body: "" }])]);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "",
      readPage: list.readPage,
    });

    expect(status).toBe(2);
    expect(output).toContain("nothing was compared");
    // Before any request. A run that cannot compare has nothing to ask for,
    // and the list is one request whether or not it is needed.
    expect(list.asked).toEqual([]);
  });

  it("asks for nothing when the changelog names no released section", async () => {
    const file = await changelogWith("# Changelog\n\n## [Unreleased]\n\n- **Not shipped**\n");
    const list = listing([onePage([])]);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: list.readPage,
    });

    expect(status).toBe(2);
    expect(output).toContain("no released section");
    expect(list.asked).toEqual([]);
  });

  it("stops rather than guessing when the API refuses", async () => {
    const file = await changelogWith(changelog);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: listing([new Error("GitHub answered 401")]).readPage,
    });

    expect(status).toBe(2);
    expect(output).toContain("401");
  });

  it("compares only the version named, when one is named", async () => {
    const file = await changelogWith(
      [changelog, "## [1.1.0] - 2026-01-01", "", "- **Older**", ""].join("\n"),
    );

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      only: "1.1.0",
      // Both releases are on the list. Which sections are compared is decided
      // by the changelog, not by what the list happens to carry.
      readPage: listing([
        onePage([
          { tag_name: "v1.2.0", body: "" },
          { tag_name: "v1.1.0", body: "" },
        ]),
      ]).readPage,
    });

    expect(status).toBe(1);
    expect(reportedTags(output)).toEqual(["v1.1.0"]);
  });
});

describe("reading the published bodies", () => {
  /**
   * A changelog of `count` released sections, newest first, each with one entry.
   *
   * The version's minor is the section's distance from the bottom, so a case can
   * say which section it means by tag alone.
   */
  const changelogOf = (count: number): string => {
    const lines = ["# Changelog", ""];
    for (let minor = count; minor >= 1; minor -= 1) {
      lines.push(
        `## [1.${String(minor)}.0] - 2026-01-02`,
        "",
        `- **Entry for 1.${String(minor)}.0**`,
        "",
      );
    }
    return lines.join("\n");
  };

  /** The release for each of `count` sections, carrying the entry its section names. */
  const releasesFor = (count: number): Release[] =>
    Array.from({ length: count }, (_unused, index) => ({
      tag_name: `v1.${String(count - index)}.0`,
      body: `- **Entry for 1.${String(count - index)}.0**`,
    }));

  /** The request a run opens with, written out rather than rebuilt from the script. */
  const FIRST_PAGE = "https://api.github.com/repos/owner/repo/releases?per_page=100";
  const SECOND_PAGE = `${FIRST_PAGE}&page=2`;

  it("asks the list once for a page of a hundred, whatever the section count", async () => {
    const file = await changelogWith(changelogOf(40));
    const list = listing([onePage(releasesFor(40))]);

    const { status } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: list.readPage,
    });

    expect(status).toBe(0);
    // Forty sections, one request. Read one release per section this would be
    // forty, and the count would rise with every release.
    expect(list.asked).toEqual([FIRST_PAGE]);
  });

  it("follows the link to the next page, and compares a section only that page carries", async () => {
    const file = await changelogWith(changelogOf(2));
    const list = listing([
      { releases: [{ tag_name: "v1.2.0", body: "- **Entry for 1.2.0**" }], next: SECOND_PAGE },
      // Empty body, so this section drifts: a section compared at all is what
      // the case is about, and the report is where that shows.
      onePage([{ tag_name: "v1.1.0", body: "" }]),
    ]);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: list.readPage,
    });

    expect(list.asked).toEqual([FIRST_PAGE, SECOND_PAGE]);
    expect(status).toBe(1);
    expect(reportedTags(output)).toEqual(["v1.1.0"]);
  });

  it("stops at the page that names no page after it", async () => {
    const file = await changelogWith(changelogOf(2));
    const list = listing([
      { releases: [{ tag_name: "v1.2.0", body: "- **Entry for 1.2.0**" }], next: SECOND_PAGE },
      onePage([{ tag_name: "v1.1.0", body: "- **Entry for 1.1.0**" }]),
    ]);

    const { status } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: list.readPage,
    });

    expect(status).toBe(0);
    expect(list.asked).toHaveLength(2);
  });

  it("ends the run when a later page fails, and says which request that was", async () => {
    const file = await changelogWith(changelogOf(2));
    const list = listing([
      { releases: [{ tag_name: "v1.2.0", body: "- **Entry for 1.2.0**" }], next: SECOND_PAGE },
      new Error("GitHub answered 500"),
    ]);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: list.readPage,
    });

    expect(status).toBe(2);
    expect(output).toContain(`reading ${SECOND_PAGE}: GitHub answered 500`);
    expect(list.asked).toEqual([FIRST_PAGE, SECOND_PAGE]);
  });

  it("compares nothing when a page fails, rather than reading the rest as unreleased", async () => {
    const file = await changelogWith(changelogOf(2));
    const list = listing([
      // Empty, so this section would be reported as drift had the run got that
      // far. A partial list is what makes the sections it lacks look released
      // by nobody, which reads as a clean run rather than as the failure it is.
      { releases: [{ tag_name: "v1.2.0", body: "" }], next: SECOND_PAGE },
      new Error("GitHub answered 500"),
    ]);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: list.readPage,
    });

    expect(status).toBe(2);
    expect(reportedTags(output)).toEqual([]);
    expect(output).not.toContain("compared)");
  });

  it("reports by version, newest first, whatever order the list came in", async () => {
    const file = await changelogWith(changelogOf(3));
    const list = listing([
      // The list orders by when each release was created, which is not the
      // changelog's order and is not what the report reads by.
      onePage([
        { tag_name: "v1.1.0", body: "" },
        { tag_name: "v1.3.0", body: "" },
        { tag_name: "v1.2.0", body: "" },
      ]),
    ]);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: list.readPage,
    });

    expect(status).toBe(1);
    expect(reportedTags(output)).toEqual(["v1.3.0", "v1.2.0", "v1.1.0"]);
  });

  it("does not compare a section against a draft, which nobody reading the notes can see", async () => {
    const file = await changelogWith(changelogOf(1));
    const list = listing([onePage([{ tag_name: "v1.1.0", body: "", draft: true }])]);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: list.readPage,
    });

    // The body is empty, so a draft compared at all would be reported as drift.
    // A read by tag never returned one, and the list shows drafts to whoever
    // can push — so without this the answer would follow the token.
    expect(status).toBe(0);
    expect(output).toContain("0 compared");
  });

  it("reads a release with no notes as an empty body, not as no release", async () => {
    const file = await changelogWith(changelogOf(1));
    const list = listing([onePage([{ tag_name: "v1.1.0", body: null }])]);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: list.readPage,
    });

    expect(status).toBe(1);
    expect(reportedTags(output)).toEqual(["v1.1.0"]);
  });

  it("counts every section it compared, and none the list does not name", async () => {
    const file = await changelogWith(changelogOf(20));
    // Every fourth section has no release, which is not a comparison.
    const list = listing([
      onePage(
        releasesFor(20).filter((release) => Number(release.tag_name.split(".")[1]) % 4 !== 0),
      ),
    ]);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readPage: list.readPage,
    });

    expect(status).toBe(0);
    expect(output).toContain("15 compared");
  });
});

describe("where the next page is", () => {
  it("is the target the header marks `next`", () => {
    expect(
      nextPageLink(
        '<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=4>; rel="last"',
      ),
    ).toBe("https://api.github.com/x?page=2");
  });

  it("is nothing on the last page, which marks only what came before it", () => {
    expect(
      nextPageLink(
        '<https://api.github.com/x?page=1>; rel="prev", <https://api.github.com/x?page=1>; rel="first"',
      ),
    ).toBe(null);
  });

  it("is nothing when the response carries no such header", () => {
    expect(nextPageLink(null)).toBe(null);
  });

  it("is not a target marked with a longer word beginning `next`", () => {
    expect(nextPageLink('<https://api.github.com/x?page=2>; rel="nextish"')).toBe(null);
  });

  it("is a target whose own URL carries a comma", () => {
    // Split on every comma, this one target becomes two halves, neither of
    // which parses, and the page that has a next reads as the last.
    expect(nextPageLink('<https://api.github.com/x?page=2&a=1,2>; rel="next"')).toBe(
      "https://api.github.com/x?page=2&a=1,2",
    );
  });
});

describe("resuming a release pull-request description", () => {
  it.each(
    (
      [
        ["instruction", "<?aaaa", "?>"],
        ["CDATA", "<![CDATA[aaaa", "]]>"],
        ["declaration", "<!DOCTYPE aaaa ", ">"],
      ] as const
    ).flatMap(([name, opener, closer]) =>
      ["absent", "blank", "table"].map((boundary) => [name, opener, closer, boundary] as const),
    ),
  )(
    "bounds unmatched HTML label scans for %s / %s / %s / %s",
    async (_name, opener, closer, boundary) => {
      const workflow = await readFile(
        path.join(REPO_ROOT, ".github/workflows/prepare-release.yml"),
        "utf-8",
      );
      const script = workflow.match(
        /^\s*node - .* <<'REPAIR_BODY'\r?\n([\s\S]*?)^\s*REPAIR_BODY[ \t]*$/m,
      )?.[1];
      if (script === undefined) throw new Error("Release body repair script is absent");
      const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-release-html-scans-"));
      tempDirs.push(dir);
      const existingPath = path.join(dir, "existing.md");
      const bodyPath = path.join(dir, "generated.md");
      const instrumented = [
        "const originalLabelExec = RegExp.prototype.exec;",
        "let labelHtmlAttempts = 0;",
        "RegExp.prototype.exec = function (input) {",
        "  if (this.sticky && this.source.includes('\\\\?>')) labelHtmlAttempts += 1;",
        "  return originalLabelExec.call(this, input);",
        "};",
        script,
        "process.stdout.write(JSON.stringify({ attempts: labelHtmlAttempts }));",
      ].join("\n");
      for (const end of ["\n", "\r\n"]) {
        const suffix =
          boundary === "absent"
            ? ""
            : boundary === "blank"
              ? `${end}prefix ${opener}closed${closer}${end}`
              : `head | detail${end}--- | ---${end}prefix ${opener}closed${closer}${end}`;
        const existing = `## What this change made unnecessary${end}${end}\uFEFFprefix ${opener.repeat(256)}${end}${suffix}Nothing removed.${end}${end}## Adoption bar${end}${end}Keep all review protections.${end}`;
        await writeFile(existingPath, existing, "utf-8");
        await writeFile(
          bodyPath,
          "## What this change made unnecessary\n\nSuperseded version.\n",
          "utf-8",
        );
        const result = spawnSync(process.execPath, ["-", existingPath, bodyPath], {
          input: instrumented,
          encoding: "utf-8",
        });
        if (result.error !== undefined) throw result.error;
        expect(result.status, result.stderr).toBe(0);
        expect(await readFile(bodyPath, "utf-8")).toBe(existing);
        const measurement = JSON.parse(result.stdout) as { attempts: number };
        expect(measurement.attempts).toBeGreaterThan(0);
        expect(measurement.attempts).toBeLessThanOrEqual(4);
        expect(measurement.attempts).toBe(boundary === "absent" ? 2 : 4);
      }
    },
  );

  it.each([
    [
      "balanced image interrupted by table",
      "![removed [item] | detail\n--- | ---\nstill present](/image.png) |",
    ],
    [
      "reference image interrupted by table",
      "![removed [item] | detail\n--- | ---\nstill present][image] |\n\n[image]: /image.png",
    ],
    ["image label raw HTML", '![prefix [nested]\nNothing removed.\n<span title="](/image.png)">'],
    [
      "image label autolink",
      "![prefix [nested]\nNothing removed.\n<https://example.com/](/image.png)>",
    ],
    [
      "image label inline comment",
      "![prefix [nested]\nNothing removed.\nlater <!-- ](/image.png) -->",
    ],
    [
      "image paragraph interrupted by a table",
      "![prefix [nested]\nNothing removed.\nfoo | bar\n--- | ---\n](/image.png)",
    ],
  ])("preserves the authored %s release answer", async (_name, answer) => {
    const workflow = await readFile(
      path.join(REPO_ROOT, ".github/workflows/prepare-release.yml"),
      "utf-8",
    );
    const script = workflow.match(
      /^\s*node - .* <<'REPAIR_BODY'\r?\n([\s\S]*?)^\s*REPAIR_BODY[ \t]*$/m,
    )?.[1];
    if (script === undefined) throw new Error("Release body repair script is absent");
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-release-inline-"));
    tempDirs.push(dir);
    const existingPath = path.join(dir, "existing.md");
    const bodyPath = path.join(dir, "generated.md");
    const existing = `## What this change made unnecessary\n\n${answer}\n\n## Adoption bar\n\nKeep all review protections.\n`;
    await writeFile(existingPath, existing, "utf-8");
    await writeFile(
      bodyPath,
      "## What this change made unnecessary\n\nSuperseded version.\n",
      "utf-8",
    );
    const result = spawnSync(process.execPath, ["-", existingPath, bodyPath], {
      input: script,
      encoding: "utf-8",
    });
    if (result.error !== undefined) throw result.error;
    expect(result.status, result.stderr).toBe(0);
    expect(await readFile(bodyPath, "utf-8")).toBe(existing);
  });

  it.each(["changed", "unchanged", "authored"])(
    "checks the %s release-body snapshot before editing",
    async (snapshot) => {
      const workflow = await readFile(
        path.join(REPO_ROOT, ".github/workflows/prepare-release.yml"),
        "utf-8",
      );
      const update = workflow.match(
        /^ {12}if ! cmp -s "\$\{existing_body\}" "\$\{body_file\}"; then\r?\n[\s\S]*?^ {12}fi[ \t]*$/m,
      )?.[0];
      if (update === undefined) throw new Error("Release body update is absent");
      const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-release-body-"));
      tempDirs.push(dir);
      const existingPath = path.join(dir, "existing.md");
      const bodyPath = path.join(dir, "repaired.md");
      const currentPath = path.join(dir, "current.md");
      const existing = "\uFEFF## What this change made unnecessary\r\n\r\nTODO\r\n";
      const repaired =
        "\uFEFF## What this change made unnecessary\r\n\r\nSuperseded version. Notes stay.\r\n";
      const current =
        snapshot === "unchanged" ? existing : `${existing}\r\nKeep the maintainer's risk note.\r\n`;
      await writeFile(existingPath, existing, "utf-8");
      await writeFile(bodyPath, snapshot === "authored" ? existing : repaired, "utf-8");
      await writeFile(currentPath, current, "utf-8");
      const shell = [
        'existing_body="$1"; body_file="$2"; current_body="$3"; existing_pr=99',
        "gh() {",
        '  case "${1-} ${2-}" in',
        '    "pr view") printf "VIEW\\n" >&2; command cat "${current_body}" ;;',
        '    "pr edit") printf "EDIT\\n" ;;',
        "    *) return 2 ;;",
        "  esac",
        "}",
        update,
      ].join("\n");
      const result = spawnSync(
        "bash",
        [
          "-e",
          "-o",
          "pipefail",
          "-c",
          shell,
          "_",
          ...[existingPath, bodyPath, currentPath].map((file) => file.replaceAll(path.sep, "/")),
        ],
        {
          cwd: dir,
          encoding: "utf-8",
          env: { ...process.env, GITHUB_TOKEN: "", GH_TOKEN: "" },
        },
      );
      if (result.error !== undefined) throw result.error;
      expect(result.status, result.stderr).toBe(snapshot === "changed" ? 1 : 0);
      expect(result.stdout).toBe(snapshot === "unchanged" ? "EDIT\n" : "");
      if (snapshot === "changed") expect(result.stderr).toContain("changed");
      expect(result.stderr.includes("VIEW")).toBe(snapshot !== "authored");
      expect(await readFile(currentPath, "utf-8")).toBe(current);
    },
  );

  it.each(
    ["- ", "1. ", "  - "].flatMap((marker) =>
      ["```", "~~~"].map((fence) => [marker, fence] as const),
    ),
  )("ignores a list-contained fence %j / %s during removal repair", async (marker, fence) => {
    const workflow = await readFile(
      path.join(REPO_ROOT, ".github/workflows/prepare-release.yml"),
      "utf-8",
    );
    const script = workflow.match(
      /^\s*node - .* <<'REPAIR_BODY'\r?\n([\s\S]*?)^\s*REPAIR_BODY[ \t]*$/m,
    )?.[1];
    if (script === undefined) throw new Error("Release body repair script is absent");
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-release-list-fence-"));
    tempDirs.push(dir);
    const existingPath = path.join(dir, "existing.md");
    const bodyPath = path.join(dir, "generated.md");
    const prefix = "# Prepared release\n\nKeep publication approval.\n\n";
    const existing = `${prefix}${marker}${fence}\n${" ".repeat(marker.length)}## What this change made unnecessary\n${" ".repeat(marker.length)}Nothing.\n${" ".repeat(marker.length)}${fence}\n`;
    const generated = "## What this change made unnecessary\n\nSuperseded pin.\n";
    await writeFile(existingPath, existing, "utf-8");
    await writeFile(bodyPath, generated, "utf-8");
    const result = spawnSync(process.execPath, ["-", existingPath, bodyPath], {
      input: script,
      encoding: "utf-8",
    });
    if (result.error !== undefined) throw result.error;
    expect(result.status, result.stderr).toBe(0);
    expect(await readFile(bodyPath, "utf-8")).toBe(`${existing.trimEnd()}\n\n${generated}`);
  });

  it.each(
    ["---", "==="].flatMap((underline) =>
      ["Adoption bar", "Adoption\nbar", "=", "==="].map((title) => [underline, title] as const),
    ),
  )("preserves a Setext %s / %j section during removal repair", async (underline, title) => {
    const workflow = await readFile(
      path.join(REPO_ROOT, ".github/workflows/prepare-release.yml"),
      "utf-8",
    );
    const script = workflow.match(
      /^\s*node - .* <<'REPAIR_BODY'\r?\n([\s\S]*?)^\s*REPAIR_BODY[ \t]*$/m,
    )?.[1];
    if (script === undefined) throw new Error("Release body repair script is absent");
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-release-setext-"));
    tempDirs.push(dir);
    const existingPath = path.join(dir, "existing.md");
    const bodyPath = path.join(dir, "generated.md");
    const later = `${title}\n${underline}\nKeep publication approval.\n`;
    const existing = `## What this change made unnecessary\n\n${later}`;
    const generated = "## What this change made unnecessary\n\nSuperseded pin.\n";
    await writeFile(existingPath, existing, "utf-8");
    await writeFile(bodyPath, generated, "utf-8");
    const result = spawnSync(process.execPath, ["-", existingPath, bodyPath], {
      input: script,
      encoding: "utf-8",
    });
    if (result.error !== undefined) throw result.error;
    expect(result.status, result.stderr).toBe(0);
    expect(await readFile(bodyPath, "utf-8")).toBe(`${generated}\n${later}`);
  });

  it.each(
    [1, 2, 3].flatMap((indent) =>
      ["#", "##"].map((level) => `${" ".repeat(indent)}${level} Adoption bar`),
    ),
  )("preserves an indented next heading %j during removal repair", async (heading) => {
    const workflow = await readFile(
      path.join(REPO_ROOT, ".github/workflows/prepare-release.yml"),
      "utf-8",
    );
    const script = workflow.match(
      /^\s*node - .* <<'REPAIR_BODY'\r?\n([\s\S]*?)^\s*REPAIR_BODY[ \t]*$/m,
    )?.[1];
    if (script === undefined) throw new Error("Release body repair script is absent");
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-release-body-"));
    tempDirs.push(dir);
    const existingPath = path.join(dir, "existing.md");
    const bodyPath = path.join(dir, "generated.md");
    const prefix = "# Prepared release\n\nKeep the corrected date.\n\n";
    const suffix = `${heading}\n\nKeep this authored adoption answer.\n\n## Risks\n\nRetain publication approval.\n`;
    const replacement =
      "## What this change made unnecessary\n\nSuperseded version. Release notes stay.\n";
    await writeFile(
      existingPath,
      `${prefix}## What this change made unnecessary\n\nTODO\n\n${suffix}`,
      "utf-8",
    );
    await writeFile(bodyPath, replacement, "utf-8");
    const result = spawnSync(process.execPath, ["-", existingPath, bodyPath], {
      input: script,
      encoding: "utf-8",
    });
    if (result.error !== undefined) throw result.error;
    expect(result.status, result.stderr).toBe(0);
    expect(await readFile(bodyPath, "utf-8")).toBe(`${prefix}${replacement}\n${suffix}`);
  });

  it.each([
    ["missing", ""],
    ["empty", "## What this change made unnecessary\n\n<!-- Answer required. -->\n"],
    ["Markdown-only", "## What this change made unnecessary\n\n- [ ]\n"],
    ["None marker", "## What this change made unnecessary\n\nNone.\n"],
    ["N/A marker", "## What this change made unnecessary\n\nN/A\n"],
    ["named space entity", "## What this change made unnecessary\n\n&nbsp;\n"],
    ["numeric space entity", "## What this change made unnecessary\n\n&#160;\n"],
    ["TODO prefix", "## What this change made unnecessary\n\nTODO: fill this in\n"],
    ["TBD prefix", "## What this change made unnecessary\n\nTBD: list the removals\n"],
    ["thematic break", "## What this change made unnecessary\n\n---\n"],
    ...["---", "==="].map((underline) => [
      `reference paragraph becomes Setext ${underline}`,
      `## What this change made unnecessary\n\n[Nothing]: /url "Title\n${underline}\nNothing"\n`,
    ]),
    ["empty quotation", "## What this change made unnecessary\n\n>\n"],
    ["empty link", "## What this change made unnecessary\n\n[]()\n"],
    ["empty link with target", "## What this change made unnecessary\n\n[](https://example.com)\n"],
    ["HTML break", "## What this change made unnecessary\n\n<br>\n"],
    ["fenced example", "```md\n## What this change made unnecessary\n\nNothing.\n```\n"],
    ["longer backtick close", "```md\n## What this change made unnecessary\n\nNothing.\n````\n"],
    [
      "longer tilde close",
      "~~~md\r\n## What this change made unnecessary\r\n\r\nNothing.\r\n~~~~\r\n",
    ],
    ["short close", "````md\n```\n## What this change made unnecessary\n\nNothing.\n````\n"],
    ["wrong marker close", "```md\n~~~\n## What this change made unnecessary\n\nNothing.\n````\n"],
    ["commented example", "<!--\n## What this change made unnecessary\n\nNothing.\n-->\n"],
    ["HTML empty block", "## What this change made unnecessary\n\n<div>\n</div>\n"],
    ...["---", "==="].map((underline) => [
      `code span becomes Setext ${underline}`,
      `## What this change made unnecessary\n\n\`\nNext section\n${underline}\nNothing removed.\n\`\n`,
    ]),
    ...[
      "![Nothing](/image.png)",
      "![Nothing][image]\n\n[image]: /image.png",
      "![Nothing][]\n\n[Nothing]: /image.png",
      "![Nothing]\n\n[Nothing]: /image.png",
      "> [Nothing]: /url",
      "- [Nothing]: /url",
      "- > [Nothing]: /url",
      "> - > [Nothing]: /url",
    ].map((source) => [
      `hidden image/container answer ${JSON.stringify(source)}`,
      `## What this change made unnecessary\n\n${source}\n`,
    ]),
    ...[
      // A container opened inside a list item, a linked image showing no prose,
      // and placeholders wearing formatting: each renders as no authored answer
      // while the text the reader measured said otherwise.
      "- > ~~~md\n  > Nothing removed.\n  > ~~~",
      "> - ~~~md\n>   Nothing removed.\n>   ~~~",
      "[![Nothing](/image.png)](/target)",
      "[![Nothing](/image.png)][target]\n\n[target]: /url",
      "> - TODO",
      "- - TODO",
      "N\\/A",
      "~~TODO~~",
    ].map((source) => [
      `hidden or formatted answer ${JSON.stringify(source)}`,
      `## What this change made unnecessary\n\n${source}\n`,
    ]),
    ...[
      "[^1]: Hidden\nNothing removed.\n",
      "[^1]: Hidden\n    Nothing removed.\n",
      "[^1]: Hidden\n\n    Nothing removed.\n",
    ].map((source) => [
      `hidden footnote continuation ${JSON.stringify(source)}`,
      `## What this change made unnecessary\n\n${source}`,
    ]),
    ...[
      "![Nothing [example]](/image.png)",
      "![Nothing [example]][image]\n\n[image]: /image.png",
    ].map((source) => [
      `balanced image answer ${JSON.stringify(source)}`,
      `## What this change made unnecessary\n\n${source}\n`,
    ]),
    ...["T&#79;DO", "T&#x4f;DO", "N&#111;ne", "Not&#32;applicable", "N&sol;A"].map((source) => [
      `encoded placeholder ${source}`,
      `## What this change made unnecessary\n\n${source}\n`,
    ]),
    ...["- - ", "1. - ", "- 2. "].flatMap((prefix) =>
      ["```", "~~~"].map((fence) => [
        `nested list fence ${prefix}${fence}`,
        `## What this change made unnecessary\n\n${prefix}${fence}md\n${" ".repeat(prefix.length)}Nothing removed.\n${" ".repeat(prefix.length)}${fence}\n`,
      ]),
    ),
    [
      "link-reference definition",
      "## What this change made unnecessary\n\n[Nothing]: https://example.com\n",
    ],
    ...[
      "[Nothing]:\n   https://example.com\n",
      '[Nothing]: https://example.com "Title\nwith a line break"\n',
      "[Nothing]: <https://example.com/space here>\n",
      "[Nothing]: https://example.com/a(b)c\n",
      "[Nothing]: https://example.com\r\n",
      "[\u00a0]: https://example.com\n",
    ].map((definition) => [
      `reference boundary ${JSON.stringify(definition)}`,
      `## What this change made unnecessary\n\n${definition}`,
    ]),
    ...[
      ["1000 ASCII bytes", `[${"a".repeat(1000)}]: /url\n`],
      ["1000 emoji bytes", `[${"😀".repeat(250)}]: /url\n`],
      ["1000 accented bytes", `[${"é".repeat(500)}]: /url\n`],
      ["CRLF label", `[${"a".repeat(996)}\r\nok]: /url\r\n`],
      ["32 nested parentheses", `[Nothing]: /${"(".repeat(32)}a${")".repeat(32)}\n`],
      ["optional title before a heading", '[Nothing]: /url\n"\n## Adoption bar\nNothing"\n'],
      ...["+", "2. Nothing", "<span>", "    ## Adoption bar"].map((line) => [
        `non-interrupting title line ${line}`,
        `[Nothing]: /url "Title\n${line}\nNothing"\n`,
      ]),
    ].map(([name, definition]) => [
      `hidden reference ${name}`,
      `## What this change made unnecessary\n\n${definition}`,
    ]),
    ...[
      '[](https://example.com "\nNothing\n")',
      "[](https://example.com '\nNothing\n')",
      "[](https://example.com (\nNothing\n))",
      '[ ](https://example.com "\nNothing\n")',
      '[](<https://example.com> "\nNothing\n")',
      '[](https://example.com/a(b)c "\nNothing\n")',
    ].map((link) => [
      `empty multiline link ${JSON.stringify(link)}`,
      `## What this change made unnecessary\n\n${link}\n`,
    ]),
    [
      "tab-indented fence closer",
      "~~~\n\t~~~\n## What this change made unnecessary\n\nNothing.\n~~~\n",
    ],
    ...["[](/url))", "[](/url(a)))", "[]())"].map((link) => [
      `empty link with trailing parenthesis ${link}`,
      `## What this change made unnecessary\n\n${link}\n`,
    ]),
    [
      "multiline HTML tag",
      '## What this change made unnecessary\n\n<div\nclass="Nothing">\n</div>\n',
    ],
    [
      "quoted HTML attribute",
      '## What this change made unnecessary\n\n<span\ntitle="Nothing > never">\n</span>\n',
    ],
    [
      "HTML comment only",
      "## What this change made unnecessary\n\n<div>\n<!-- Nothing. -->\n</div>\n",
    ],
    ["HTML entity only", "## What this change made unnecessary\n\n<p>&nbsp;</p>\n"],
    ["HTML placeholder only", "## What this change made unnecessary\n\n<p>TODO</p>\n"],
    ...["pre", "script", "style", "textarea"].map((tag) => [
      `literal HTML answer ${tag}`,
      `## What this change made unnecessary\n\n<${tag}>\nNothing.\n</${tag}>\n`,
    ]),
    ...["pre", "script", "style", "textarea", "div", "table"].map((tag) => [
      `raw HTML ${tag} example`,
      `<${tag}>\n## What this change made unnecessary\nNothing.\n</${tag}>\n`,
    ]),
    ...["- ", "1. ", "  - "].flatMap((marker) =>
      ["pre", "div", "span"].map((tag) => [
        `raw HTML list-contained ${JSON.stringify(marker)} ${tag}`,
        `${marker}<${tag}>\n${" ".repeat(marker.length)}## What this change made unnecessary\n${" ".repeat(marker.length)}Nothing.\n${" ".repeat(marker.length)}</${tag}>\n`,
      ]),
    ),
    ...["- ", "1. ", "  - "].flatMap((marker) =>
      ["<pre>", "```", "~~~"].map((opening) => [
        `authored real removal section dedented from a container ${JSON.stringify(marker)} ${opening}`,
        `${marker}${opening}\n${" ".repeat(marker.length)}Example\n## What this change made unnecessary\nNothing.\n`,
      ]),
    ),
    [
      "raw HTML processing instruction",
      "<?qfai\n## What this change made unnecessary\nNothing.\n?>\n",
    ],
    ["raw HTML declaration", "<!DOCTYPE\n## What this change made unnecessary\nNothing.\n>\n"],
    ["raw HTML CDATA", "<![CDATA[\n## What this change made unnecessary\nNothing.\n]]>\n"],
    [
      "raw HTML standalone inline tag",
      "<span>\n## What this change made unnecessary\nNothing.\n</span>\n",
    ],
    [
      "authored",
      "## What this change made unnecessary\n\nA superseded pin. Notes stay to document this release.\n",
    ],
    [
      "authored after footnote dedent",
      "## What this change made unnecessary\n\n[^1]: Hidden\n\nNothing removed.\n",
    ],
    [
      "authored after footnote block",
      "## What this change made unnecessary\n\n[^1]: Hidden\n### Heading\nNothing removed.\n",
    ],
    ...[
      "\\<!--\nNothing removed.\n-->",
      "\\\\\\<!--\nNothing removed.\n-->",
      "Nothing&#32;removed.",
      "`T&#79;DO`",
      "T\\&#79;DO",
      "N&SOL;A",
      "Paragraph\n2. Nothing removed.",
      "[Nothing [example]](/url)",
      "\\![Nothing [example]](/image.png)",
      "![Nothing [example]][missing]",
    ].map((answer) => [
      `authored inline boundary ${JSON.stringify(answer)}`,
      `## What this change made unnecessary\n\n${answer}\n`,
    ]),
    ...[
      "[Nothing]: https://example.com/a(b\n",
      "[Nothing]: https://example.com/a)b\n",
      "[]: https://example.com\n",
      `[${"😀".repeat(1000)}]: https://example.com\n`,
    ].map((answer) => [
      `authored reference-like text ${JSON.stringify(answer)}`,
      `## What this change made unnecessary\n\n${answer}`,
    ]),
    ...[
      ...[
        "## Adoption bar",
        "~~~",
        "> Nothing",
        "- Nothing",
        "01. Nothing",
        "<![cdata[",
        "<div>",
      ].map((block) => [
        `title interrupted by ${block}`,
        `[Nothing]: /url "Title\n${block}\nNothing"\n`,
      ]),
      ["label interrupted by a heading", "[Nothing\n## Adoption bar\nNothing]: /url\n"],
      ["destination interrupted by HTML", "[Nothing]:\n<div>\n"],
      ["1001 ASCII bytes", `[${"a".repeat(1001)}]: /url\n`],
      ["1004 emoji bytes", `[${"😀".repeat(251)}]: /url\n`],
      ["1002 accented bytes", `[${"é".repeat(501)}]: /url\n`],
      ["3996 emoji bytes", `[${"😀".repeat(999)}]: https://example.com\n`],
      ["CRLF overlong label", `[${"😀".repeat(996)}\r\nok]: https://example.com\r\n`],
      ["33 nested parentheses", `[Nothing]: /${"(".repeat(33)}a${")".repeat(33)}\n`],
      ["empty anchor then a literal reference", "[](/url)\n[Nothing]: /target\n"],
      ["escaped multiline link", '\\[](https://example.com "\nNothing\n")\n'],
      ["literal HTML link", "<div>\n[](https://example.com)\n</div>\n"],
      ["literal inline code link", "`[](https://example.com)`\n"],
      ["escaped single-line link", "\\[](https://example.com)\n"],
    ].map(([name, answer]) => [
      `authored reference-like text ${name}`,
      `## What this change made unnecessary\n\n${answer}`,
    ]),
    ...(
      [
        ...[
          "## What this change made unnecessary ##",
          " ## What this change made unnecessary",
          "  ## What a change made unnecessary ###",
          "   ## What this change made unnecessary",
        ].map((heading) => [heading, `${heading}\n\nA removed pin.\n`] as const),
        ...["\t", " \t"].flatMap((indent) =>
          ["```", "~~~", "<pre>"].map(
            (opener) =>
              [
                `indented code ${JSON.stringify(indent + opener)}`,
                `${indent}${opener}\n## What this change made unnecessary\n\nA removed pin.\n`,
              ] as const,
          ),
        ),
        ["multiline visible link", '[A removed pin](https://example.com "\nNothing\n")\n'],
        ["ordinary image-label link", "[Nothing](/url)\n"],
        ["code-like reference container top level", "    [Nothing]: /url\n"],
        ["code-like reference container quote", ">     [Nothing]: /url\n"],
        ["code-like reference container list", "-     [Nothing]: /url\n"],
        ["escaped image", "\\![Nothing](/image.png)\n"],
        ["unresolved image", "![Nothing][missing]\n"],
        ["quoted definition-like paragraph", "> Paragraph\n> [Nothing]: /url\n"],
        ["list definition-like paragraph", "- Paragraph\n  [Nothing]: /url\n"],
        ["image with visible prose", "![Example](/image.png)\n\nNothing.\n"],
        ["literal link with a blank title line", '[](https://example.com "\n\nNothing\n")\n'],
        ["literal link with an unquoted title", "[](https://example.com \nNothing\n)\n"],
      ] as const
    ).map(([name, section]) => [
      `authored rendered Markdown ${name}`,
      section.includes("## What") ? section : `## What this change made unnecessary\n\n${section}`,
    ]),
    [
      "authored after backtick fence",
      "```md\n## What this change made unnecessary\n\nExample only.\n````\n\n## What this change made unnecessary\n\nA superseded pin. Notes stay to document this release.\n",
    ],
    [
      "authored after tilde fence",
      "~~~md\n## What this change made unnecessary\n\nExample only.\n~~~~\n\n## What this change made unnecessary\n\nA superseded pin. Notes stay to document this release.\n",
    ],
    [
      "authored after commented fence",
      "<!--\n```md\n## What this change made unnecessary\n\nExample only.\n-->\n\n## What this change made unnecessary\n\nA superseded pin. Notes stay to document this release.\n",
    ],
    [
      "authored heading that interrupts a backtick paragraph",
      "`\n## What this change made unnecessary\nNothing.\n`\n",
    ],
    ...[
      "<p>Nothing.</p>",
      "<div>\nNothing.\n</div>",
      "<span>\nNothing.\n</span>",
      "<div>\n<!--\n## Example -->\nNothing.\n</div>",
      "<div>\n[Nothing]: https://example.com\n</div>",
    ].map((answer) => [
      `authored HTML answer ${answer}`,
      `## What this change made unnecessary\n\n${answer}\n`,
    ]),
    ...[
      "<pre>\n<!--\n```md\n</pre>\n",
      "<div>\nExample\n</div>\n\n",
      "<pre>Example</pre>\n",
      "Paragraph text\n<span>\n",
      "<span title=>\n",
      "<![cdata[\n",
    ].map((prefix) => [
      `authored after raw block ${JSON.stringify(prefix)}`,
      `${prefix}## What this change made unnecessary\n\nA superseded pin. Notes stay to document this release.\n`,
    ]),
  ])("preserves other prose when the removal answer is %s", async (name, section) => {
    const workflow = await readFile(
      path.join(REPO_ROOT, ".github/workflows/prepare-release.yml"),
      "utf-8",
    );
    const resume = workflow.match(
      /if \[ -n "\$\{existing_pr\}" \]; then([\s\S]*?)\n\s*else\n\s*gh pr create/,
    )?.[1];
    expect(resume).toContain('gh pr view "${existing_pr}" --json body --jq .body');
    expect(resume).toContain('gh pr edit "${existing_pr}" --body-file "${body_file}"');
    const script = workflow.match(
      /^\s*node - .* <<'REPAIR_BODY'\r?\n([\s\S]*?)^\s*REPAIR_BODY[ \t]*$/m,
    )?.[1];
    expect(script).toBeDefined();
    if (script === undefined) throw new Error("Release body repair script is absent");
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-release-body-"));
    tempDirs.push(dir);
    const existingPath = path.join(dir, "existing.md");
    const bodyPath = path.join(dir, "generated.md");
    const retained =
      "# Prepared release\n\nDate corrected to 2026-09-14.\n\nRisk note: retain the publication approval.\n\n";
    const existing = retained + section;
    const answer = "Superseded package version and Unreleased heading. Release notes are retained.";
    await writeFile(existingPath, existing, "utf-8");
    await writeFile(
      bodyPath,
      `Generated prose.\n\n## What this change made unnecessary\n\n${answer}\n`,
      "utf-8",
    );
    const result = spawnSync(process.execPath, ["-", existingPath, bodyPath], {
      input: script,
      encoding: "utf-8",
    });
    if (result.error !== undefined) throw result.error;
    expect(result.status, result.stderr).toBe(0);
    const updated = await readFile(bodyPath, "utf-8");
    expect(updated.startsWith(retained)).toBe(true);
    expect(updated).not.toContain("Generated prose.");
    if (name.startsWith("authored")) {
      expect(updated).toBe(existing);
    } else {
      expect(updated).toContain(answer);
      if (name.startsWith("raw HTML")) {
        expect(updated).toBe(
          `${existing.trimEnd()}\n\n## What this change made unnecessary\n\n${answer}\n`,
        );
      } else {
        const outsideCode = maskFencedCodeBlocks(updated).replace(/<!--[\s\S]*?-->/g, "");
        expect(outsideCode.match(/^## What this change made unnecessary$/gm)).toHaveLength(1);
        if (name.startsWith("reference paragraph becomes Setext")) {
          expect(
            updated.endsWith(section.slice("## What this change made unnecessary\n\n".length)),
          ).toBe(true);
        }
      }
    }
  });
});

describe("the command line", () => {
  /** The script itself, so what is held is the entry point rather than a model of it. */
  const runScript = (args: string[]): { status: number; output: string } => {
    const run = spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      env: { ...process.env, GITHUB_REPOSITORY: "", GITHUB_TOKEN: "", GH_TOKEN: "" },
    });
    if (run.error !== undefined) throw run.error;
    return { status: run.status ?? -1, output: `${run.stdout ?? ""}${run.stderr ?? ""}` };
  };

  it("refuses `--version` with no version rather than comparing every section", () => {
    // Read as "every version", a caller that meant to name one and passed an
    // empty value would be told its run was clean.
    const run = runScript(["--version"]);

    expect(run.status).toBe(2);
    expect(run.output).toContain("--version needs a version");
  });

  it("refuses `--version` followed by another flag, which names no version either", () => {
    const run = runScript(["--version", "--quiet"]);

    expect(run.status).toBe(2);
    expect(run.output).toContain("--version needs a version");
  });

  it("gets past the argument check with a version, and stops on the missing token", () => {
    // The negative legs above would pass against a script that refused every
    // run, so one leg has to reach the next stage.
    const run = runScript(["--version", "1.11.0"]);

    expect(run.status).toBe(2);
    expect(run.output).toContain("needs GITHUB_REPOSITORY");
  });
});
