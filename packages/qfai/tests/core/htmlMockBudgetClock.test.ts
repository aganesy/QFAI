/**
 * `htmlMockTimeout` is a budget for PARSING mock blocks, and it was charged jsdom's load.
 *
 * Review finding [59]. Moving the jsdom-backed import off module scope stopped every `qfai` command
 * paying its 910 ms — but the import then landed AFTER the clock started, so the one-off cost of
 * loading it was measured against a budget that is about parsing every block. A project configuring
 * anything under a second was reported over budget on every run however fast its blocks parsed.
 *
 * The comment where the static import used to sit predicted exactly this, and the code was arranged
 * the other way round.
 *
 * These rows once read the retired `QFAI-MOCK-099` warning. The elapsed time is no longer a finding
 * — it describes the machine, not the tree, so it travels in `ValidationResult.timings` instead of
 * moving `counts.warning` — and the rows now read the measurement `validateHtmlMock` reports. The
 * property under test is unchanged and the reason it can still be tested here is the same: the
 * measurement is taken on the far side of the import, so a caller cannot take it instead.
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
import type { HtmlMockTiming } from "../../src/core/validators/htmlMock.js";
import type { QfaiConfig } from "../../src/core/config.js";

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

/**
 * The budget itself no longer lives here: the validator reports what parsing cost and the caller
 * compares it against `uiux.htmlMockTimeout`, so these rows read the measurement directly. That the
 * configured budget is what the caller compares against is covered in `validationTimings.test.ts`.
 */
function config(): QfaiConfig {
  return {
    paths: { discussionDir: ".qfai/discussion", specsDir: ".qfai/specs" },
  } as unknown as QfaiConfig;
}

/** Runs the validator over `root` and returns only what it measured. */
async function parseMsFor(root: string): Promise<number> {
  const timing: HtmlMockTiming = { parseMs: -1 };
  await validateHtmlMock(root, "web", config(), timing);
  return timing.parseMs;
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

describe("the mock budget measures parsing, not the parser's load", () => {
  it("stays under a budget smaller than the load when the blocks parse instantly", async () => {
    const root = await treeWithOneMock();
    const parseMs = await parseMsFor(root);

    // The premise, asserted rather than assumed: the parser really was loaded, which is the only
    // reason the load cost exists to be charged. Without a block there is no import at all and this
    // row would hold for a validator that never looks at the clock.
    expect(
      LOAD_MS,
      "the mocked load must cost more than the budget, or this row proves nothing",
    ).toBeGreaterThan(BUDGET_MS);

    expect(
      parseMs,
      "the load is a real cost, and it is not the parsing this budget is for",
    ).toBeLessThan(BUDGET_MS);
  }, 30_000);

  it("still overshoots a budget the parsing itself cannot meet", async () => {
    // The other direction, so the clock is a clock and not a removed check. Zero is a budget no
    // amount of work fits inside, and every block is validated regardless.
    const root = await treeWithOneMock();
    const parseMs = await parseMsFor(root);
    expect(parseMs, "a budget of zero must still be exceeded").toBeGreaterThan(0);
  }, 30_000);

  it("attributes nothing when there is no block to parse", async () => {
    // The load is skipped entirely here, so there is no cost to attribute and the sink must be left
    // as the caller set it — not overwritten with a stopwatch reading that spans the file walk.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-mock-budget-"));
    dirs.push(root);
    const timing: HtmlMockTiming = { parseMs: -1 };

    await expect(validateHtmlMock(root, "web", config(), timing)).resolves.toEqual([]);
    expect(timing.parseMs, "an untouched sink keeps the caller's initial value").toBe(-1);
  }, 30_000);
});
