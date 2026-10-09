/**
 * Two ways a governance negation reached the `.gitignore` and still did nothing.
 *
 * 1. `ensureRootGitignoreEntries` stripped the managed block and wrote the
 *    canonical one back whenever the freshness check failed. Shipping a NEW
 *    governance negation is exactly what makes it fail — so a project that had
 *    deliberately removed `.qfai/evidence/*` to track its own audit trail got
 *    that line resurrected by the very release meant to widen tracking, and
 *    every evidence file went back to being ignored.
 * 2. A project ignore line below the managed block re-ignored what a
 *    governance negation re-included, and the freshness check, reading the
 *    block alone, called the negation effective.
 */

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";
import {
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_MARKER,
} from "../../src/core/gitignore.js";

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-migration-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const NL = "\n";

const readGitignore = (root: string): Promise<string> =>
  readFile(path.join(root, ".gitignore"), "utf-8");

describe("re-init preserves what the project chose to track", () => {
  // QFAI:EX-0001-0033-09
  it("does not resurrect an ignore line the project removed from the block", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The project tracks its evidence: drop the evidence ignore, and drop one
      // governance negation so the freshness check fails on re-init.
      const pruned = (await readGitignore(root))
        .split("\n")
        .filter((line) => line !== ".qfai/evidence/*" && line !== "!.qfai/assistant/")
        .join("\n");
      await writeFile(path.join(root, ".gitignore"), pruned, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = await readGitignore(root);
      expect(after.split("\n")).not.toContain(".qfai/evidence/*");
      // …while the missing governance negation is restored.
      expect(after).toContain("!.qfai/assistant/");
      expect(after.split(QFAI_GITIGNORE_MARKER).length - 1).toBe(1);
    });
  });

  it("keeps every governance negation after the ignores it undoes", async () => {
    // Git applies the last matching pattern; a negation above its ignore is
    // inert, which is the failure `governanceNegationsEffective` exists for.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const lines = (await readGitignore(root)).split("\n");
      const evidenceIgnore = lines.indexOf(".qfai/evidence/*");
      for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
        expect(lines.indexOf(negation)).toBeGreaterThan(evidenceIgnore);
      }
    });
  });
});

describe("--force regenerates the standard asset trees", () => {
  it("restores an edited agent definition, not the manifest and not project content", async () => {
    // The retired manifest is adopter content. Init does not create or update it.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const agent = path.join(root, ".qfai", "assistant", "agent", "qa-gatekeeper.md");
      const manifest = path.join(root, ".qfai", "assistant", "manifest", "agent-catalog.yml");
      await writeFile(agent, "# stale" + NL, "utf-8");
      await mkdir(path.dirname(manifest), { recursive: true });
      await writeFile(manifest, "tuned: true" + NL, "utf-8");

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(agent, "utf-8")).not.toBe("# stale" + NL);
      expect(await readFile(manifest, "utf-8")).toBe("tuned: true" + NL);
    });
  });

  it("leaves them alone without --force", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const agent = path.join(root, ".qfai", "assistant", "agent", "qa-gatekeeper.md");
      await writeFile(agent, "# ours\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readFile(agent, "utf-8")).toBe("# ours\n");
    });
  });
});

describe("an unrecognised line inside the block does not truncate it", () => {
  // Both block walks must not stop at the first line they do not recognise: a line a
  // project wrote between two lines of the block would sit exactly there.
  //
  // What follows is not a cosmetic duplicate. The freshness check reads the block it extracted,
  // so it found the governance negations "missing" and never took the early return; the strip
  // removed the same truncated prefix and left the rest; and the rebuilt block went back in
  // ABOVE the twenty lines nobody had removed. Git applies the LAST matching pattern, so the
  // re-appended negations sit above the ignores that cancel them and do nothing at all — a
  // block of inert lines added on every single run.
  const OWN_LINE_INSIDE_BLOCK = ".qfai/notes/*";

  it("leaves a block carrying an unrecognised line completely alone", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Put the project's line inside the block, between two lines the writer emits.
      const seeded = (await readGitignore(root))
        .split(NL)
        .flatMap((line) => (line === ".qfai/report/*" ? [line, OWN_LINE_INSIDE_BLOCK] : [line]))
        .join(NL);
      await writeFile(path.join(root, ".gitignore"), seeded, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const after = await readGitignore(root);

      expect(
        after,
        "the file must be untouched: every negation was already present and already last",
      ).toBe(seeded);
      expect(
        after.split(NL).filter((line) => line === OWN_LINE_INSIDE_BLOCK),
        "and the project's own line is kept, not stripped",
      ).toHaveLength(1);
    });
  });

  it("appends each governance negation exactly once, however often init runs", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const seeded = (await readGitignore(root))
        .split(NL)
        .flatMap((line) => (line === ".qfai/report/*" ? [line, OWN_LINE_INSIDE_BLOCK] : [line]))
        .join(NL);
      await writeFile(path.join(root, ".gitignore"), seeded, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const once = await readGitignore(root);
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const twice = await readGitignore(root);

      expect(twice, "init must be idempotent on its own output").toBe(once);
      for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
        expect(
          twice.split(NL).filter((line) => line === negation),
          `\`${negation}\` must appear once: a second copy above the ignores that cancel it is ` +
            "inert under git's last-match rule, and grows by one block per run",
        ).toHaveLength(1);
      }
      expect(twice.split(QFAI_GITIGNORE_MARKER).length - 1).toBe(1);
    });
  });

  // QFAI:EX-0001-0033-08
  it("still leaves a project line written under the block outside it", async () => {
    // The protection the old walk bought, kept. Widening it to tolerate unknown lines INSIDE
    // the block must not swallow the lines a project appended directly under it with no blank
    // between — hoisting one above the governance negations would flip git's verdict for the
    // paths it covers, from ignored to tracked.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      // Deliberately NOT a `.qfai/**` path. A project line that re-ignores what a governance
      // negation re-includes has its own designed behaviour — the block is rebuilt BELOW it, so
      // the negations win again — and two rows above already pin that. This row is about the
      // other case: an unrelated project line, where the block must stay where it is.
      const PROJECT_LINE = "coverage-local/";
      // TWO conditions, and the row was inert without either. A planted "absorb everything"
      // walk survived each of the first two attempts at this fixture, which is the fixture
      // reporting on itself rather than the walk being safe.
      //
      // 1. NO blank line between the block and the project's line. Appending to the file as
      //    written leaves the block's own trailing blank in place, and the walk terminates
      //    there whatever it does with unknown lines.
      // 2. A governance negation REMOVED, so the freshness check fails and init actually
      //    rewrites the file. With the file already fresh, an absorbing walk changes what init
      //    computes and nothing about what it writes — the early return fires and the project
      //    line stays put for a reason that has nothing to do with the walk.
      const DROPPED = QFAI_GITIGNORE_GOVERNANCE_NEGATIONS[1] ?? "";
      const trimmed = (await readGitignore(root)).split(NL).filter((line) => line !== DROPPED);
      while (trimmed.length > 0 && (trimmed[trimmed.length - 1] ?? "").trim() === "") {
        trimmed.pop();
      }
      const seeded = `${trimmed.join(NL)}${NL}${PROJECT_LINE}${NL}`;
      await writeFile(path.join(root, ".gitignore"), seeded, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const lines = (await readGitignore(root)).split(NL);

      const project = lines.lastIndexOf(PROJECT_LINE);
      const lastNegation = Math.max(
        ...QFAI_GITIGNORE_GOVERNANCE_NEGATIONS.map((negation) => lines.lastIndexOf(negation)),
      );
      expect(project, "the project's line must survive").toBeGreaterThan(-1);
      expect(
        project,
        "and must stay BELOW the governance negations, where the project put it — git applies " +
          "the last matching pattern, so moving it above them would silently start tracking " +
          "files the project chose to ignore",
      ).toBeGreaterThan(lastNegation);
    });
  });
});

describe("a duplicated managed block keeps every ignore line it carries", () => {
  it("rebuilds from all blocks, not the first", async () => {
    // A past duplicate-append bug left some projects with two managed blocks.
    // `removeManagedBlock` strips all of them but `extractManagedBlock` read
    // only the first, so a line living exclusively in the later block was
    // deleted and never rebuilt — `.qfai/state.json` came back tracked and
    // local run state could be committed.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const first = await readGitignore(root);
      expect(first).toContain(".qfai/state.json");

      const lines = first.split(NL);
      const start = lines.findIndex((line) => line.includes(QFAI_GITIGNORE_MARKER));
      const block = lines.slice(start).filter((line) => line.trim().length > 0);
      // Both blocks lack one governance negation, so the freshness check
      // fails and the file is rewritten. Block 1 also lacks `.qfai/state.json`;
      // block 2 carries it.
      const withoutNegation = block.filter(
        (line) => line !== QFAI_GITIGNORE_GOVERNANCE_NEGATIONS[1],
      );
      const stale = withoutNegation.filter((line) => line !== ".qfai/state.json");
      await writeFile(
        path.join(root, ".gitignore"),
        // A project line separates the two blocks. Without something unknown
        // between them the extractor runs straight through the blank line into
        // the second block and the bug does not appear.
        [...stale, "", "node_modules/", "", ...withoutNegation, ""].join(NL),
        "utf-8",
      );

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const rebuilt = await readGitignore(root);
      expect(rebuilt).toContain(".qfai/state.json");
      // The duplicate is collapsed to exactly one block.
      expect(rebuilt.split(QFAI_GITIGNORE_MARKER).length - 1).toBe(1);
      for (const entry of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
        expect(rebuilt).toContain(entry);
      }
    });
  });
});

describe("a project rule after the managed block does not win", () => {
  it("re-appends the block when a later ignore line re-ignores the negations", async () => {
    // Git applies the last matching pattern, so `.qfai/assistant/**/*.json` appended below
    // the managed block re-ignores the vendored assistant tree. The freshness
    // check read the block only, called the negations effective and returned
    // early — while `git check-ignore -v` named the project's line.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const before = await readGitignore(root);
      await writeFile(
        path.join(root, ".gitignore"),
        `${before}${NL}# project rules${NL}.qfai/assistant/**/*.json${NL}`,
        "utf-8",
      );

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const lines = (await readGitignore(root)).split(NL).map((l) => l.trimEnd());
      const projectRule = lines.lastIndexOf(".qfai/assistant/**/*.json");
      const negation = lines.lastIndexOf("!.qfai/assistant/**");
      expect(projectRule).toBeGreaterThan(-1);
      expect(negation).toBeGreaterThan(projectRule);
      // The project's own rule is preserved, not deleted.
      expect(lines.filter((l) => l === ".qfai/assistant/**/*.json")).toHaveLength(1);
    });
  });

  it("leaves a file whose negations already win alone", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const first = await readGitignore(root);

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      expect(await readGitignore(root)).toBe(first);
    });
  });
});

describe("a project rule after the managed block keeps its place", () => {
  /**
   * The one governance negation the stale fixture below leaves out.
   *
   * Read from the list rather than written out. The fixture is only stale while
   * the line it drops is still a negation the block writes, so naming one
   * directly makes the fixture current the day that line retires — and a
   * current block takes the early return, which passes every assertion below
   * without the rebuild they are about ever running.
   */
  const droppedNegation = (): string => {
    const last =
      QFAI_GITIGNORE_GOVERNANCE_NEGATIONS[QFAI_GITIGNORE_GOVERNANCE_NEGATIONS.length - 1];
    if (last === undefined) {
      throw new Error("the governance negation list is empty, so no block can be one line short");
    }
    return last;
  };

  /** A stale block — one governance negation short — plus a project negation below it. */
  const staleBlockWithNegationBelow = async (root: string): Promise<void> => {
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const stale = (await readGitignore(root))
      .split(NL)
      .filter((line) => line !== droppedNegation())
      .join(NL)
      .trimEnd();
    await writeFile(
      path.join(root, ".gitignore"),
      `${stale}${NL}${NL}# project-owned: keep our published dashboard tracked${NL}!.qfai/report/dashboard.md${NL}`,
      "utf-8",
    );
  };

  it("rebuilds the block in place instead of hoisting a project negation above it", async () => {
    // The block was stripped from wherever it sat and re-appended at EOF, so
    // anything the project wrote below it ended up above it. Git applies the
    // last matching pattern, so `!.qfai/report/dashboard.md` stopped beating
    // `.qfai/report/*` and the file quietly dropped out of `git add`.
    await withProject(async (root) => {
      await staleBlockWithNegationBelow(root);

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const lines = (await readGitignore(root)).split(NL).map((l) => l.trimEnd());
      const projectNegation = lines.lastIndexOf("!.qfai/report/dashboard.md");
      const reportIgnore = lines.lastIndexOf(".qfai/report/*");
      expect(projectNegation).toBeGreaterThan(-1);
      expect(projectNegation).toBeGreaterThan(reportIgnore);
      // The rewrite still did its job: the missing governance negation is back,
      // in one block, and QFAI's own negations still outrank QFAI's ignores.
      expect(lines).toContain(droppedNegation());
      expect(lines.filter((l) => l === QFAI_GITIGNORE_MARKER)).toHaveLength(1);
      for (const negation of QFAI_GITIGNORE_GOVERNANCE_NEGATIONS) {
        expect(lines.lastIndexOf(negation)).toBeGreaterThan(reportIgnore);
      }
    });
  });

  it("settles after one rewrite", async () => {
    await withProject(async (root) => {
      await staleBlockWithNegationBelow(root);

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const once = await readGitignore(root);
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readGitignore(root)).toBe(once);
    });
  });

  it("names the project negation it demotes when the block must move", async () => {
    // The fallback stays for a project ignore line that re-ignores a governance
    // record — a genuine conflict. What it may not do is stay silent about the
    // project negation the move makes inert.
    await withProject(async (root) => {
      await staleBlockWithNegationBelow(root);
      const conflicted = await readGitignore(root);
      await writeFile(
        path.join(root, ".gitignore"),
        `${conflicted.trimEnd()}${NL}.qfai/assistant/**/*.json${NL}`,
        "utf-8",
      );

      const lines: string[] = [];
      const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
        lines.push(String(chunk));
        return true;
      });
      try {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      } finally {
        spy.mockRestore();
      }

      const after = (await readGitignore(root)).split(NL).map((l) => l.trimEnd());
      // The block moved below the project's ignore line, as the conflict requires…
      expect(after.lastIndexOf("!.qfai/assistant/**")).toBeGreaterThan(
        after.lastIndexOf(".qfai/assistant/**/*.json"),
      );
      // …and the negation that lost is reported, not swallowed.
      expect(lines.join("")).toContain("!.qfai/report/dashboard.md");
    });
  });
});

describe("nothing under a review directory reaches a commit", () => {
  /** What a review round writes. */
  const REVIEW_PATHS: readonly string[] = [
    ".qfai/review/review-20260101000000000/summary.json",
    ".qfai/review/review-20260101000000000/review_request.md",
    ".qfai/review/review-20260101000000000/R01_implementation-reviewer.md",
  ];

  /**
   * Git's verdict on a path, from a real repository at `root`.
   *
   * Asked of git: what ships is a `.gitignore`, so what decides is git.
   *
   * `--no-index` because tracking is not the question: a path already in the
   * index reports as not ignored however the patterns read, and these paths are
   * being judged before anything has added them.
   */
  const ignoredByGit = (root: string, samplePath: string): boolean => {
    const result = spawnSync("git", ["check-ignore", "--quiet", "--no-index", samplePath], {
      cwd: root,
    });
    // 0 is ignored, 1 is not; anything else is git failing rather than deciding,
    // and a thrown error is the only reading of that which cannot pass silently.
    if (result.status !== 0 && result.status !== 1) {
      throw new Error(
        `git check-ignore could not decide ${samplePath}: status ${String(result.status)}`,
      );
    }
    return result.status === 0;
  };

  const gitProject = async (root: string): Promise<void> => {
    expect(spawnSync("git", ["init", "--quiet"], { cwd: root }).status).toBe(0);
  };

  it("ignores every review path a fresh init leaves behind", async () => {
    await withProject(async (root) => {
      await gitProject(root);
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const reachable = REVIEW_PATHS.filter((sample) => !ignoredByGit(root, sample));
      expect(reachable, "a review artifact must not be committable").toEqual([]);
    });
  });

  it("leaves the governance records the same block re-includes", async () => {
    // Over-correction pin. `!.qfai/` is what makes the governance negations
    // reachable at all, and dropping two of its neighbours must not take it
    // along — which a text search for `!.qfai/` cannot distinguish from
    // dropping only the review lines.
    await withProject(async (root) => {
      await gitProject(root);
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const hidden = [".qfai/assistant/rule/drift-protocol.md"].filter((sample) =>
        ignoredByGit(root, sample),
      );
      expect(hidden, "a governance record must stay committable").toEqual([]);
    });
  });
});

describe("the managed block does not repeat a line the project already has", () => {
  // QFAI:EX-0001-0033-10
  it("leaves /tmp/ to the project's own line and says so", async () => {
    await withProject(async (root) => {
      await writeFile(
        path.join(root, ".gitignore"),
        `# Temporary files${NL}/tmp/${NL}node_modules/${NL}`,
        "utf-8",
      );

      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      const lines = (await readGitignore(root)).split(NL);
      expect(lines.filter((line) => line === "/tmp/")).toHaveLength(1);
      expect(lines).toContain(QFAI_GITIGNORE_MARKER);
      expect(lines).toContain(".qfai/report/*");
      expect(output).toContain("left out of the QFAI entries: /tmp/");
    });
  });

  // QFAI:EX-0001-0033-10
  it("counts the project's own unanchored tmp/ as the same ignore", async () => {
    await withProject(async (root) => {
      await writeFile(path.join(root, ".gitignore"), `tmp/${NL}`, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect((await readGitignore(root)).split(NL)).not.toContain("/tmp/");
    });
  });

  // QFAI:EX-0001-0033-10
  it("keeps every other ignore line in the block, even one the project has", async () => {
    // The contract names these as the block's own lines.
    await withProject(async (root) => {
      await writeFile(
        path.join(root, ".gitignore"),
        `.qfai/state.json${NL}.qfai/report/*${NL}`,
        "utf-8",
      );

      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });

      const lines = (await readGitignore(root)).split(NL);
      expect(lines.filter((line) => line === ".qfai/state.json")).toHaveLength(2);
      expect(lines.filter((line) => line === ".qfai/report/*")).toHaveLength(2);
      expect(output).not.toContain("left out of the QFAI entries");
    });
  });

  // QFAI:EX-0001-0033-10
  it("names the lines it would leave out on --dry-run", async () => {
    await withProject(async (root) => {
      await writeFile(path.join(root, ".gitignore"), `/tmp/${NL}`, "utf-8");

      const output = await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: true, yes: true });
      });

      expect(output).toContain("left out of the QFAI entries: /tmp/");
      expect(await readGitignore(root)).toBe(`/tmp/${NL}`);
    });
  });

  // QFAI:EX-0001-0033-10
  it("does not count a project line that starts with whitespace", async () => {
    // Git reads the leading space as part of the pattern, so ` /tmp/` ignores nothing.
    await withProject(async (root) => {
      await writeFile(path.join(root, ".gitignore"), ` /tmp/${NL}`, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect((await readGitignore(root)).split(NL)).toContain("/tmp/");
    });
  });

  // QFAI:EX-0001-0033-10
  it("settles on identical bytes when init runs again", async () => {
    await withProject(async (root) => {
      await writeFile(path.join(root, ".gitignore"), `/tmp/${NL}`, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const first = await readGitignore(root);

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readGitignore(root)).toBe(first);
    });
  });

  // QFAI:EX-0001-0033-10
  it("still writes /tmp/ when the project's line is cancelled by a negation", async () => {
    await withProject(async (root) => {
      await writeFile(path.join(root, ".gitignore"), `/tmp/${NL}!/tmp/${NL}`, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const lines = (await readGitignore(root)).split(NL);
      expect(lines.filter((line) => line === "/tmp/")).toHaveLength(2);
    });
  });
});
