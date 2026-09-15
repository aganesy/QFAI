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
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  READS_AT_ONCE,
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

describe("reading the bodies at once", () => {
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

  /** Resolves after `ms`, so a case chooses the order the responses arrive in. */
  const after = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  /** The tags the report named, in the order it named them. */
  const reportedTags = (output: string): string[] =>
    output.split("\n").flatMap((line) => {
      const match = /^(v\d+\.\d+\.\d+): \d+ entr/.exec(line);
      return match === null ? [] : [match[1] ?? ""];
    });

  it("reports in changelog order when the responses arrive in the reverse of it", async () => {
    const file = await changelogWith(changelogOf(3));
    const arrived: string[] = [];
    // The newest section answers last. Read one at a time, that order cannot
    // occur at all: the second is not asked for until the first has answered.
    const delay: Record<string, number> = { "v1.3.0": 60, "v1.2.0": 40, "v1.1.0": 20 };

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readBody: async (_repo: string, tag: string) => {
        await after(delay[tag] ?? 0);
        arrived.push(tag);
        // Empty, so every section drifts and every one of them is reported.
        return "";
      },
    });

    expect(arrived).toEqual(["v1.1.0", "v1.2.0", "v1.3.0"]);
    expect(reportedTags(output)).toEqual(["v1.3.0", "v1.2.0", "v1.1.0"]);
    expect(status).toBe(1);
  });

  it("holds its bound, and reaches it", async () => {
    const file = await changelogWith(changelogOf(40));
    let inFlight = 0;
    let peak = 0;

    const { status } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readBody: async (_repo: string, tag: string) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await after(5);
        inFlight -= 1;
        return `- **Entry for ${tag.slice(1)}**`;
      },
    });

    expect(status).toBe(0);
    expect(peak).toBe(READS_AT_ONCE);
  });

  it("stops the report at the section that failed, and exits 2 over the drift above it", async () => {
    const file = await changelogWith(changelogOf(3));

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readBody: async (_repo: string, tag: string) => {
        await after(5);
        if (tag === "v1.2.0") throw new Error("GitHub answered 403");
        return "";
      },
    });

    expect(status).toBe(2);
    expect(output).toContain("v1.2.0: GitHub answered 403");
    // The section below the failure is reached only because the reads overlap.
    // A run that read one at a time never asked for it, so it is not reported.
    expect(reportedTags(output)).toEqual(["v1.3.0"]);
  });

  it("names the failed section nearest the top of the changelog, not the one that failed first", async () => {
    const file = await changelogWith(changelogOf(2));

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readBody: async (_repo: string, tag: string) => {
        await after(tag === "v1.1.0" ? 10 : 50);
        throw new Error(`GitHub answered ${tag === "v1.1.0" ? "403" : "500"}`);
      },
    });

    expect(status).toBe(2);
    expect(output).toContain("v1.2.0: GitHub answered 500");
    expect(output).not.toContain("403");
  });

  it("asks for no more sections than its bound once one has failed", async () => {
    const file = await changelogWith(changelogOf(40));
    const asked: string[] = [];

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readBody: async (_repo: string, tag: string) => {
        asked.push(tag);
        await after(5);
        throw new Error("GitHub answered 401");
      },
    });

    expect(status).toBe(2);
    expect(output).toContain("v1.40.0: GitHub answered 401");
    // A refused token is refused for every section. Asking all forty would
    // spend the budget the bound exists to protect.
    expect(asked.length).toBeLessThanOrEqual(READS_AT_ONCE);
  });

  it("counts every section it compared, with the reads overlapping", async () => {
    const file = await changelogWith(changelogOf(20));

    const { status, output } = await capture({
      changelogPath: file,
      repository: "owner/repo",
      token: "t",
      readBody: async (_repo: string, tag: string) => {
        const minor = Number(tag.split(".")[1] ?? "0");
        await after(minor % 4);
        // Every fourth section has no release, which is not a comparison.
        return minor % 4 === 0 ? null : `- **Entry for ${tag.slice(1)}**`;
      },
    });

    expect(status).toBe(0);
    expect(output).toContain("15 compared");
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
