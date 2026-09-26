// QFAI:AC-0001-0194-04
// QFAI:EX-0001-0194-08

import { afterEach, expect, it } from "vitest";

import {
  featureRunAt,
  field,
  minimalProject,
  removeProjects,
  resultFor,
  submit,
} from "./workflowProject.js";

afterEach(removeProjects);

const review = (agentInstance: string) => ({
  role: "qa-gatekeeper",
  agentInstance,
  verdict: "PASS",
  reportRef: "qa.md",
});

const reasonsOf = (document: unknown) => {
  const reasons = field(document, "error.reasons");
  return Array.isArray(reasons) ? reasons.map((each) => field(each, "reason")) : [];
};

it("Built CLI results reviewed by their own actor, an author, the recommender, and one with no actor", async () => {
  const root = await minimalProject();
  const { runId, issued } = await featureRunAt(root, "implement");
  const history = field(issued.json, "workOrder.actorHistory");
  const recorded: unknown[][] = Array.isArray(history)
    ? history.map((entry) => [field(entry, "role"), field(entry, "agentInstance")])
    : [];
  const author = recorded.find((entry) => entry[0] === "author")?.[1];
  const reviewedBy = (reviewer: unknown, id: string) =>
    submit(
      root,
      runId,
      "accept",
      resultFor(issued.json, id, { reviewResults: [review(String(reviewer))] }),
    );
  const own = await reviewedBy("agent-implement-1", "implement-1");
  const byAuthor = await reviewedBy(author, "implement-2");
  const byRecommender = await reviewedBy("agent-route-1", "implement-3");
  const { actor: _dropped, ...noActor } = resultFor(issued.json, "implement-4");
  const anonymous = await submit(root, runId, "accept", noActor);

  expect({
    recorded: recorded.filter((entry) => entry[1] === "agent-route-1"),
    author: typeof author,
    refused: [own, byAuthor, byRecommender, anonymous].map((each) => [
      field(each.json, "error.code"),
      reasonsOf(each.json),
    ]),
  }).toEqual({
    recorded: [["recommender", "agent-route-1"]],
    author: "string",
    refused: [
      ["invalid-input", ["reviewer-not-independent"]],
      ["invalid-input", ["reviewer-not-independent"]],
      ["invalid-input", ["reviewer-not-independent"]],
      ["invalid-input", ["schema"]],
    ],
  });
});
