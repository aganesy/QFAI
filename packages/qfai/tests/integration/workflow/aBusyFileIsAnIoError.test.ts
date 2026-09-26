// QFAI:AC-0001-0196-04
// QFAI:EX-0001-0196-10

import { afterEach, expect, it } from "vitest";

import { runNamed, runWorkflow } from "../../../src/cli/commands/workflow.js";
import { ioRefusalOf } from "../../../src/core/workflow/persistence.js";
import { minimalProject, removeProjects, startRun } from "./workflowProject.js";

afterEach(removeProjects);

function failure(code: string): Error {
  return Object.assign(new Error(`${code}: the operating system refused`), { code });
}

it("A write refused with EBUSY, EPERM or EACCES, and failures that are not", () => {
  const mapped = ["EBUSY", "EPERM", "EACCES"].map((code) => ioRefusalOf(failure(code))?.cause);
  const unmapped = ["EISDIR", "ENOSPC", "ERR_INVALID_ARG_VALUE"].map((code) =>
    ioRefusalOf(failure(code)),
  );

  expect({ mapped, unmapped, plain: ioRefusalOf(new TypeError("not a system error")) }).toEqual({
    mapped: ["EBUSY", "EPERM", "EACCES"],
    unmapped: [undefined, undefined, undefined],
    plain: undefined,
  });
});

it("The io-error refusal of an operation on an existing run names the run's state and sequence", async () => {
  const root = await minimalProject();
  const runId = await startRun(root);

  expect(await runNamed({ root, runId })).toEqual({ id: runId, state: "routing", sequence: 2 });
  expect(await runNamed({ root })).toBeNull();
});

it("A programming error inside an operation is not answered as an io-error", async () => {
  // A path holding a NUL byte makes Node throw ERR_INVALID_ARG_VALUE before any file is touched.
  await expect(
    runWorkflow({ root: "nul\0root", operation: "next", runId: "run-20260926000000000" }),
  ).rejects.toMatchObject({ code: "ERR_INVALID_ARG_VALUE" });
});
