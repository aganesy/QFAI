/**
 * The runs the workflow's acceptance tests start through the built CLI, on a `qfai init`
 * project. A flow-bound run starts from the tree the feature journey leaves behind: BF-0001 with
 * one story, one criterion and two examples, a test annotating each obligation, and the rule
 * that cites the examples.
 */
import { EXAMPLE_IDS, FLOW_ID, seedFlow } from "../../e2e/workflowFeatureRun.js";
import {
  acceptThenNext,
  authorizationsOf,
  commitAll,
  field,
  fileRef,
  initProject,
  resultFor,
  routedRun,
  workflow,
  write,
} from "../../e2e/workflowJourney.js";

export { EXAMPLE_IDS, FLOW_ID };

/** A report a stage names as a receipt: git ignores it, so it is no changed file. */
export const REPORT = ".qfai/report/stage-record.md";

/** A `qfai init` project holding BF-0001 and the tests that annotate it, committed. */
export async function flowProject(): Promise<string> {
  const root = await initProject();
  await seedFlow(root);
  await write(root, REPORT, "Reproduced, re-run and reviewed.\n");
  await write(root, "README.md", "# Notifications\n\nYou recieve one email per address.\n");
  commitAll(root);
  return root;
}

/** Two more flows beside BF-0001, each with nothing but its flow file. */
export async function withOtherFlows(root: string): Promise<void> {
  await write(
    root,
    ".qfai/spec/02_business-flow/business-flows.md",
    [
      "# Business Flows",
      "",
      "## Flows",
      "",
      "| BF-ID | Flow | Path |",
      "| ----- | ---- | ---- |",
      "| BF-0001 | Notify customers | `business-flow-0001/` |",
      "| BF-0002 | Bill customers | `business-flow-0002/` |",
      "| BF-0003 | Ship orders | `business-flow-0003/` |",
      "",
    ].join("\n"),
  );
  for (const [id, name] of [
    ["0002", "Bill customers"],
    ["0003", "Ship orders"],
  ]) {
    await write(
      root,
      `.qfai/spec/02_business-flow/business-flow-${id}/business-flow.md`,
      `# BF-${id}: ${name}\n\n## Purpose\n\n- ${name}.\n\n## Flow\n\n\`\`\`mermaid\nflowchart LR\n  Start --> Finish\n\`\`\`\n`,
    );
  }
  commitAll(root);
}

const base = {
  requestKind: "change",
  expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
  observedRefs: [],
  riskSignals: [],
  unresolvedQuestions: [],
  newStories: [],
  protectedTargets: [],
  rationale: "The route the request needs.",
};

/** A routing proposal for `route`, bound to BF-0001 where the plan takes a flow target. */
export function proposalFor(route: string, extra: object = {}): object {
  const byRoute: Record<string, object> = {
    direct: {
      goal: "Fix the typo in the README.",
      affectedFlowIds: [],
      proposedWriteScope: ["README.md"],
      requiredStages: ["maintenance", "verify"],
    },
    bugfix: {
      goal: "A sixth address is accepted again; refuse it.",
      affectedFlowIds: [FLOW_ID],
      proposedWriteScope: ["src/**", "tests/**"],
      requiredStages: ["diagnose", "verify"],
    },
    "bounded-change": {
      goal: "Allow ten notification addresses per customer.",
      affectedFlowIds: [FLOW_ID],
      proposedWriteScope: [
        ".qfai/spec/02_business-flow/business-flow-0001/**",
        "src/**",
        "tests/**",
      ],
      requiredStages: ["sdd_delta", "implement", "verify"],
    },
  };
  return { ...base, candidateRoute: route, ...byRoute[route], ...extra };
}

/** A bugfix run on BF-0001 whose diagnose stage reported `diagnosis`; returns the next order. */
export async function diagnosed(root: string, diagnosis: object) {
  const { runId } = await routedRun(root, proposalFor("bugfix"));
  const diagnose = workflow(root, ["next", "--run", runId]);
  const { accepted, next } = await acceptThenNext(root, runId, diagnose.json, "diagnose-1", {
    diagnosis: { reproductionRef: REPORT, ...diagnosis },
  });
  return { runId, diagnose, accepted, next };
}

/** A run of `route` driven with canned accepted results until `next` issues `stageKind`. */
export async function runAt(root: string, route: string, stageKind: string, extra: object = {}) {
  const { runId, routed } = await routedRun(root, proposalFor(route, extra));
  for (let step = 1; step <= 8; step += 1) {
    const issued = workflow(root, ["next", "--run", runId]);
    if (field(issued.json, "workOrder.stageKind") === stageKind) return { runId, routed, issued };
    await acceptThenNext(root, runId, issued.json, `stage-${String(step)}`);
  }
  throw new Error(`no ${stageKind} work order`);
}

/** The accepted verify result of `issued`: this run's full PASS and an independent QA pass. */
export async function verifyResult(root: string, issued: unknown, resultId = "verify-1") {
  await write(root, ".qfai/report/verify.json", '{"status":"PASS","scope":"full"}\n');
  return resultFor(issued, resultId, {
    testObservation: "pass",
    artifactRefs: [await fileRef(root, ".qfai/report/verify.json")],
    reviewResults: [
      { role: "qa-gatekeeper", agentInstance: "qa-1", verdict: "PASS", reportRef: REPORT },
    ],
  });
}

/** The `human_decision` authorization records a run tracked. */
export async function humanDecisions(root: string, runId: string): Promise<unknown[]> {
  return (await authorizationsOf(root, runId)).filter(
    (record) => field(record, "kind") === "human_decision",
  );
}
