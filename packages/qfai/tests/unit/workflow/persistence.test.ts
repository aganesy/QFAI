// QFAI:SPEC-0018:TC-0018-0122

import { expect, it } from "vitest";

import { workflowExitCode } from "../../../src/cli/commands/workflow.js";
import { writeRecord } from "../../../src/core/workflow/persistence.js";

const busy: [string, string][] = [
  ["TC-0018-0122 (TDD-0146): ebusy", "EBUSY"],
  ["TC-0018-0122 (TDD-0147): eperm", "EPERM"],
  ["TC-0018-0122 (TDD-0148): eacces", "EACCES"],
];

for (const [title, code] of busy) {
  it(title, async () => {
    const calls: string[] = [];
    const write = (filePath: string) => {
      calls.push(filePath);
      return Promise.reject(Object.assign(new Error(`${code}: resource busy or locked`), { code }));
    };

    const refusal = await writeRecord(".qfai/runs/run-1/snapshot.json", "{}", write);

    expect({ refusal, exitCode: workflowExitCode(refusal), calls }).toEqual({
      refusal: { code: "io-error", message: expect.any(String), cause: code },
      exitCode: 1,
      calls: [".qfai/runs/run-1/snapshot.json"],
    });
  });
}
