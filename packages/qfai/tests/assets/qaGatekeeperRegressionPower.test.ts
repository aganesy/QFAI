/**
 * The gatekeeper's test checks ask whether a test covers the behaviour and
 * whether it would fail on a regression. None asked whether it would survive a
 * refactor that keeps the behaviour.
 *
 * The card adds that one check and points the other three questions at the
 * checks that already own them, rather than restating them. The check is
 * advisory, scores nothing, admits a finding only with a named change, and
 * reads every touched test file whole while deferring findings on tests the
 * change did not add.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const GATEKEEPER = path.join("assistant", "agent", "qa-gatekeeper.md");
const ORACLE_STRENGTH = path.join(
  "assistant",
  "skill",
  "qfai-implement",
  "references",
  "oracle-strength.md",
);

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

/** The section under `heading`, up to the next `## ` heading. */
const section = (card: string, heading: string): string => {
  const start = card.indexOf(heading);
  expect(start, `missing ${heading}`).toBeGreaterThanOrEqual(0);
  const rest = card.slice(start + heading.length);
  const end = rest.indexOf(" ## ");
  return end < 0 ? rest : rest.slice(0, end);
};

const CHECK = "## Refactor survival check (advisory)";

describe.each(TREES)("%s", (tree) => {
  it("gives the gatekeeper a refactor survival check", async () => {
    const check = section(await read(tree, GATEKEEPER), CHECK);
    expect(check).toContain(
      "| Would it survive a refactor that keeps the behaviour? | This check |",
    );
    expect(check).toContain("asserts on what the contract does not name");
  });

  it("sends the other three questions to the checks that own them", async () => {
    // A second statement of the coverage or oracle rules would drift from the
    // first, so the table points instead of restating.
    const card = await read(tree, GATEKEEPER);
    const check = section(card, CHECK);
    expect(check).toContain(
      "| Does it cover the behaviour that matters, not just the lines run? | The coverage gate above |",
    );
    expect(check).toContain(
      "| Are the recurring gaps covered: kept failures and boundary cases? | The coverage gate above |",
    );
    expect(check).toContain(
      "| Would it fail on a concrete regression? | `skill/qfai-implement/references/oracle-strength.md` and the RED and GREEN observation gate |",
    );
    // Each pointer resolves to a section or file that exists.
    expect(card).toContain("## Coverage gate");
    expect(card).toContain("## RED and GREEN observation gate");
    expect(card.indexOf("## Coverage gate")).toBeLessThan(card.indexOf(CHECK));
    expect(await read(tree, ORACLE_STRENGTH)).toContain("## Weak oracles");
  });

  it("is advisory, scores nothing, and admits a finding only with a named change", async () => {
    // An unread score is a number authors learn to optimize, and a finding
    // with no concrete change cannot be acted on.
    const check = section(await read(tree, GATEKEEPER), CHECK);
    expect(check).toContain(
      "Record each finding with the test and a concrete behaviour-preserving change it would fail on.",
    );
    expect(check).toContain("A finding with no named change is not admitted.");
    expect(check).toContain("This check does not REVISE on its own and carries no score.");
  });

  it("reads every touched test file whole and defers findings on older tests", async () => {
    const check = section(await read(tree, GATEKEEPER), CHECK);
    expect(check).toContain(
      "Read the whole of every test file the change touches, not only the tests it adds or alters.",
    );
    expect(check).toContain(
      "A finding on a test that existed before the change is recorded and deferred.",
    );
  });
});
