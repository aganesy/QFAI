import { describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/main.js";

async function captureRun(
  argv: string[],
): Promise<{ stdout: string; stderr: string; exitCode: typeof process.exitCode }> {
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  const previousExitCode = process.exitCode;
  process.exitCode = undefined;
  try {
    await run(argv, process.cwd());
    return {
      stdout: stdoutSpy.mock.calls.map((call) => String(call[0])).join(""),
      stderr: stderrSpy.mock.calls.map((call) => String(call[0])).join(""),
      exitCode: process.exitCode,
    };
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    process.exitCode = previousExitCode;
  }
}

describe("a refused argument prints the command's usage, not the whole help", () => {
  // QFAI:AC-0001-0315-01 QFAI:EX-0001-0315-01
  it("prints only the refused command's usage line and the help pointer", async () => {
    const { stdout, stderr, exitCode } = await captureRun(["sdd", "next-id", "BR", "CLI-0014"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("--base requires a value");
    expect(stdout).toContain("qfai sdd next-id <kind> [<parent-ID>] --base <local-ref>");
    expect(stdout).toContain("qfai --help");
    expect(stdout).not.toContain("qfai sdd merge-docs");
    expect(stdout).not.toContain("qfai validate");
    expect(stdout).not.toContain("Options:");
    expect(stdout.split("\n").filter((line) => line.trim() !== "")).toHaveLength(3);
  });

  // QFAI:AC-0001-0315-01 QFAI:EX-0001-0315-02
  it("narrows the usage to the command, or to every subcommand of it, on a refusal", async () => {
    const validate = await captureRun(["validate", "--profile", "bogus"]);
    expect(validate.stdout).toContain("qfai validate");
    expect(validate.stdout).toContain("qfai --help");
    expect(validate.stdout).not.toContain("Commands:");
    expect(validate.stdout).not.toContain("Options:");

    const sdd = await captureRun(["sdd"]);
    expect(sdd.exitCode).toBe(2);
    for (const line of ["qfai sdd preflight", "qfai sdd next-id", "qfai sdd merge-docs"]) {
      expect(sdd.stdout).toContain(line);
    }
    expect(sdd.stdout).toContain("qfai --help");
    expect(sdd.stdout).not.toContain("qfai atdd");
    expect(sdd.stdout).not.toContain("Options:");
  });

  // QFAI:AC-0001-0315-01 QFAI:EX-0001-0315-03
  it("keeps the whole help for --help, no command and an unknown command", async () => {
    for (const argv of [["--help"], ["sdd", "--help"], [], ["bogus"]]) {
      const { stdout } = await captureRun(argv);
      expect(stdout).toContain("qfai <command> [options]");
      expect(stdout).toContain("Options:");
    }
  });
});
