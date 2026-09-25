// QFAI:SPEC-0018:TC-0018-0195
// QFAI:SPEC-0018:TC-0018-0211

import { expect, it, vi } from "vitest";

import { buildSeedFixture, untypedTokens } from "../../helpers/routingEval.js";

it("TC-0018-0195 (TDD-0241): The fixture factory given a seed with an unknown fact key", async () => {
  const overlay = vi.fn(async () => {});
  const seed = { id: "ROUTE-900", repoFacts: { newCapability: true, notAFact: true } };

  const built = buildSeedFixture("fixture-root", seed, { newCapability: overlay });

  await expect(built).rejects.toMatchObject({ seedId: "ROUTE-900", keys: ["notAFact"] });
  expect(overlay).not.toHaveBeenCalled();
});

it("TC-0018-0211 (TDD-0242): The vocabulary check given a synthetic seed with an untyped token", () => {
  const vocabulary = { verify: "stage", direct_delete: "effect", unknown_class: "wish" };
  const seed = {
    id: "ROUTE-901",
    repoFacts: {},
    expected: {
      requestKind: "change",
      allowedRoutes: ["bounded-change"],
      requiresHumanInput: false,
      must: ["verify", "made_up_token"],
      forbid: ["direct_delete", "unknown_class"],
    },
  };

  expect(untypedTokens([seed], vocabulary)).toEqual(["made_up_token", "unknown_class"]);
});
