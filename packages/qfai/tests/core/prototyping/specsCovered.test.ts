import { describe, expect, it } from "vitest";

import {
  checkUiContractsCoveredDrift,
  readUiContractsCovered,
} from "../../../src/core/prototyping/specsCovered.js";

describe("readUiContractsCovered", () => {
  it("accepts a non-empty, unique array of UI contract IDs", () => {
    expect(readUiContractsCovered({ uiContractsCovered: ["UI-0001", "UI-0002"] })).toEqual({
      kind: "ok",
      value: ["UI-0001", "UI-0002"],
    });
  });

  it.each([null, undefined, "string", 42, []])("rejects a non-record input: %s", (value) => {
    expect(readUiContractsCovered(value)).toEqual({
      kind: "malformed",
      reason: "record is not an object",
    });
  });

  it.each([{}, { uiContractsCovered: null }, { uiContractsCovered: [] }])(
    "rejects a missing or empty UI contract scope: %s",
    (value) => {
      expect(readUiContractsCovered(value)).toEqual({
        kind: "malformed",
        reason: "uiContractsCovered must be a non-empty array",
      });
    },
  );

  it.each([
    { uiContractsCovered: [""] },
    { uiContractsCovered: ["0001"] },
    { uiContractsCovered: ["UI-1"] },
    { uiContractsCovered: ["API-0001"] },
    { uiContractsCovered: ["UI-0001", 42] },
  ])("rejects an invalid UI contract ID: %s", (value) => {
    expect(readUiContractsCovered(value)).toEqual({
      kind: "malformed",
      reason: "uiContractsCovered entries must match UI-NNNN",
    });
  });

  it("rejects duplicate IDs so a frozen scope is unambiguous", () => {
    expect(readUiContractsCovered({ uiContractsCovered: ["UI-0001", "UI-0001"] })).toEqual({
      kind: "malformed",
      reason: "uiContractsCovered contains duplicate IDs",
    });
  });

  it.each([
    { specsCovered: ["0001"], uiContractsCovered: ["UI-0001"] },
    { frozenSpecsCovered: null, uiContractsCovered: ["UI-0001"] },
  ])("rejects a legacy scope rather than silently certifying it: %s", (value) => {
    expect(readUiContractsCovered(value)).toEqual({ kind: "legacy" });
  });
});

describe("checkUiContractsCoveredDrift", () => {
  it("reports added and removed contracts in stable order", () => {
    expect(
      checkUiContractsCoveredDrift(["UI-0003", "UI-0001"], ["UI-0004", "UI-0002", "UI-0002"]),
    ).toEqual({
      drifted: true,
      added: ["UI-0002", "UI-0004"],
      removed: ["UI-0001", "UI-0003"],
    });
  });

  it("accepts the same contract set regardless of order", () => {
    expect(checkUiContractsCoveredDrift(["UI-0002", "UI-0001"], ["UI-0001", "UI-0002"])).toEqual({
      drifted: false,
      added: [],
      removed: [],
    });
  });
});
