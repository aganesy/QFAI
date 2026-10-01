// QFAI:AC-0001-0185-05
// QFAI:AC-0001-0216-03
// QFAI:EX-0001-0185-51

import { afterEach, expect, it } from "vitest";

import { planFacts } from "../../../src/core/workflow/observe.js";
import { JournalRun, planOf, readyWith } from "../../unit/workflow/journalRun.js";
import {
  DECISIONS,
  decisions,
  removeStoryProjects,
  storyFacts,
  storyProject,
  TEST,
  write,
} from "./storyTreeFixture.js";

afterEach(removeStoryProjects);

const FLOW_ID = "BF-0001";
const CRITERION = "AC-0001-0001-01";

const AUTHOR_PASS = {
  step: "atdd-author",
  reason: "Every obligation of the flow already has its acceptance-layer test.",
  evidenceRef: ".qfai/report/atdd-author-pass.md",
};

// An add-feature run bound to BF-0001 over a tree whose tests annotate `layers` and whose
// decisions table holds `decisionRows`, driven to its acceptance stage, whose result passes
// `atdd-author`. Returns what `accept` made of the pass.
async function authorPassed(layers: Record<string, string[]>, decisionRows?: string[]) {
  const root = await storyProject();
  for (const [file, ids] of Object.entries(layers)) {
    await write(root, file, ids.map((id) => `// QFAI:${id}\nit("${id}", () => {});\n`).join("\n"));
  }
  if (decisionRows) await write(root, DECISIONS, decisions(decisionRows));
  const addFeature = (await planFacts())["add-feature"]?.stages ?? [];
  const run = new JournalRun(readyWith(planOf("add-feature", addFeature, ["src/**"]), FLOW_ID));
  const facts = async () => storyFacts(root, run.snapshot);
  expect(run.next(await facts()).stageKind).toBe("sdd");
  run.accept({}, await facts());
  expect(run.next(await facts()).stageKind).toBe("acceptance");
  const before = run.records.length;
  const decision = run.accept({ passes: [AUTHOR_PASS] }, await facts());
  const error = decision.verdict.error;
  return {
    state: decision.verdict.run?.state,
    reasons: error && "reasons" in error ? error.reasons : [],
    unchanged: run.records.length === before,
  };
}

const accepted = { state: "ready", reasons: [], unchanged: false };
const refused = {
  state: "running",
  reasons: [{ reason: "pass-obligation-open", subject: "atdd-author" }],
  unchanged: true,
};

it("An E2E test annotates the flow and an integration test annotates its criterion", async () => {
  expect(
    await authorPassed({
      "tests/e2e/flow.test.ts": [FLOW_ID],
      "tests/integration/criteria.test.ts": [CRITERION],
    }),
  ).toEqual(accepted);
});

// QFAI:EX-0001-0216-03
it("The criterion is annotated only in a unit test, and no exception row exempts it", async () => {
  expect(
    await authorPassed({
      "tests/e2e/flow.test.ts": [FLOW_ID],
      "tests/unit/criteria.test.ts": [CRITERION],
    }),
  ).toEqual(refused);
});

it("The flow is annotated only in an integration test", async () => {
  expect(
    await authorPassed({
      "tests/integration/flow.test.ts": [FLOW_ID, CRITERION],
    }),
  ).toEqual(refused);
});

// QFAI:EX-0001-0185-52
it("A criterion a DONE test exception names, with no example annotated", async () => {
  expect(
    await authorPassed({ "tests/e2e/flow.test.ts": [FLOW_ID], [TEST]: [] }, [
      `| DEC-0002 | Test exception: ${CRITERION} | Covered by the flow's E2E test | DONE |`,
    ]),
  ).toEqual(accepted);
});
