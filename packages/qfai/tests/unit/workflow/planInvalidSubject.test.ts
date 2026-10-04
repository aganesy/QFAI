// BR-0020-0016

import { expect, it, vi } from "vitest";

import type * as Plans from "../../../src/core/workflow/plans.js";
import type { PlanLoad } from "../../../src/core/workflow/plans.js";

// A shipped plan whose refusal names an empty key: an unknown key `""` in the YAML.
vi.mock("../../../src/core/workflow/plans.js", async (importOriginal) => ({
  ...(await importOriginal<typeof Plans>()),
  loadInstalledPlan: async (): Promise<PlanLoad> => ({
    ok: false,
    refusals: [{ route: "edit-text", reason: "unknown-key", subject: "" }],
  }),
}));

const { planOf } = await import("../../../src/core/workflow/plan.js");

it("A plan refusal about an empty key names the plan file as its subject", async () => {
  const document = await planOf("unused-root", { route: "edit-text" });

  expect(document).toEqual({
    ok: false,
    message: expect.any(String),
    reasons: [
      {
        reason: "plan-invalid",
        subject: "edit-text.yml",
        file: "edit-text.yml",
        cause: "unknown-key",
      },
    ],
  });
});
