/**
 * The command that hands out story-tree IDs no open pull request has taken.
 *
 * Nothing here makes a call or runs git. What the cases hold is the reading of
 * `git grep` and `git fetch` output and the arithmetic on the IDs read, because
 * those are where a silent mistake hands two branches the same number.
 */
import { describe, expect, it } from "vitest";

import { isContractId, isStoryTreeId, type StoryTreeIdKind } from "../../src/core/storyTree/ids.js";
import {
  added,
  collisions,
  fetchedHeads,
  idsFromMatches,
  isStoryId,
  nextFree,
  parseScope,
  pullsFrom,
  run,
} from "../../../../scripts/story-ids.mjs";

const KINDS: StoryTreeIdKind[] = ["BF", "US", "AC", "EX", "BR", "DEC", "OQ"];

/** Whether the validator accepts a value as any story-tree or contract ID. */
function validatorAccepts(value: string): boolean {
  return isContractId(value) || KINDS.some((kind) => isStoryTreeId(value, kind));
}

function shapeOf(scope: string): NonNullable<ReturnType<typeof parseScope>> {
  const shape = parseScope(scope);
  if (shape === undefined) throw new Error(`${scope} is not a scope`);
  return shape;
}

describe("the ID grammar", () => {
  it.each([
    "BF-0001",
    "US-0001-0054",
    "AC-0001-0054-04",
    "EX-0001-0054-06",
    "BR-0016-0100",
    "DEC-0990",
    "OQ-0012",
    "CLI-0018",
    "API-0002",
    "DB-0003",
    "UI-0100",
    "DEC-0001-0042",
    "AC-0001-0010",
    "BR-0010",
    "EX-0001-0054-006",
    "US-0001",
  ])("agrees with the validator on %s", (value) => {
    expect(isStoryId(value)).toBe(validatorAccepts(value));
  });
});

describe("reading git grep -o output", () => {
  it("keeps the ID and drops the character matched before it", () => {
    const output = ["DEC-0990", "|BR-0016-0100", " EX-0001-0054-06", "(AC-0001-0054-04"].join("\n");
    expect([...idsFromMatches(output)].sort()).toEqual([
      "AC-0001-0054-04",
      "BR-0016-0100",
      "DEC-0990",
      "EX-0001-0054-06",
    ]);
  });

  it("ignores a legacy decision ID that only starts like a current one", () => {
    expect([...idsFromMatches(" DEC-0001-0042\n AC-0001-0010\n")]).toEqual([]);
  });

  it("reads CRLF output", () => {
    expect([...idsFromMatches("DEC-0001\r\n OQ-0002\r\n")].sort()).toEqual(["DEC-0001", "OQ-0002"]);
  });
});

describe("the next free ID", () => {
  const taken = new Set([
    "DEC-0989",
    "DEC-0012",
    "BR-0016-0101",
    "BR-0017-0400",
    "EX-0001-0054-08",
    "EX-0001-0055-20",
    "AC-0001-0054-04",
    "US-0001-0115",
    "US-0002-0200",
    "CLI-0022",
    "UI-0030",
  ]);

  it.each([
    ["DEC", "DEC-0990"],
    ["OQ", "OQ-0001"],
    ["BR-0016", "BR-0016-0102"],
    ["EX-0001-0054", "EX-0001-0054-09"],
    ["AC-0001-0054", "AC-0001-0054-05"],
    ["US-0001", "US-0001-0116"],
    ["CLI", "CLI-0031"],
    ["API", "API-0031"],
  ])("%s answers %s", (scope, expected) => {
    expect(nextFree(shapeOf(scope), taken)).toBe(expected);
  });

  it("answers nothing once the scope is full", () => {
    expect(nextFree(shapeOf("EX-0001-0054"), new Set(["EX-0001-0054-99"]))).toBeUndefined();
  });

  it.each(["", "DECISION", "BR", "EX-0001", "US-0001-0001", "CON-0001", "dec"])(
    "refuses the scope %j",
    (scope) => {
      expect(parseScope(scope)).toBeUndefined();
    },
  );
});

describe("collisions", () => {
  const base = new Set(["DEC-0989", "BR-0016-0099"]);

  it("names an ID this branch adds that another head adds too", () => {
    const mine = added(new Set(["DEC-0989", "DEC-0990", "BR-0016-0100"]), base);
    const others = [
      { label: "main", ids: added(new Set(["DEC-0989", "DEC-0990"]), base) },
      { label: "#12 (feature)", ids: added(new Set(["DEC-0990", "BR-0016-0100"]), base) },
    ];
    expect(collisions(mine, others)).toEqual([
      { id: "BR-0016-0100", heads: ["#12 (feature)"] },
      { id: "DEC-0990", heads: ["main", "#12 (feature)"] },
    ]);
  });

  it("does not count an ID both heads inherited from the base", () => {
    const mine = added(new Set(["DEC-0989"]), base);
    expect(collisions(mine, [{ label: "main", ids: new Set(["DEC-0989"]) }])).toEqual([]);
  });
});

describe("reading the hosted side", () => {
  it("takes number, branch and repository from the listing", () => {
    const body = JSON.stringify([
      { number: 12, head: { ref: "feature", repo: { full_name: "owner/repo" } } },
      { number: 13, head: { ref: "fork-branch", repo: null } },
      { head: { ref: "no-number" } },
    ]);
    expect(pullsFrom(body)).toEqual([
      { number: 12, branch: "feature", repo: "owner/repo" },
      { number: 13, branch: "fork-branch", repo: undefined },
    ]);
  });

  it("answers nothing for a body that is not a listing", () => {
    expect(pullsFrom("{}")).toBeUndefined();
    expect(pullsFrom("not json")).toBeUndefined();
  });

  it("takes each head's commit from FETCH_HEAD, not from the listing", () => {
    const fetchHead = [
      "0fbae1fb0d3485fc2ec18598948a60327ecb80c4\t\tbranch 'main' of https://github.com/owner/repo",
      "085cccdac1948e8c66568c4c8cabeb8bc3c8a23a\tnot-for-merge\t'refs/pull/2515/head' of https://github.com/owner/repo",
      "63a8351422cfd9318233e2535a7f25e32a0a1d7b\t\t'refs/pull/2514/head' of https://github.com/owner/repo",
    ].join("\n");
    expect([...fetchedHeads(fetchHead)]).toEqual([
      [2515, "085cccdac1948e8c66568c4c8cabeb8bc3c8a23a"],
      [2514, "63a8351422cfd9318233e2535a7f25e32a0a1d7b"],
    ]);
  });
});

describe("arguments", () => {
  it.each([[[]], [["list"]], [["next"]], [["next", "BR"]]])(
    "refuses %j before any call",
    (argv) => {
      expect(run(argv)).toBe(2);
    },
  );
});
