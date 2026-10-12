/**
 * A released changelog section, held against what it said when it was released.
 *
 * The release workflow cuts the section out at the tag and creates the release
 * page once. An entry appended to that section afterwards is in the repository
 * and in no page anybody reads — and nothing refuses the change that does it,
 * which is how one section came to hold 77 of them.
 *
 * The cases are about the three shapes that look alike in a diff: an entry
 * added to a released section, an entry added to `## [Unreleased]`, and the
 * release commit that renames one heading into the other.
 */
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { cp, link, mkdir, mkdtemp, readFile, rename, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { removeTempTree } from "../helpers/tempTree.js";

import {
  addedEntries,
  releasedAdditions,
  sectionEntries,
  tagOnOrigin,
  taggedBefore,
} from "../../../../scripts/check-changelog-released-sections.mjs";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const RELEASED = [
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "### Changed",
  "",
  "- **Something not yet released.**",
  "",
  "## [1.2.0] - 2026-01-02",
  "",
  "### Added",
  "",
  "- **The first thing the release carried.**",
  "- **The second thing the release carried.**",
  "",
].join("\n");

describe("what a released section may gain", () => {
  it("reports an entry appended to a released section", () => {
    const after = RELEASED.replace(
      "- **The second thing the release carried.**",
      "- **The second thing the release carried.**\n- **An entry the release page never carried.**",
    );

    expect(addedEntries(RELEASED, after)).toEqual([
      {
        version: "1.2.0",
        gained: ["- **An entry the release page never carried.**"],
      },
    ]);
  });

  it("says nothing about an entry added to the unreleased section", () => {
    // Where every entry belongs, and the remedy the finding names.
    const after = RELEASED.replace(
      "- **Something not yet released.**",
      "- **Something not yet released.**\n- **Another thing not yet released.**",
    );

    expect(addedEntries(RELEASED, after)).toEqual([]);
  });

  it("says nothing about the release commit that renames the heading", () => {
    // The rename creates a released section holding what the unreleased one
    // held. Read as a section that gained entries, a release could never be cut.
    const after = RELEASED.replace("## [Unreleased]", "## [Unreleased]\n\n## [1.3.0] - 2026-02-03");

    expect(addedEntries(RELEASED, after)).toEqual([]);
  });

  it("says nothing about a title whose spacing was repaired", () => {
    // A space restored after a code span edits the title line, and that line is
    // how an entry is told apart; the entry is still the same one.
    const before = RELEASED.replace(
      "- **The first thing the release carried.**",
      "- **The first `thing`the release carried.**",
    );
    const after = RELEASED.replace(
      "- **The first thing the release carried.**",
      "- **The first `thing` the release carried.**",
    );

    expect(addedEntries(before, after)).toEqual([]);
  });

  it("says nothing about an entry a released section lost", () => {
    // Removing one is a correction to what the release said, not a claim it
    // never made. Only the direction that leaves a reader told less is refused.
    const after = RELEASED.replace("- **The second thing the release carried.**\n", "");

    expect(addedEntries(RELEASED, after)).toEqual([]);
  });

  it("lets an untagged section gain entries, and refuses a tagged one", () => {
    // Released means tagged: a section main carries whose tag does not exist yet
    // has built no release page, so an entry added to it is still read.
    const added = [
      { version: "1.2.0", gained: ["- **Late.**"] },
      { version: "1.3.0", gained: ["- **Early.**"] },
    ];
    const tagged = (version: string) => version === "1.2.0";

    expect(releasedAdditions(added, tagged)).toEqual({
      refused: [{ version: "1.2.0", gained: ["- **Late.**"] }],
      notes: [],
    });
  });

  it("refuses a section whose tag lookup failed, and says so", () => {
    const added = [{ version: "1.3.0", gained: ["- **Unknown.**"] }];
    const failing = (): boolean | null => null;

    const result = releasedAdditions(added, failing);
    expect(result.refused).toEqual(added);
    expect(result.notes).toEqual([
      "the tag v1.3.0 could not be looked up; the section is treated as released.",
    ]);
  });

  it("reads the released sections and leaves the unreleased one out", () => {
    const entries = sectionEntries(RELEASED);

    expect([...entries.keys()]).toEqual(["1.2.0"]);
    expect(entries.get("1.2.0")?.size).toBe(2);
  });
});

describe("which tag makes a section released", () => {
  const earlier = "a".repeat(40);
  const head = "b".repeat(40);

  it("counts a tag on an earlier commit", () => {
    expect(taggedBefore(`${earlier}\trefs/tags/v1.2.0\n`, head)).toBe(true);
  });

  it("does not count a tag on the commit being checked", () => {
    // The merge that folds the unreleased entries is the commit the tag is
    // pushed to, so the release page has not been built from the section yet.
    expect(taggedBefore(`${head}\trefs/tags/v1.2.0\n`, head)).toBe(false);
  });

  it("reads the commit of an annotated tag from its peeled line", () => {
    const annotated = `${earlier}\trefs/tags/v1.2.0\n${head}\trefs/tags/v1.2.0^{}\n`;

    expect(taggedBefore(annotated, head)).toBe(false);
    expect(taggedBefore(annotated, "c".repeat(40))).toBe(true);
  });

  it("does not count a tag that does not exist", () => {
    expect(taggedBefore("", head)).toBe(false);
  });
});

describe("where the tag is looked up", () => {
  const earlier = "a".repeat(40);
  const head = "b".repeat(40);

  it("answers from a local tag without asking the remote", () => {
    const lookups = {
      local: () => earlier,
      remote: () => {
        throw new Error("the remote must not be asked");
      },
    };

    expect(tagOnOrigin("1.2.0", head, lookups)).toBe(true);
    expect(tagOnOrigin("1.2.0", earlier, lookups)).toBe(false);
  });

  it("asks the remote when there is no local tag", () => {
    const lookups = {
      local: () => null,
      remote: () => [earlier, "refs/tags/v1.2.0"].join(String.fromCharCode(9)),
    };

    expect(tagOnOrigin("1.2.0", head, lookups)).toBe(true);
  });

  it("reports an unknown answer when neither a local tag nor the remote answers", () => {
    const lookups = { local: () => null, remote: () => null };

    expect(tagOnOrigin("1.2.0", head, lookups)).toBeNull();
  });
});

describe("the lane that runs it", () => {
  it("is in the scans lane, so a pull request is where the refusal lands", async () => {
    // A guard nothing invokes reports nothing. `ci:lint:scans` is the lane that
    // runs on every pull request and carries the other whole-tree readers.
    const manifest = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf-8")) as {
      scripts: Record<string, string>;
    };

    expect(manifest.scripts["ci:lint:scans"]).toContain(
      "node ./scripts/check-changelog-released-sections.mjs",
    );
  });
});

const repairTrees: string[] = [];
afterEach(async () => {
  await Promise.all(repairTrees.splice(0).map((tree) => removeTempTree(tree)));
});

async function repairFixture(
  head = lateEntry(),
  base = RELEASED,
): Promise<{ root: string; base: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-changelog-repair-"));
  repairTrees.push(root);
  await mkdir(path.join(root, "scripts"));
  for (const name of [
    "check-changelog-released-sections.mjs",
    "check-release-notes.mjs",
    "check-shipped-ci-parity.mjs",
  ]) {
    await cp(path.join(repoRoot, "scripts", name), path.join(root, "scripts", name));
  }
  git(root, "init", "-b", "main");
  git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "config", "user.name", "Changelog fixture");
  git(root, "config", "core.autocrlf", "false");
  await writeFile(path.join(root, "CHANGELOG.md"), base);
  git(root, "add", "CHANGELOG.md");
  git(root, "commit", "-m", "Release baseline");
  const baseSha = git(root, "rev-parse", "HEAD").trim();
  git(root, "branch", "baseline", baseSha);
  git(root, "tag", "v1.2.0");
  await writeFile(path.join(root, "CHANGELOG.md"), head);
  git(root, "add", "CHANGELOG.md");
  git(root, "commit", "--allow-empty", "-m", "Branch entries");
  return { root, base: baseSha };
}

function git(root: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf-8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout;
}

function lateEntry(
  block = "- **A late fix.**\n  Its continuation stays with the entry.\n",
): string {
  return RELEASED.replace(
    "- **The second thing the release carried.**\n",
    "- **The second thing the release carried.**\n" + block,
  );
}

function repair(
  root: string,
  base: string,
  preload?: string,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [
      ...(preload === undefined ? [] : ["--import", pathToFileURL(preload).href]),
      path.join(root, "scripts", "check-changelog-released-sections.mjs"),
      "--fix",
      "--base",
      base,
    ],
    {
      cwd: root,
      encoding: "utf-8",
      env: { ...process.env, GITHUB_EVENT_NAME: "", BASE_REF: "" },
    },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function unchangedFailure(head: string, message: string): Promise<void> {
  const fixture = await repairFixture(head);
  const result = repair(fixture.root, fixture.base);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(message);
  expect(await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8")).toBe(head);
  expect(git(fixture.root, "diff", "--cached")).toBe("");
}

describe("explicit repair of misplaced released entries", () => {
  it("moves the full block to its Unreleased category and makes the next run a no-op", async () => {
    const fixture = await repairFixture();
    const beforeHead = git(fixture.root, "rev-parse", "HEAD");
    const result = repair(fixture.root, fixture.base);
    const expected = RELEASED.replace(
      "## [1.2.0]",
      "### Added\n\n- **A late fix.**\n  Its continuation stays with the entry.\n\n## [1.2.0]",
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1.2.0 / Added");
    expect(result.stdout).toContain("Unreleased / Added");
    expect(result.stdout).toMatch(/lines \d+-\d+/);
    expect(await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8")).toBe(expected);
    expect(git(fixture.root, "rev-parse", "HEAD")).toBe(beforeHead);
    expect(git(fixture.root, "diff", "--cached")).toBe("");
    expect(repair(fixture.root, fixture.base).status).toBe(0);
    expect(await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8")).toBe(expected);
  });

  it("keeps multiple categories, continuation lines, fences and CRLF bytes", async () => {
    const base = RELEASED.replace(
      "- **The second thing the release carried.**\n",
      "- **The second thing the release carried.**\n\n### Fixed\n\n- **An earlier fix.**\n",
    ).replaceAll("\n", "\r\n");
    const added =
      "- **Late addition.**\r\n  Details.\r\n\r\n```md\r\n## [9.9.9] - 2026-01-01\r\n- **Example only.**\r\n```\r\n";
    const fixed = "- **Late correction.**\r\n  - Nested detail.\r\n";
    const head = base
      .replace(
        "- **The second thing the release carried.**\r\n",
        "- **The second thing the release carried.**\r\n" + added,
      )
      .replace("- **An earlier fix.**\r\n", "- **An earlier fix.**\r\n" + fixed);
    const fixture = await repairFixture(head, base);
    expect(repair(fixture.root, fixture.base).status).toBe(0);
    const text = await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8");
    expect(text.slice(text.indexOf("## [1.2.0]"))).toBe(base.slice(base.indexOf("## [1.2.0]")));
    expect(text).toContain("### Added\r\n\r\n" + added);
    expect(text).toContain("### Fixed\r\n\r\n" + fixed);
    expect(text).not.toMatch(/(?<!\r)\n/);
    expect(text.match(/^### Added\r?$/gm)).toHaveLength(2);
  });

  it("appends to an existing destination without rewriting its entries or older releases", async () => {
    const base =
      RELEASED.replace("### Changed", "### Added") +
      "\n## [1.1.0] - 2026-01-01\n\n### Removed\n\n- **Old removal.**\n";
    const head = base.replace(
      "- **The second thing the release carried.**\n",
      "- **The second thing the release carried.**\n- **Late.**\n",
    );
    const fixture = await repairFixture(head, base);
    expect(repair(fixture.root, fixture.base).status).toBe(0);
    const text = await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8");
    expect(text).toBe(base.replace("## [1.2.0]", "- **Late.**\n\n## [1.2.0]"));
  });

  it.each([
    [
      "edited historical body",
      lateEntry().replace("The first thing", "Changed first thing"),
      "byte-for-byte",
    ],
    [
      "deleted historical entry",
      lateEntry().replace("- **The first thing the release carried.**\n", ""),
      "byte-for-byte",
    ],
    [
      "reordered historical entries",
      lateEntry().replace(
        "- **The first thing the release carried.**\n- **The second thing the release carried.**",
        "- **The second thing the release carried.**\n- **The first thing the release carried.**",
      ),
      "byte-for-byte",
    ],
    ["renamed release heading", lateEntry().replace("2026-01-02", "2026-01-03"), "byte-for-byte"],
    ["missing Unreleased", lateEntry().replace("## [Unreleased]", "## Pending"), "one Unreleased"],
    [
      "duplicate Unreleased",
      lateEntry().replace("## [Unreleased]", "## [Unreleased]\n\n## [Unreleased]"),
      "one Unreleased",
    ],
    ["unknown category", lateEntry().replace("### Added", "### Extra"), "category"],
    ["duplicate category", lateEntry().replace("### Added", "### Added\n\n### Added"), "category"],
    ["duplicate release", lateEntry() + "\n## [1.2.0] - 2026-01-02\n", "duplicate"],
    [
      "duplicate destination title",
      lateEntry().replace("Something not yet released.", "A late fix."),
      "duplicate",
    ],
    ["duplicate added title", lateEntry("- **Late.**\n- **Late.**\n"), "duplicate"],
    ["unclosed fence", lateEntry("- **Late.**\n```md\nexample\n"), "fence"],
  ])("refuses %s without writing any bytes", async (_name, head, message) => {
    await unchangedFailure(head, message);
  });

  it("rejects --fix without --base as a usage error without changing files or Git state", async () => {
    const fixture = await repairFixture();
    const changelog = path.join(fixture.root, "CHANGELOG.md");
    const index = path.join(fixture.root, ".git", "index");
    const beforeBytes = await readFile(changelog);
    const beforeIndex = await readFile(index);
    const beforeHead = git(fixture.root, "rev-parse", "HEAD");
    const beforeRefs = git(fixture.root, "show-ref");
    const result = spawnSync(
      process.execPath,
      [path.join(fixture.root, "scripts", "check-changelog-released-sections.mjs"), "--fix"],
      { cwd: fixture.root, encoding: "utf-8" },
    );
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--base");
    expect(await readFile(changelog)).toEqual(beforeBytes);
    expect(await readFile(index)).toEqual(beforeIndex);
    expect(git(fixture.root, "rev-parse", "HEAD")).toBe(beforeHead);
    expect(git(fixture.root, "show-ref")).toBe(beforeRefs);
  });

  it("refuses an unresolvable base", async () => {
    const fixture = await repairFixture();
    const before = await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8");
    expect(repair(fixture.root, "missing-ref").status).toBe(1);
    expect(await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8")).toBe(before);
  });

  it("refuses a base that is not an ancestor of HEAD", async () => {
    const fixture = await repairFixture();
    git(fixture.root, "checkout", "--orphan", "unrelated");
    git(fixture.root, "commit", "-m", "Unrelated history");
    const before = await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8");
    const result = repair(fixture.root, fixture.base);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ancestor");
    expect(await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8")).toBe(before);
  });

  it.each(["untagged", "head-tag"])("leaves a verified %s section unchanged", async (kind) => {
    const fixture = await repairFixture();
    git(fixture.root, "tag", "-d", "v1.2.0");
    if (kind === "head-tag") git(fixture.root, "tag", "v1.2.0");
    else git(fixture.root, "remote", "add", "origin", fixture.root);
    expect(repair(fixture.root, fixture.base).status).toBe(0);
    expect(await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8")).toBe(lateEntry());
  });

  it("refuses an unknown tag answer instead of moving an unverified section", async () => {
    const fixture = await repairFixture();
    git(fixture.root, "tag", "-d", "v1.2.0");
    const before = await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8");
    const result = repair(fixture.root, fixture.base);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("tag");
    expect(await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8")).toBe(before);
  });

  it("refuses a multiply linked changelog", async () => {
    const fixture = await repairFixture();
    await link(path.join(fixture.root, "CHANGELOG.md"), path.join(fixture.root, "alias.md"));
    const result = repair(fixture.root, fixture.base);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("regular file with one link");
    expect(await readFile(path.join(fixture.root, "alias.md"), "utf-8")).toBe(lateEntry());
  });

  it("refuses a renamed version heading instead of treating it as a new release", async () => {
    await unchangedFailure(lateEntry().replace("[1.2.0]", "[1.2.1]"), "missing or renamed");
  });

  it("keeps a genuinely new release section unchanged", async () => {
    const head = lateEntry().replace(
      "## [Unreleased]",
      "## [Unreleased]\n\n## [1.3.0] - 2026-02-03",
    );
    const fixture = await repairFixture(head);
    expect(repair(fixture.root, fixture.base).status).toBe(0);
    const text = await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8");
    expect(text).toContain(
      "## [1.3.0] - 2026-02-03\n\n### Changed\n\n- **Something not yet released.**",
    );
    expect(text.slice(text.indexOf("## [1.2.0]"))).toBe(
      RELEASED.slice(RELEASED.indexOf("## [1.2.0]")),
    );
  });

  it("refuses a symbolic changelog leaf without touching its target", async () => {
    const fixture = await repairFixture();
    const target = path.join(fixture.root, "target.md");
    await rename(path.join(fixture.root, "CHANGELOG.md"), target);
    await symlink(target, path.join(fixture.root, "CHANGELOG.md"), "file");
    const result = repair(fixture.root, fixture.base);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("regular file with one link");
    expect(await readFile(target, "utf-8")).toBe(lateEntry());
  });

  it("refuses invalid UTF-8 bytes without replacing them", async () => {
    const fixture = await repairFixture();
    const bytes = Buffer.concat([Buffer.from(lateEntry()), Buffer.from([0xff])]);
    await writeFile(path.join(fixture.root, "CHANGELOG.md"), bytes);
    const result = repair(fixture.root, fixture.base);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("valid UTF-8");
    expect(await readFile(path.join(fixture.root, "CHANGELOG.md"))).toEqual(bytes);
  });

  it.each(["file", "HEAD", "base", "write"])(
    "keeps observed %s changes or write failures visible",
    async (kind) => {
      const fixture = await repairFixture();
      const preload = path.join(fixture.root, "boundary.mjs");
      const mutation =
        kind === "file"
          ? 'fs.writeFileSync("CHANGELOG.md", original + "external edit\\n");'
          : kind === "HEAD"
            ? 'execFileSync("git", ["commit", "--allow-empty", "-m", "External commit"]);'
            : kind === "base"
              ? 'execFileSync("git", ["update-ref", "refs/heads/baseline", "HEAD"]);'
              : "";
      await writeFile(
        preload,
        `import fs from "node:fs";\nimport { execFileSync } from "node:child_process";\nimport { syncBuiltinESMExports } from "node:module";\nconst read = fs.readFileSync;\nlet changed = false;\nfs.readFileSync = function (file, ...args) { const original = read.call(this, file, ...args); if (!changed && String(file).endsWith("CHANGELOG.md")) { changed = true; ${mutation} } return original; };\n${kind === "write" ? 'fs.writeFileSync = function () { throw new Error("fixture write refused"); };' : ""}\nsyncBuiltinESMExports();\n`,
      );
      const result = repair(fixture.root, "baseline", preload);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(kind === "write" ? "fixture write refused" : "changed");
      expect(await readFile(path.join(fixture.root, "CHANGELOG.md"), "utf-8")).toBe(
        lateEntry() + (kind === "file" ? "external edit\n" : ""),
      );
      expect(git(fixture.root, "diff", "--cached")).toBe("");
    },
  );

  it("reports a write failure after retaining actual partial bytes without changing HEAD or index", async () => {
    const fixture = await repairFixture();
    const beforeHead = git(fixture.root, "rev-parse", "HEAD");
    const index = path.join(fixture.root, ".git", "index");
    const beforeIndex = await readFile(index);
    const preload = path.join(fixture.root, "partial-write.mjs");
    await writeFile(
      preload,
      [
        'import fs from "node:fs";',
        'import { syncBuiltinESMExports } from "node:module";',
        "const write = fs.writeFileSync;",
        "fs.writeFileSync = function (file, data, ...options) {",
        '  if (String(file).endsWith("CHANGELOG.md")) {',
        "    write.call(this, file, Buffer.from(data).subarray(0, 96), ...options);",
        '    throw Object.assign(new Error("EPERM: fixture partial write"), { code: "EPERM" });',
        "  }",
        "  return write.call(this, file, data, ...options);",
        "};",
        "syncBuiltinESMExports();",
      ].join("\n"),
    );
    const result = repair(fixture.root, fixture.base, preload);
    const planned = RELEASED.replace(
      "## [1.2.0]",
      "### Added\n\n- **A late fix.**\n  Its continuation stays with the entry.\n\n## [1.2.0]",
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("EPERM");
    expect(result.stdout).not.toContain("repaired CHANGELOG.md");
    expect(await readFile(path.join(fixture.root, "CHANGELOG.md"))).toEqual(
      Buffer.from(planned).subarray(0, 96),
    );
    expect(git(fixture.root, "rev-parse", "HEAD")).toBe(beforeHead);
    expect(await readFile(index)).toEqual(beforeIndex);
  });

  it("prints the source lines, destination category and exact repair command in check mode", async () => {
    const fixture = await repairFixture();
    const result = spawnSync(
      process.execPath,
      [
        path.join(fixture.root, "scripts", "check-changelog-released-sections.mjs"),
        "--base",
        fixture.base,
      ],
      { cwd: fixture.root, encoding: "utf-8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("1.2.0 / Added");
    expect(result.stderr).toMatch(/lines \d+-\d+/);
    expect(result.stderr).toContain("Unreleased / Added");
    expect(result.stderr).toContain(
      `node scripts/check-changelog-released-sections.mjs --fix --base ${fixture.base}`,
    );
  });
});
