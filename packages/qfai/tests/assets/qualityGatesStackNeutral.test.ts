/**
 * `constitution/quality.md` no longer names a package manager (#390).
 *
 * Three shipped constitution files answered "what are the gate commands?"
 * differently. `workflow.md` and `constitution.md` Article VIII hedge
 * explicitly — "project-defined", "project-dependent", "Typical". `quality.md`
 * was the only one that asserted ("the expected minimum gates **are**") and the
 * only one that was wrong: five `pnpm` commands, `category: universal`, on a
 * file an agent reaches for first because it is titled "Quality (Gates, tests,
 * and safety)".
 *
 * It also had no owner: nothing read it, nothing rewrote it at init time, and
 * `/qfai-configure`'s write allow-list excluded `constitution/**`, so a correct
 * configure pass left the five lines in place forever.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const QUALITY = "assistant/constitution/quality.md";
const CONFIGURE = "assistant/skills/qfai-configure/SKILL.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

/** The document with HTML comments removed — the normative text only. */
const normative = (s: string): string => s.replace(/<!--[\s\S]*?-->/g, "");

describe("quality.md states capabilities, not commands", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: no package manager appears in the normative text`, async () => {
      const text = normative(await read(tree, QUALITY));

      // The examples survive inside an HTML comment, clearly labelled; the
      // rule itself must name no stack.
      for (const token of ["pnpm ", "npm ", "yarn ", "uv run"]) {
        expect(text).not.toContain(token);
      }
    });

    it(`${tree}: it now agrees with its two siblings`, async () => {
      const quality = flat(await read(tree, QUALITY));

      expect(quality).toContain(
        "**Gate commands are project-defined. Always discover them from the repo.**",
      );
      // Naming the disagreement is what stops it being reintroduced as a
      // "helpful" concrete default.
      expect(quality).toContain(
        "this file used to disagree with both by stating five `pnpm` commands as fact",
      );
    });

    it(`${tree}: the capability list is the rule`, async () => {
      const quality = await read(tree, QUALITY);

      for (const capability of [
        "- format check",
        "- lint",
        "- typecheck",
        "- tests",
        "- pack / distribution verification",
      ]) {
        expect(quality).toContain(capability);
      }
    });

    it(`${tree}: it says how to discover the real commands`, async () => {
      const quality = flat(await read(tree, QUALITY));

      expect(quality).toContain("Discover the actual commands from the repository, in this order");
      expect(quality).toContain("`/qfai-configure` records what it detected in");
      // A missing gate must not read as a passing one.
      expect(quality).toContain(
        "A capability with no discoverable command is **UNRUN**, not passed",
      );
    });

    it(`${tree}: the worked examples are marked as examples`, async () => {
      const quality = await read(tree, QUALITY);
      const comments = quality.match(/<!--[\s\S]*?-->/g)?.join("\n") ?? "";

      expect(comments).toContain("Neither list is a default");
      // Both stacks, so neither reads as the canonical one.
      expect(comments).toContain("pnpm");
      expect(comments).toContain("uv run");
    });

    it(`${tree}: qfai-configure owns the file`, async () => {
      const configure = flat(await read(tree, CONFIGURE));

      expect(configure).toContain(
        "`.qfai/assistant/constitution/quality.md` — the gate capability list",
      );
      expect(configure).toContain("This skill is its owner");
      // Owning it means being allowed to write it.
      expect(configure).toContain(
        "`.qfai/assistant/constitution/quality.md` (gate capabilities only — never the surrounding rules)",
      );
    });

    it(`${tree}: both copies of the write allow-list were updated`, async () => {
      const configure = await read(tree, CONFIGURE);
      const occurrences = configure.split("gate capabilities only").length - 1;

      // The constraint is stated twice in the skill; updating one copy would
      // leave the two disagreeing.
      expect(occurrences).toBe(2);
    });
  }
});
