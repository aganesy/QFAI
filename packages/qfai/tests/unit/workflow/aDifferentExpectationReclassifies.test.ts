import { expect, it } from "vitest";

import { planFacts } from "../../../src/core/workflow/observe.js";
import { JournalRun, planOf, readyWith } from "./journalRun.js";

const FLOW = "BF-0007";
const diagnosis = {
  verdict: "expectation-differs",
  reproductionRef: "evidence/expectation-reproduction.json",
  matchedIds: ["EX-0007-0002-01"],
};

// QFAI:EX-0001-0186-08
it("A diagnose result expectation-differs", async () => {
  const plans = await planFacts();
  const facts = { plans, flows: [FLOW] };
  const plan = planOf("fix-defect", plans["fix-defect"]?.stages ?? [], ["src/**"]);
  const run = new JournalRun(readyWith(plan, FLOW));
  const diagnose = run.next(facts);
  const accepted = run.accept({ diagnosis }, facts);
  const last = run.records.at(-1);
  const followUp = run.next(facts);

  expect({
    diagnose: diagnose.stageKind,
    edge: [last?.from, last?.to],
    events: accepted.events.map((event) => event.type),
    followUp: [followUp.stageKind, followUp.reroute],
  }).toEqual({
    diagnose: "diagnose",
    edge: ["running", "routing"],
    events: ["declared-reroute"],
    followUp: [
      "route",
      {
        route: "decide-acceptance",
        fromStep: "implement-diagnose",
        outcome: "expectation-differs",
      },
    ],
  });
});
