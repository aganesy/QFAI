/**
 * The shipped delta template must be readable by the parser that reads deltas.
 *
 * `parseDeltaV1` accepts exactly one shape — an H2 `## Decision Log`, `### DL-`
 * entries, and a `#### Meta` YAML block carrying every key in
 * `REQUIRED_DELTA_META_KEYS`. The shipped `spec/09_delta.md` had none of it, so
 * an author who followed the template produced a file `qfai report` extracted
 * nothing from, and the Change Type section printed zeros as if the run were
 * clean (#545).
 *
 * Round-tripping the template through the parser is the guard: a delta template
 * the parser returns no complete entry for fails the build.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  isPlaceholderDeltaMeta,
  normalizeCompat,
  normalizePrimary,
  parseDeltaV1,
  REQUIRED_DELTA_META_KEYS,
  toDeltaMeta,
} from "../../src/core/deltaV1.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SPEC_TEMPLATES = "assistant/skills/qfai-sdd/templates/specs/spec";

/** Every per-spec delta template, whatever it ends up being numbered. */
async function listDeltaTemplates(tree: string): Promise<string[]> {
  const dir = path.join(repoRoot, tree, SPEC_TEMPLATES);
  const names = await readdir(dir);
  return names.filter((name) => /(?:^|_)delta\.md$/i.test(name)).sort();
}

describe("the shipped spec delta template parses as a delta", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: ships at least one per-spec delta template`, async () => {
      expect(await listDeltaTemplates(tree)).not.toEqual([]);
    });

    it(`${tree}: every delta template yields a complete decision entry`, async () => {
      for (const name of await listDeltaTemplates(tree)) {
        const text = await readFile(path.join(repoRoot, tree, SPEC_TEMPLATES, name), "utf-8");
        const parsed = parseDeltaV1(text);

        expect(parsed.hasDeltaHeading, `${name}: H1 is not recognised as a delta heading`).toBe(
          true,
        );
        expect(parsed.decisionLogSection, `${name}: no "## Decision Log" section`).not.toBeNull();

        const complete = parsed.entries.filter((entry) => {
          const meta = entry.meta;
          if (!meta) {
            return false;
          }
          return REQUIRED_DELTA_META_KEYS.every((key) =>
            Object.prototype.hasOwnProperty.call(meta, key),
          );
        });
        expect(
          complete.length,
          `${name}: no "### DL-" entry with all of ${REQUIRED_DELTA_META_KEYS.join(", ")}`,
        ).toBeGreaterThan(0);

        for (const entry of complete) {
          expect(entry.metaError, `${name}: ${entry.heading} meta YAML`).toBeNull();
        }
      }
    });

    it(`${tree}: the template's own meta values are the vocabulary the report counts`, async () => {
      // A skeleton whose `primary` / `compat` land in the `unknown` bucket
      // teaches the wrong vocabulary on the first copy.
      for (const name of await listDeltaTemplates(tree)) {
        const text = await readFile(path.join(repoRoot, tree, SPEC_TEMPLATES, name), "utf-8");
        for (const entry of parseDeltaV1(text).entries) {
          const meta = entry.meta;
          if (!meta) {
            continue;
          }
          const primary = typeof meta.primary === "string" ? meta.primary : null;
          const compat = typeof meta.compat === "string" ? meta.compat : null;
          expect(normalizePrimary(primary), `${name}: primary "${primary ?? ""}"`).not.toBeNull();
          expect(normalizeCompat(compat), `${name}: compat "${compat ?? ""}"`).not.toBeNull();
        }
      }
    });

    it(`${tree}: the template's entry reads as a skeleton, not as a decision`, async () => {
      // It parses on purpose, so an author who copies it gets a file the report
      // can read. It must still not be counted: an untouched copy would publish
      // `Initial 1 / @docs 1 / Improvement 1` for a spec that decided nothing,
      // and that fabricated 1 also hides the "nothing was counted" disclosure.
      for (const name of await listDeltaTemplates(tree)) {
        const text = await readFile(path.join(repoRoot, tree, SPEC_TEMPLATES, name), "utf-8");
        for (const entry of parseDeltaV1(text).entries) {
          if (!entry.meta) {
            continue;
          }
          expect(
            isPlaceholderDeltaMeta(toDeltaMeta(entry.meta)),
            `${name}: ${entry.heading} reads as a filled-in decision`,
          ).toBe(true);
        }
      }
    });

    it(`${tree}: the template carries the Verification.Plan skeleton`, async () => {
      // `constitution/change-classification.md` requires `Verification.Plan`
      // when `compat: Change`, and this is the only file that offers a slot.
      for (const name of await listDeltaTemplates(tree)) {
        const text = await readFile(path.join(repoRoot, tree, SPEC_TEMPLATES, name), "utf-8");
        const entries = parseDeltaV1(text).entries;
        expect(
          entries.some((entry) => entry.verificationPlanItems.length > 0),
          `${name}: no parsable "#### Verification" / "### Plan" item`,
        ).toBe(true);
        for (const entry of entries) {
          expect(entry.verificationPlanError, `${name}: ${entry.heading} plan YAML`).toBeNull();
        }
      }
    });
  }
});
