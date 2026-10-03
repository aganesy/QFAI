// QFAI:AC-0001-0187-04
// QFAI:EX-0001-0187-08

import { afterEach, expect, it } from "vitest";

import { requiredReviews } from "../../helpers/requiredReviews.js";

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

it("Built CLI results reviewed by their own actor, one with no actor, and one reviewed by an earlier stage's author", async () => {
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
      resultFor(issued.json, id, {
        reviewResults: [
          ...requiredReviews(field(issued.json, "workOrder.requiredReviewerRoles"), id).filter(
            (entry) => entry.role !== "qa-gatekeeper",
          ),
          review(String(reviewer)),
        ],
      }),
    );
  const own = await reviewedBy("agent-implement-1", "implement-1");
  const { actor: _dropped, ...noActor } = resultFor(issued.json, "implement-2");
  const anonymous = await submit(root, runId, "accept", noActor);
  const byEarlierAuthor = await reviewedBy(author, "implement-3");

  expect({
    recorded: recorded.filter((entry) => entry[1] === "agent-route-1"),
    author: typeof author,
    results: [own, anonymous, byEarlierAuthor].map((each) => [
      field(each.json, "error.code"),
      reasonsOf(each.json),
    ]),
  }).toEqual({
    recorded: [["recommender", "agent-route-1"]],
    author: "string",
    results: [
      ["invalid-input", ["reviewer-not-independent"]],
      ["invalid-input", ["schema"]],
      [undefined, []],
    ],
  });
});
