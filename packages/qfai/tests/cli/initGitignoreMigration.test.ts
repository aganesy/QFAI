/**
 * Two ways a governance negation reached the `.gitignore` and still did nothing.
 *
 * 1. `ensureRootGitignoreEntries` stripped the managed block and wrote the
 *    canonical one back whenever the freshness check failed. Shipping a NEW
 *    governance negation is exactly what makes it fail — so a project that had
 *    deliberately removed `.qfai/evidence/*` to track its own audit trail got
 *    that line resurrected by the very release meant to widen tracking, and
 *    every evidence file went back to being ignored.
 * 2. An earlier `qfai init` wrote a per-directory `.qfai/evidence/.gitignore`
 *    whose first line is `*`. Git applies the deepest matching file, so that
 *    `*` beats every root negation and the governance records stayed ignored
 *    however correct the managed block was.
 */

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import {
  isPathIgnoredByLayers,
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
  it("does not resurrect an ignore line the project removed from the block", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The project tracks its own audit trail: drop the evidence ignore, and
      // drop one governance negation so the freshness check fails on re-init.
      const pruned = (await readGitignore(root))
        .split("\n")
        .filter((line) => line !== ".qfai/evidence/*" && line !== "!.qfai/decisions/**")
        .join("\n");
      await writeFile(path.join(root, ".gitignore"), pruned, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = await readGitignore(root);
      expect(after.split("\n")).not.toContain(".qfai/evidence/*");
      // …while the missing governance negation is restored.
      expect(after).toContain("!.qfai/decisions/**");
      expect(after.split(QFAI_GITIGNORE_MARKER).length - 1).toBe(1);
    });
  });

  it("strips retired lines from an old block without re-adding what it dropped", async () => {
    // A legacy-shaped block can ALSO carry a deliberate removal, so the earlier
    // "migrate it wholesale" rule resurrected the ignore for exactly those
    // projects. Age and intent are indistinguishable from the file, so the
    // conservative reading wins in both cases.
    await withProject(async (root) => {
      await writeFile(
        path.join(root, ".gitignore"),
        [
          QFAI_GITIGNORE_MARKER,
          ".qfai/report/*",
          "!.qfai/report/README.md",
          ".qfai/discussion/discussion-*/",
          "",
        ].join("\n"),
        "utf-8",
      );

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = (await readGitignore(root)).split("\n");
      // Retired lines go.
      expect(after).not.toContain("!.qfai/report/README.md");
      expect(after).not.toContain(".qfai/discussion/discussion-*/");
      // A renamed line keeps its successor — dropping it alone would remove an
      // ignore the project never gave up.
      expect(after).toContain(".qfai/discussion/*");
      // But an ignore this block simply never had is NOT added.
      expect(after).not.toContain(".qfai/evidence/*");
      expect(after).toContain("!.qfai/decisions/**");
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

describe("a legacy per-directory evidence ignore is migrated, not ignored", () => {
  it("re-includes the governance records inside the legacy file", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const legacy = path.join(root, ".qfai", "evidence", ".gitignore");
      await mkdir(path.dirname(legacy), { recursive: true });
      await writeFile(legacy, "*\n!.gitignore\n!README.md\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = (await readFile(legacy, "utf-8")).split("\n");
      for (const negation of [
        "!change-request-*.md",
        "!decision-*.md",
        "!implement-*.md",
        "!atdd-*.md",
        "!coverage-depth-*.md",
        "!decisions/",
        "!decisions/**",
        "!implement-*.md",
        "!atdd-*.md",
      ]) {
        expect(after).toContain(negation);
      }
      // The rest of the file is the project's; the `*` stays.
      expect(after).toContain("*");
      expect(after).toContain("!README.md");

      // The root negations cannot override this deeper file. Prove the migrated
      // legacy rules make both durable per-item evidence homes visible to Git.
      expect(spawnSync("git", ["init", "--quiet"], { cwd: root }).status).toBe(0);
      for (const name of ["implement-spec-0001.md", "atdd-spec-0001.md"]) {
        await writeFile(path.join(root, ".qfai", "evidence", name), "# evidence\n", "utf-8");
        expect(
          spawnSync("git", ["check-ignore", "--quiet", "--no-index", `.qfai/evidence/${name}`], {
            cwd: root,
          }).status,
        ).toBe(1);
      }
    });
  });

  // Membership in the legacy file is not the claim; the VERDICT is. Every root
  // governance negation needs its leaf counterpart, and the RED/GREEN records
  // were the two that shipped without one: on a project carrying the legacy
  // file, `git check-ignore -v .qfai/evidence/implement-<spec-id>.md` still
  // named the nested `*` as the winner, so the fresh clone and CI this change
  // exists to serve saw neither file. Ask the repository's own layered matcher
  // the same question git would.
  it("leaves no root governance negation inert under the legacy file", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const legacy = path.join(root, ".qfai", "evidence", ".gitignore");
      await mkdir(path.dirname(legacy), { recursive: true });
      await writeFile(legacy, "*\n!.gitignore\n!README.md\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const layers = [
        { dir: "", lines: (await readGitignore(root)).split(NL).map((l) => l.trimEnd()) },
        {
          dir: ".qfai/evidence",
          lines: (await readFile(legacy, "utf-8")).split(NL).map((l) => l.trimEnd()),
        },
      ];
      for (const sample of [
        ".qfai/evidence/implement-spec-0001.md",
        ".qfai/evidence/atdd-spec-0001.md",
        ".qfai/evidence/coverage-depth-spec-0001.md",
        ".qfai/evidence/change-request-0001.md",
        ".qfai/evidence/decision-0001.md",
        ".qfai/evidence/decisions/20260101T000000000.json",
      ]) {
        expect(
          isPathIgnoredByLayers(layers, sample),
          `${sample} must survive the legacy nested ignore file`,
        ).toBe(false);
      }

      // Over-correction pin: the migration re-includes the governance records,
      // not the regenerable stage logs the legacy file exists to hide.
      expect(
        isPathIgnoredByLayers(layers, ".qfai/evidence/validate-run.log"),
        "a regenerable stage log stays ignored",
      ).toBe(true);
    });
  });

  it("is idempotent and leaves a project without the legacy file alone", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const legacy = path.join(root, ".qfai", "evidence", ".gitignore");
      await mkdir(path.dirname(legacy), { recursive: true });
      await writeFile(legacy, "*\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const once = await readFile(legacy, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      expect(await readFile(legacy, "utf-8")).toBe(once);
    });
  });
});

describe("--force regenerates the standard asset trees", () => {
  it("restores an edited agent definition, not the manifest and not project content", async () => {
    // Without this, a correction to an agent body reached new projects only:
    // `.qfai/**` is copied create-only and `--force` covered
    // `assistant/skills` alone.
    //
    // `agent-catalog.yml` is **not** in the set. `qfai-configure` is the
    // shipped entrypoint for editing the declarative manifests, so forcing the
    // catalog would replace a taxonomy adjustment made through the supported
    // path — and nothing migrates it back, because `--upgrade-assistant-tree`
    // deliberately does not walk `manifest/`.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const agent = path.join(root, ".qfai", "assistant", "agents", "qa-gatekeeper.md");
      const manifest = path.join(root, ".qfai", "assistant", "manifest", "agent-catalog.yml");
      const steering = path.join(root, ".qfai", "steering", "README.md");
      await writeFile(agent, "# stale" + NL, "utf-8");
      await writeFile(manifest, "tuned: true" + NL, "utf-8");
      const projectContent = await readFile(steering, "utf-8").catch(() => null);

      await runInit({ dir: root, force: true, dryRun: false, yes: true });

      expect(await readFile(agent, "utf-8")).not.toBe("# stale" + NL);
      expect(await readFile(manifest, "utf-8")).toBe("tuned: true" + NL);
      if (projectContent !== null) {
        expect(await readFile(steering, "utf-8")).toBe(projectContent);
      }
    });
  });

  it("leaves them alone without --force", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const agent = path.join(root, ".qfai", "assistant", "agents", "qa-gatekeeper.md");
      await writeFile(agent, "# ours\n", "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readFile(agent, "utf-8")).toBe("# ours\n");
    });
  });
});

describe("a retired line inside the block does not truncate it", () => {
  // #1168. Both block walks used to stop at the first line they did not recognise, and a line
  // an older release wrote — registered neither in the current block nor as legacy — sits
  // exactly there. This repository had one: `.qfai/output/*`, the legacy validate output dir,
  // three lines into the block.
  //
  // What follows is not a cosmetic duplicate. The freshness check reads the block it extracted,
  // so it found the governance negations "missing" and never took the early return; the strip
  // removed the same truncated prefix and left the rest; and the rebuilt block went back in
  // ABOVE the twenty lines nobody had removed. Git applies the LAST matching pattern, so the
  // re-appended negations sit above the ignores that cancel them and do nothing at all — a
  // block of inert lines added on every single run.
  const RETIRED_INSIDE_BLOCK = ".qfai/output/*";

  it("leaves a block carrying an unregistered line completely alone", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Put the retired line where an older release wrote it: inside the block, between two
      // lines the current writer still emits.
      const seeded = (await readGitignore(root))
        .split(NL)
        .flatMap((line) => (line === ".qfai/report/*" ? [line, RETIRED_INSIDE_BLOCK] : [line]))
        .join(NL);
      await writeFile(path.join(root, ".gitignore"), seeded, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const after = await readGitignore(root);

      expect(
        after,
        "the file must be untouched: every negation was already present and already last",
      ).toBe(seeded);
      expect(
        after.split(NL).filter((line) => line === RETIRED_INSIDE_BLOCK),
        "and the project's own retired line is kept, not stripped — age and intent cannot be " +
          "told apart from the file, so it is treated as the project's",
      ).toHaveLength(1);
    });
  });

  it("appends each governance negation exactly once, however often init runs", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const seeded = (await readGitignore(root))
        .split(NL)
        .flatMap((line) => (line === ".qfai/report/*" ? [line, RETIRED_INSIDE_BLOCK] : [line]))
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
      // Block 1 is stale — it carries a retired line, so the freshness check
      // fails and the file is rewritten — and it lacks `.qfai/state.json`.
      // Block 2 carries it.
      const stale = [
        ...block.filter((line) => line !== ".qfai/state.json"),
        ".qfai/discussion/discussion-*/",
      ];
      await writeFile(
        path.join(root, ".gitignore"),
        // A project line separates the two blocks. Without something unknown
        // between them the extractor runs straight through the blank line into
        // the second block and the bug does not appear.
        [...stale, "", "node_modules/", "", ...block, ""].join(NL),
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

describe("a legacy evidence negation must actually win", () => {
  it("re-appends a negation that a later ignore line overrides", async () => {
    // Git applies the last matching pattern, so a negation above a broad `*`
    // is inert — but `lines.includes` read it as satisfied and the migration
    // returned "already current". `git check-ignore -v` still named the `*`,
    // so the governance record stayed untracked with the file looking correct.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const legacy = path.join(root, ".qfai", "evidence", ".gitignore");
      await mkdir(path.dirname(legacy), { recursive: true });
      await writeFile(legacy, ["!decisions/", "!decisions/**", "*", ""].join(NL), "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const lines = (await readFile(legacy, "utf-8")).split(NL).filter((l) => l.length > 0);
      const lastStar = lines.lastIndexOf("*");
      const lastNegation = lines.lastIndexOf("!decisions/**");
      expect(lastNegation).toBeGreaterThan(lastStar);
    });
  });

  it("leaves a file whose negations already win untouched", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const legacy = path.join(root, ".qfai", "evidence", ".gitignore");
      await mkdir(path.dirname(legacy), { recursive: true });
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const migrated = await readFile(legacy, "utf-8").catch(() => null);
      if (migrated === null) return;

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      expect(await readFile(legacy, "utf-8")).toBe(migrated);
    });
  });
});

describe("a project rule after the managed block does not win", () => {
  it("re-appends the block when a later ignore line re-ignores the negations", async () => {
    // Git applies the last matching pattern, so `.qfai/evidence/*.md` appended
    // below the managed block re-ignores the Coverage Depth Matrix. The
    // freshness check read the block only, called the negations effective and
    // returned early — while `git check-ignore -v` named the project's line.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const before = await readGitignore(root);
      await writeFile(
        path.join(root, ".gitignore"),
        `${before}${NL}# project rules${NL}.qfai/evidence/*.md${NL}`,
        "utf-8",
      );

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const lines = (await readGitignore(root)).split(NL).map((l) => l.trimEnd());
      const projectRule = lines.lastIndexOf(".qfai/evidence/*.md");
      const negation = lines.lastIndexOf("!.qfai/evidence/coverage-depth-*.md");
      expect(projectRule).toBeGreaterThan(-1);
      expect(negation).toBeGreaterThan(projectRule);
      // The project's own rule is preserved, not deleted.
      expect(lines.filter((l) => l === ".qfai/evidence/*.md")).toHaveLength(1);
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
  /** A stale block — one governance negation short — plus a project negation below it. */
  const staleBlockWithNegationBelow = async (root: string): Promise<void> => {
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
    const stale = (await readGitignore(root))
      .split(NL)
      .filter((line) => line !== "!.qfai/review/.legacy-packs")
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
      expect(lines).toContain("!.qfai/review/.legacy-packs");
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
        `${conflicted.trimEnd()}${NL}.qfai/evidence/*.md${NL}`,
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
      expect(after.lastIndexOf("!.qfai/evidence/coverage-depth-*.md")).toBeGreaterThan(
        after.lastIndexOf(".qfai/evidence/*.md"),
      );
      // …and the negation that lost is reported, not swallowed.
      expect(lines.join("")).toContain("!.qfai/report/dashboard.md");
    });
  });
});

describe("a legacy evidence negation loses to a later glob too", () => {
  it("re-appends when a later *.md re-ignores the governance records", async () => {
    // The prefix comparison saw `*` and `.qfai/evidence/*`; it did not see
    // `*.md`, which matches `coverage-depth-*.md`, `decision-*.md` and
    // `change-request-*.md` exactly.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const legacy = path.join(root, ".qfai", "evidence", ".gitignore");
      await mkdir(path.dirname(legacy), { recursive: true });
      await writeFile(
        legacy,
        ["*", "!coverage-depth-*.md", "!decision-*.md", "*.md", ""].join(NL),
        "utf-8",
      );

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const lines = (await readFile(legacy, "utf-8")).split(NL).map((l) => l.trimEnd());
      const lastMd = lines.lastIndexOf("*.md");
      expect(lines.lastIndexOf("!coverage-depth-*.md")).toBeGreaterThan(lastMd);
      expect(lines.lastIndexOf("!decision-*.md")).toBeGreaterThan(lastMd);
    });
  });

  it("re-appends when a later canonical-name glob re-ignores per-item evidence", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const legacy = path.join(root, ".qfai", "evidence", ".gitignore");
      await mkdir(path.dirname(legacy), { recursive: true });
      await writeFile(
        legacy,
        ["*", "!implement-*.md", "!atdd-*.md", "implement-spec-*.md", "atdd-spec-*.md", ""].join(
          NL,
        ),
        "utf-8",
      );

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const lines = (await readFile(legacy, "utf-8")).split(NL).map((line) => line.trimEnd());
      expect(lines.lastIndexOf("!implement-*.md")).toBeGreaterThan(
        lines.lastIndexOf("implement-spec-*.md"),
      );
      expect(lines.lastIndexOf("!atdd-*.md")).toBeGreaterThan(lines.lastIndexOf("atdd-spec-*.md"));
    });
  });
});
