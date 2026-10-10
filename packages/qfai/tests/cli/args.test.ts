import { describe, expect, it } from "vitest";

import type { ParsedArgs } from "../../src/cli/lib/args.js";
import { parseArgs } from "../../src/cli/lib/args.js";

describe("parseArgs", () => {
  it("routes story and flow scaffold options without accepting them on other commands", () => {
    const story = parseArgs(["atdd", "scaffold", "--story", "US-0008-0007"], process.cwd());
    expect(story.invalid).toBe(false);
    expect(story.options.atddStoryId).toBe("US-0008-0007");
    const flow = parseArgs(["atdd", "scaffold", "--flow", "BF-0008"], process.cwd());
    expect(flow.invalid).toBe(false);
    expect(flow.options.atddFlowId).toBe("BF-0008");
    expect(parseArgs(["report", "--story", "US-0008-0007"], process.cwd()).invalid).toBe(true);
  });

  it("does not skip other options when --format has no value", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--format", "--strict"], cwd);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.help).toBe(true);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.validateFormat).toBe("text");
  });

  it("sets validateFormat when --format has an explicit value", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--format", "github", "--strict"], cwd);
    expect(parsed.options.help).toBe(false);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.validateFormat).toBe("github");
  });

  it("accepts --dir on init, which is the only command that reads it", () => {
    const parsed = parseArgs(["init", "--dir", "/tmp/out"], process.cwd());
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.dir).toBe("/tmp/out");
  });

  for (const command of ["validate", "report", "doctor", "atdd"] as const) {
    it(`rejects --dir on ${command}, which never reads it`, () => {
      // `options.dir` is read at exactly one place — the `init` arm of the
      // dispatch. Anywhere else the flag reached nothing and `resolveRoot` fell
      // through to the current directory, so `validate --dir <path>` answered
      // about the CURRENT tree and `report --dir <path>` overwrote its
      // `report.md`. A confident verdict about a tree the operator did not name
      // is worse than an error, because it looks like an answer.
      const parsed = parseArgs([command, "--dir", "/tmp/elsewhere"], process.cwd());
      expect(parsed.invalid).toBe(true);
    });
  }

  describe("shared flags reach only the commands that read them", () => {
    // The owner lists are derived from where `main.ts` reads each field. A flag
    // accepted where nothing reads it reaches nothing and the run proceeds as if
    // it had not been given — `--dry-run` most sharply, since an operator who
    // believes a run is a rehearsal gets a real one.
    const OWNERS = [
      ["--force", [["init"]], ["validate"]],
      ["--yes", [["init"], ["doctor"]], ["validate", "report"]],
      ["--dry-run", [["init"], ["doctor"]], ["validate", "report", "atdd"]],
    ] as const;

    for (const [flag, owners, strangers] of OWNERS) {
      for (const owner of owners) {
        it(`accepts ${flag} on ${owner.join(" ")}`, () => {
          const parsed = parseArgs([...owner, flag], process.cwd());
          expect(parsed.invalid).toBe(false);
        });
      }
      for (const stranger of strangers) {
        it(`rejects ${flag} on ${stranger}, which never reads it`, () => {
          const parsed = parseArgs([stranger, flag], process.cwd());
          expect(parsed.invalid).toBe(true);
        });
      }
    }
  });

  it("still accepts --root on the commands that resolve a target", () => {
    // The flag the operator wanted. A rejection that did not leave this working
    // would have removed the only way to point those commands at a tree.
    const parsed = parseArgs(["validate", "--root", "/tmp/project"], process.cwd());
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.root).toBe("/tmp/project");
    expect(parsed.options.rootExplicit).toBe(true);
  });

  it("parses --fail-on {never|warning|error} and rejects other values", () => {
    const cwd = process.cwd();
    for (const value of ["never", "warning", "error"] as const) {
      const parsed = parseArgs(["validate", "--fail-on", value], cwd);
      expect(parsed.invalid).toBe(false);
      expect(parsed.options.failOn).toBe(value);
    }
    // A misspelled or mis-cased threshold must not fall through to the
    // config default: the gate would then silently differ from the flag.
    for (const value of ["errr", "nver", "ERROR"]) {
      const bogus = parseArgs(["validate", "--fail-on", value], cwd);
      expect(bogus.invalid).toBe(true);
      expect(bogus.options.help).toBe(true);
      expect(bogus.options.failOn).toBeUndefined();
    }
  });

  it("requires a value for --fail-on", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--fail-on"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("does not consume other options as a value for --out", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["report", "--out", "--format", "json"], cwd);
    expect(parsed.options.help).toBe(true);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.reportFormat).toBe("json");
  });

  it("parses --base-url for report", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(
      ["report", "--base-url", "https://example.com/", "--format", "md"],
      cwd,
    );
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.reportBaseUrl).toBe("https://example.com/");
    expect(parsed.options.reportFormat).toBe("md");
  });

  it("requires a value for --base-url", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["report", "--base-url", "--format", "md"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("parses --profile for validate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--profile", "atdd"], cwd);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.profile).toBe("atdd");
  });

  it("parses sdd profile for validate", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--profile", "sdd"], cwd);
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.profile).toBe("sdd");
  });

  it("marks invalid --profile value", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--profile", "unknown"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
  });

  it("parses --verbose for init and defaults it off", () => {
    const cwd = process.cwd();
    const withFlag = parseArgs(["init", "--dir", ".", "--verbose"], cwd);
    expect(withFlag.invalid).toBe(false);
    expect(withFlag.options.verbose).toBe(true);

    const without = parseArgs(["init", "--dir", "."], cwd);
    expect(without.invalid).toBe(false);
    expect(without.options.verbose).toBe(false);
  });

  // --verbose is published in the help text as an init-only option, so a
  // misuse must surface rather than be silently dropped: automation that
  // asked for the expanded list would otherwise get a success exit code and
  // no detail.
  it("rejects --verbose on commands other than init", () => {
    const cwd = process.cwd();
    for (const command of ["validate", "doctor", "report"]) {
      const parsed = parseArgs([command, "--verbose"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.help).toBe(true);
      expect(parsed.options.verbose).toBe(false);
    }
  });

  describe("validate/report --flow", () => {
    for (const command of ["validate", "report"] as const) {
      it(`collects repeatable flow IDs on ${command}`, () => {
        const parsed = parseArgs(
          [command, "--flow", "BF-0002", "--flow", "BF-0001"],
          process.cwd(),
        );
        expect(parsed.invalid).toBe(false);
        expect(
          command === "validate" ? parsed.options.validateFlowIds : parsed.options.reportFlowIds,
        ).toEqual(["BF-0002", "BF-0001"]);
      });
    }

    it("rejects --flow on commands that do not consume it", () => {
      const parsed = parseArgs(["init", "--flow", "BF-0001"], process.cwd());
      expect(parsed.invalid).toBe(true);
    });
  });

  // `--dry-run` is implemented by init and doctor. On every other command it
  // used to be accepted and then ignored, so an operator reaching for a
  // preview flag got a real write instead.
  describe("--dry-run scope", () => {
    it.each(["init", "doctor"])("is accepted on %s", (command) => {
      const parsed = parseArgs([command, "--dry-run"], process.cwd());
      expect(parsed.invalid).toBe(false);
      expect(parsed.options.dryRun).toBe(true);
    });

    it.each([["validate"], ["report"], ["atdd"], ["discussion"]])(
      "marks --dry-run invalid on %s and leaves dryRun off",
      (command) => {
        const parsed = parseArgs([command, "--dry-run"], process.cwd());
        expect(parsed.invalid).toBe(true);
        expect(parsed.options.help).toBe(true);
        expect(parsed.options.dryRun).toBe(false);
      },
    );

    it("does not consume a following token when rejecting --dry-run", () => {
      const parsed = parseArgs(["validate", "--dry-run", "--format", "github"], process.cwd());
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.validateFormat).toBe("github");
    });

    it("keeps honoring --dry-run alongside doctor --clean", () => {
      const parsed = parseArgs(["doctor", "--clean", "--dry-run"], process.cwd());
      expect(parsed.invalid).toBe(false);
      expect(parsed.options.doctorClean).toBe(true);
      expect(parsed.options.dryRun).toBe(true);
    });
  });

  // The rejection reason (invalidReason) is the diagnostic main.ts writes to
  // stderr. Pin that the output names which token was rejected.
  describe("invalidReason", () => {
    it("names the flag when a value-taking flag has no value", () => {
      const parsed = parseArgs(["validate", "--format"], process.cwd());
      expect(parsed.invalid).toBe(true);
      expect(parsed.invalidReason).toBe("qfai validate: --format requires a value.");
    });

    it("names the flag, the rejected value and the accepted set", () => {
      const parsed = parseArgs(["validate", "--profile", "bogus"], process.cwd());
      expect(parsed.invalid).toBe(true);
      expect(parsed.invalidReason).toContain("--profile");
      expect(parsed.invalidReason).toContain('"bogus"');
      expect(parsed.invalidReason).toContain("full");
    });

    it("keeps the first reason when several rejections fire", () => {
      const parsed = parseArgs(["validate", "--format", "--profile"], process.cwd());
      expect(parsed.invalidReason).toBe("qfai validate: --format requires a value.");
    });

    it("reuses the per-family subcommand wording when the subcommand is missing", () => {
      const cwd = process.cwd();
      expect(parseArgs(["atdd"], cwd).invalidReason).toBe(
        "qfai atdd: unknown or missing subcommand. Expected: scaffold",
      );
      expect(parseArgs(["discussion"], cwd).invalidReason).toBe(
        "qfai discussion: unknown or missing subcommand. Expected: list|use",
      );
      expect(parseArgs(["sdd"], cwd).invalidReason).toBe(
        "qfai sdd: unknown or missing subcommand. Expected: preflight",
      );
    });

    it("quotes the rejected subcommand token", () => {
      const parsed = parseArgs(["atdd", "bogusaction"], process.cwd());
      expect(parsed.invalid).toBe(true);
      expect(parsed.invalidReason).toBe(
        'qfai atdd: unknown subcommand "bogusaction". Expected: scaffold',
      );
    });

    it("reports a flag used on a command that does not accept it", () => {
      const parsed = parseArgs(["init", "--flow", "BF-0001"], process.cwd());
      expect(parsed.invalid).toBe(true);
      expect(parsed.invalidReason).toBe("qfai init: --flow is not valid for this command.");
    });

    it("leaves invalidReason unset when the arguments parse", () => {
      const parsed = parseArgs(["validate", "--profile", "full"], process.cwd());
      expect(parsed.invalid).toBe(false);
      expect(parsed.invalidReason).toBeUndefined();
    });
  });

  // Unknown-flag handling. Pre-fix the flag switch ended with a bare
  // `default: break;`, so any unrecognized `--token` was silently
  // dropped: `qfai init --dryrun` performed a REAL init and still
  // exited 0. `.qfai/spec/03_contract/cli/cli-0009-qfai-init.md` reserves exit 2 for
  // CLI-arg errors, so an unknown flag must markInvalid() with 2.
  describe("unknown flags", () => {
    // The usage-error code is one number for every command. Asserted over a
    // spread of commands rather than one, because a single case cannot tell a
    // default from a special case.
    it.each(["init", "validate", "report", "doctor", "atdd", "discussion"])(
      "reserves the same usage-error code on %s",
      (command) => {
        const parsed = parseArgs([command, "--bogus-flag"], process.cwd());
        expect(parsed.invalid).toBe(true);
        expect(parsed.options.invalidExitCode, `${command} must use the shared code`).toBe(2);
      },
    );

    it("marks an unrecognized --flag invalid and reserves exit 2", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["init", "--bogus-flag", "--dry-run"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.help).toBe(true);
      expect(parsed.options.invalidExitCode).toBe(2);
      expect(parsed.options.unknownFlags).toEqual(["--bogus-flag"]);
    });

    it("does not let a --dry-run typo fall through to a real init", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["init", "--dryrun"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.dryRun).toBe(false);
      expect(parsed.options.invalidExitCode).toBe(2);
      expect(parsed.options.unknownFlags).toEqual(["--dryrun"]);
    });

    it("collects every unknown flag in argv order", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["validate", "--nope", "--strict", "--also-nope"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.strict).toBe(true);
      expect(parsed.options.unknownFlags).toEqual(["--nope", "--also-nope"]);
    });

    it("keeps positional subcommand arguments exempt", () => {
      const cwd = process.cwd();
      const use = parseArgs(["discussion", "use", "disc-0001"], cwd);
      expect(use.invalid).toBe(false);
      expect(use.options.discussionId).toBe("disc-0001");
      expect(use.options.unknownFlags).toEqual([]);
    });

    it("routes a missing flag value to exit 2 as well", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["validate", "--format"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.invalidExitCode).toBe(2);
    });

    // A leading unknown option is consumed by `command = args.shift()`
    // before the flag loop, so it used to reach main.ts's
    // unknown-command branch, which sets no exit code (exit 0).
    it("rejects an unknown option in the command position", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["--bogus"], cwd);
      expect(parsed.command).toBeNull();
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.unknownFlags).toEqual(["--bogus"]);
      expect(parsed.options.invalidExitCode).toBe(2);
    });

    it("still keeps a leading --help/-h a clean help request", () => {
      const cwd = process.cwd();
      for (const token of ["--help", "-h"]) {
        const parsed = parseArgs([token], cwd);
        expect(parsed.command).toBeNull();
        expect(parsed.invalid).toBe(false);
        expect(parsed.options.help).toBe(true);
        expect(parsed.options.unknownFlags).toEqual([]);
      }
    });

    it("collects a leading unknown option together with later ones", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["--bogus", "--also-bogus"], cwd);
      expect(parsed.command).toBeNull();
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.unknownFlags).toEqual(["--bogus", "--also-bogus"]);
    });
  });

  describe("init destination resolution", () => {
    it("uses --root as the init destination when --dir is omitted", () => {
      const parsed = parseArgs(["init", "--root", "/tmp/target"], "/tmp/cwd");
      expect(parsed.invalid).toBe(false);
      expect(parsed.options.dir).toBe("/tmp/target");
      expect(parsed.options.root).toBe("/tmp/target");
      expect(parsed.options.rootExplicit).toBe(true);
    });

    it("keeps --dir as the init destination when both flags are supplied", () => {
      const parsed = parseArgs(["init", "--root", "/tmp/target", "--dir", "/tmp/out"], "/tmp/cwd");
      expect(parsed.invalid).toBe(false);
      expect(parsed.options.dir).toBe("/tmp/out");
      expect(parsed.options.dirExplicit).toBe(true);
    });

    it("falls back to cwd for init when neither flag is supplied", () => {
      const parsed = parseArgs(["init"], "/tmp/cwd");
      expect(parsed.options.dir).toBe("/tmp/cwd");
      expect(parsed.options.dirExplicit).toBe(false);
    });

    it("does not rewrite --dir for non-init commands", () => {
      const parsed = parseArgs(["validate", "--root", "/tmp/target"], "/tmp/cwd");
      expect(parsed.options.dir).toBe("/tmp/cwd");
      expect(parsed.options.root).toBe("/tmp/target");
    });
  });

  // Contract rule 2 extended to the whole switch: a command-specific
  // flag used on a command that does not own it must markInvalid()
  // instead of being silently dropped, and value-taking flags must
  // still consume their value token on the reject path.
  describe("cross-command flag ownership", () => {
    type Options = ParsedArgs["options"];

    const valueTakingCases: {
      flag: string;
      value: string;
      wrongCommand: string[];
      probe: (options: Options) => void;
      untouched: (options: Options) => void;
    }[] = [
      {
        flag: "--in",
        value: "validate.json",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.reportIn).toBeUndefined(),
      },
      {
        flag: "--base-url",
        value: "https://example.com/",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.reportBaseUrl).toBeUndefined(),
      },
      {
        flag: "--platform",
        value: "web",
        wrongCommand: ["report"],
        probe: (o) => expect(o.reportFormat).toBe("json"),
        untouched: (o) => expect(o.platform).toBeUndefined(),
      },
      {
        flag: "--target-url",
        value: "https://example.com/",
        wrongCommand: ["validate"],
        probe: (o) => expect(o.validateFormat).toBe("github"),
        untouched: (o) => expect(o.prototypingTargetUrl).toBeUndefined(),
      },
    ];

    it.each(valueTakingCases)(
      "$flag on a non-owning command marks invalid AND consumes the value token",
      ({ flag, value, wrongCommand, probe, untouched }) => {
        const cwd = process.cwd();
        const formatValue = wrongCommand[0] === "report" ? "json" : "github";
        const parsed = parseArgs([...wrongCommand, flag, value, "--format", formatValue], cwd);
        expect(parsed.invalid).toBe(true);
        expect(parsed.options.help).toBe(true);
        untouched(parsed.options);
        // The dangling value must not have shifted into the positional
        // stream: the trailing --format is still honored.
        probe(parsed.options);
      },
    );

    const booleanCases: { flag: string; untouched: (options: Options) => void }[] = [
      { flag: "--run-validate", untouched: (o) => expect(o.reportRunValidate).toBe(false) },
      { flag: "--active", untouched: (o) => expect(o.discussionActive).toBeUndefined() },
      { flag: "--clean", untouched: (o) => expect(o.doctorClean).toBeUndefined() },
      { flag: "--autoremediate", untouched: (o) => expect(o.doctorAutoremediate).toBeUndefined() },
    ];

    it.each(booleanCases)(
      "$flag on a non-owning command marks invalid instead of being dropped",
      ({ flag, untouched }) => {
        const cwd = process.cwd();
        const parsed = parseArgs(["validate", flag, "--format", "github"], cwd);
        expect(parsed.invalid).toBe(true);
        expect(parsed.options.help).toBe(true);
        expect(parsed.options.validateFormat).toBe("github");
        untouched(parsed.options);
      },
    );

    it("accepts --active only on `discussion list`", () => {
      const cwd = process.cwd();
      const parsed = parseArgs(["discussion", "use", "discussion-1", "--active"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.discussionActive).toBeUndefined();
      expect(parsed.options.discussionId).toBe("discussion-1");
    });

    it("accepts doctor --target-url only with the built-in prototyping profile", () => {
      const cwd = process.cwd();

      const bare = parseArgs(["doctor", "--target-url", "https://x/"], cwd);
      expect(bare.invalid).toBe(true);

      // A skill profile does not run the targetUrl probe either.
      const skillProfile = parseArgs(
        ["doctor", "--profile", "qfai-sdd", "--target-url", "https://x/"],
        cwd,
      );
      expect(skillProfile.invalid).toBe(true);

      // The pairing is judged after the loop, so `--profile` may follow.
      const trailingProfile = parseArgs(
        ["doctor", "--target-url", "https://x/", "--profile", "prototyping"],
        cwd,
      );
      expect(trailingProfile.invalid).toBe(false);
      expect(trailingProfile.options.prototypingTargetUrl).toBe("https://x/");
    });

    it("rejects --strict / --fail-on on commands that never read them", () => {
      const cwd = process.cwd();

      // `report` moved into the owning set: runReport now gates on the
      // findings it prints, so it reads both flags rather than dropping
      // them. The rejection this case pins is for the commands that still
      // do not read them.
      const reportStrict = parseArgs(["report", "--strict"], cwd);
      expect(reportStrict.invalid).toBe(false);
      expect(reportStrict.options.strict).toBe(true);

      const reportFailOn = parseArgs(["report", "--fail-on", "warning", "--format", "json"], cwd);
      expect(reportFailOn.invalid).toBe(false);
      expect(reportFailOn.options.failOn).toBe("warning");
      expect(reportFailOn.options.reportFormat).toBe("json");

      const initStrict = parseArgs(["init", "--strict"], cwd);
      expect(initStrict.invalid).toBe(true);
      expect(initStrict.options.strict).toBe(false);

      const validateStrict = parseArgs(["validate", "--strict", "--fail-on", "warning"], cwd);
      expect(validateStrict.invalid).toBe(false);
      expect(validateStrict.options.strict).toBe(true);
      expect(validateStrict.options.failOn).toBe("warning");

      const doctorFailOn = parseArgs(["doctor", "--fail-on", "warning"], cwd);
      expect(doctorFailOn.invalid).toBe(false);
      expect(doctorFailOn.options.failOn).toBe("warning");
    });

    it("keeps every guarded flag valid on its owning command", () => {
      const cwd = process.cwd();

      const report = parseArgs(
        ["report", "--in", "validate.json", "--run-validate", "--base-url", "https://x/"],
        cwd,
      );
      expect(report.invalid).toBe(false);
      expect(report.options.reportIn).toBe("validate.json");
      expect(report.options.reportRunValidate).toBe(true);
      expect(report.options.reportBaseUrl).toBe("https://x/");

      // `doctor --profile prototyping` shares the targetUrl probe, so
      // --target-url stays valid there alongside doctor's own flags.
      const doctor = parseArgs(
        ["doctor", "--profile", "prototyping", "--target-url", "https://x/", "--clean"],
        cwd,
      );
      expect(doctor.invalid).toBe(false);
      expect(doctor.options.prototypingTargetUrl).toBe("https://x/");
      expect(doctor.options.doctorClean).toBe(true);

      const discussion = parseArgs(["discussion", "list", "--active"], cwd);
      expect(discussion.invalid).toBe(false);
      expect(discussion.options.discussionActive).toBe(true);

      const validate = parseArgs(["validate", "--platform", "web"], cwd);
      expect(validate.invalid).toBe(false);
      expect(validate.options.platform).toBe("web");
    });
  });

  // The contract block in args.ts claims to govern EVERY value-taking
  // arm of the flag switch. These cases pin the arms that used to opt
  // out of it: the command-guarded `--platform`, which returned before
  // `i += 1` and so left the value token unconsumed, and the eight that
  // carried no guard at all and were therefore accepted on any command.
  describe("command-scoped value-taking flags: markInvalid + consume value token", () => {
    const cwd = process.cwd();

    it("--platform outside validate marks invalid AND consumes the value", () => {
      const parsed = parseArgs(["report", "--platform", "linux", "--format", "json"], cwd);
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.platform).toBeUndefined();
      expect(parsed.options.reportFormat).toBe("json");
    });

    it("--in / --base-url outside report mark invalid AND consume the value", () => {
      for (const flag of ["--in", "--base-url"] as const) {
        const parsed = parseArgs(["validate", flag, "value", "--format", "github"], cwd);
        expect(parsed.invalid).toBe(true);
        expect(parsed.options.reportIn).toBeUndefined();
        expect(parsed.options.reportBaseUrl).toBeUndefined();
        expect(parsed.options.validateFormat).toBe("github");
      }
    });

    it("--target-url is accepted on doctor", () => {
      const doctor = parseArgs(
        ["doctor", "--profile", "prototyping", "--target-url", "http://127.0.0.1:9"],
        cwd,
      );
      expect(doctor.invalid).toBe(false);
      expect(doctor.options.prototypingTargetUrl).toBe("http://127.0.0.1:9");
    });

    it("--target-url elsewhere marks invalid AND consumes the value", () => {
      const parsed = parseArgs(
        ["validate", "--target-url", "http://127.0.0.1:9", "--format", "github"],
        cwd,
      );
      expect(parsed.invalid).toBe(true);
      expect(parsed.options.prototypingTargetUrl).toBeUndefined();
      expect(parsed.options.validateFormat).toBe("github");
    });
  });
});

describe("parseArgs --fail-on", () => {
  it.each(["never", "warning", "error"] as const)("accepts %s", (value) => {
    const parsed = parseArgs(["report", "--fail-on", value], process.cwd());
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.failOn).toBe(value);
  });

  it("rejects an unknown value instead of silently falling back to the config default", () => {
    // `--fail-on warn` used to leave `failOn` unset, so the run fell back to
    // the configured default (`error`) and a CI step that meant to gate on
    // warnings exited 0 on a warning-only run.
    const parsed = parseArgs(["report", "--fail-on", "warn"], process.cwd());
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.help).toBe(true);
    expect(parsed.options.failOn).toBeUndefined();
  });

  it("does not consume the next option when --fail-on has no value", () => {
    const parsed = parseArgs(["validate", "--fail-on", "--strict"], process.cwd());
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.strict).toBe(true);
    expect(parsed.options.failOn).toBeUndefined();
  });
});

describe("parseArgs --version", () => {
  it("treats --version in the command position as a version request", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["--version"], cwd);
    expect(parsed.command).toBeNull();
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.version).toBe(true);
    expect(parsed.options.help).toBe(false);
  });

  it("treats -V in the command position as a version request", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["-V"], cwd);
    expect(parsed.command).toBeNull();
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.version).toBe(true);
  });

  it("accepts --version as a trailing flag without marking the args invalid", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--version"], cwd);
    expect(parsed.command).toBe("validate");
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.version).toBe(true);
  });

  it("leaves version false when no version flag is present", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate"], cwd);
    expect(parsed.options.version).toBe(false);
  });

  // The subcommand scan runs before the flag loop and only skipped `--`
  // tokens, so a short flag was shifted away as an unknown action: the long
  // form worked on these commands and the short one printed help.
  for (const command of ["atdd", "discussion", "sdd"] as const) {
    for (const flag of ["--version", "-V"] as const) {
      it(`sets version for \`qfai ${command} ${flag}\``, () => {
        const parsed = parseArgs([command, flag], process.cwd());
        expect(parsed.options.version).toBe(true);
      });
    }
  }

  it("does not read a short flag as the discussion use id", () => {
    const parsed = parseArgs(["discussion", "use", "-V"], process.cwd());
    expect(parsed.options.discussionAction).toBe("use");
    expect(parsed.options.discussionId).toBeUndefined();
    expect(parsed.options.version).toBe(true);
  });

  it("still rejects an unknown subcommand name", () => {
    // Skipping dash-prefixed tokens must not skip a real typo: the post-loop
    // "action required" guard still has to fire.
    const parsed = parseArgs(["atdd", "scafold"], process.cwd());
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.atddAction).toBeUndefined();
  });

  it("still requires a subcommand when only flags follow", () => {
    const parsed = parseArgs(["atdd", "--root", "."], process.cwd());
    expect(parsed.invalid).toBe(true);
  });
});

describe("parseArgs dash-leading positionals", () => {
  // A subcommand name is a closed set and never starts with `-`, but the
  // positional after it is caller data and may legitimately begin with a
  // single `-`.
  it("accepts a discussion id that starts with a dash", () => {
    const parsed = parseArgs(["discussion", "use", "-discussion-0001"], process.cwd());
    expect(parsed.options.discussionAction).toBe("use");
    expect(parsed.options.discussionId).toBe("-discussion-0001");
    expect(parsed.invalid).toBe(false);
  });

  it("accepts a dash-leading discussion id alongside a trailing flag", () => {
    const parsed = parseArgs(
      ["discussion", "use", "-discussion-0001", "--root", "/tmp/example"],
      process.cwd(),
    );
    expect(parsed.options.discussionId).toBe("-discussion-0001");
    expect(parsed.options.root).toBe("/tmp/example");
    expect(parsed.invalid).toBe(false);
  });

  // Over-correction pins: relaxing the positional must not re-admit the two
  // short flags the parser reserves, nor any long flag.
  it("keeps a long flag out of the discussion use id", () => {
    const parsed = parseArgs(["discussion", "use", "--root", "/tmp/example"], process.cwd());
    expect(parsed.options.discussionId).toBeUndefined();
    expect(parsed.options.root).toBe("/tmp/example");
  });

  it("keeps -h out of the discussion use id", () => {
    const parsed = parseArgs(["discussion", "use", "-h"], process.cwd());
    expect(parsed.options.discussionId).toBeUndefined();
    expect(parsed.options.help).toBe(true);
  });

  it("still refuses a dash-leading token in the subcommand position", () => {
    const parsed = parseArgs(["discussion", "-discussion-0001"], process.cwd());
    expect(parsed.options.discussionAction).toBeUndefined();
    expect(parsed.options.discussionId).toBeUndefined();
    expect(parsed.invalid).toBe(true);
  });
});

describe("parseArgs: qfai sdd <subcommand>", () => {
  const renumber = [
    "sdd",
    "renumber-decision",
    "--from",
    "DEC-0002",
    "--to",
    "DEC-0013",
    "--base",
    "main",
  ];

  it.each([false, true])("accepts explicit renumber arguments with apply=%s", (apply) => {
    const parsed = parseArgs([...renumber, ...(apply ? ["--apply"] : [])], process.cwd());
    expect(parsed.invalid).toBe(false);
    expect(parsed.command).toBe("sdd");
    expect(parsed.options.sddAction).toBe("renumber-decision");
    expect(parsed.options.help).toBe(false);
  });

  // QFAI:EX-0001-0008-16
  it.each([
    ["--format", "json"],
    ["--fail-on", "never"],
    ["--import", "legacy"],
    ["--assume", "reviewed"],
  ])("rejects the preflight-only option %s on renumber", (...option) => {
    const parsed = parseArgs([...renumber, ...option], process.cwd());
    expect(parsed.invalid).toBe(true);
    expect(parsed.invalidReason).toContain(option[0]);
  });

  // QFAI:EX-0001-0008-16
  it.each([
    ["sdd", "renumber-decision", "--from", "DEC-0002", "--to", "DEC-0013"],
    ["sdd", "renumber-decision", "--to", "DEC-0013", "--base", "main"],
    ["sdd", "renumber-decision", "--from", "DEC-0002", "--base", "main"],
    ["sdd", "renumber-decision", "--from", "DEC-2", "--to", "DEC-0013", "--base", "main"],
    ["sdd", "renumber-decision", "--from", "DEC-0002", "--to", "DEC-10000", "--base", "main"],
    ["sdd", "renumber-decision", "--from", "DEC-0002", "--to", "DEC-0002", "--base", "main"],
  ])("rejects missing or invalid explicit renumber inputs %j", (...argv) => {
    expect(parseArgs(argv, process.cwd()).invalid).toBe(true);
  });

  it("routes `sdd preflight` and its diagnostic flags", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["sdd", "preflight", "--format", "json", "--fail-on", "error"], cwd);
    expect(parsed.invalid).toBe(false);
    expect(parsed.command).toBe("sdd");
    expect(parsed.options.sddAction).toBe("preflight");
    expect(parsed.options.sddFormat).toBe("json");
    expect(parsed.options.failOn).toBe("error");
  });

  it("rejects an unknown sdd subcommand", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["sdd", "triage"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.sddAction).toBeUndefined();
  });

  it("rejects a bare `sdd` with no subcommand", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["sdd"], cwd);
    expect(parsed.invalid).toBe(true);
  });

  it("rejects an unsupported --format value for sdd preflight", () => {
    // The diagnostic has to name the rejected value and the accepted set.
    // Routing this through formatReason() reported "--format is not valid for
    // this command" instead, because formatChoicesFor() has no sdd entry — a
    // caller who mistyped the value was told the flag itself was wrong.
    const cwd = process.cwd();
    const parsed = parseArgs(["sdd", "preflight", "--format", "github"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.sddFormat).toBeUndefined();
    expect(parsed.invalidReason).toBe(
      'qfai sdd: invalid value for --format: "github". Expected: text|json',
    );
  });

  it("rejects an unsupported --fail-on value instead of silently dropping it", () => {
    // `--fail-on neve` used to fall through as `undefined`, so a run meant to
    // report-only exited 1 on blockers with nothing explaining the typo.
    const cwd = process.cwd();
    const parsed = parseArgs(["sdd", "preflight", "--fail-on", "neve"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.failOn).toBeUndefined();
  });

  it("rejects an unsupported --fail-on value for validate as well", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--fail-on", "errors"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.failOn).toBeUndefined();
  });

  it("collects repeatable --assume values for sdd preflight", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(
      [
        "sdd",
        "preflight",
        "--assume",
        "OQ-0001 deferred to the next phase",
        "--assume",
        "W-PENDING-PROMOTION",
      ],
      cwd,
    );
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.sddAssumptions).toEqual([
      "OQ-0001 deferred to the next phase",
      "W-PENDING-PROMOTION",
    ]);
  });

  it("keeps a help flag out of the sdd subcommand slot", () => {
    // The scan that pulls the subcommand runs before the flag loop, so testing
    // only for a `--` prefix shifted `-h` away as an unknown action: the help
    // request became a usage error naming a subcommand the caller never typed.
    const cwd = process.cwd();
    for (const flag of ["--help", "-h"] as const) {
      const parsed = parseArgs(["sdd", flag], cwd);
      expect(parsed.options.help).toBe(true);
      expect(parsed.invalid).toBe(false);
      expect(parsed.invalidReason).toBeUndefined();
    }
  });

  it("rejects --assume outside `sdd preflight`", () => {
    const cwd = process.cwd();
    const parsed = parseArgs(["validate", "--assume", "x"], cwd);
    expect(parsed.invalid).toBe(true);
    expect(parsed.options.sddAssumptions).toEqual([]);
  });
});
