// QFAI:EX-0001-0196-10
// QFAI:EX-0001-0199-03

import { expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { workflowExitCode } from "../../../src/cli/commands/workflow.js";
import { readWorkflowMode } from "../../../src/core/config.js";
import { writeRecord } from "../../../src/core/workflow/persistence.js";

const busy: [string, string][] = [
  ["ebusy", "EBUSY"],
  ["eperm", "EPERM"],
  ["eacces", "EACCES"],
];

for (const [title, code] of busy) {
  it(title, async () => {
    const calls: string[] = [];
    const write = (filePath: string) => {
      calls.push(filePath);
      return Promise.reject(Object.assign(new Error(`${code}: resource busy or locked`), { code }));
    };

    const refusal = await writeRecord(".qfai/run/run-1/snapshot.json", "{}", write);

    expect({ refusal, exitCode: workflowExitCode(refusal), calls }).toEqual({
      refusal: { code: "io-error", message: expect.any(String), cause: code },
      exitCode: 1,
      calls: [".qfai/run/run-1/snapshot.json"],
    });
  });
}

const modes: [string, string, string | null][] = [
  ["active", "active", "active"],
  ["shadow", "shadow", "shadow"],
  ["off", "off", "off"],
  ["invalid", "always", null],
];

for (const [title, value, mode] of modes) {
  it(title, () => {
    const document: unknown = parseYaml(`workflow:
  mode: ${value}
`);

    expect(readWorkflowMode(document)).toBe(mode);
  });
}
