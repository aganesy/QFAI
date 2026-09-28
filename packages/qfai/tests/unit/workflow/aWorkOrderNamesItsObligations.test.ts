// QFAI:EX-0001-0193-07

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { planStage } from "./kindSteps.js";

const plan = {
  route: "bounded-change",
  stages: [
    planStage("bounded-sdd-delta", "sdd_delta"),
    planStage("bounded-implement", "implement"),
    planStage("bounded-verify", "verify"),
  ],
};
const obligations = {
  flowId: "BF-0001",
  ids: ["AC-0001-0001-01", "BF-0001", "EX-0001-0001-01", "EX-0001-0001-02"],
  exampleIds: ["EX-0001-0001-01", "EX-0001-0001-02"],
  annotated: ["EX-0001-0001-01"],
  digest: "1".repeat(64),
};

it("Issue an implement work order bound to a flow", () => {
  const decision = decide(
    {
      run: { id: "run-obligations", state: "ready", sequence: 6 },
      plan,
      flowBinding: { flowId: "BF-0001" },
      acceptedStages: [
        { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
      ],
    },
    { operation: "next" },
    { obligations },
  );
  const workOrder = decision.verdict.workOrder;
  const issued = workOrder?.obligations;

  expect({
    stageKind: workOrder?.stageKind,
    keys: issued ? Object.keys(issued).sort() : [],
    flowId: issued?.flowId,
    ids: issued?.ids,
    digestShape: /^[a-f0-9]{64}$/.test(issued?.digest ?? ""),
    carriesAnnotation: /annotated|exampleIds/.test(JSON.stringify(workOrder ?? {})),
  }).toEqual({
    stageKind: "implement",
    keys: ["digest", "flowId", "ids"],
    flowId: "BF-0001",
    ids: obligations.ids,
    digestShape: true,
    carriesAnnotation: false,
  });
});
