/**
 * `QFAI-PROFILE-001` names what a partial run did not evaluate, from
 * `GATE_GROUP_FAMILIES` — and that table was hand-maintained with nothing
 * checking it against the emitters.
 *
 * The message asserts completeness ("Hard gates NOT evaluated in this run: …"),
 * so a family missing from the table reads as a family that WAS evaluated. When
 * #572 was filed the table named 25 families of at least 37, and the twelve it
 * omitted included the spec-pack structural gates — triage approval, status
 * enums, acceptance-criteria verification, the Traceability Ledger. An
 * implementer running `--profile tdd` per item was told accurately that
 * repository hygiene and the prototyping gates were skipped, and told nothing
 * about six spec-pack families that were also skipped. The list's specificity
 * is what makes the omission misleading.
 *
 * `EMITTED_RULE_CODES` is the derivation the issue asked for, and it already
 * ships: `scripts/generate-emitted-rule-codes.mjs` scans the package source for
 * every code a validate `Issue` can carry, and the scripts slice fails on
 * drift. So the guard is a comparison between two things that are already
 * maintained, rather than a third list of families.
 *
 * A code outside every group is not automatically a defect — the notice derives
 * `full groups - profile groups`, and a code that runs in EVERY profile is
 * never unevaluated, so it has nothing to be reported under. Those are
 * enumerated below with the layer that emits them, because "outside on purpose"
 * and "forgotten" are the two readings this test exists to separate.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { GATE_GROUP_FAMILIES } from "../../src/cli/commands/validate.js";
import { EMITTED_RULE_CODES } from "../../src/core/emittedRuleCodes.js";
import { familyMatches } from "../helpers/gateFamilies.js";

/**
 * Codes that belong to no gate group because they are not gated by profile.
 *
 * Each one is emitted by a layer that runs whatever profile was asked for: the
 * `--spec` and provenance checks the run opens with, config loading, the waiver
 * engine, the delta scan, or the separate `saas-package` runner.
 * `full groups - profile groups` can never include them, so a group entry would
 * make `QFAI-PROFILE-001` report as unevaluated something that ran.
 *
 * The module is stored per entry rather than left to a section comment, and
 * `names the module that emits it` below reads the file and requires the code to
 * appear in it. That is the difference between a reason and a claim: written as
 * comments, eight of these nineteen entries named the wrong module — six of them
 * `src/cli/commands/validate.ts`, which mentions every code in the codebase
 * because the notice's own description map lives there. Two more turned out not
 * to belong here at all.
 */
interface Exemption {
  /** Package-relative path of the module whose code path raises the finding. */
  readonly module: string;
  /** Why `full groups - profile groups` can never include the code. */
  readonly reason: string;
}

/**
 * Folds one module over a set of codes, so a reason may say `as QFAI-LINK-001`
 * without the entry losing what raises it.
 */
function raisedBy(module: string, codes: Readonly<Record<string, string>>): [string, Exemption][] {
  return Object.entries(codes).map(([code, reason]) => [code, { module, reason }]);
}

const PROFILE_INDEPENDENT_CODES: ReadonlyMap<string, Exemption> = new Map([
  // Structural damage to the assistant tree, both dispatched from
  // `runProfileValidators` ahead of the profile's own validators and merged
  // past its short-circuit: a skill that never loaded or a citation that
  // resolves to no heading invalidates the run whichever stage it was.
  ...raisedBy("src/core/validators/integrationSurface.ts", {
    "QFAI-LINK-001": "broken integration symlinks, inspected before a profile is dispatched",
  }),
  ...raisedBy("src/core/validators/assistantAnchorReferences.ts", {
    "QFAI-LINK-002":
      "anchor integrity across the assistant tree, run in every profile for the same reason",
  }),
  // Properties of the invocation, raised around the validator run rather than
  // by it — `--spec` resolution precedes the group dispatch, and provenance
  // survives the short-circuit so the operator still learns which qfai ran.
  ...raisedBy("src/core/validate.ts", {
    "QFAI-SCOPE-001": "the `--spec` value's shape, resolved before any group is chosen",
    "QFAI-SCOPE-002": "as QFAI-SCOPE-001, for a spec directory that does not exist",
    "QFAI-TOOL-001": "which copy of qfai is running — a property of the invocation, not of a gate",
    "QFAI-TOOL-002": "as QFAI-TOOL-001",
  }),
  // The legacy-output deprecation notice, decided from `qfai.config.yaml` and
  // the file on disk.
  //
  // The one entry here that is not clear-cut: `validators/assistantTreeMigration.ts`
  // also emits this code, and that half runs in `sdd` only. Exempt because the
  // CLI half runs in every profile, so naming a family would tell a `tdd` run
  // the code went unevaluated when part of it had just been evaluated. The
  // opposite reading — that `sdd`'s half is silently unreported outside `sdd` —
  // is equally defensible, and choosing between them is a question about what
  // the notice should say for a code with emitters on both sides of the
  // dispatch. Filed rather than settled here.
  ...raisedBy("src/cli/commands/validate.ts", {
    "D-DEPRECATED-PATH": "the legacy validate.json path, reported wherever the run reads one",
  }),
  ...raisedBy("src/core/config.ts", {
    "QFAI-CFG-001": "the `qfai.config.yaml` read, which every profile needs first",
    QFAI_CONFIG_INVALID: "config parse failure: nothing downstream runs, so no group owns it",
  }),
  ...raisedBy("src/core/report.ts", {
    "QFAI-CTYPE-004": "the delta scan, which the report writer runs for every profile",
  }),
  ...raisedBy("src/core/waivers.ts", {
    "QFAI-WAIVER-001": "the waiver engine, applied to the findings of whatever profile ran",
    "QFAI-WAIVER-002": "as QFAI-WAIVER-001",
    "QFAI-WAIVER-003": "as QFAI-WAIVER-001; `report.ts` only counts it into expired_waivers",
    "QFAI-WAIVER-004": "as QFAI-WAIVER-001",
    "QFAI-WAIVER-005": "as QFAI-WAIVER-001",
  }),
  ...raisedBy("src/core/phasePolicy.ts", {
    "QFAI-VALIDATE-017":
      "the CI-profile advisory, decided from the environment rather than a gate, via `buildCiProfileIssue`",
  }),
  ...raisedBy("src/core/saasPackage/profile.ts", {
    "D-SAAS-PACKAGE-VERIFY-SKIPPED":
      "the `saas-package` runner's own skip notice; its skip-set is SAAS_PACKAGE_SKIPPED_GATE_FAMILIES",
  }),
]);

const ALL_FAMILIES: readonly string[] = Object.values(GATE_GROUP_FAMILIES).flat();

function coveringFamilies(code: string): string[] {
  return ALL_FAMILIES.filter((family) => familyMatches(family, code));
}

describe("QFAI-PROFILE-001's skip-set accounts for every code that can be emitted", () => {
  it("names a gate group for every emitted code, or exempts it with a reason", () => {
    const unaccounted = EMITTED_RULE_CODES.filter(
      (code) => coveringFamilies(code).length === 0 && !PROFILE_INDEPENDENT_CODES.has(code),
    ).sort();

    expect(
      unaccounted,
      `emitted but named by no GATE_GROUP_FAMILIES entry and not exempt: ${unaccounted.join(", ")} — ` +
        "`QFAI-PROFILE-001` derives what a partial run skipped as `full groups - profile groups`, " +
        "so a code outside every group is reported as skipped by NO profile. Add its family to the " +
        "group whose `run*Validators` dispatches it, or, if it is raised outside the validator " +
        "groups entirely, add it to PROFILE_INDEPENDENT_CODES with the layer that emits it",
    ).toEqual([]);
  });

  it("gives every emitted code at most one gate group", () => {
    // The other direction of the same claim, and the one that is a trap rather
    // than a live defect. `unevaluatedGates` walks the groups a profile does
    // NOT run and reports their family PATTERNS, so a code in two groups is
    // still reported exactly once — by whichever group is missing. Misreporting
    // needs a profile that runs the narrow group WITHOUT the wildcard one.
    //
    // No profile did, in the instance this case was written for.
    // `canonical-uix` HELD `["UIX-VAL-*"]`, which swallowed all twelve
    // `UIX-VAL-SKILL-*` codes that `prototyping-skill` owns (#1215) — and
    // `prototyping-skill` is reachable only from `runFullValidators`, which
    // runs `canonical-uix` too, so nothing misreported. The same commit
    // replaced that glob with an enumeration, so the overlap is gone and this
    // case is asserted for the divergence that has not happened yet.
    //
    // It is worth asserting because it has happened twice on other prefixes,
    // and both repairs are in the table as comments: `QFAI-CONTRACT-*` "would
    // swallow the sdd-only reference codes, letting a `tdd` run claim a hard
    // gate it never reached", and `QFAI-TRACE-*` "would count every trace code
    // in two groups at once". Three instances of one shape, each found by
    // reading rather than by a lane.
    const groups: [string, readonly string[]][] = Object.entries(GATE_GROUP_FAMILIES);
    const shared = EMITTED_RULE_CODES.map((code) => ({
      code,
      owners: groups
        .filter(([, families]) => families.some((family) => familyMatches(family, code)))
        .map(([group]) => group),
    }))
      .filter((entry) => entry.owners.length > 1)
      .map((entry) => `${entry.code} -> ${entry.owners.join(", ")}`)
      .sort();

    expect(
      shared,
      `emitted code claimed by more than one gate group: ${shared.join("; ")} — ` +
        "`QFAI-PROFILE-001` reports a code as skipped when ANY group holding it is absent from " +
        "the profile, so a shared code is reported skipped by a profile that ran it. The family " +
        "grammar has no negation: where one group's prefix swallows another's, spell the narrower " +
        "set out",
    ).toEqual([]);
  });

  it("drops an exemption once a group starts covering its code", () => {
    // The other direction, and the one an exemption list rots in. A code that
    // gained a family is now reported by the notice, and the entry claiming it
    // is profile-independent contradicts the table it sits beside.
    const covered = [...PROFILE_INDEPENDENT_CODES.keys()]
      .filter((code) => coveringFamilies(code).length > 0)
      .sort();

    expect(
      covered,
      `exempt from the skip-set but now covered by a gate family: ${covered.join(", ")} — ` +
        "remove the PROFILE_INDEPENDENT_CODES entry; the table already accounts for it",
    ).toEqual([]);
  });

  it("drops an exemption whose code nothing emits any more", () => {
    const emitted = new Set(EMITTED_RULE_CODES);
    const gone = [...PROFILE_INDEPENDENT_CODES.keys()].filter((code) => !emitted.has(code)).sort();

    expect(
      gone,
      `exempt from the skip-set but emitted by nothing: ${gone.join(", ")} — ` +
        "an exemption for a code that no longer exists is a claim about a rule that is not there",
    ).toEqual([]);
  });

  it("requires a reason on every exemption, because that is what a reviewer reads", () => {
    const unreasoned = [...PROFILE_INDEPENDENT_CODES.entries()]
      .filter(([, exemption]) => exemption.reason.trim().length === 0)
      .map(([code]) => code)
      .sort();

    expect(unreasoned, `exempt with no reason given: ${unreasoned.join(", ")}`).toEqual([]);
  });

  it("names the module that emits it", () => {
    // What turns the reason from a claim into a fact. A module that no longer
    // mentions the code has either stopped emitting it — in which case the
    // exemption is stale — or moved, in which case the next reader is sent to
    // the wrong file. Both were true of this list when it was comments: six
    // entries pointed at `src/cli/commands/validate.ts`, where every code in
    // the codebase appears because the notice's description map is there, so
    // the wrong answer was indistinguishable from the right one.
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const misattributed = [...PROFILE_INDEPENDENT_CODES.entries()]
      .filter(([code, exemption]) => {
        let source: string;
        try {
          source = readFileSync(path.join(packageRoot, exemption.module), "utf8");
        } catch {
          return true;
        }
        return !source.includes(`"${code}"`);
      })
      .map(([code, exemption]) => `${code} (${exemption.module})`)
      .sort();

    expect(
      misattributed,
      `exempt with a module that does not mention the code: ${misattributed.join(", ")} — ` +
        "the module is the whole reason the exemption is checkable. Point it at the file whose " +
        "code path raises the finding, not at the caller and not at `src/cli/commands/validate.ts`, " +
        "whose description map mentions every code there is",
    ).toEqual([]);
  });
});

/**
 * Codes with an emit site in more than one module, and the group each belongs
 * to.
 *
 * `QFAI-PROFILE-001` derives what a partial run skipped from GROUPS, so a code
 * whose emitters sit in two compositions is reported correctly only if its
 * group is listed by every profile that can reach one of them. Under any
 * narrower group the notice denies a gate the run just evaluated.
 *
 * Three of the four below are cross-dispatch and resolve the same way: the
 * group is one that both dispatching profiles list. The fourth has an emitter
 * that runs in every profile, which puts it outside that rule by construction
 * — its entry says how.
 */
interface DualEmitter {
  /** Every module with an emit site, package-relative and sorted. */
  readonly modules: readonly string[];
  /**
   * How the code is accounted for: the group that holds it and why that
   * group's profile set matches its emitters — or, where no group can, the
   * exemption standing in for one and what makes a group unreachable.
   */
  readonly treatment: string;
}

const DUAL_EMITTED_CODES: ReadonlyMap<string, DualEmitter> = new Map([
  [
    "R-AUTOPILOT-POLICY-MISSING",
    {
      modules: [
        "src/core/validators/autopilotPolicy.ts",
        "src/core/validators/justificationCatalog.ts",
      ],
      treatment:
        "The easy case: both emitters are dispatched from `runSddValidators`, so one group " +
        "listed by `sdd` covers both. `reviewer-gate-sdd`.",
    },
  ],
  [
    "R-DESIGN-MD-PATCH-OUT-OF-ZONE",
    {
      modules: [
        "src/core/validators/designMdPatchZone.ts",
        "src/core/validators/justificationCatalog.ts",
      ],
      treatment:
        "Genuinely cross-dispatch: `validateDesignMdPatchZone` from " +
        "`runPrototypingValidators`, `validateReviewerJustification` from `runSddValidators`. " +
        "`reviewer-gate-shared`, which BOTH profiles list, so neither is told it skipped a " +
        "code it can emit.",
    },
  ],
  [
    "R-MOCK-HREF-DRIFT",
    {
      modules: [
        "src/core/validators/justificationCatalog.ts",
        "src/core/validators/reviewerGate.ts",
      ],
      treatment:
        "As R-DESIGN-MD-PATCH-OUT-OF-ZONE: `detectMockHrefDrift` from " +
        "`runPrototypingValidators`, the catalog re-emit from `runSddValidators`. " +
        "`reviewer-gate-shared`.",
    },
  ],
  [
    "D-DEPRECATED-PATH",
    {
      modules: ["src/cli/commands/validate.ts", "src/core/validators/assistantTreeMigration.ts"],
      treatment:
        "One emitter is the CLI's legacy-path notice, which runs in EVERY profile - so 'a " +
        "group every emitting profile lists' would be a group every profile lists, and that " +
        "can never appear in `full groups - profile groups`. Exempt in " +
        "PROFILE_INDEPENDENT_CODES instead, which reaches the same outcome by a different " +
        "route: that list reads as 'no group owns it' where the accurate statement is 'every " +
        "profile evaluates it'.",
    },
  ],
]);

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

/** `.ts` files under `src`, minus the generated registry the codes come from. */
function sourceFiles(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) found.push(full);
    }
  };
  walk(path.join(root, "src"));
  return found.filter((file) => !toPosixPath(file).endsWith("src/core/emittedRuleCodes.ts"));
}

/**
 * Modules with an emit site for each code, keyed by code.
 *
 * Shape-matched rather than string-matched. A plain search for the quoted code
 * reports 139 codes in two or more modules, and almost every one of them is a
 * LIST rather than an emit — `core/prototyping/mode.ts` names the codes its
 * relaxation applies to, which raises nothing. Only three forms build a
 * finding: the code as the first argument to `issue(` / `pushIssue(` on the
 * same line or the next, and a `code:` property. Matching those brings 139
 * down to 4, and the four are all real.
 */
function emitSitesByCode(root: string): Map<string, readonly string[]> {
  const known = new Set<string>(EMITTED_RULE_CODES);
  const sites = new Map<string, Set<string>>();
  for (const file of sourceFiles(root)) {
    const relative = toPosixPath(path.relative(root, file));
    const lines = readFileSync(file, "utf8").split(/\r?\n/u);
    lines.forEach((line, index) => {
      const code = /"([A-Z][A-Za-z0-9_.-]{4,})"/u.exec(line)?.[1];
      if (code === undefined || !known.has(code)) return;
      const previous = index > 0 ? (lines[index - 1] ?? "").trimEnd() : "";
      // Plain `includes` rather than a RegExp built from the code: a constructed
      // pattern has to escape the code, and `\-` is an invalid escape under the `u`
      // flag rather than a harmless one. Prettier normalises the spacing these
      // three forms are written with, so exact substrings are enough.
      const isEmit =
        /(?:issue|pushIssue)\($/u.test(previous) ||
        line.includes(`issue("${code}"`) ||
        line.includes(`pushIssue("${code}"`) ||
        line.includes(`code: "${code}"`);
      if (!isEmit) return;
      const forCode = sites.get(code) ?? new Set<string>();
      forCode.add(relative);
      sites.set(code, forCode);
    });
  }
  return new Map([...sites].map(([code, files]) => [code, [...files].sort()]));
}

describe("a code emitted from more than one module is accounted for", () => {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const dual = new Map(
    [...emitSitesByCode(packageRoot)].filter(([, modules]) => modules.length > 1),
  );

  it("declares every one of them", () => {
    const undeclared = [...dual.keys()].filter((code) => !DUAL_EMITTED_CODES.has(code)).sort();

    expect(
      undeclared,
      `emitted from more than one module and not declared: ${undeclared.join(", ")} — ` +
        "`QFAI-PROFILE-001` reports by GROUP, so a code whose emitters sit in different " +
        "compositions needs a group every one of their profiles lists, or the notice denies a " +
        "gate the run evaluated. Add it to DUAL_EMITTED_CODES naming the group that holds it " +
        "and why that group's profile set matches its emitters",
    ).toEqual([]);
  });

  it("drops a declaration once the code has a single emitter again", () => {
    const single = [...DUAL_EMITTED_CODES.keys()].filter((code) => !dual.has(code)).sort();

    expect(
      single,
      `declared as dual-emitted but now emitted from one module or none: ${single.join(", ")} — ` +
        "the entry describes a hazard that is gone, and nothing constrains the group choice it " +
        "argues for any more",
    ).toEqual([]);
  });

  it("keeps each declaration's module list equal to what the scan finds", () => {
    const drifted = [...DUAL_EMITTED_CODES.entries()]
      .filter(([code, entry]) => {
        const actual = dual.get(code);
        return actual !== undefined && actual.join("|") !== [...entry.modules].sort().join("|");
      })
      .map(
        ([code, entry]) =>
          `${code} (declared ${entry.modules.join(", ")}, found ${(dual.get(code) ?? []).join(", ")})`,
      )
      .sort();

    expect(
      drifted,
      `declared modules do not match the emit sites: ${drifted.join("; ")} — ` +
        "the module list is what makes the group choice checkable. Which compositions dispatch " +
        "these files IS the argument, so an emitter that moved changes it",
    ).toEqual([]);
  });

  it("requires a treatment on every entry", () => {
    const unexplained = [...DUAL_EMITTED_CODES.entries()]
      .filter(([, entry]) => entry.treatment.trim().length === 0)
      .map(([code]) => code)
      .sort();

    expect(unexplained, `declared with no treatment: ${unexplained.join(", ")}`).toEqual([]);
  });
});
