// QFAI:EX-0001-0201-03

import { expect, it, vi } from "vitest";

import { buildSeedFixture, untypedTokens } from "../../helpers/routingEval.js";

it("The fixture factory refuses a seed with an unknown fact key before touching the tree", async () => {
  const overlay = vi.fn(async () => {});
  const seed = { id: "ROUTE-900", repoFacts: { newCapability: true, notAFact: true } };

  const built = buildSeedFixture("fixture-root", seed, { newCapability: overlay });

  await expect(built).rejects.toMatchObject({ seedId: "ROUTE-900", keys: ["notAFact"] });
  expect(overlay).not.toHaveBeenCalled();
});

it("The vocabulary check fails a synthetic seed carrying a token the vocabulary does not type", () => {
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
