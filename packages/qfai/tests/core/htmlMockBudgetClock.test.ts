/**
 * `htmlMockTimeout` is a budget for PARSING mock blocks, and it was charged jsdom's load.
 *
 * Review finding [59]. Moving the jsdom-backed import off module scope stopped every `qfai` command
 * paying its 910 ms — but the import then landed AFTER the clock started, so the one-off cost of
 * loading it was measured against a budget whose own message says "All blocks were validated". A
 * project configuring anything under a second raised `QFAI-MOCK-099` on every run however fast its
 * blocks parsed, and `--fail-on warning` failed the run on it.
 *
 * The comment where the static import used to sit predicted exactly this, and the code was arranged
 * the other way round.
 *
 * Measured by MOCKING the module with a slow factory rather than by timing the real jsdom. A
 * stopwatch on the real thing measures the module cache: by the time this file runs another test has
 * usually loaded jsdom already, the import is free, and the row passes whatever the code does. A
 * factory that sleeps costs its time on the first import in this file's module registry, every run.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

/** How long the mocked module takes to load — jsdom's own cost is ~910 ms; this is enough to see. */
const LOAD_MS = 250;

/** The budget under test: comfortably less than the load, comfortably more than the parse. */
const BUDGET_MS = 60;

vi.mock("../../src/core/uiux/htmlMockDom.js", async () => {
  await new Promise((resolve) => setTimeout(resolve, LOAD_MS));
  return {
    // An empty result, so the PARSE costs nothing and the only thing that could exceed the budget
    // is the load above. That is the whole point of the row: a parse this fast must never trip it.
    parseHtmlMock: () =>
      Promise.resolve({
        parseErrors: [],
        externalUrls: [],
        localRefs: [],
        unsafeUrls: [],
        scriptTags: [],
        eventHandlers: [],
        varUsages: [],
        stateAttributes: [],
        colorPairs: [],
        inlineDimensions: [],
      }),
  };
});

import { validateHtmlMock } from "../../src/core/validators/htmlMock.js";
import type { QfaiConfig } from "../../src/core/config.js";

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

function config(budget: number): QfaiConfig {
  return {
    paths: { discussionDir: ".qfai/discussion", specsDir: ".qfai/specs" },
    uiux: { htmlMockTimeout: budget },
  } as unknown as QfaiConfig;
}

/** A tree holding exactly one HTML mock block, which is what makes the validator load the parser. */
async function treeWithOneMock(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mock-budget-"));
  dirs.push(root);
  const dir = path.join(root, ".qfai", "discussion", "discussion-20260826000000000");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "mock.md"),
    ["# mock", "", "```html", "<div>one block</div>", "```", ""].join("\n"),
    "utf-8",
  );
  return root;
}

const budgetIssues = (issues: { code: string }[]): string[] =>
  issues.filter((entry) => entry.code === "QFAI-MOCK-099").map((entry) => entry.code);

describe("the mock budget measures parsing, not the parser's load", () => {
  it("does not exceed a budget smaller than the load when the blocks parse instantly", async () => {
    const root = await treeWithOneMock();
    const issues = await validateHtmlMock(root, "web", config(BUDGET_MS));

    // The premise, asserted rather than assumed: the parser really was loaded, which is the only
    // reason the load cost exists to be charged. Without a block there is no import at all and this
    // row would hold for a validator that never looks at the clock.
    expect(
      LOAD_MS,
      "the mocked load must cost more than the budget, or this row proves nothing",
    ).toBeGreaterThan(BUDGET_MS);

    expect(
      budgetIssues(issues),
      "the load is a real cost, and it is not the parsing this budget is for",
    ).toEqual([]);
  }, 30_000);

  it("still exceeds a budget the parsing itself cannot meet", async () => {
    // The other direction, so the clock is a clock and not a removed check. Zero is a budget no
    // amount of work fits inside, and the message says every block was validated anyway.
    const root = await treeWithOneMock();
    const issues = await validateHtmlMock(root, "web", config(0));
    expect(budgetIssues(issues), "a budget nothing can meet must still be reported").toEqual([
      "QFAI-MOCK-099",
    ]);
  }, 30_000);
});
