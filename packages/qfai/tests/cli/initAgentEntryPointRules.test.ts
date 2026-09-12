/**
 * A project that already had an `AGENTS.md` or a `CLAUDE.md` never learned
 * about the rules `qfai init` seeds.
 *
 * The root templates are copied create-only (`force: false`,
 * `conflictPolicy: "skip"`), so in that project the copy skipped both files and
 * wrote `.agents/rules/**` with nothing pointing at it. Codex loads `AGENTS.md`
 * and Claude Code loads `CLAUDE.md`; neither reads a directory it is never told
 * about, so the "where an agent may write" and "who decides a release version"
 * rules reached fresh projects only — not the repositories already running an
 * agent, which are the ones the rules exist for.
 *
 * `ensureAgentEntryPointRules` appends the managed section, lifted from the
 * shipped template, to a file it did not create. The pins below hold the two
 * ways that could over-correct: appending twice, and appending to a project
 * that had already wired the masters in by hand.
 */

import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import {
  AGENT_ENTRY_POINT_FILES,
  CROSS_AI_RULES_HEADING,
  addRuleCitations,
  addRuleCitationsToList,
  QFAI_AGENT_RULES_BEGIN,
  QFAI_AGENT_RULES_END,
  citedRuleMasters,
  extractManagedRulesSection,
} from "../../src/core/agentEntryPoints.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-agent-entry-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const readTemplate = (name: string): Promise<string> =>
  readFile(path.join(getInitAssetsDir(), "root", name), "utf-8");

const readEntryPoint = (root: string, name: string): Promise<string> =>
  readFile(path.join(root, name), "utf-8");

const PROJECT_TEXT = [
  "# Our house rules",
  "",
  "Run `pnpm verify` before pushing. Ask before touching `infra/`.",
  "",
].join("\n");

const occurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

/** `runInit` with the diagnostics it wrote to stderr. */
async function initCapturingStderr(root: string): Promise<string> {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  });
  try {
    await runInit({ dir: root, force: false, dryRun: false, yes: true });
  } finally {
    spy.mockRestore();
  }
  return chunks.join("");
}

describe("qfai init connects a pre-existing agent entry point to the rule masters", () => {
  it("appends the managed section to an AGENTS.md / CLAUDE.md it did not create", async () => {
    await withProject(async (root) => {
      for (const name of AGENT_ENTRY_POINT_FILES) {
        await writeFile(path.join(root, name), PROJECT_TEXT, "utf-8");
      }

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      for (const name of AGENT_ENTRY_POINT_FILES) {
        const after = await readEntryPoint(root, name);
        // The project's own instructions are still there, first.
        expect(after.startsWith(PROJECT_TEXT.trimEnd()), `${name} lost its content`).toBe(true);
        expect(after).toContain(QFAI_AGENT_RULES_BEGIN);
        expect(after).toContain(QFAI_AGENT_RULES_END);

        // Every master the template's section names is cited AND resolves, so
        // the agent that loads this file can actually read the rules.
        const expected = citedRuleMasters(
          extractManagedRulesSection(await readTemplate(name)) ?? "",
        );
        expect(expected.length).toBeGreaterThan(0);
        for (const master of expected) {
          expect(after, `${name} does not cite ${master}`).toContain(master);
          const stats = await stat(path.join(root, ...master.split("/"))).catch(() => null);
          expect(stats?.isFile(), `${name} cites ${master}, which does not exist`).toBe(true);
        }
      }
    });
  });

  it("pin: a second init does not append the section again", async () => {
    await withProject(async (root) => {
      await writeFile(path.join(root, "AGENTS.md"), PROJECT_TEXT, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const afterFirst = await readEntryPoint(root, "AGENTS.md");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const afterSecond = await readEntryPoint(root, "AGENTS.md");

      expect(afterSecond).toBe(afterFirst);
      expect(occurrences(afterSecond, QFAI_AGENT_RULES_BEGIN)).toBe(1);
    });
  });

  it("pin: a fresh project gets the template's single section, not a second copy", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      for (const name of AGENT_ENTRY_POINT_FILES) {
        const written = await readEntryPoint(root, name);
        expect(written).toBe(await readTemplate(name));
        expect(occurrences(written, QFAI_AGENT_RULES_BEGIN)).toBe(1);
      }
    });
  });

  it("pin: a file that already cites every master by hand is left untouched", async () => {
    await withProject(async (root) => {
      const masters = citedRuleMasters(
        extractManagedRulesSection(await readTemplate("CLAUDE.md")) ?? "",
      );
      const handWired = [
        "# Claude Code",
        "",
        "Read these before acting:",
        "",
        ...masters.map((master) => `- \`${master}\``),
        "",
      ].join("\n");
      await writeFile(path.join(root, "CLAUDE.md"), handWired, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // No markers bolted on, no duplicated bullets: the rules already reach
      // the agent, and init has no better wording to impose.
      expect(await readEntryPoint(root, "CLAUDE.md")).toBe(handWired);
    });
  });

  it("pin: --dry-run writes nothing", async () => {
    await withProject(async (root) => {
      await writeFile(path.join(root, "AGENTS.md"), PROJECT_TEXT, "utf-8");

      await runInit({ dir: root, force: false, dryRun: true, yes: true });

      expect(await readEntryPoint(root, "AGENTS.md")).toBe(PROJECT_TEXT);
    });
  });
});

describe("shipped entry-point templates carry the section the writer appends", () => {
  // The writer lifts the block out of the template instead of composing it, so
  // a template that lost its markers would silently stop connecting anything.
  it.each([...AGENT_ENTRY_POINT_FILES])("%s has one complete marker pair", async (name) => {
    const template = await readTemplate(name);
    expect(occurrences(template, QFAI_AGENT_RULES_BEGIN)).toBe(1);
    expect(occurrences(template, QFAI_AGENT_RULES_END)).toBe(1);

    const section = extractManagedRulesSection(template);
    expect(section, `${name} has no extractable managed section`).not.toBeNull();
    expect(section).toContain("## Cross-AI rules (master)");
  });

  it.each([...AGENT_ENTRY_POINT_FILES])(
    "%s cites every rule master shipped under assets/init/root/.agents/rules/",
    async (name) => {
      const cited = new Set(
        citedRuleMasters(extractManagedRulesSection(await readTemplate(name)) ?? ""),
      );
      const rulesDir = path.join(getInitAssetsDir(), "root", ".agents", "rules");
      const shipped = (await readdir(rulesDir)).filter((entry) => entry.endsWith(".md")).sort();
      expect(shipped.length).toBeGreaterThan(0);
      for (const master of shipped) {
        expect(cited, `${name} does not cite .agents/rules/${master}`).toContain(
          `.agents/rules/${master}`,
        );
      }
    },
  );
});

/**
 * A rule shipped after the section was written.
 *
 * The section is written once and then left alone, which is what keeps a bullet
 * the project deleted deleted. New masters still arrive, so a project that reran
 * `init` got the file on disk and no bullet citing it — the rule shipped and no
 * entry point named it, which means no agent loaded it.
 *
 * What separates the two reasons a bullet can be absent is the copy's own
 * report: a master it wrote this run did not exist here before, so no section
 * can have cited it. One the project deleted has its file on disk already, the
 * copy skips it, and nothing is restored.
 */
describe("a later init cites a rule master it is shipping for the first time", () => {
  /** The project as an earlier release left it: the section, minus one rule. */
  async function seedWithout(root: string, master: string): Promise<void> {
    await writeFile(path.join(root, "AGENTS.md"), PROJECT_TEXT, "utf-8");
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const after = await readEntryPoint(root, "AGENTS.md");
    const withoutBullet = after
      .split("\n")
      .filter((line) => !(line.startsWith("- ") && line.includes(master)))
      .join("\n");
    await writeFile(path.join(root, "AGENTS.md"), withoutBullet, "utf-8");
    await rm(path.join(root, ...master.split("/")), { force: true });
  }

  it("adds the bullet for a master the run wrote, and nothing else", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await seedWithout(root, master);
      const before = await readEntryPoint(root, "AGENTS.md");
      expect(before, "the seed still cites the master").not.toContain(master);

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = await readEntryPoint(root, "AGENTS.md");
      expect(after, "the newly shipped master is not cited").toContain(master);
      // One section, one heading, and the project's own text where it was.
      expect(occurrences(after, QFAI_AGENT_RULES_BEGIN)).toBe(1);
      expect(after.startsWith(PROJECT_TEXT.trimEnd())).toBe(true);
      // The bullet is the template's, not one composed here.
      const templateBullet = (extractManagedRulesSection(await readTemplate("AGENTS.md")) ?? "")
        .split("\n")
        .find((line) => line.startsWith("- ") && line.includes(master));
      expect(templateBullet).toBeDefined();
      expect(after).toContain(templateBullet ?? "");
      // Nothing else moved: the only added lines are that bullet.
      const added = after.split("\n").filter((line) => !before.split("\n").includes(line));
      expect(added).toEqual([templateBullet]);
    });
  });

  it("leaves a bullet the project deleted deleted", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/temporary-files.md";
      await writeFile(path.join(root, "AGENTS.md"), PROJECT_TEXT, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Deleted on purpose: the file stays on disk, so the copy skips it and
      // the run has no reason to think the rule is new here.
      const trimmed = (await readEntryPoint(root, "AGENTS.md"))
        .split("\n")
        .filter((line) => !(line.startsWith("- ") && line.includes(master)))
        .join("\n");
      await writeFile(path.join(root, "AGENTS.md"), trimmed, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readEntryPoint(root, "AGENTS.md")).toBe(trimmed);
    });
  });

  it("keeps what the project wrote inside the section", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await seedWithout(root, master);
      const note = "Our team reads these before every review.";
      const withNote = (await readEntryPoint(root, "AGENTS.md")).replace(
        QFAI_AGENT_RULES_END,
        `${note}\n\n${QFAI_AGENT_RULES_END}`,
      );
      await writeFile(path.join(root, "AGENTS.md"), withNote, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = await readEntryPoint(root, "AGENTS.md");
      expect(after).toContain(note);
      expect(after).toContain(master);
      // The bullet goes above the closing prose, not into it.
      expect(after.indexOf(master)).toBeLessThan(after.indexOf(note));
    });
  });
});

/**
 * The update path revisits a file the project owns, so it carries the create-only
 * copy's protections and two the copy never needed.
 */
describe("the update path refuses a rewrite it cannot make safely", () => {
  it("leaves a symlinked entry point alone and says why", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await writeFile(path.join(root, "AGENTS.md"), PROJECT_TEXT, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The project's file moves aside and the entry point becomes a link to
      // it, as a repository sharing one instruction file would have.
      const shared = path.join(root, "shared-instructions.md");
      const written = (await readEntryPoint(root, "AGENTS.md"))
        .split("\n")
        .filter((line) => !(line.startsWith("- ") && line.includes(master)))
        .join("\n");
      await writeFile(shared, written, "utf-8");
      await rm(path.join(root, "AGENTS.md"));
      await rm(path.join(root, ...master.split("/")), { force: true });
      try {
        await symlink(shared, path.join(root, "AGENTS.md"));
      } catch {
        // A host without symlink permission cannot exercise this case.
        return;
      }

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The link's target is untouched, so the shared file did not gain a
      // citation this project asked for.
      expect(await readFile(shared, "utf-8")).toBe(written);
    });
  });

  it("leaves a file whose bytes are not UTF-8 unchanged", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await writeFile(path.join(root, "AGENTS.md"), PROJECT_TEXT, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const written = (await readEntryPoint(root, "AGENTS.md"))
        .split("\n")
        .filter((line) => !(line.startsWith("- ") && line.includes(master)))
        .join("\n");
      // A legacy-encoded byte in the project's own prose. Decoded as UTF-8 it
      // becomes U+FFFD, and writing that back would corrupt the line.
      const bytes = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(written, "utf-8")]);
      await writeFile(path.join(root, "AGENTS.md"), bytes);
      await rm(path.join(root, ...master.split("/")), { force: true });

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readFile(path.join(root, "AGENTS.md"))).toEqual(bytes);
    });
  });
});

describe("a section with no rule bullet left still gains the new citation", () => {
  it("adds the bullets as their own block inside the markers", () => {
    // Every bullet deleted, markers kept. Without a fallback insertion point the
    // pending bullets are discarded and the rule stays uncited for good.
    const section = [
      QFAI_AGENT_RULES_BEGIN,
      "",
      "## Cross-AI rules (master)",
      "",
      "We keep our own summary here instead.",
      "",
      QFAI_AGENT_RULES_END,
      "",
    ].join("\n");
    const template = [
      QFAI_AGENT_RULES_BEGIN,
      "",
      "- `.agents/rules/grilling.md` — interview the decision tree.",
      "",
      QFAI_AGENT_RULES_END,
    ].join("\n");

    const merged = addRuleCitations(section, template, [".agents/rules/grilling.md"]);

    expect(merged).toContain("- `.agents/rules/grilling.md` — interview the decision tree.");
    expect(merged).toContain("We keep our own summary here instead.");
    // Inside the markers, and the section still closes with its end marker.
    expect(merged.indexOf(".agents/rules/grilling.md")).toBeLessThan(
      merged.indexOf(QFAI_AGENT_RULES_END),
    );
    expect(occurrences(merged, QFAI_AGENT_RULES_BEGIN)).toBe(1);
    expect(occurrences(merged, QFAI_AGENT_RULES_END)).toBe(1);
  });
});

describe("the third agent's instruction file gains the citation too", () => {
  it("cites a newly shipped master in an existing copilot-instructions.md", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The project as an earlier release left it: the file exists, so the
      // wrapper sync skips it, and the bullet for a later rule is missing.
      const copilot = path.join(root, ".github", "copilot-instructions.md");
      const trimmed = (await readFile(copilot, "utf-8"))
        .split("\n")
        .filter((line) => !(line.startsWith("- ") && line.includes(master)))
        .join("\n");
      await writeFile(copilot, trimmed, "utf-8");
      await rm(path.join(root, ...master.split("/")), { force: true });

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = await readFile(copilot, "utf-8");
      expect(after, "the newly shipped master is not cited").toContain(master);
      // Only that line was added.
      const added = after.split("\n").filter((line) => !trimmed.split("\n").includes(line));
      expect(added).toHaveLength(1);
    });
  });
});

describe("a section written with CRLF keeps its line endings", () => {
  it("renders the inserted bullet with the newline the file uses", () => {
    const template = [
      QFAI_AGENT_RULES_BEGIN,
      "",
      "- `.agents/rules/grilling.md` — interview the decision tree.",
      "",
      QFAI_AGENT_RULES_END,
    ].join("\n");
    const existing = [
      QFAI_AGENT_RULES_BEGIN,
      "",
      "- `.agents/rules/temporary-files.md` — scratch goes under `tmp/`.",
      "",
      QFAI_AGENT_RULES_END,
      "",
    ].join("\r\n");

    const merged = addRuleCitations(existing, template, [".agents/rules/grilling.md"]);

    expect(merged).toContain(".agents/rules/grilling.md");
    // Mixed endings are what a formatter rewrites the whole file over, turning a
    // one-line change into a diff nobody asked for.
    expect(merged.split("\n").filter((line) => !line.endsWith("\r"))).toHaveLength(1);
  });
});

describe("the update refuses a write it cannot make safely", () => {
  it("refuses a linked parent directory, not only a linked file", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // `.github` becomes a link to a directory outside the project, with an
      // ordinary file inside it — which `lstat` on the file reports as regular.
      const outside = path.join(root, "..", `qfai-outside-${path.basename(root)}`);
      await mkdir(outside, { recursive: true });
      const copilot = path.join(root, ".github", "copilot-instructions.md");
      const trimmed = (await readFile(copilot, "utf-8"))
        .split("\n")
        .filter((line) => !(line.startsWith("- ") && line.includes(master)))
        .join("\n");
      await writeFile(path.join(outside, "copilot-instructions.md"), trimmed, "utf-8");
      await rm(path.join(root, ".github"), { recursive: true, force: true });
      try {
        await symlink(outside, path.join(root, ".github"), "dir");
      } catch {
        await rm(outside, { recursive: true, force: true });
        return;
      }
      await rm(path.join(root, ...master.split("/")), { force: true });

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The file behind the linked parent is untouched.
      expect(await readFile(path.join(outside, "copilot-instructions.md"), "utf-8")).toBe(trimmed);
      await rm(outside, { recursive: true, force: true });
    });
  });
});

describe("an emptied Copilot rule list still gains the citation", () => {
  it("puts the bullets under the heading when no bullet is left", () => {
    const template = [
      QFAI_AGENT_RULES_BEGIN,
      "",
      "- `.agents/rules/grilling.md` — interview the decision tree.",
      "",
      QFAI_AGENT_RULES_END,
    ].join("\n");
    const existing = [
      "# QFAI repository instructions (Copilot)",
      "",
      CROSS_AI_RULES_HEADING,
      "",
      "We keep our own summary here instead.",
      "",
    ].join("\n");

    const merged = addRuleCitationsToList(existing, template, [".agents/rules/grilling.md"]);

    expect(merged).toContain("- `.agents/rules/grilling.md` — interview the decision tree.");
    expect(merged).toContain("We keep our own summary here instead.");
    // Under the heading, which is the one place a reader reads as the list.
    expect(merged.indexOf(CROSS_AI_RULES_HEADING)).toBeLessThan(
      merged.indexOf(".agents/rules/grilling.md"),
    );
  });
});

describe("a managed section that was never closed is reported", () => {
  it("names the missing marker instead of skipping in silence", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await writeFile(path.join(root, "AGENTS.md"), PROJECT_TEXT, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The end marker lost to a hand edit. The file still reads as connected,
      // so nothing appends the section, and there is no region to insert into.
      const broken = (await readEntryPoint(root, "AGENTS.md"))
        .split("\n")
        .filter((line) => line !== QFAI_AGENT_RULES_END)
        .filter((line) => !(line.startsWith("- ") && line.includes(master)))
        .join("\n");
      await writeFile(path.join(root, "AGENTS.md"), broken, "utf-8");
      await rm(path.join(root, ...master.split("/")), { force: true });

      const stderr = await initCapturingStderr(root);

      expect(await readEntryPoint(root, "AGENTS.md")).toBe(broken);
      expect(stderr).toContain("never closes it");
      expect(stderr).toContain(QFAI_AGENT_RULES_END);
    });
  });
});

describe("an entry point wired in by hand keeps the list it has", () => {
  it("adds the uncited master's bullet without restating the others", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await writeFile(path.join(root, "AGENTS.md"), PROJECT_TEXT, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // A file as a project that never used the markers would keep it: its own
      // prose, its own list, every master but one cited exactly once.
      const section = extractManagedRulesSection(await readTemplate("AGENTS.md"));
      expect(section).not.toBeNull();
      const others = citedRuleMasters(section ?? "").filter((cited) => cited !== master);
      const handWired = [
        PROJECT_TEXT,
        "## The rules we load",
        "",
        ...others.map((cited) => "- `" + cited + "` — read this one."),
        "",
      ].join("\n");
      await writeFile(path.join(root, "AGENTS.md"), handWired, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = await readEntryPoint(root, "AGENTS.md");
      expect(after, "the uncited master never arrived").toContain(master);
      // The section is not appended on top of the list the project keeps, so
      // nothing it already cited is said twice.
      expect(after).not.toContain(QFAI_AGENT_RULES_BEGIN);
      for (const cited of others) expect(occurrences(after, cited)).toBe(1);
      expect(after).toContain("Ask before touching");
    });
  });
});

describe("the append path refuses what the update path refuses", () => {
  it("does not append through a symbolic link", async () => {
    await withProject(async (root) => {
      // A repository sharing one instruction file with another checkout. The
      // file cites no rule, so the append path is the one that reaches it.
      const shared = path.join(root, "shared-instructions.md");
      await writeFile(shared, PROJECT_TEXT, "utf-8");
      try {
        await symlink(shared, path.join(root, "AGENTS.md"));
      } catch {
        // A host without symlink permission cannot exercise this case.
        return;
      }

      const stderr = await initCapturingStderr(root);

      expect(await readFile(shared, "utf-8")).toBe(PROJECT_TEXT);
      expect(stderr).toContain("symbolic link");
    });
  });
});

describe("staging an interrupted run left behind is reclaimed", () => {
  it("removes the writer's own name shape and nothing else", async () => {
    await withProject(async (root) => {
      // What a kill between the write and the rename leaves: a full copy of the
      // project's instructions, untracked, in the repository root.
      const abandoned = path.join(root, ".qfai-entry-6f1d4b4e-0c2a-4f1e-9b0d-2a7c5e8f1a33.tmp");
      const unrelated = path.join(root, "notes.tmp");
      await writeFile(abandoned, PROJECT_TEXT, "utf-8");
      await writeFile(unrelated, PROJECT_TEXT, "utf-8");
      // Sat still long enough that no run is using it.
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await utimes(abandoned, yesterday, yesterday);

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readdir(root)).not.toContain(path.basename(abandoned));
      expect(await readFile(unrelated, "utf-8")).toBe(PROJECT_TEXT);
    });
  });
});

describe("a hand-wired file this run cannot extend is named", () => {
  it("says which masters to add when the citations are not a bullet list", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await writeFile(path.join(root, "AGENTS.md"), PROJECT_TEXT, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Cited in prose, which is not a list a bullet can be added to. Appending
      // the whole section instead would restate every citation the file has.
      const section = extractManagedRulesSection(await readTemplate("AGENTS.md"));
      const others = citedRuleMasters(section ?? "").filter((cited) => cited !== master);
      const prose = [PROJECT_TEXT, "We read " + others.join(", ") + " on every change.", ""].join(
        "\n",
      );
      await writeFile(path.join(root, "AGENTS.md"), prose, "utf-8");

      const stderr = await initCapturingStderr(root);

      expect(await readEntryPoint(root, "AGENTS.md")).toBe(prose);
      expect(stderr).toContain("not as a bullet list this run can add a line to");
      expect(stderr).toContain(master);
    });
  });
});

describe("the staged write keeps the file's own permissions", () => {
  it("restores the target's mode rather than the process default", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await writeFile(path.join(root, "AGENTS.md"), PROJECT_TEXT, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const target = path.join(root, "AGENTS.md");
      const trimmed = (await readEntryPoint(root, "AGENTS.md"))
        .split("\n")
        .filter((line) => !(line.startsWith("- ") && line.includes(master)))
        .join("\n");
      await writeFile(target, trimmed, "utf-8");
      await rm(path.join(root, ...master.split("/")), { force: true });
      await chmod(target, 0o600);
      const before = (await stat(target)).mode & 0o7777;

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(await readEntryPoint(root, "AGENTS.md")).toContain(master);
      // A file the project had kept to itself is not published by the rewrite.
      expect((await stat(target)).mode & 0o7777).toBe(before);
    });
  });
});

describe("what the reclaim refuses to remove", () => {
  it("leaves a name the writer could not have produced, and a fresh one", async () => {
    await withProject(async (root) => {
      const hour = 60 * 60 * 1000;
      // Right shape, sat still for a day: abandoned.
      const stale = path.join(root, ".qfai-entry-6f1d4b4e-0c2a-4f1e-9b0d-2a7c5e8f1a33.tmp");
      // Right shape, written a moment ago: another init is using it.
      const fresh = path.join(root, ".qfai-entry-0b2c9d1e-7a3f-4c5b-8e6d-1f2a3b4c5d6e.tmp");
      // Wrong shape. The dots are literal and the layout is the one
      // `randomUUID` writes, so neither of these is the writer's.
      const notOurs = [
        path.join(root, "xqfai-entry-6f1d4b4e-0c2a-4f1e-9b0d-2a7c5e8f1a33Ytmp"),
        path.join(root, ".qfai-entry-6f1d4b4e0c2a4f1e9b0d2a7c5e8f1a33----.tmp"),
      ];
      for (const file of [stale, fresh, ...notOurs]) {
        await writeFile(file, PROJECT_TEXT, "utf-8");
      }
      const old = new Date(Date.now() - 24 * hour);
      await utimes(stale, old, old);

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const left = await readdir(root);
      expect(left).not.toContain(path.basename(stale));
      expect(left).toContain(path.basename(fresh));
      for (const file of notOurs) expect(left).toContain(path.basename(file));
    });
  });
});

describe("a citation inside a fence is an example, not a citation", () => {
  it("appends the section rather than writing bullets into the code block", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await writeFile(path.join(root, "AGENTS.md"), PROJECT_TEXT, "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // A project whose own file shows what a rule bullet looks like. Read as a
      // rule list, the new bullets are spliced inside the fence, where they
      // stay examples while the run reports having cited them.
      const section = extractManagedRulesSection(await readTemplate("AGENTS.md"));
      const others = citedRuleMasters(section ?? "").filter((cited) => cited !== master);
      const fenced = [
        PROJECT_TEXT,
        "Write the rule list like this:",
        "",
        "```markdown",
        ...others.map((cited) => "- `" + cited + "` — what it covers."),
        "```",
        "",
      ].join("\n");
      await writeFile(path.join(root, "AGENTS.md"), fenced, "utf-8");

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = await readEntryPoint(root, "AGENTS.md");
      // Nothing was written into the block, and the file gained the section it
      // never had: the examples cited nothing a reader would follow.
      expect(after).toContain(QFAI_AGENT_RULES_BEGIN);
      const fence = after.split("```markdown")[1]?.split("```")[0] ?? "";
      expect(fence.split("\n").filter((line) => line.startsWith("- "))).toHaveLength(others.length);
    });
  });
});
