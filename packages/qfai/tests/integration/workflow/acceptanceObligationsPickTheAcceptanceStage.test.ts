// QFAI:AC-0001-0192-05
// QFAI:EX-0001-0192-51

import { afterEach, expect, it } from "vitest";

import { planFacts } from "../../../src/core/workflow/observe.js";
import { JournalRun, planOf, readyWith } from "../../unit/workflow/journalRun.js";
import { removeStoryProjects, storyFacts, storyProject, write } from "./storyTreeFixture.js";

afterEach(removeStoryProjects);

const FLOW_ID = "BF-0001";
const CRITERION = "AC-0001-0001-01";

// A bounded-change run bound to BF-0001 over a tree whose tests annotate `layers`, driven
// through its sdd_delta stage; returns the stage `next` issues after it.
async function stageAfterSddDelta(layers: Record<string, string[]>): Promise<string> {
  const root = await storyProject();
  for (const [file, ids] of Object.entries(layers)) {
    await write(root, file, ids.map((id) => `// QFAI:${id}\nit("${id}", () => {});\n`).join("\n"));
  }
  const bounded = (await planFacts())["bounded-change"]?.stages ?? [];
  const run = new JournalRun(readyWith(planOf("bounded-change", bounded, ["src/**"]), FLOW_ID));
  const facts = async () => storyFacts(root, run.snapshot);
  expect(run.next(await facts()).stageKind).toBe("sdd_delta");
  run.accept({}, await facts());
  return run.next(await facts()).stageKind;
}

it("An E2E test annotates the flow and an integration test annotates its criterion", async () => {
  expect(
    await stageAfterSddDelta({
      "tests/e2e/flow.test.ts": [FLOW_ID],
      "tests/integration/criteria.test.ts": [CRITERION],
    }),
  ).toBe("implement");
});

it("The criterion is annotated only in a unit test", async () => {
  expect(
    await stageAfterSddDelta({
      "tests/e2e/flow.test.ts": [FLOW_ID],
      "tests/unit/criteria.test.ts": [CRITERION],
    }),
  ).toBe("acceptance");
});

it("The flow is annotated only in an integration test", async () => {
  expect(
    await stageAfterSddDelta({
      "tests/integration/flow.test.ts": [FLOW_ID, CRITERION],
    }),
  ).toBe("acceptance");
});
