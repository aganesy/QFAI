import { describe, expect, it } from "vitest";

import { runCliCaptured } from "../helpers/cliCapture.js";

const HELP_POINTER = "Run qfai --help for every option.";

describe("a refused argument prints the command's usage, not the whole help", () => {
  // QFAI:AC-0001-0315-01 QFAI:EX-0001-0315-01
  it("prints only the refused command's usage line and the help pointer", async () => {
    const { out, err, code } = await runCliCaptured(["sdd", "next-id", "BR", "CLI-0014"]);
    expect(code).toBe(2);
    expect(err).toContain("--base requires a value");
    expect(out).toContain("qfai sdd next-id <kind> [<parent-ID>] --base <local-ref>");
    expect(out).toContain(HELP_POINTER);
    expect(out).not.toContain("qfai sdd merge-docs");
    expect(out).not.toContain("qfai validate");
    expect(out).not.toContain("Options:");
    expect(out.split("\n").filter((line) => line.trim() !== "")).toHaveLength(3);
  });

  // QFAI:AC-0001-0315-01 QFAI:EX-0001-0315-02
  it("narrows the usage to the command, or to every subcommand of it, on a refusal", async () => {
    const validate = await runCliCaptured(["validate", "--profile", "bogus"]);
    expect(validate.code).toBe(2);
    expect(validate.out).toContain("qfai validate");
    expect(validate.out).toContain(HELP_POINTER);
    expect(validate.out).not.toContain("Commands:");
    expect(validate.out).not.toContain("Options:");

    const sdd = await runCliCaptured(["sdd"]);
    expect(sdd.code).toBe(2);
    for (const line of ["qfai sdd preflight", "qfai sdd next-id", "qfai sdd merge-docs"]) {
      expect(sdd.out).toContain(line);
    }
    expect(sdd.out).toContain(HELP_POINTER);
    expect(sdd.out).not.toContain("qfai atdd");
    expect(sdd.out).not.toContain("Options:");

    const doctor = await runCliCaptured(["doctor", "--profile", "full"]);
    expect(doctor.code).toBe(2);
    expect(doctor.err).toContain("--profile");
    expect(doctor.err).toContain("full");
    expect(doctor.out).toContain("qfai doctor");
    expect(doctor.out).toContain(HELP_POINTER);
    expect(doctor.out).not.toContain("Options:");
  });

  // QFAI:AC-0001-0315-01 QFAI:EX-0001-0315-04
  it("gives every command but workflow its own usage lines on an unknown option", async () => {
    const commands = [
      "init",
      "validate",
      "report",
      "doctor",
      "db-drift",
      "session-review",
      "sdd",
      "atdd",
      "catalog",
    ];
    for (const command of commands) {
      const { out, err, code } = await runCliCaptured([command, "--bogus"]);
      expect(code, command).toBe(2);
      expect(err, command).toContain("unknown option: --bogus");
      expect(out, command).toContain(`qfai ${command}`);
      expect(out, command).toContain(HELP_POINTER);
      expect(out, command).not.toContain("Options:");
    }
  });

  // QFAI:AC-0001-0315-01 QFAI:EX-0001-0315-03
  it("keeps the whole help for --help, no command and an unknown command", async () => {
    for (const argv of [["--help"], ["sdd", "--help"], [], ["bogus"]]) {
      const { out } = await runCliCaptured(argv);
      expect(out).toContain("qfai <command> [options]");
      expect(out).toContain("Options:");
    }
  });

  // QFAI:AC-0001-0315-01 QFAI:EX-0001-0315-03
  it.each([
    { argv: ["validate", "--bogus", "--help"], reason: "unknown option: --bogus" },
    { argv: ["validate", "--format", "-h"], reason: "--format requires a value" },
  ])("prints full help and preserves the refusal for $argv", async ({ argv, reason }) => {
    const { out, err, code } = await runCliCaptured(argv);
    expect(code).toBe(2);
    expect(err).toContain(reason);
    expect(out).toContain("Commands:");
    expect(out).toContain("Options:");
  });
});
