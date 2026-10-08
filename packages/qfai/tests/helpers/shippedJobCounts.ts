/**
 * The jobs a pull request event starts in a workflow, read the way the repository's own cost reader
 * reads them (`scripts/shipped-workflow-cost.mjs`, which the pinned cost declaration is computed
 * from). The header rows of the shipped workflows and the `qfai doctor` finding are both held
 * against this, so there is one reading of the templates and not a second one.
 */
import { parse } from "yaml";

import { instancesOf, jobRuns } from "../../../../scripts/shipped-workflow-cost.mjs";
import { isRecord } from "./shippedWorkflowFixtures.js";

const LAYERS = ["unit", "component", "integration", "api", "e2e"];

type Scenario = {
  event: string;
  documentsOnly: boolean;
  documentsTouched: boolean;
  testScripts: string[];
};

/** A pull request event whose change no lane of any file reads. */
export const IDLE: Scenario = {
  event: "pull_request",
  documentsOnly: true,
  documentsTouched: false,
  testScripts: [],
};

/** A pull request event whose change every lane reads, in a project declaring every test script. */
export const LANE_RUNS: Scenario = {
  event: "pull_request",
  documentsOnly: false,
  documentsTouched: true,
  testScripts: LAYERS,
};

export type Counted = { total: number; ids: string };

export function jobsOf(body: string): Record<string, unknown> {
  const doc: unknown = parse(body);
  const jobs = isRecord(doc) ? doc["jobs"] : undefined;
  if (!isRecord(jobs)) throw new Error("the workflow declares no jobs");
  return jobs;
}

/** The jobs a scenario starts: how many runners, and the ids in file order, a matrix as `id xN`. */
export function startedBy(jobs: Record<string, unknown>, scenario: Scenario): Counted {
  let total = 0;
  const ids: string[] = [];
  for (const [id, job] of Object.entries(jobs)) {
    if (!jobRuns(job, scenario)) continue;
    const instances: number = instancesOf(job, scenario);
    total += instances;
    ids.push(instances === 1 ? id : `${id} x${instances}`);
  }
  return { total, ids: ids.join(", ") };
}
