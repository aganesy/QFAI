/**
 * `verify.json` has exactly one writer — the `/qfai-verify` skill — and no
 * TypeScript writes it, so the shipped prose *is* the write-side contract.
 *
 * The contract told the skill to write `.qfai/output/verify.json` while
 * `readVerifyJson()` had already moved the canonical location to
 * `.qfai/report/verify.json`. Every conforming run therefore landed in the
 * legacy branch and `prototyping certify` printed a migration note it could
 * not act on: moving the file fixed one run, and the next `/qfai-verify` wrote
 * it back where the skill said to.
 *
 * This is the second time the constant drifted from its documentation, so the
 * guard is structural: every write-side path literal in the shipped prose is
 * compared against `VERIFY_JSON_REL` itself, not against a copy of it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { VERIFY_JSON_LEGACY_REL, VERIFY_JSON_REL } from "../../src/core/prototyping/verifyJson.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const CONTRACT = "assistant/skills/qfai-verify/references/verify-output-contract.md";
const VERIFY_SKILL = "assistant/skills/qfai-verify/SKILL.md";
const WORKFLOW = "assistant/constitution/workflow.md";
const HANDOFF = "assistant/skills/qfai-prototyping/references/handoff.md";

/** Files whose prose instructs a writer where to put `verify.json`. */
const WRITE_SIDE_DOCS = [CONTRACT, VERIFY_SKILL, WORKFLOW, HANDOFF];

/** ``... write[s] ... `<some .qfai path ending in verify.json>` `` on one line. */
const WRITE_INSTRUCTION = /\bwrites?\b[^.\n]*`(\.qfai\/[^`]*verify\.json)`/g;

/** Any backticked `.qfai/...verify.json` literal, wherever it appears. */
const ANY_VERIFY_PATH = /`(\.qfai\/[^`]*verify\.json)`/g;

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

// `flatMap` rather than `map`: group 1 is present in every match the two
// patterns can produce, but `noUncheckedIndexedAccess` types it `string |
// undefined`, and dropping the impossible case keeps the return type honest
// without an assertion.
const matchAll = (text: string, re: RegExp): string[] =>
  [...text.matchAll(re)].flatMap((m) => (m[1] === undefined ? [] : [m[1]]));

describe.each(QFAI_TREES)("%s", (tree) => {
  it("names the canonical path the code reads first as the contract's canonical path", async () => {
    const contract = await read(tree, CONTRACT);
    expect(contract).toContain(`# Verify Output Contract — \`${VERIFY_JSON_REL}\``);
    expect(contract).toContain(`\`/qfai-verify\` MUST write \`${VERIFY_JSON_REL}\``);
    expect(contract).toContain(`Canonical path: \`${VERIFY_JSON_REL}\``);
  });

  it("records the legacy location as read-only rather than dropping it", async () => {
    // The fallback still exists in `readVerifyJson()`; a writer that has never
    // heard of it cannot understand certify's migration note.
    const contract = await read(tree, CONTRACT);
    expect(contract).toContain(`\`${VERIFY_JSON_LEGACY_REL}\` is the legacy location`);
    expect(contract).toContain("Never write there.");
  });

  it.each(WRITE_SIDE_DOCS)("%s tells the writer to write only the canonical path", async (rel) => {
    const doc = await read(tree, rel);
    const instructed = matchAll(doc, WRITE_INSTRUCTION);
    expect(instructed.length).toBeGreaterThan(0);
    for (const p of instructed) {
      expect(p).toBe(VERIFY_JSON_REL);
    }
  });

  it.each(WRITE_SIDE_DOCS)("%s invents no third verify.json location", async (rel) => {
    // Catches a rename that updates the writer but leaves a stale reader path,
    // which is the shape of the drift this guard exists for.
    const doc = await read(tree, rel);
    for (const p of matchAll(doc, ANY_VERIFY_PATH)) {
      expect([VERIFY_JSON_REL, VERIFY_JSON_LEGACY_REL]).toContain(p);
    }
  });
});
