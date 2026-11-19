/**
 * `--format github` prints its summary and notes as plain log lines beside the workflow
 * commands, and the runner reads every line of stdout as a possible command. A path in those
 * lines comes from the configuration and the run, so a path carrying a newline would start a
 * line of its own, and `::stop-commands::<token>` on that line would silence every annotation
 * after it.
 *
 * The emitter is driven rather than the escaping helper, because the property is that the lines
 * written to stdout keep each path on its own line, escaped the way a notice's text is.
 */
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { emitGitHubOutput } from "../../src/cli/commands/validate.js";
import type { ValidationResult } from "../../src/core/types.js";

/** The command a hostile path would open if it were printed raw. */
const INJECTED_COMMAND = "::stop-commands::7f3a9c";

/** The lines `emitGitHubOutput` writes for a clean run with these report and run-log paths. */
function emittedLines(root: string, jsonPath: string, runLogPath: string): string[] {
  const result: ValidationResult = {
    toolVersion: "0.0.0-test",
    profile: "full",
    issues: [],
    counts: { info: 0, warning: 0, error: 0 },
  };
  const chunks: string[] = [];
  const writeSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    });
  try {
    emitGitHubOutput(result, root, jsonPath, {
      failOn: "error",
      status: "pass",
      runLogPath,
    });
  } finally {
    writeSpy.mockRestore();
  }
  return chunks.join("").split("\n").filter(Boolean);
}

describe("the GitHub summary keeps each path on one log line", () => {
  const root = path.resolve("qfai-summary-root");

  it("does not let the report path open a command of its own", () => {
    const jsonPath = path.join(root, `report\n${INJECTED_COMMAND}`, "validate.json");
    const lines = emittedLines(root, jsonPath, ".qfai/report/run-1");
    expect(lines.filter((line) => line.startsWith("::"))).toEqual([]);
    const reportLine = lines.find((line) => line.includes("--format text for the details"));
    expect(reportLine).toContain(`report\\n${INJECTED_COMMAND}`);
  });

  it("does not let the run-log path open a command of its own", () => {
    const lines = emittedLines(
      root,
      path.join(root, "validate.json"),
      `.qfai/report/run\r\n${INJECTED_COMMAND}`,
    );
    expect(lines.filter((line) => line.startsWith("::"))).toEqual([]);
    expect(lines).toContain(
      `qfai validate note: see .qfai/report/run\\r\\n${INJECTED_COMMAND} for the run-log.`,
    );
  });

  it("keeps `%` as written, since the runner decodes escapes only inside a command", () => {
    const lines = emittedLines(root, path.join(root, "validate.json"), ".qfai/report/100%");
    expect(lines).toContain("qfai validate note: see .qfai/report/100% for the run-log.");
  });
});
