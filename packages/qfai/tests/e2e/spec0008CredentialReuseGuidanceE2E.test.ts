/**
 * E2E: the credential-reuse guidance an adopter receives (spec-0008)
 *
 * `US-0008-0008` is about a QA engineer reading the rules in their own project. The integration
 * rows beside `tests/integration/atddCredentialReuseGuidance.test.ts` own the content oracles, and
 * every one of them reads `packages/qfai/assets/init/**` — the source, which no adopter has.
 *
 * Between that file and the reader sits `qfai init`: a template copy with an asset filter, which
 * has dropped whole subtrees before. A reference artifact that exists in the package and never
 * arrives is indistinguishable, from every integration row, from one that works. So this file
 * initialises an empty project and reads the delivered tree, and it follows the cross-link the way
 * a reader would — from the delivered `SKILL.md`, resolved against the delivered skill directory.
 *
 * `runInit` once, shared: a full asset tree is the expensive part and both rows read the same one.
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";

let projectPromise: Promise<string> | undefined;

function project(): Promise<string> {
  projectPromise ??= (async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-spec0008-"));
    await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
    return dir;
  })();
  return projectPromise;
}

afterAll(async () => {
  if (projectPromise === undefined) return;
  await rm(await projectPromise, { recursive: true, force: true });
});

async function skillDir(): Promise<string> {
  return path.join(await project(), ".qfai", "assistant", "skills", "qfai-atdd");
}

// QFAI:SPEC-0008:US-0008-0008
describe(
  "E2E: an adopter receives the worker-scoped credential-reuse rules, reachable from the skill (US-0008-0008)",
  { timeout: 120000 },
  () => {
    it("delivers the rule set, and the link in the delivered skill resolves to it", async () => {
      const dir = await skillDir();
      const entry = await readFile(path.join(dir, "SKILL.md"), "utf-8");

      // The link as written in the delivered file, followed from the delivered directory. Asserting
      // that the artifact exists at a path this test spells would prove the file arrived and not
      // that a reader can get to it.
      const link = /`(references\/[a-z0-9-]*credential[a-z0-9-]*\.md)`/.exec(entry)?.[1];
      expect(link, "the delivered skill entry point links no credential guidance").toBeDefined();
      if (link === undefined) return;

      const guidance = await readFile(path.resolve(dir, link), "utf-8");

      // The rule set itself, delivered. One assertion per rule rather than a length check: a
      // truncated copy is the failure this layer exists to catch, and it truncates from the end.
      for (const rule of [
        /never sign in per test/i,
        /never share one account across parallel/i,
        /key(ed)? (the cached session )?by the pair/i,
        /tear the cache down at worker exit/i,
        /re-authenticate and rewrite the cache/i,
        /mutates its own account creates a dedicated/i,
        /costs more workers, not more sign-ins/i,
      ]) {
        expect(guidance, `the delivered guidance is missing ${String(rule)}`).toMatch(rule);
      }
      expect(guidance, "the delivered guidance lost the companion rule").toMatch(
        /caller-injected|injected by the caller/i,
      );
    });

    it("arrives naming no backend, and adds nothing to the adopter's ATDD vocabulary", async () => {
      const dir = await skillDir();
      const entry = await readFile(path.join(dir, "SKILL.md"), "utf-8");
      const link = /`(references\/[a-z0-9-]*credential[a-z0-9-]*\.md)`/.exec(entry)?.[1] ?? "";
      const guidance = await readFile(path.resolve(dir, link), "utf-8");

      // What the adopter must NOT receive: a tool choice made for them, and a vocabulary their
      // project now has to honour. Both are properties of the delivered bytes, so a filter that
      // rewrote or substituted the file would be caught here and nowhere else.
      expect(guidance, "the delivered guidance names a browser backend").not.toMatch(
        /\b(playwright|cypress|puppeteer|selenium|webdriver|chromium|chrome|firefox|webkit|safari)\b/i,
      );
      expect(guidance, "the delivered guidance carries an annotation token").not.toMatch(
        /\bQFAI:SPEC-\d{4}:/,
      );
      expect(guidance, "the delivered guidance carries a finding code").not.toMatch(
        /\bQFAI-[A-Z]+-\d/,
      );
      // And it tells the adopter that the rules were not exercised here, which is what stops them
      // being read as a report rather than as guidance.
      expect(guidance, "the delivered guidance does not disclaim dogfooding").toMatch(
        /own suite has zero credentials/i,
      );
    });
  },
);
