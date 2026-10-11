# Reached-step observations

Use this procedure at each existing stage boundary to compare reached scoped work with actual observations. Keep the comparison in the existing ignored human stage report or handoff. It is not a completion detector, new gate or evidence schema.

## Contents

- [Reach and termination](#reach-and-termination)
- [The stage comparison](#the-stage-comparison)
- [Missing proof and observed omission](#missing-proof-and-observed-omission)
- [Purpose and source binding](#purpose-and-source-binding)
- [No-write passes](#no-write-passes)
- [Gate observations](#gate-observations)
- [Recover existing receipts safely](#recover-existing-receipts-safely)
- [Native read-only example](#native-read-only-example)
- [Existing review and limits](#existing-review-and-limits)

## Reach and termination

Compare the finite set of steps whose turn was reached in the selected scope before a declared stop or termination. Name the selected scope, reached boundary and any declared stop. Legitimately excluded or unreached work is neither an omission nor completed work.

Preserve plan order, scope, stop conditions and pass-through. A branch outcome ends its old route at the declared point; later steps of that route are not fabricated as completed. Do not add a step to obtain proof or silently omit a reached obligation.

## The stage comparison

Use the existing stage report, not a new schema. For each reached step retain these human-readable observations:

| Observation | What to retain                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Identity    | Plan step, owner, purpose, target and source identity; include the full source head where applicable.                   |
| Work        | Actual input reads, action or output and artifact references. A file path alone does not establish its contents or use. |
| Gate        | Applicable Gate observations from the actual command and result, without borrowing an unrelated green result.           |
| Assessment  | Supported completion, an observed incomplete result, or UNVERIFIED with missing proof, owner and resume condition.      |

A supported comparison assesses this reached step only. It does not pass unrelated gates, complete later work or establish that an agent understood instructions.

## Missing proof and observed omission

A plan declaration or content-read receipt establishes neither procedural execution nor understanding or adherence. Missing evidence leaves completion UNVERIFIED: name the missing proof or blocker, owner and resume condition. Absence alone does not prove that an action was omitted.

Positive target-bound evidence that a required action was not performed is different. Report the observed omission and its evidence as an incomplete result, then resume the existing authorized owner procedure. Do not add a step, route, review or gate. An actor's target-bound record explicitly saying the required action was not performed can support an omission; an absent output file alone cannot.

Keep these two assessments distinct. Do not claim an omission merely because a report is missing, or hide positive omission evidence behind an unknown-proof label.

## Purpose and source binding

Check the target, source identity and purpose before consuming evidence or resuming writes. A wrong target, old source or wrong purpose leaves completion UNVERIFIED with the actual missing proof or blocker. A matching command name or totals are not enough proof.

An unrelated green build cannot complete a reached design step. If its required artifact or procedural proof is missing, leave that completion UNVERIFIED and name the owner and resume condition. Keep the build's actual result without using it for a different obligation.

Inspect available receipts against the reached step and current source. A successful read of an old artifact shows only what that source contains; it does not verify the current work.

## No-write passes

A reached pass-through step records the actual input reads and their source identity, the `Passes when` condition it checked, and its declared no-write reason. The step ran despite writing nothing; this is not a skip.

Retain applicable Gate observations for the planned independent review. A valid pass remains available to that review. Do not require an invented output for a step whose checked pass condition permits no write.

## Gate observations

Retain the actual command, purpose, status and observed result, including an available exit or signal outcome. For test commands retain actual executed case counts and their evidence. For non-test commands use execution/result evidence with no invented case counts.

Keep the artifact reference and any available outcome. Unknown exit, counts or evidence remain unknown. Actual FAIL, UNRUN and pending results cannot become PASS through step metadata, a declaration or a read receipt. Existing delegated transport is not formal completion; its pending result stays visible until actual evidence arrives.

UNVERIFIED is an assessment in the human comparison. It adds no state or field to the public verification output. Preserve the existing command result and required gates rather than replacing them with this assessment.

## Recover existing receipts safely

Inspect existing receipts and recover available target-bound proof before deciding what is genuinely owed. Do not repeat an irreversible or external action merely to manufacture evidence. A missing reference can often be repaired by linking a receipt that already exists.

If proof is unavailable or cannot be recovered safely, keep the blocker, owner and resume condition. Resume only genuinely owed work with existing covered authority through its current owner procedure. Gathering observations does not grant new action permission.

## Native read-only example

This optional example invokes existing native Git reads, not a new QFAI command.
Review the local checkout, full source identifier and tracked text artifact path before use.
Read only text already cleared for this report; do not dump secrets or publish its contents automatically.
Save the block in an owned temporary `.mjs` file and supply those three arguments in that order.
Binary verification and unreviewed inputs are outside this example.

The reads are bounded to 1 MiB of output and 10 seconds each. Repository override environment variables are excluded, optional index writes are disabled, and the status read uses no filesystem monitor. A bounded or failed read can leave partial evidence; do not treat it as a complete receipt.

```js
import { spawnSync } from "node:child_process";

const [checkout, source, artifact] = process.argv.slice(2);
if (!checkout || !source || !artifact) {
  process.stderr.write("Supply the reviewed checkout, source and tracked artifact.\n");
  process.exit(1);
}

const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")),
);
const reads = [
  ["rev-parse", "--verify", "HEAD"],
  ["status", "--porcelain=v1", "--untracked-files=no"],
  ["show", `${source}:${artifact}`],
];
for (const args of reads) {
  const result = spawnSync(
    "git",
    ["--no-optional-locks", "-c", "core.fsmonitor=false", "-C", checkout, ...args],
    { encoding: "utf8", env, maxBuffer: 1024 * 1024, timeout: 10_000 },
  );
  process.stdout.write(`git ${args[0]} exit: ${result.status ?? "unavailable"}\n`);
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  if (result.signal) process.stderr.write(`Signal: ${result.signal}\n`);
  if (result.error || result.signal || result.status !== 0) process.exitCode = 1;
}
```

The example reports raw read outcomes.
Its zero exit does not complete a plan step.
Compare the observed current HEAD with the requested source and the actual target/purpose before using the artifact.
A missing artifact read is failed evidence collection, not proof that its required action was omitted.
Successful reads and unchanged files do not establish a `Passes when` decision; the owner records that actual decision separately.

## Existing review and limits

The already-planned independent reviewer assesses the reached work it reviews against actual observations and reports unresolved proof without an extra review or gate. Preserve reviewer independence, count, route and plan order. The comparison changes none of the selected scope, termination, pass-through, authority or required gate obligations.

No engine, command, plan key, runtime schema, ledger, registry or automatic obedience detector is introduced.
Reports remain existing human artifacts.
A passing instruction fixture does not prove host understanding or adherence, and the native read example proves only its observed reads and outcomes.
Missing or stale observations can still leave work UNVERIFIED; no automatic or zero-cost conformance claim is made.
