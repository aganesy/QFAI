// QFAI:EX-0001-0196-22
// QFAI:EX-0001-0193-10
// QFAI:EX-0001-0196-25

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { receiptValidityOf, routingDependenciesOf } from "../../../src/core/workflow/observe.js";
import { JournalRun, planOf, readyWith, stage } from "./journalRun.js";

const FLOW = "BF-0007";
const bounded = [
  stage("bounded-sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"),
  stage("bounded-implement", "implement", "qfai-implement", "implement"),
  stage("bounded-verify", "verify", "qfai-verify", "verify-full"),
];
const obligations = {
  flowId: FLOW,
  ids: [FLOW],
  exampleIds: [],
  annotated: [],
  digest: "1".repeat(64),
};

// A bounded run over `src/**` whose implement stage found a finding only acceptance authoring
// repairs, so routing settled a narrower plan over `src/api/**`.
function narrowed() {
  const facts = { flows: [FLOW], obligations };
  const run = new JournalRun(readyWith(planOf("bounded-change", bounded, ["src/**"]), FLOW));
  run.next(facts);
  run.accept({}, facts);
  run.next(facts);
  const finding = {
    findingCode: "QFAI-TRACE-002",
    path: "src/ui/button.ts",
    cause: "The criterion has no acceptance test",
    owningFlow: FLOW,
    detectingCommand: "qfai validate",
    resolvingOwner: "qfai-atdd",
    blockingExtent: "run",
  };
  expect(run.accept({ outcome: "needs_repair", debts: [finding] }, facts).verdict.run?.state).toBe(
    "routing",
  );
  run.next(facts);
  const proposal = {
    requestKind: "change",
    candidateRoute: "bounded-change",
    goal: "Change the API only.",
    expectedBehaviorRefs: [{ kind: "flow-id", ref: FLOW }],
    observedRefs: [],
    affectedFlowIds: [FLOW],
    newStories: [],
    proposedWriteScope: ["src/api/**"],
    protectedTargets: [],
    requiredStages: ["sdd_delta", "implement", "verify"],
  };
  const plans = { "bounded-change": { route: "bounded-change", stages: bounded } };
  expect(run.accept({ proposal }, { flows: [FLOW], plans }).verdict.run?.state).toBe("ready");
  return { run, facts, routing: run.snapshot.routingReceiptRef ?? "" };
}

it("next after a replan that narrowed the write scope, with a file changed under the earlier scope", () => {
  const { run, facts, routing } = narrowed();
  const valid = { [routing]: "valid" } as const;
  const under = (changed: string[]) =>
    run.apply(
      { operation: "next" },
      { ...facts, receiptValidity: valid, observedChangedPaths: changed },
    ).verdict;

  const earlier = under(["src/ui/button.ts"]);
  expect(earlier.workOrder?.stageKind).toBe("sdd_delta");
});

it("A file outside every scope the run was ever issued, after the replan", () => {
  const { run, facts, routing } = narrowed();

  const decision = run.apply(
    { operation: "next" },
    { ...facts, receiptValidity: { [routing]: "valid" }, observedChangedPaths: ["docs/stray.md"] },
  );

  expect(decision.verdict.error).toMatchObject({
    code: "fail-closed",
    cause: "invariant-violation",
  });
});

// A run in `ready` whose journal holds `replans` replans already, each settled by routing.
function replanned(replans: number) {
  const plan = planOf("bounded-change", bounded, ["src/**"]);
  const seed = readyWith(plan, FLOW);
  for (let index = 1; index <= replans; index += 1) {
    seed.push(
      { event: "required-plan-revision", from: "ready", to: "routing" },
      {
        event: "plan-accepted",
        from: "routing",
        to: "ready",
        plan,
        resultRef: `results/route-${index}.json`,
        dependencies: [],
      },
    );
  }
  return new JournalRun(seed);
}

it("next once the routing receipt went stale, with the replan budget spent and with one left", () => {
  const next = (run: JournalRun) => {
    const stale = { [run.snapshot.routingReceiptRef ?? ""]: "stale" } as const;
    return run.apply({ operation: "next" }, { flows: [FLOW], obligations, receiptValidity: stale });
  };
  const exhausted = replanned(3);
  const spent = next(exhausted);
  const again = exhausted.apply({ operation: "next" }, { flows: [FLOW], obligations });
  const left = next(replanned(2));
  const halt = { blocker: "budget-exhausted", owner: "operator", subjects: ["replan"] };

  expect({
    spent: [spent.verdict.run?.state, spent.verdict.halt, spent.events.map((event) => event.type)],
    folded: [exhausted.snapshot.run.state, exhausted.snapshot.halt],
    again: [again.verdict.ok, again.verdict.workOrder, again.verdict.halt],
    left: [left.verdict.run?.state, left.events.map((event) => event.type)],
  }).toEqual({
    spent: ["blocked", halt, ["budget-exhausted"]],
    folded: ["blocked", halt],
    again: [true, null, halt],
    left: ["routing", ["required-plan-revision"]],
  });
});

it("The routing receipt after the run's tests rewrite a log the proposal cited as evidence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-routing-evidence-"));
  try {
    await writeFile(path.join(root, "failure.log"), "500 Internal Server Error\n");
    await writeFile(path.join(root, "contract.md"), "# Contract\n");
    const proposal = {
      expectedBehaviorRefs: [{ kind: "path" as const, ref: "contract.md" }],
      observedRefs: [{ kind: "evidence" as const, ref: "failure.log" }],
      proposedWriteScope: ["src/**"],
    };
    const dependencies = await routingDependenciesOf(root, proposal);
    await writeFile(path.join(root, "failure.log"), "all tests pass\n");
    const snapshot = {
      run: { id: "run-evidence", state: "ready", sequence: 3 },
      routingReceiptRef: "results/route-1.json",
      routingDependencies: dependencies,
    };

    expect({
      classes: dependencies.map((each) => `${each.path}:${each.class}`),
      validity: (await receiptValidityOf(root, snapshot))["results/route-1.json"],
    }).toEqual({
      classes: ["contract.md:normative", "failure.log:historical_observation"],
      validity: "valid",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("A proposal citing one file both as a normative path and as observed evidence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-routing-both-"));
  try {
    await writeFile(path.join(root, "contract.md"), "# Contract\n");
    const both = {
      expectedBehaviorRefs: [{ kind: "path" as const, ref: "contract.md" }],
      observedRefs: [{ kind: "evidence" as const, ref: "contract.md" }],
      proposedWriteScope: ["src/**"],
    };
    const classes = (await routingDependenciesOf(root, both)).map((each) => each.class);

    expect(classes).toEqual(["normative"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("resume of a run blocked on its spent replan budget, with the routing receipt still stale and once it holds again", () => {
  const blocked = () => {
    const run = replanned(3);
    const stale = { [run.snapshot.routingReceiptRef ?? ""]: "stale" } as const;
    run.apply({ operation: "next" }, { flows: [FLOW], obligations, receiptValidity: stale });
    return run;
  };
  const still = blocked();
  const before = still.snapshot.run.sequence;
  const stale = { [still.snapshot.routingReceiptRef ?? ""]: "stale" } as const;
  const resumed = still.apply(
    { operation: "resume" },
    { flows: [FLOW], obligations, receiptValidity: stale },
  );
  const cleared = blocked();
  const valid = { [cleared.snapshot.routingReceiptRef ?? ""]: "valid" } as const;
  const released = cleared.apply(
    { operation: "resume" },
    { flows: [FLOW], obligations, receiptValidity: valid },
  );

  expect({
    still: [
      resumed.verdict.run?.state,
      resumed.events.length,
      still.snapshot.run.sequence - before,
    ],
    halt: resumed.verdict.halt,
    released: [released.verdict.run?.state, released.verdict.workOrder?.stageKind],
  }).toEqual({
    still: ["blocked", 0, 0],
    halt: { blocker: "budget-exhausted", owner: "operator", subjects: ["replan"] },
    released: ["running", "sdd_delta"],
  });
});
