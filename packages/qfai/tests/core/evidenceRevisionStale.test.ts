/**
 * `Revision` is compared against the tree, not just read (#1146).
 *
 * `evidence-revision.md#what-makes-evidence-stale` has always defined staleness
 * mechanically — "a commit that changes any file the observation covered
 * invalidates it" — and nothing computed it. The field was written by hand,
 * required in three places, and compared against nothing: `QFAI-REVIEW-009`
 * asks whether `summary.json`'s field is PRESENT, never whether it is CURRENT.
 *
 * The failure is silent and self-consistent — a stale `Revision` looks exactly
 * like a fresh one, every command in the record is real, and nothing in the
 * record contradicts anything else. So the rows here are mostly about the
 * states that must stay SILENT, because a check that reported on all of them
 * would be turned off by its first false positive.
 *
 * Two seams rather than a ledger fixture: `changedFilesSince` is the git
 * question, `staleEvidenceFiles` is the decision. Reaching them through a whole
 * `tdd/test-list.md` plus evidence file would mostly test the fixture.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { changedFilesSince } from "../../src/core/gitChanges.js";
import { staleEvidenceFiles } from "../../src/core/validators/tddList.js";

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

const git = (cwd: string, ...args: string[]): void => {
  execFileSync("git", args, { cwd, stdio: ["ignore", "ignore", "ignore"] });
};

async function write(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf-8");
}

/** A repo with one commit, and the revision that commit is at. */
async function repoAtOneCommit(): Promise<{ root: string; head: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-revision-"));
  dirs.push(root);
  git(root, "init", "--initial-branch=main");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "test");
  await write(root, "src/lease.ts", "export const rate = 1;\n");
  await write(root, "tests/integration/lease.test.ts", "it('works', () => {});\n");
  await write(root, "docs/notes.md", "notes\n");
  git(root, "add", "-A");
  git(root, "commit", "-m", "seed");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf-8" }).trim();
  return { root, head };
}

async function commit(root: string, rel: string, content: string): Promise<void> {
  await write(root, rel, content);
  git(root, "add", "-A");
  git(root, "commit", "-m", `edit ${rel}`);
}

/** A bare `- Revision:`, which a row may record. */
const section = (revision: string): string =>
  ["### TDD-0001", "", `- Revision: ${revision}`, "- Status: done", ""].join("\n");

/**
 * The shape completed evidence actually writes: the field is ROUND-SCOPED.
 *
 * The first draft of this check read `rowEvidenceFieldValue(section,
 * "Revision")`, which filters `round === null` and so reads only the bare
 * form — making the whole check a SILENT NO-OP on every real evidence file.
 * That is the failure class #1146 is about, reproduced inside the check
 * written to end it, and it survived a green suite because the fixtures here
 * used the bare form too.
 */
const roundSection = (...revisions: string[]): string =>
  [
    "### TDD-0001",
    "",
    ...revisions.map((rev, i) => `- Round ${i + 1}: Revision: ${rev}`),
    "- Status: done",
    "",
  ].join("\n");

describe("changedFilesSince", () => {
  it("reports the files that moved under the observation", async () => {
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");

    const result = changedFilesSince(root, head, ["tests/integration/lease.test.ts", "src"]);
    expect(result.kind).toBe("changed");
    expect(result.kind === "changed" ? result.files : []).toEqual(["src/lease.ts"]);
  });

  it("is silent when nothing under the pathspec moved", async () => {
    // The pathspec is the point: a commit to `docs/` is not a file the
    // observation covered, and reporting it would make the check noise.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "docs/notes.md", "more notes\n");

    expect(changedFilesSince(root, head, ["tests/integration/lease.test.ts", "src"]).kind).toBe(
      "unchanged",
    );
  });

  it("says so when the revision cannot be resolved, rather than `unchanged`", async () => {
    // The whole reason this is three-valued. `getChangedFilesAgainstBase`
    // collapses every failure into an empty set, which its caller reads as
    // "nothing to check"; here that same collapse would read as "the evidence
    // is fresh" — the silent pass #1146 is about, reproduced inside the check
    // meant to detect it.
    const { root } = await repoAtOneCommit();
    expect(changedFilesSince(root, "0".repeat(40), ["src"]).kind).toBe("unresolvable");
  });

  it("says so when git rejects the pathspec, rather than `unchanged`", async () => {
    // The branch after `rev-parse` has already succeeded: a broken worktree or
    // a pathspec git will not take. `:(bogus)` is an unknown magic prefix, so
    // git exits non-zero with the revision perfectly resolvable — which is the
    // one way to reach that catch, and the reason this row exists.
    const { root, head } = await repoAtOneCommit();
    expect(changedFilesSince(root, head, [":(bogus)src"]).kind).toBe("unresolvable");
  });

  it("says so outside a git checkout too", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-revision-nogit-"));
    dirs.push(root);
    expect(changedFilesSince(root, "abc1234", ["src"]).kind).toBe("unresolvable");
  });
});

describe("staleEvidenceFiles", () => {
  it("names the files that moved", async () => {
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");

    expect(
      staleEvidenceFiles(root, "src", section(head), "tests/integration/lease.test.ts"),
    ).toEqual(["src/lease.ts"]);
  });

  it("names a change to the test file itself", async () => {
    // "Any file the observation covered" starts with the test that was run.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "tests/integration/lease.test.ts", "it('works differently', () => {});\n");

    expect(
      staleEvidenceFiles(root, "src", section(head), "tests/integration/lease.test.ts"),
    ).toEqual(["tests/integration/lease.test.ts"]);
  });

  it("stays silent when the observation is current", async () => {
    const { root, head } = await repoAtOneCommit();
    expect(
      staleEvidenceFiles(root, "src", section(head), "tests/integration/lease.test.ts"),
    ).toBeNull();
  });

  it("stays silent when the row records no Revision", async () => {
    // That absence belongs to `QFAI-TDDLIST-008`'s completed-evidence field
    // list. Two findings on one state with two remedies help nobody.
    const { root } = await repoAtOneCommit();
    const noRevision = ["### TDD-0001", "", "- Status: done", ""].join("\n");
    expect(
      staleEvidenceFiles(root, "src", noRevision, "tests/integration/lease.test.ts"),
    ).toBeNull();
  });

  it("stays silent for a content-address revision, which names no commit", async () => {
    // `working-tree+<hash>` is a different contract with no interval to
    // compute; `QFAI-REVIEW-007` / `-009` own its shape.
    const { root } = await repoAtOneCommit();
    const contentAddress = section(`working-tree+${"a".repeat(64)}`);
    expect(
      staleEvidenceFiles(root, "src", contentAddress, "tests/integration/lease.test.ts"),
    ).toBeNull();
  });

  it("stays silent when the revision cannot be resolved", async () => {
    // Deliberate, and the residual is stated in the source: `actions/checkout`
    // is depth-1 by default, so sharing this code's window would error on every
    // row of every CI run on a shallow clone, and `QFAI-REVIEW-009` already
    // reports an unresolvable revision.
    const { root } = await repoAtOneCommit();
    expect(
      staleEvidenceFiles(root, "src", section("0".repeat(40)), "tests/integration/lease.test.ts"),
    ).toBeNull();
  });

  it("reads the ROUND-SCOPED field completed evidence actually writes", async () => {
    // The row that would have caught the silent no-op.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");

    expect(
      staleEvidenceFiles(root, "src", roundSection(head), "tests/integration/lease.test.ts"),
    ).toEqual(["src/lease.ts"]);
  });

  it("takes the NEWEST round, because a re-verify re-takes the observation", async () => {
    // Round 1 is stale by construction; round 2 is current. Reading round 1
    // would report a row whose latest observation is fine.
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");
    const second = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf-8",
    }).trim();

    expect(
      staleEvidenceFiles(
        root,
        "src",
        roundSection(head, second),
        "tests/integration/lease.test.ts",
      ),
    ).toBeNull();
  });

  it("still reports when the newest round is itself stale", async () => {
    const { root, head } = await repoAtOneCommit();
    await commit(root, "src/lease.ts", "export const rate = 2;\n");
    const second = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf-8",
    }).trim();
    await commit(root, "src/lease.ts", "export const rate = 3;\n");

    expect(
      staleEvidenceFiles(
        root,
        "src",
        roundSection(head, second),
        "tests/integration/lease.test.ts",
      ),
    ).toEqual(["src/lease.ts"]);
  });

  it("stays silent when a commit touched neither the test nor the source", async () => {
    const { root, head } = await repoAtOneCommit();
    await commit(root, "docs/notes.md", "more notes\n");
    expect(
      staleEvidenceFiles(root, "src", section(head), "tests/integration/lease.test.ts"),
    ).toBeNull();
  });
});
