/**
 * A published release body, held against the changelog section it was built
 * from.
 *
 * The release workflow cuts the section out of `CHANGELOG.md` at the tagged
 * commit and creates the release once. An entry added to that section
 * afterwards is in the repository and not in the notes anyone reads, and
 * nothing noticed.
 *
 * Three decisions carry the check, and the cases are about them: which
 * sections are compared, what counts as an entry, and what a body the workflow
 * had to cut is allowed to be missing.
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
  releasedSections,
  run,
} from "../../../../scripts/check-release-notes.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "check-release-notes.mjs");

const tempDirs: string[] = [];

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
  const chunks: string[] = [];
  const collect = (...args: unknown[]): void => {
    chunks.push(args.map((arg) => String(arg)).join(" "));
  };
  const log = vi.spyOn(console, "log").mockImplementation(collect);
  const error = vi.spyOn(console, "error").mockImplementation(collect);
  try {
    return { status: await run(options), output: chunks.join("\n") };
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
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
      readBody: () => Promise.resolve("- **Shipped in the notes**"),
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
      readBody: () =>
        Promise.resolve(
          ["- **Shipped in the notes**", "- **Added to the section afterwards**"].join("\n"),
        ),
    });

    expect(status).toBe(0);
  });

  it("passes over a section with no release, which is an ordinary state", async () => {
    const file = await changelogWith(changelog);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readBody: () => Promise.resolve(null),
    });

    expect(status).toBe(0);
    expect(output).toContain("0 compared");
  });

  it("says it compared nothing rather than reporting a clean run, with no token", async () => {
    const file = await changelogWith(changelog);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "",
    });

    expect(status).toBe(2);
    expect(output).toContain("nothing was compared");
  });

  it("stops rather than guessing when the API refuses", async () => {
    const file = await changelogWith(changelog);

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readBody: () => Promise.reject(new Error("GitHub answered 401")),
    });

    expect(status).toBe(2);
    expect(output).toContain("401");
  });

  it("compares only the version named, when one is named", async () => {
    const file = await changelogWith(
      [changelog, "## [1.1.0] - 2026-01-01", "", "- **Older**", ""].join("\n"),
    );
    const asked: string[] = [];

    await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      only: "1.1.0",
      readBody: (_repo: string, tag: string) => {
        asked.push(tag);
        return Promise.resolve("- **Older**");
      },
    });

    expect(asked).toEqual(["v1.1.0"]);
  });
});

describe("resuming a release pull-request description", () => {
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
