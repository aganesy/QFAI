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

import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import {
  AGENT_ENTRY_POINT_FILES,
  QFAI_AGENT_RULES_BEGIN,
  QFAI_AGENT_RULES_END,
  citedRuleMasters,
  extractManagedRulesSection,
} from "../../src/core/agentEntryPoints.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

const TIMEOUT = 90_000;

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

describe("qfai init connects a pre-existing agent entry point to the rule masters", () => {
  it(
    "appends the managed section to an AGENTS.md / CLAUDE.md it did not create",
    { timeout: TIMEOUT },
    async () => {
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
    },
  );

  it("pin: a second init does not append the section again", { timeout: TIMEOUT }, async () => {
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

  it(
    "pin: a fresh project gets the template's single section, not a second copy",
    { timeout: TIMEOUT },
    async () => {
      await withProject(async (root) => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });

        for (const name of AGENT_ENTRY_POINT_FILES) {
          const written = await readEntryPoint(root, name);
          expect(written).toBe(await readTemplate(name));
          expect(occurrences(written, QFAI_AGENT_RULES_BEGIN)).toBe(1);
        }
      });
    },
  );

  it(
    "pin: a file that already cites every master by hand is left untouched",
    { timeout: TIMEOUT },
    async () => {
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
    },
  );

  it("pin: --dry-run writes nothing", { timeout: TIMEOUT }, async () => {
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
