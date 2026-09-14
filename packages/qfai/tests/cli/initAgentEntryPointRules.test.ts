/** Init adds canonical guidance without replacing project text or deleted rule citations. */

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
  addReviewPointer,
  QFAI_AGENT_RULES_BEGIN,
  QFAI_AGENT_RULES_END,
  citedRuleMasters,
  citedRuleMastersOutsideCode,
  extractManagedRulesSection,
  hasUnclosedRulesSection,
  needsManagedRulesSection,
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

const REVIEW_POINTER =
  "Read `REVIEW.md` before reviewing a pull request when that file exists in this repository. Read it before writing the PR description as well.";

const withoutAddedReviewPointer = (text: string): string =>
  text.replace(`${REVIEW_POINTER}\n\n`, "");

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
  it("installs optional review policy into existing entry points", async () => {
    const pointer =
      "Read `REVIEW.md` before reviewing a pull request when that file exists in this repository. Read it before writing the PR description as well.";
    for (const force of [false, true]) {
      await withProject(async (root) => {
        const project = "# Project rules\r\n\r\nKeep every original byte.\r\n";
        for (const name of AGENT_ENTRY_POINT_FILES) {
          await writeFile(path.join(root, name), project, "utf-8");
        }
        await runInit({ dir: root, force, dryRun: false, yes: true });
        for (const name of AGENT_ENTRY_POINT_FILES) {
          const first = await readEntryPoint(root, name);
          expect(first).toContain(pointer);
          expect(occurrences(first, pointer)).toBe(1);
          expect(first).toContain(project);
        }
        const first = await Promise.all(
          AGENT_ENTRY_POINT_FILES.map((name) => readEntryPoint(root, name)),
        );
        await runInit({ dir: root, force, dryRun: false, yes: true });
        const second = await Promise.all(
          AGENT_ENTRY_POINT_FILES.map((name) => readEntryPoint(root, name)),
        );
        expect(second).toEqual(first);
        await expect(stat(path.join(root, "REVIEW.md"))).rejects.toMatchObject({ code: "ENOENT" });
      });
    }
  });

  it("keeps optional repository review policy in fresh and forced reviewer output", async () => {
    await withProject(async (root) => {
      const pointer =
        "Read `REVIEW.md` before reviewing a pull request when that file exists in this repository.";
      const pointerFor = (name: string): string =>
        name === ".github/instructions/code-review.instructions.md"
          ? "Read `REVIEW.md` if present."
          : pointer;
      const files = [
        "AGENTS.md",
        "CLAUDE.md",
        ".github/copilot-instructions.md",
        ".github/instructions/code-review.instructions.md",
      ];
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      for (const name of files) {
        expect(await readEntryPoint(root, name)).toContain(pointerFor(name));
        const text = await readEntryPoint(root, name);
        if (name === ".github/instructions/code-review.instructions.md") {
          expect(text).toContain(`Process:\n\n${pointerFor(name)}\n\n1. Read the PR description`);
        }
        const next = AGENT_ENTRY_POINT_FILES.some((entry) => entry === name)
          ? text + PROJECT_TEXT
          : text.replace(pointerFor(name), "");
        await writeFile(path.join(root, name), next, "utf-8");
      }
      await runInit({ dir: root, force: true, dryRun: false, yes: true });
      for (const name of files) {
        const text = await readEntryPoint(root, name);
        expect(text).toContain(pointerFor(name));
        if (name === ".github/instructions/code-review.instructions.md") {
          expect(text).toContain(`Process:\n\n${pointerFor(name)}\n\n1. Read the PR description`);
        }
        if (AGENT_ENTRY_POINT_FILES.some((entry) => entry === name)) {
          expect(text.endsWith(PROJECT_TEXT)).toBe(true);
        }
      }
      await expect(stat(path.join(root, "REVIEW.md"))).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("appends the managed section to an AGENTS.md / CLAUDE.md it did not create", async () => {
    await withProject(async (root) => {
      for (const name of AGENT_ENTRY_POINT_FILES) {
        await writeFile(path.join(root, name), PROJECT_TEXT, "utf-8");
      }

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      for (const name of AGENT_ENTRY_POINT_FILES) {
        const after = await readEntryPoint(root, name);
        expect(
          withoutAddedReviewPointer(after).startsWith(PROJECT_TEXT.trimEnd()),
          `${name} lost its content`,
        ).toBe(true);
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

  it("keeps manual rule wiring when adding review guidance", async () => {
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

      expect(await readEntryPoint(root, "CLAUDE.md")).toBe(`${REVIEW_POINTER}\n\n${handWired}`);
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
      expect(withoutAddedReviewPointer(after).startsWith(PROJECT_TEXT.trimEnd())).toBe(true);
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

      expect(await readEntryPoint(root, "AGENTS.md")).toBe(`${REVIEW_POINTER}\n\n${prose}`);
      expect(stderr).toContain("not as a bullet list this run can add a line to");
      expect(stderr).toContain(master);
    });
  });
});

describe("optional review directive detection", () => {
  it.each(["\n", "\r\n"])(
    "link-reference boundary: adds guidance outside image labels with %j",
    (end) => {
      for (const image of [
        `![${end}${REVIEW_POINTER}${end}](/image.png)`,
        `![${end}${REVIEW_POINTER}${end}][image]${end}${end}[image]: /image.png`,
        `![${end}${REVIEW_POINTER}${end}][]${end}${end}[${end}${REVIEW_POINTER}${end}]: /image.png`,
        `![${end}${REVIEW_POINTER}${end}]${end}${end}[${end}${REVIEW_POINTER}${end}]: /image.png`,
      ]) {
        const existing = `\uFEFF${image}${end}`;
        const updated = addReviewPointer(existing, `${REVIEW_POINTER}\n`);
        expect(updated).toBe(`\uFEFF${REVIEW_POINTER}${end}${end}${existing.slice(1)}`);
        expect(addReviewPointer(updated, `${REVIEW_POINTER}\n`)).toBe(updated);
      }
    },
  );

  it.each(["\n", "\r\n"])(
    "link-reference boundary: adds guidance outside reference definitions with %j",
    (end) => {
      for (const definition of [
        `[example]: /url "${end}${REVIEW_POINTER}${end}"`,
        `[example]: /url '${end}${REVIEW_POINTER}${end}'`,
        `[example]: /url (${end}${REVIEW_POINTER}${end})`,
        `[${end}${REVIEW_POINTER}${end}]: /url`,
      ]) {
        const existing = `\uFEFF${definition}${end}`;
        const updated = addReviewPointer(existing, `${REVIEW_POINTER}\n`);
        expect(updated).toBe(`\uFEFF${REVIEW_POINTER}${end}${end}${existing.slice(1)}`);
        expect(addReviewPointer(updated, `${REVIEW_POINTER}\n`)).toBe(updated);
      }
    },
  );

  it.each(["\n", "\r\n"])(
    "link-reference boundary: retains ordinary and unresolved label text with %j",
    (end) => {
      for (const source of [
        `[${end}${REVIEW_POINTER}${end}](/url)`,
        `\\![${end}${REVIEW_POINTER}${end}](/url)`,
        `![${end}${REVIEW_POINTER}${end}][missing]`,
        `Paragraph text${end}[example]: /url "${end}${REVIEW_POINTER}${end}"`,
        `[example]: /url "${end}${REVIEW_POINTER}${end}## Live heading${end}"`,
      ]) {
        const existing = `\uFEFF${source}${end}`;
        expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(existing);
      }
    },
  );

  it("link-reference boundary: does not copy the remaining tail for unmatched inline links", () => {
    const existing = `${"[ \n".repeat(6400)}\n${REVIEW_POINTER}\n`;
    const originalSlice = String.prototype.slice;
    let copiedTail = 0;
    const spy = vi.spyOn(String.prototype, "slice").mockImplementation(function (
      this: string,
      start?: number,
      end?: number,
    ) {
      const result = originalSlice.call(this, start, end);
      if (this === existing) copiedTail += result.length;
      return result;
    });
    let updated: string;
    try {
      updated = addReviewPointer(existing, `${REVIEW_POINTER}\n`);
    } finally {
      spy.mockRestore();
    }
    expect(updated).toBe(existing);
    expect(copiedTail).toBeLessThanOrEqual(existing.length * 4);
  });

  it.each(["\n", "\r\n"])(
    "adds guidance outside lowercase CDATA-like attribute text with %j",
    (end) => {
      const existing = `\uFEFF<span title="${end}<![cdata[${end}${REVIEW_POINTER}${end}">Example</span>${end}`;
      const updated = addReviewPointer(existing, `${REVIEW_POINTER}\n`);
      expect(updated).toBe(`\uFEFF${REVIEW_POINTER}${end}${end}${existing.slice(1)}`);
      expect(addReviewPointer(updated, `${REVIEW_POINTER}\n`)).toBe(updated);
    },
  );

  it.each(["\n", "\r\n"])("retains live guidance after a tag-like ATX heading with %j", (end) => {
    const existing = `\uFEFF# <span title="${end}${REVIEW_POINTER}${end}">Example</span>${end}`;
    expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(existing);
  });

  it.each(["\n", "\r\n"])("keeps reference-definition continuations quoted with %j", (end) => {
    const existing = `> [example]: /url${end}${REVIEW_POINTER}${end}`;
    expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(
      `${REVIEW_POINTER}${end}${end}${existing}`,
    );
    const live = `> [example]: /url${end}${end}${REVIEW_POINTER}${end}`;
    expect(addReviewPointer(live, `${REVIEW_POINTER}\n`)).toBe(live);
  });

  it("does not copy the remaining tail for every malformed multiline tag", () => {
    const existing = `${'<span a="\n'.repeat(6400)}\n${REVIEW_POINTER}\n`;
    const originalSlice = String.prototype.slice;
    let copiedTail = 0;
    const spy = vi.spyOn(String.prototype, "slice").mockImplementation(function (
      this: string,
      start?: number,
      end?: number,
    ) {
      const result = originalSlice.call(this, start, end);
      if (this === existing) copiedTail += result.length;
      return result;
    });
    let updated: string;
    try {
      updated = addReviewPointer(existing, `${REVIEW_POINTER}\n`);
    } finally {
      spy.mockRestore();
    }
    expect(updated).toBe(existing);
    expect(copiedTail).toBeLessThanOrEqual(existing.length * 4);
  });

  it.each(
    (
      [
        ["lazy quote", `> Quoted example\n${REVIEW_POINTER}\n`],
        ["nested lazy quote", `> > Quoted example\n${REVIEW_POINTER}\n`],
        ["lazy quoted list", `> - Quoted example\n${REVIEW_POINTER}\n`],
        ["indented lazy quote", `> Quoted example\n    ${REVIEW_POINTER}\n`],
        ["double-quoted tag", `<span\ntitle="\n${REVIEW_POINTER}\n">Example</span>\n`],
        ["single-quoted tag", `<span\ntitle='\n${REVIEW_POINTER}\n'>Example</span>\n`],
        [
          "inline double-quoted tag",
          `Paragraph <span title="\n${REVIEW_POINTER}\n">Example</span>\n`,
        ],
        [
          "inline single-quoted tag",
          `Paragraph <span title='\n${REVIEW_POINTER}\n'>Example</span>\n`,
        ],
      ] as const
    ).flatMap(([name, example]) =>
      ["\n", "\r\n"].map((end) => [name, example.replace(/\n/g, end), end] as const),
    ),
  )("adds guidance outside a lazy quote or multiline HTML tag %s / %j", (_name, example, end) => {
    const existing = `\uFEFF# Project rules${end}${end}${example}`;
    const updated = addReviewPointer(existing, `${REVIEW_POINTER}\n`);
    expect(updated).toBe(`\uFEFF${REVIEW_POINTER}${end}${end}${existing.slice(1)}`);
    expect(addReviewPointer(updated, `${REVIEW_POINTER}\n`)).toBe(updated);
  });

  it.each([
    ["blank quote boundary", "> Quoted example\n\n", ""],
    ["quoted blank boundary", "> Quoted example\n>\n", ""],
    ["quoted heading", "> # Quoted heading\n", ""],
    ["quoted indented code", ">     Example only.\n", ""],
    ["quoted list code", "> -     Example only.\n", ""],
    ["quoted fence", "> ~~~\n> Example only.\n> ~~~\n", ""],
    ["quoted literal HTML", "> <pre>\n> Example only.\n> </pre>\n", ""],
    ["escaped multiline tag", '\\<span\ntitle="\n', '">Example</span>\n'],
    ["interrupted multiline tag", '<span title="\n# Live heading\n', '">Example</span>\n'],
  ])("retains live guidance after a quote or tag boundary %s", (_name, prefix, suffix) => {
    const existing = `${prefix}${REVIEW_POINTER}\n${suffix}`;
    expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(existing);
  });

  it.each(
    ["pre", "div", "span"].flatMap((tag) =>
      ["-", "10.", "   -"].map((marker) => [tag, marker] as const),
    ),
  )("adds guidance outside list HTML %s / %s", (tag, marker) => {
    const indent = " ".repeat(marker.length + 1);
    const existing = `# Project rules\n\n${marker} <${tag}>\n${indent}${REVIEW_POINTER}\n${indent}</${tag}>\n\nKeep every byte.\n`;
    const updated = addReviewPointer(existing, `${REVIEW_POINTER}\n`);
    expect(updated).toBe(`${REVIEW_POINTER}\n\n${existing}`);
    expect(addReviewPointer(updated, `${REVIEW_POINTER}\n`)).toBe(updated);
  });

  it.each(['"', "'", "("])("adds guidance outside a multiline link title %s", (delimiter) => {
    const close = delimiter === "(" ? ")" : delimiter;
    const existing = `\uFEFF# Project rules\r\n\r\n[](https://example.com ${delimiter}\r\n${REVIEW_POINTER}\r\n${close})\r\nKeep every byte.\r\n`;
    const updated = addReviewPointer(existing, `${REVIEW_POINTER}\n`);
    expect(updated).toBe(`\uFEFF${REVIEW_POINTER}\r\n\r\n${existing.slice(1)}`);
    expect(addReviewPointer(updated, `${REVIEW_POINTER}\n`)).toBe(updated);
  });

  it.each([
    ["escaped link", `\\[](https://example.com "\n${REVIEW_POINTER}\n")\n`],
    ["invalid blank title", `[](https://example.com "\n\n${REVIEW_POINTER}\n")\n`],
    ["visible label", `[${REVIEW_POINTER}](https://example.com "\nExample\n")\n`],
    ["after a closed link", `[](/url)\n\n${REVIEW_POINTER}\n`],
    ["after a dedented list HTML block", `- <pre>\n  Example only.\n\n${REVIEW_POINTER}\n`],
  ])("retains a live directive %s", (_name, section) => {
    const existing = `# Project rules\n\n${section}`;
    expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(existing);
  });

  it.each(["```", "~~~"].flatMap((fence) => ["-", "1.", "10)"].map((marker) => [fence, marker])))(
    "keeps list-like %s fence content with %s inside its real close",
    (fence, marker) => {
      const existing = `# Project rules\n\n${fence}md\n${marker} ${fence}\n${REVIEW_POINTER}\n${fence}\n\nKeep this text.\n`;
      expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(
        `${REVIEW_POINTER}\n\n${existing}`,
      );
    },
  );

  it.each([
    ["bullet", "-", 2],
    ["ordered", "10.", 4],
    ["indented", "   -", 5],
  ] as const)(
    "keeps a live directive after a real %s list fence close",
    (_name, marker, indent) => {
      const padding = " ".repeat(indent);
      const existing = `${marker} \`\`\`md\n${padding}Example only.\n${padding}\`\`\`\n\n${REVIEW_POINTER}\n`;
      expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(existing);
    },
  );

  it.each(["-", "10."])(
    "adds guidance outside first-line code at the %s list content column",
    (marker) => {
      const existing = `# Project rules\n\n${marker}     ${REVIEW_POINTER}\n`;
      expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(
        `${REVIEW_POINTER}\n\n${existing}`,
      );
    },
  );

  it.each([
    ["bullet", "- Project rules", 6],
    ["ordered", "10. Project rules", 8],
    ["tabbed marker", "1.\tProject rules", 8],
    ["three-space marker", "   - Project rules", 9],
    ["nested bullet", "- Project rules\n  - Nested rules", 8],
    ["nested ordered", "- Project rules\n  10. Nested rules", 10],
    ["outer continuation", "- Project rules\n  - Nested rules\n\n  Outer rules", 6],
  ] as const)(
    "adds guidance outside code at the %s list content column",
    (_name, list, indentation) => {
      const existing = `\uFEFF# Project rules\r\n\r\n${list.replace(/\n/g, "\r\n")}\r\n\r\n${" ".repeat(indentation)}${REVIEW_POINTER}\r\n\r\nKeep this text.\r\n`;
      expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(
        `\uFEFF${REVIEW_POINTER}\r\n\r\n${existing.slice(1)}`,
      );
    },
  );

  it.each([
    ["bullet", "- Project rules", 2],
    ["ordered", "10. Project rules", 4],
    ["tabbed marker", "1.\tProject rules", 4],
    ["three-space marker", "   - Project rules", 5],
    ["nested bullet", "- Project rules\n  - Nested rules", 4],
    ["nested ordered", "- Project rules\n  10. Nested rules", 6],
  ] as const)(
    "keeps a live directive at the %s list content column",
    (_name, list, indentation) => {
      const existing = `${list}\n\n${" ".repeat(indentation)}${REVIEW_POINTER}\n`;
      expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(existing);
    },
  );

  it.each([
    ["heading", "# Project rules\n"],
    ["fence", "~~~\nExample\n~~~\n"],
    ["literal HTML", "<pre>\nExample\n</pre>\n"],
  ])("adds guidance outside indented code immediately after a %s block", (_name, prefix) => {
    const existing = `${prefix}    - ${REVIEW_POINTER}\n`;
    expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(
      `${REVIEW_POINTER}\n\n${existing}`,
    );
  });

  it.each(["pre", "script", "style", "textarea", "div", "table", "span"])(
    "adds a live directive outside a raw HTML %s example",
    (tag) => {
      const existing = `# Project rules\n\n<${tag}>\n${REVIEW_POINTER}\n</${tag}>\n`;
      expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(
        `${REVIEW_POINTER}\n\n${existing}`,
      );
    },
  );

  it.each(["    - ", "    1. ", "\t- ", " \t1. ", "    "])(
    "adds a live directive when %j indents the existing copy as top-level code",
    (prefix) => {
      const existing = `\uFEFF# Project rules\r\n\r\n${prefix}${REVIEW_POINTER}\r\n\r\nKeep this text.\r\n`;
      expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(
        `\uFEFF${REVIEW_POINTER}\r\n\r\n${existing.slice(1)}`,
      );
    },
  );

  it.each([
    ["three-space list item", `# Project rules\n\n   - ${REVIEW_POINTER}\n`],
    ["nested list item", `- Project rules\n\n    - ${REVIEW_POINTER}\n`],
    ["indented paragraph continuation", `Paragraph text\n    - ${REVIEW_POINTER}\n`],
    ["past an indented literal comment", `    <!--\n\n${REVIEW_POINTER}\n`],
  ])("retains a live directive in %s", (_name, existing) => {
    expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(existing);
  });

  it.each(["-", "*", "+", "1.", "2)", "10."])(
    "retains an operative directive in a %s list item byte for byte",
    (marker) => {
      const existing = `\uFEFF# Project rules\r\n\r\n  ${marker}\t${REVIEW_POINTER}\r\nKeep this text.\r\n`;
      expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(existing);
    },
  );

  it.each([false, true])(
    "preserves project bytes when adding guidance outside an example with force=%s",
    async (force) => {
      await withProject(async (root) => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
        const templates = await Promise.all(
          AGENT_ENTRY_POINT_FILES.map(async (name) => ({
            name,
            text: await readEntryPoint(root, name),
            mode: (await stat(path.join(root, name))).mode,
          })),
        );
        for (const example of [
          `    - ${REVIEW_POINTER}`,
          `<pre>\n${REVIEW_POINTER}\n</pre>`,
          `- Project rules\n\n      ${REVIEW_POINTER}`,
          `10. Project rules\n\n        ${REVIEW_POINTER}`,
          `- <pre>\n  ${REVIEW_POINTER}\n  </pre>`,
          `[](https://example.com "\n${REVIEW_POINTER}\n")`,
          `> Quoted example\n${REVIEW_POINTER}`,
          `> > Quoted example\n${REVIEW_POINTER}`,
          `<span\ntitle="\n${REVIEW_POINTER}\n">Example</span>`,
          `<span\ntitle='\n${REVIEW_POINTER}\n'>Example</span>`,
          `<span title="\n<![cdata[\n${REVIEW_POINTER}\n">Example</span>`,
          `> [example]: /url\n${REVIEW_POINTER}`,
          `![\n${REVIEW_POINTER}\n](/image.png)`,
          `![\n${REVIEW_POINTER}\n][image]\n\n[image]: /image.png`,
          `![\n${REVIEW_POINTER}\n][]\n\n[\n${REVIEW_POINTER}\n]: /image.png`,
          `![\n${REVIEW_POINTER}\n]\n\n[\n${REVIEW_POINTER}\n]: /image.png`,
          `[example]: /url "\n${REVIEW_POINTER}\n"`,
          `[example]: /url '\n${REVIEW_POINTER}\n'`,
          `[example]: /url (\n${REVIEW_POINTER}\n)`,
          `[\n${REVIEW_POINTER}\n]: /url`,
        ]) {
          const originals = templates.map(({ name, text, mode }) => ({
            name,
            mode,
            text: `\uFEFF${text.replace(REVIEW_POINTER, example)}${PROJECT_TEXT}`.replace(
              /\n/g,
              "\r\n",
            ),
          }));
          for (const { name, text } of originals) {
            await writeFile(path.join(root, name), text, "utf-8");
          }
          await runInit({ dir: root, force, dryRun: false, yes: true });
          for (const { name, text, mode } of originals) {
            expect(await readEntryPoint(root, name)).toBe(
              `\uFEFF${REVIEW_POINTER}\r\n\r\n${text.slice(1)}`,
            );
            expect((await stat(path.join(root, name))).mode).toBe(mode);
          }
        }
      });
    },
  );

  it.each([false, true])(
    "keeps live block-boundary directives during init with force=%s",
    async (force) => {
      await withProject(async (root) => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
        const templates = await Promise.all(
          AGENT_ENTRY_POINT_FILES.map(async (name) => ({
            name,
            text: await readEntryPoint(root, name),
            mode: (await stat(path.join(root, name))).mode,
          })),
        );
        for (const fragment of [
          `# <span title="\n${REVIEW_POINTER}\n">Example</span>`,
          `> [example]: /url\n\n${REVIEW_POINTER}`,
        ]) {
          const originals = templates.map(({ name, text, mode }) => ({
            name,
            mode,
            text: `\uFEFF${text.replace(REVIEW_POINTER, fragment)}${PROJECT_TEXT}`.replace(
              /\n/g,
              "\r\n",
            ),
          }));
          for (const { name, text } of originals) {
            await writeFile(path.join(root, name), text, "utf-8");
          }
          await runInit({ dir: root, force, dryRun: false, yes: true });
          for (const { name, text, mode } of originals) {
            expect(await readEntryPoint(root, name)).toBe(text);
            expect((await stat(path.join(root, name))).mode).toBe(mode);
          }
        }
      });
    },
  );

  it.each([false, true])(
    "keeps existing list directives during init with force=%s",
    async (force) => {
      await withProject(async (root) => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
        const templates = await Promise.all(
          AGENT_ENTRY_POINT_FILES.map(async (name) => ({
            name,
            text: await readEntryPoint(root, name),
            mode: (await stat(path.join(root, name))).mode,
          })),
        );
        for (const marker of ["-", "*", "+", "1.", "2)", "10."]) {
          const originals = templates.map(({ name, text, mode }) => ({
            name,
            mode,
            text: `\uFEFF${text.replace(REVIEW_POINTER, `  ${marker}\t${REVIEW_POINTER}`)}${PROJECT_TEXT}`.replace(
              /\n/g,
              "\r\n",
            ),
          }));
          for (const { name, text } of originals) {
            await writeFile(path.join(root, name), text, "utf-8");
          }
          await runInit({ dir: root, force, dryRun: false, yes: true });
          for (const { name, text, mode } of originals) {
            expect(await readEntryPoint(root, name), `${name}, marker=${marker}`).toBe(text);
            expect((await stat(path.join(root, name))).mode).toBe(mode);
          }
        }
      });
    },
  );

  it.each([
    ["ordinary text", "# Project rules\n\n"],
    ["inline comment marker", "Use `<!--` literally.\n\n"],
    ["multi-backtick span", "Use `` `<!--` `` literally.\n\n"],
    ["multiline code span", "Use `a\n<!--\nb` literally.\n\n"],
    ["fence info comment marker", "~~~ <!--\nExample\n~~~\n\n"],
    ["backticks inside a real comment", "<!-- ` -->\n\n"],
  ])("retains an operative directive after %s byte for byte", (_name, prefix) => {
    const existing = `${prefix}${REVIEW_POINTER}\n`;
    expect(addReviewPointer(existing, `${REVIEW_POINTER}\n`)).toBe(existing);
  });

  it.each([
    ["HTML comment", `<!--\n${REVIEW_POINTER}\n-->\n`],
    ["fenced block", `~~~\n${REVIEW_POINTER}\n~~~\n`],
    ["inline code span", `\`\`${REVIEW_POINTER}\`\`\n`],
    ["unfinished fence", "~~~\nKeep this example.\n"],
    ["unfinished comment", "<!-- Keep this comment.\n"],
  ])("adds guidance before a %s without changing existing text", (_name, existing) => {
    const merged = addReviewPointer(existing, `${REVIEW_POINTER}\n`);
    expect(merged).toBe(`${REVIEW_POINTER}\n\n${existing}`);
    expect(addReviewPointer(merged, `${REVIEW_POINTER}\n`)).toBe(merged);
  });

  it("keeps the BOM and CRLF text when prepending guidance", () => {
    const existing = "\uFEFF# Project rules\r\n\r\nKeep this text.\r\n";
    const merged = addReviewPointer(existing, `${REVIEW_POINTER}\n`);
    expect(merged).toBe(`\uFEFF${REVIEW_POINTER}\r\n\r\n${existing.slice(1)}`);
    expect(addReviewPointer(merged, `${REVIEW_POINTER}\n`)).toBe(merged);
  });

  it("does not invent guidance when the template has none", () => {
    expect(addReviewPointer(PROJECT_TEXT, null)).toBe(PROJECT_TEXT);
    expect(addReviewPointer(PROJECT_TEXT, "# Project instructions\n")).toBe(PROJECT_TEXT);
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

describe("a marker pair inside an example is an example", () => {
  it("does not read a fenced section as the managed one", () => {
    const template = [
      QFAI_AGENT_RULES_BEGIN,
      "",
      "- `.agents/rules/grilling.md` — interview the decision tree.",
      "",
      QFAI_AGENT_RULES_END,
    ].join("\n");
    // A project documenting what the section looks like. Read as the managed
    // section, the bullet is written into the example, where it instructs
    // nobody while the run reports a successful update.
    const existing = [
      "# Our house rules",
      "",
      "Ours looks like this:",
      "",
      "````markdown",
      QFAI_AGENT_RULES_BEGIN,
      "",
      "- `.agents/rules/temporary-files.md` — scratch goes under `tmp/`.",
      "",
      QFAI_AGENT_RULES_END,
      "````",
      "",
    ].join("\n");

    expect(addRuleCitations(existing, template, [".agents/rules/grilling.md"])).toBe(existing);
    expect(hasUnclosedRulesSection(existing)).toBe(false);
    // Nothing outside the example cites a rule, so the file still needs the
    // section — which is what the caller falls through to appending.
    expect(needsManagedRulesSection(existing, template)).toBe(true);
  });

  it("keeps an opening fence inside a block from closing it", () => {
    // A closing fence carries no info string, so the inner line is content. Read
    // as a closer, every bullet after it counts as a live citation.
    const existing = [
      "# Our house rules",
      "",
      "````",
      "```markdown",
      "- `.agents/rules/temporary-files.md` — scratch goes under `tmp/`.",
      "````",
      "",
    ].join("\n");

    expect(citedRuleMastersOutsideCode(existing)).toEqual([]);
  });
});

describe("the Copilot file this run cannot extend", () => {
  it("names the masters when the project wrote its own instructions", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // A project's own Copilot instructions: no generated heading, no rule
      // bullet. The wrapper sync skips an existing file, so nothing else will
      // carry the citation either.
      const copilot = path.join(root, ".github", "copilot-instructions.md");
      const own = ["# House instructions", "", "Run the tests before pushing.", ""].join("\n");
      await writeFile(copilot, own, "utf-8");
      await rm(path.join(root, ...master.split("/")), { force: true });

      const stderr = await initCapturingStderr(root);

      expect(await readFile(copilot, "utf-8")).toBe(own);
      expect(stderr).toContain("carries no rule list this run can add a line to");
      expect(stderr).toContain(master);
    });
  });

  it("leaves the file to the wrapper regeneration under --force", async () => {
    await withProject(async (root) => {
      const master = ".agents/rules/grilling.md";
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const copilot = path.join(root, ".github", "copilot-instructions.md");
      await writeFile(copilot, "# House instructions\n", "utf-8");
      await rm(path.join(root, ...master.split("/")), { force: true });

      const chunks: string[] = [];
      const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
        chunks.push(String(chunk));
        return true;
      });
      try {
        await runInit({ dir: root, force: true, dryRun: false, yes: true });
      } finally {
        spy.mockRestore();
      }

      // The wrapper sync writes it whole from the same source, so a diagnostic
      // here would name a file this run goes on to replace.
      expect(chunks.join("")).not.toContain("carries no rule list");
      expect(await readFile(copilot, "utf-8")).toContain(master);
    });
  });
});

describe("what the citation scan reads a line as", () => {
  const template = [
    QFAI_AGENT_RULES_BEGIN,
    "",
    "- `.agents/rules/grilling.md` — interview the decision tree.",
    "",
    QFAI_AGENT_RULES_END,
  ].join("\n");

  it("reads a fence inside a block quote as a fence", () => {
    // Anchored at the start of the line, the scan never sees `> ~~~`, and the
    // example inside reads as live content.
    const existing = [
      "# Our house rules",
      "",
      "> Ours looks like this:",
      ">",
      "> ~~~markdown",
      "> " + QFAI_AGENT_RULES_BEGIN,
      "> - `.agents/rules/temporary-files.md` — scratch goes under `tmp/`.",
      "> " + QFAI_AGENT_RULES_END,
      "> ~~~",
      "",
    ].join("\n");

    expect(citedRuleMastersOutsideCode(existing)).toEqual([]);
    expect(needsManagedRulesSection(existing, template)).toBe(true);
    expect(addRuleCitations(existing, template, [".agents/rules/grilling.md"])).toBe(existing);
  });

  it("reads a fence opened as a list item's content", () => {
    // `- ```markdown` opens a block. Left unopened, the example inside reads as
    // live and the file is classified as hand-wired.
    const existing = [
      "# Our house rules",
      "",
      "- Ours looks like this:",
      "",
      "  ```markdown",
      "  - `.agents/rules/temporary-files.md` — scratch goes under `tmp/`.",
      "  ```",
      "",
    ].join("\n");

    expect(citedRuleMastersOutsideCode(existing)).toEqual([]);
    expect(needsManagedRulesSection(existing, template)).toBe(true);
  });

  it("does not add a second blank line to an emptied section", () => {
    // The section already closes with one. A run that promised a bullet should
    // not also rewrite the whitespace around it.
    const existing = [
      QFAI_AGENT_RULES_BEGIN,
      "",
      "We keep our own summary here instead.",
      "",
      QFAI_AGENT_RULES_END,
      "",
    ].join("\n");

    const merged = addRuleCitations(existing, template, [".agents/rules/grilling.md"]);
    const lines = merged.split("\n");
    const added = lines.findIndex((line) => line.includes("grilling.md"));
    const end = lines.findIndex((line) => line.includes(QFAI_AGENT_RULES_END));
    expect(added).toBeGreaterThan(0);
    // One blank between the bullet and the closing marker, not two.
    expect(lines.slice(added + 1, end).filter((line) => line.trim() === "")).toHaveLength(1);
  });
  it("ends a quoted fence where the block quote ends", () => {
    // An unclosed fence inside a block quote closes with the quote. Held open
    // past it, the real section below reads as an example and a later run
    // appends a second one.
    const existing = [
      "# Our house rules",
      "",
      "> An example we never closed:",
      ">",
      "> ```markdown",
      "> - `.agents/rules/temporary-files.md` — scratch goes under `tmp/`.",
      "",
      QFAI_AGENT_RULES_BEGIN,
      "",
      "- `.agents/rules/temporary-files.md` — scratch goes under `tmp/`.",
      "",
      QFAI_AGENT_RULES_END,
      "",
    ].join("\n");

    // The section below the quote is the real one.
    expect(needsManagedRulesSection(existing, template)).toBe(false);
    expect(hasUnclosedRulesSection(existing)).toBe(false);
    const merged = addRuleCitations(existing, template, [".agents/rules/grilling.md"]);
    expect(merged).toContain(".agents/rules/grilling.md");
    // And the bullet went into the section, not into the quoted example.
    const quoted = merged.split("\n").filter((line) => line.startsWith(">"));
    expect(quoted.some((line) => line.includes("grilling.md"))).toBe(false);
  });

  it("keeps a wrapped bullet with its own continuation", () => {
    // The continuation explains the bullet above it. Inserting between the two
    // leaves it describing a rule it was never about.
    const existing = [
      QFAI_AGENT_RULES_BEGIN,
      "",
      "- `.agents/rules/temporary-files.md` — scratch goes under `tmp/`,",
      "  and the task that made it cleans it up.",
      "",
      QFAI_AGENT_RULES_END,
      "",
    ].join("\n");

    const merged = addRuleCitations(existing, template, [".agents/rules/grilling.md"]);
    const lines = merged.split("\n");
    const continuation = lines.findIndex((line) => line.includes("cleans it up"));
    const added = lines.findIndex((line) => line.includes("grilling.md"));
    expect(continuation).toBeGreaterThan(0);
    expect(added).toBeGreaterThan(continuation);
  });

  it("keeps a closed section closed when the file's endings are mixed", () => {
    // One CRLF anywhere made the whole document split on CRLF, so an LF section
    // landed in a single element and its two markers shared a line.
    const existing = [
      "# Our house rules\r",
      "\r",
      QFAI_AGENT_RULES_BEGIN,
      "",
      "- `.agents/rules/temporary-files.md` — scratch goes under `tmp/`.",
      "",
      QFAI_AGENT_RULES_END,
      "",
    ].join("\n");

    expect(hasUnclosedRulesSection(existing)).toBe(false);
    const merged = addRuleCitations(existing, template, [".agents/rules/grilling.md"]);
    expect(merged).toContain(".agents/rules/grilling.md");
    // The project's own CRLF lines are still CRLF, and the section is still LF.
    expect(merged.startsWith("# Our house rules\r\n")).toBe(true);
    expect(merged).toContain("- `.agents/rules/grilling.md` — interview the decision tree.\n");
  });
});
