/**
 * `references/execution-ledger.md#allowed-transitions` is the ledger's
 * transition table. `qfai-implement/SKILL.md` summarised it four times, and the
 * summaries fell behind it: three of them claimed a *unique* re-entry
 * (`refactor` -> `red`), so `blocked` -> `todo`, `exception` -> `todo` and the
 * reviewer loop read as illegal to anyone working from the skill alone. The
 * `project_memory` restatement was the worst placed of them, because it is the
 * line most likely to be carried into a delegated work order.
 *
 * `TDDLIST_EXCEPTION_PARKED` then remediates via `exception` -> `todo`, an edge
 * the skill never named — so the tool appeared to ask for something the skill
 * forbids.
 *
 * These tests pin the reference as the single source: the skill may state the
 * forward spine, but it must not claim the set of re-entries is smaller than it
 * is, and the finding must cite where the real list lives.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

describe.each(TREES)("%s", (tree) => {
  it("no longer claims a single or only re-entry", async () => {
    const skill = flat(await read(tree, SKILL));
    expect(skill).not.toContain("The single re-entry is");
    expect(skill).not.toContain("with one recorded re-entry");
  });

  it("routes the reader to the reference for the complete list", async () => {
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain("`references/execution-ledger.md#allowed-transitions` is the complete");
    expect(skill).toContain(
      "**Never infer that an edge does not exist from its absence in this summary**",
    );
  });

  it("names the anomaly exit and says it needs no Change Request", async () => {
    // The gap that let a parked row sit forever: SKILL.md contained no
    // `exception -> todo` at all, so its "backward transitions need an approved
    // CR" sentence was the only nearby rule and read as a prohibition.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain("leaves via `exception` -> `todo` once the anomaly is resolved");
    expect(skill).toContain("That exit needs no Change Request");
  });

  it("keeps the CR reset as the sanctioned backward transition, and defines the term", async () => {
    // The reset sentence stays — under the reference's vocabulary a resumption
    // and an anomaly exit are re-entries rather than backward transitions, so
    // the sentence is true. What was missing is that the term is narrower than
    // "moves to an earlier status", which is how a reader takes it.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "The only exception is an approved Change Request reset (see Status Lifecycle).",
    );
    expect(skill).toContain('"Backward" is the reference\'s term of art');
  });

  it("the reference still carries every edge the summary defers to it", async () => {
    const ledger = flat(await read(tree, LEDGER));
    for (const edge of [
      "`blocked` -> `todo`",
      "`exception` -> `todo`",
      "`refactor` -> `review-fix`",
      "`review-fix` -> `refactor`",
      "`refactor` -> `red`",
    ]) {
      expect(ledger).toContain(edge);
    }
  });

  it("says `any status` in the complete list, not only in the summary table", async () => {
    // The list declares itself complete and prohibits every unlisted edge, so
    // it is the binding statement — widening only the table below left the
    // legality of a `blocked` or `review-fix` reset depending on which of the
    // two a reader reached first.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("- **Any status** -> `todo` — **upstream reset**");
    expect(ledger).toContain("`blocked` and `review-fix` included");
    expect(ledger).not.toContain(
      "`red` \\| `green` \\| `refactor` \\| `done` \\| `exception` -> `todo` — **upstream",
    );
  });

  it("numbers the sanctioned backward transition as the row it actually is", async () => {
    // The table lists the reset third and `refactor -> red` fourth. Calling the
    // reset "the fourth" made QA rejection recovery read as the sanctioned
    // backward transition, and contradicted the paragraph below it.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("The third, the approved Change Request reset");
    expect(ledger).toContain("The first, second and fourth rows are **re-entries");
  });
});

describe.each(TREES)("%s (the summary cannot license what the list forbids)", (tree) => {
  it("admits every reset source, and gates it on the approval", async () => {
    // The five-source enumeration was chosen to stop an agent writing
    // `review-fix -> todo`, whose ordinary exit is `refactor`. It cost more
    // than it bought: `drift-protocol.md` step 5 sweeps the ledger with
    // `any status -> todo`, so a row at `blocked` or `review-fix` when the
    // upstream obligation moved is one this table forbade the Protocol from
    // sweeping — a preflight with nothing legal left to do. What keeps the
    // wildcard from licensing an unapproved `review-fix -> todo` is the
    // approval column, not a shorter source list.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("| **any status** -> `todo` (upstream reset)");
    expect(ledger).toContain("The reset admits every source status");
    expect(ledger).toContain("a row sitting at `blocked` or `review-fix`");
    // The wildcard is legal only with the approval that makes it a reset.
    const resetRow = ledger.slice(ledger.indexOf("| **any status** -> `todo`"));
    expect(resetRow.slice(0, 200)).toContain("approved `CR-*`");
  });

  it("classifies the approved reset once, not twice", async () => {
    // The table header asked "why it is not backward" of all four rows while
    // the paragraph under it called the reset the only sanctioned backward
    // transition — one edge, two verdicts. Resolved towards the established
    // vocabulary: "backward" is narrow, the reset is its one instance, and the
    // column asks why each edge is *legal* instead.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("| Edge | Why it is legal | Approval needed |");
    expect(ledger).not.toContain("| Why it is not backward |");
    expect(ledger).toContain("three of them are not, one of them is and is authorised");

    // And the checklist a completion report is written against carries the
    // carve-out, so performing an approved reset does not make it unanswerable.
    const checklist = flat(
      await read(tree, "assistant/skills/qfai-implement/references/final-checklist.md"),
    );
    expect(checklist).toContain("other than an approved Change Request reset");
  });

  it("requires a new DR-ID for a second anomaly on the same row", async () => {
    // The retained `DR-*` documents an anomaly already resolved, and
    // `TDDLIST_EXCEPTION_MISSING_DR` only asks that the cell be non-empty with
    // resolvable tokens — so the stale id alone passed the gate while the
    // current anomaly had no Decision Record at all.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain(
      "**A row that enters `exception` again records a new `DR-*` for the new anomaly**",
    );
    expect(ledger).toContain("appended, not substituted");
  });

  it("does not let the skill summary restart a changed obligation", async () => {
    // The constraint asserted `exception -> todo` needs no Change Request
    // unconditionally. When the investigation finds the obligation itself was
    // wrong, that is an upstream change — and this line is read before the
    // Exception Handling section that says so.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain("**when the row's approved obligation is unchanged**");
    expect(skill).toContain("**When the investigation finds the obligation itself was wrong**");
  });
});

describe.each(TREES)("%s (`blocked` is reachable after the cycle starts)", (tree) => {
  it("admits every active source into `blocked`, not `todo` alone", async () => {
    // `todo` -> `blocked` was the only inbound edge, in a list that declares
    // itself complete and prohibits every unlisted edge. All three blockers the
    // edge names surface once the work hits them — an upstream defect at GREEN,
    // a cross-spec row found unfinished at integration, a Change Request raised
    // because this row exposed the conflict — so the row is already past `todo`
    // and had nowhere legal to record the blocker.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("- Any active status -> `blocked`");
    expect(ledger).not.toContain("- `todo` -> `blocked`");
    expect(ledger).toContain("**The source is not restricted to `todo`**");
    // The three wrong answers the narrow edge left, named so an agent does not
    // reach for one of them again.
    expect(ledger).toContain("`exception` would silently satisfy completion");
  });

  it("rewords the resumption now that a blocked row may have started", async () => {
    // "the row never started, so nothing is being undone" stopped being true
    // the moment `blocked` became reachable from `red` or later.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).not.toContain("the row never started");
    expect(ledger).toContain("**restarts its cycle from `todo`** and owes a fresh RED");
    expect(ledger).toContain("retained, not discarded");
    expect(ledger).toContain("| `blocked` -> `todo` | resumption — the row restarts its own cycle");
  });

  it("says a resumed cycle opens a round, so the retained blocks are not overwritten", async () => {
    // `round-evidence.md` enumerated only the reviewer `REVISE` as an opener,
    // which would have made the resumed RED/GREEN pair either a second round 1
    // or no round at all.
    const rounds = flat(
      await read(tree, "assistant/skills/qfai-implement/references/round-evidence.md"),
    );
    expect(rounds).toContain("A row resumed from `blocked`");
  });

  it("defines `blocked` as cannot proceed, and keeps it out of `exception`", async () => {
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("`blocked` means **cannot proceed**");
    expect(ledger).toContain("It is **not** `exception`.");
  });

  it("gives a row resumed from `green` / `refactor` a legal way to observe its RED", async () => {
    // Widening the inbound edge means a row can be blocked after its
    // implementation exists. `blocked` -> `todo` then owes a fresh RED that
    // passes on its first run, and `red-not-observable.md` classified the
    // row's own implementation as neither of its two non-anomalous cases — so
    // it fell to "anything else" and `exception`, while weakening the test to
    // manufacture a RED is forbidden. The edge this PR legalised had no route
    // back to `done`.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain(
      "**When the block happened at `green` or `refactor` this row's own implementation is still there",
    );
    expect(ledger).toContain("falsifiability path of `red-not-observable.md`, not `exception`");

    const reference = flat(
      await read(tree, "assistant/skills/qfai-implement/references/red-not-observable.md"),
    );
    expect(reference).toContain(
      "**Or, on a row resumed from `blocked`, satisfied by this row's own earlier round**",
    );
    expect(reference).toContain(
      "**On a row resumed from `blocked` it is this row's own row id plus the round whose GREEN wrote the predicate**",
    );
    // The retained round block is what a reviewer audits in place of the
    // sibling row id, so the widened form stays checkable.
    expect(reference).toContain("**retained round block**");
    expect(reference).toContain("A row carrying no such round was never resumed from `blocked`");
    // The narrow refusal it must not swallow.
    expect(reference).toContain("On a `Unit` / `Component` / `Integration` row it is **not**");
  });

  it("lets the gatekeeper accept the one `Satisfied-by` that names its own row", async () => {
    // `qa-gatekeeper.md` required a sibling row on every non-ATDD row, which
    // would have REVISEd the evidence the resumption path now prescribes.
    const gatekeeper = flat(await read(tree, "assistant/agents/qa-gatekeeper.md"));
    expect(gatekeeper).toContain("**On any other row the sibling row is still required**");
    expect(gatekeeper).toContain(
      "a row resumed from `blocked` may name **itself** plus the round whose GREEN wrote the predicate",
    );
    expect(gatekeeper).toContain("Check it against the **retained round block** rather than a");
  });
});

describe.each(TREES)("%s (resuming a blocked row is auditable and narrow)", (tree) => {
  it("keeps an approved Change Request on the sanctioned reset, not on the resumption", async () => {
    // `green` / `refactor` -> `blocked` made "unresolved Change Request" a
    // mid-cycle blocker. If that CR is then approved it moves the obligation,
    // and taking `blocked` -> `todo` on its "nothing upstream changed" gloss
    // would re-use the withdrawn implementation while skipping the DR-ID
    // record and the downstream sweep `drift-protocol.md` step 5 requires.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("(the blocker cleared **with this row's obligation intact**)");
    expect(ledger).toContain("**An approved Change Request is not this edge.**");
    expect(ledger).toContain("that CR resolved **without moving what the row owes**");
    expect(ledger).toContain(
      "**When the CR is approved and changes the obligation the row leaves `blocked` by the upstream reset below**",
    );
    // And the section an agent actually reads when a row is blocked says which
    // of the two exits applies.
    expect(ledger).toContain("**How it is left depends on how the blocker resolved.**");
    expect(ledger).toContain("only the first lets it re-use its retained rounds");
  });

  it("persists the block and its departure status in round evidence", async () => {
    // `Blocked-By` is a ledger column held only while the row is `blocked`, so
    // after the resumption nothing distinguished a resumed row from one an
    // approved reset returned to `todo` — and the self-reference was gated on
    // a retained GREEN both of them have.
    const rounds = flat(
      await read(tree, "assistant/skills/qfai-implement/references/round-evidence.md"),
    );
    expect(rounds).toContain("- `Round N: Resumed-from-blocked`");
    expect(rounds).toContain("**copied whole out of `Blocked-By`** before that transition clears");
    // The field list declares itself complete, so the new field has to be in it.
    expect(rounds).toContain(
      "the reviewer verdict, `Resumed-from-blocked` on a round a resumption wrote into",
    );
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("records `Resumed-from-blocked` on the round it writes into");
  });

  it("carries an interrupted round to completion instead of stranding it", async () => {
    // A block taken at `red` leaves a round with a RED pair and no GREEN pair.
    // "The resumed cycle is the next round" would leave that one permanently
    // short of the GREEN pair "one block per RED/GREEN cycle" requires.
    const rounds = flat(
      await read(tree, "assistant/skills/qfai-implement/references/round-evidence.md"),
    );
    expect(rounds).toContain("**Blocked at `red`**");
    expect(rounds).toContain("**continues that unfinished round**");
    expect(rounds).toContain("**Blocked at `green` or `refactor`**");
    expect(rounds).toContain("The resumed cycle is the **next round**");
    expect(rounds).toContain("**Blocked at `todo`**");
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain(
      "**Which round it writes into depends on whether the block left a round open**",
    );
  });

  it("gates the self-reference on the resumption record, not on a retained GREEN", async () => {
    const reference = flat(
      await read(tree, "assistant/skills/qfai-implement/references/red-not-observable.md"),
    );
    expect(reference).toContain("**The retained round is necessary and not sufficient**");
    expect(reference).toContain(
      "**Only a row whose resumed round carries `Resumed-from-blocked`**",
    );
    // The reviewer that judges the form has to apply the same condition.
    const gatekeeper = flat(await read(tree, "assistant/agents/qa-gatekeeper.md"));
    expect(gatekeeper).toContain("**The retained round alone does not qualify the row**");
    expect(gatekeeper).toContain(
      "require `Round N: Resumed-from-blocked` on the round the resumption wrote into",
    );
  });

  it("stops step 3b from replaying a consumed handover on a resumed ATDD row", async () => {
    // A resumed `E2E` / `API` / `Integration` row is at `todo`, so step 3b
    // claimed it by branch, consumed the original `/qfai-atdd` provenance and
    // skipped steps 4 and 5 — the row reached `red` on a RED observed before
    // the blocker moved the tree and never took the fresh one it owes.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "**Neither does a row resumed from a block taken at `red`, `green`, `refactor` or `review-fix`**",
    );
    expect(skill).toContain("steps 4 and 5 apply to it as they do to a `Unit` row");
    // Step 2 hands that row its transition instead, since 3b no longer will.
    expect(skill).toContain(
      "**Unless that row was resumed from a block taken after its handover was consumed**",
    );
    const reference = flat(
      await read(tree, "assistant/skills/qfai-implement/references/red-not-observable.md"),
    );
    expect(reference).toContain(
      "**On an `E2E` / `API` / `Integration` row the resumption reaches this procedure through steps 4 and 5, not through the handover.**",
    );
  });
});

describe.each(TREES)("%s (every departure from `blocked` is decidable)", (tree) => {
  it("writes the departure status at the block, not at the resumption", async () => {
    // `Resumed-from-blocked` was specified to carry "the status the row was
    // blocked at" but was only written by `blocked` -> `todo`. A row parked at
    // `blocked` across a session boundary persists nothing but `Status` and
    // `Blocked-By`, so by the time that field was written the departure status
    // was already gone and the next session had to guess it — which is also
    // what decides whether the resumption continues a round or opens one.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain(
      "| Blocked-By | What a `blocked` row is waiting on, and the status it was blocked at.",
    );
    expect(ledger).toContain("**followed by the status the row was blocked at**");
    expect(ledger).toContain(
      "**Both halves are written by the `Any active status -> blocked` transition itself**",
    );
    // The inbound edge itself has to ask for it, not only the column contract.
    expect(ledger).toContain(
      "Name the blocker **and the status the row is leaving** in `Blocked-By`",
    );

    // Which makes the round field a copy rather than a reconstruction.
    const rounds = flat(
      await read(tree, "assistant/skills/qfai-implement/references/round-evidence.md"),
    );
    expect(rounds).toContain("**copied whole out of `Blocked-By`**");
    expect(rounds).toContain("this field a copy rather than a reconstruction");

    // And the one-line summary an agent reads before the reference.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "a `blocked` row requires a `Blocked-By` naming the blocker **and the status it was blocked at**",
    );
  });

  it("gives a row blocked at `review-fix` a round to resume into", async () => {
    // `review-fix` is an active status, so the widened inbound edge admits it,
    // but the round-selection list named only `todo` / `red` / `green` /
    // `refactor`. `review-fix` does not change across the rework
    // (`#where-the-rounds-happen`), so the status alone cannot say whether a
    // rework round was left open — the round has to decide it.
    const rounds = flat(
      await read(tree, "assistant/skills/qfai-implement/references/round-evidence.md"),
    );
    expect(rounds).toContain("**Blocked at `review-fix`**");
    expect(rounds).toContain("the **round** decides which of the cases above applies");
    expect(rounds).toContain("**The `REVISE` is not discharged by the resumption**");
    // The list has to be exhaustive over the statuses the edge admits, or a
    // departure it skipped is a row with no legal way to reach `done`.
    expect(rounds).toContain("Every status the widened edge admits has a case here");

    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("or at `review-fix` after the rework had taken its RED");
    expect(ledger).toContain(
      "**A row blocked at `review-fix` still owes its reviewer the rework**",
    );
  });

  it("names only Change Request statuses a CR can actually hold", async () => {
    // `withdrawn` is not in the template's set, and
    // `change-request-reset.md` reads only `approved` / `rejected` /
    // `superseded` as resolved — so a CR parked at `withdrawn` on this
    // guidance would resume the row while the mandatory preflight kept
    // counting the CR as unresolved and spec completion stayed shut.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).not.toContain("rejected, withdrawn or superseded");
    expect(ledger).toContain("`open` / `approved` / `rejected` / `superseded`");
    expect(ledger).toContain("There is no `withdrawn`");
    // And a canonical landing for the case the word was reaching for.
    expect(ledger).toContain("Retire a CR nobody will apply as `rejected`");
  });

  it("still verifies the ATDD handover for a row blocked at `todo`", async () => {
    // `todo` -> `blocked` predates the widened edge and fires before
    // `/qfai-atdd` has written the test or the entry. The carve-out that sends
    // a resumed row past step 3b was written for a consumed handover and
    // applied to every `Resumed-from-blocked` row, so a row blocked at `todo`
    // reached `red` with no RED behind it — which `red-provenance.md` forbids
    // — and that stage lost the `todo` row it was going to hand over to.
    const skill = flat(await read(tree, SKILL));
    // Narrowed since: the departure status alone was made to stand for "the
    // handover was never consumed", which a reset row falsifies. The carve-out
    // still sends a row blocked at `todo` to 3b — it now also asks whether the
    // row carries a round.
    expect(skill).toContain(
      "**A row whose `Resumed-from-blocked` names `todo` and carries no earlier round is not that row**",
    );
    expect(skill).toContain(
      "**A row whose `Resumed-from-blocked` names `todo` over no earlier round does come here**",
    );
    // The unconditional wording is gone from both sites.
    expect(skill).not.toContain("**Unless that row was resumed from `blocked`**");
    expect(skill).not.toContain("**Neither does a row resumed from `blocked`**");

    const reference = flat(
      await read(tree, "assistant/skills/qfai-implement/references/red-not-observable.md"),
    );
    expect(reference).toContain("names a departure status **other than `todo`**");
    expect(reference).toContain("**A row blocked at `todo` is excluded from that exclusion**");
    // And such a row cannot claim the self-reference either: it wrote no round.
    expect(reference).toContain(
      "**naming a departure status whose round was closed by a GREEN pair**",
    );
  });

  it("retains the interrupted RED run instead of re-observing over it", async () => {
    // Continuing the unfinished round re-took the RED into the same three
    // fields, so the pre-block run — already executed and already judged by
    // `qa-gatekeeper` — disappeared. "Evidence hard rules" requires every run
    // of the same gate to be reported in order, which that overwrite breaks.
    const rounds = flat(
      await read(tree, "assistant/skills/qfai-implement/references/round-evidence.md"),
    );
    expect(rounds).toContain(
      "- `Round N: Interrupted RED revision` / `Round N: Interrupted RED test hash` (with its manifest) / `Round N: Interrupted RED command` / `Round N: Interrupted RED result`",
    );
    expect(rounds).toContain("requires every run of the same gate to be reported in order");
    expect(rounds).toContain("move that run into the round's `Interrupted RED` group");
    expect(rounds).toContain("**retained beside** the fresh one rather than replaced");
    // The complete field list has to admit it, or the round block rejects it.
    expect(rounds).toContain(
      "the `Interrupted RED` group on a round a resumption re-observed the RED into",
    );
    // The claim it replaced said the overwritten address was simply stale.
    expect(rounds).not.toContain("described a tree the blocker has since moved");

    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("**retaining the interrupted RED run** rather than overwriting it");
  });
});

describe.each(TREES)("%s (the blocked mechanism holds at its edges)", (tree) => {
  const rounds = async (): Promise<string> =>
    flat(await read(tree, "assistant/skills/qfai-implement/references/round-evidence.md"));

  it("names the departure statuses a row can be blocked at, and that both halves are enforced", async () => {
    // `Blocked-By` became the only persisted input to round selection, so a cell
    // the validator accepts without a departure status is a row no later
    // session can resume. The reference has to state the vocabulary the check
    // applies, or the two drift.
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain(
      "**The departure status is one of `todo` / `red` / `green` / `refactor` / `review-fix`**",
    );
    expect(ledger).toContain("`TDDLIST_BLOCKED_MISSING_REF` **errors on either half**");
    expect(ledger).toContain(
      "`TDDLIST_BLOCKED_MISSING_REF` errors when either half is absent, and when the departure status is not one the edge admits",
    );
  });

  it("resumes a row blocked at `red` before any RED was observed", async () => {
    // Phase Red writes `todo -> red` at step 2 and observes the RED at step 4,
    // so a blocker found while the test is still being authored parks the row at
    // `red` with an empty round. "Move the interrupted run into `Interrupted
    // RED`" had nothing to move, which left that round unresumable.
    const text = await rounds();
    expect(text).toContain(
      "**What the continuation does about the RED depends on whether one had been observed**",
    );
    expect(text).toContain("**The round holds neither**");
    expect(text).toContain("**no `Interrupted RED` group is written**");
    expect(text).toContain("Requiring the move unconditionally left this row with nothing to move");
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain(
      "or writing the RED as that round's first observation when the block landed before any run existed to retain",
    );
  });

  it("returns a behaviour-preserving `review-fix` block to the no-round path", async () => {
    // `#a-revise-that-needs-no-new-production-behaviour` opens no round and
    // verifies through a refreshed `Refactor verify` pair. Folding that path
    // into the next-round case demanded a fresh RED for rework that has no RED
    // phase, and the self-reference is closed to a `review-fix` departure — so
    // the row fell to "anything else" and `exception`.
    const text = await rounds();
    expect(text).toContain(
      "**which of the two rework paths it was on is what says whether the resumption opens one**",
    );
    expect(text).toContain("**The path that opens none**");
    expect(text).toContain("the resumption **opens none either**");
    expect(text).toContain("refresh the `Refactor verify` pair");
    expect(text).toContain("`Round N: Resumed-from-blocked` goes on the highest existing round");
    // And the section that owns the path says a block resumes back onto it.
    expect(text).toContain("**A block taken while on this path resumes on it.**");
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain(
      "the behaviour-preserving path **opens no round on resumption either**",
    );
  });

  it("retains the interrupted RED's test hash and manifest, not only its revision", async () => {
    // The fresh RED overwrites `RED test hash` and its manifest like every other
    // RED field, so preserving revision / command / result alone left a retained
    // run with no record of the test content and fixtures it executed.
    const text = await rounds();
    expect(text).toContain(
      "**It mirrors the round's own RED fields one for one, the `RED test hash` and its manifest included**",
    );
    expect(text).toContain("preserves a run with no way left to say what it ran");
  });

  it("resumes a `todo` block at the next round when the row already carries rounds", async () => {
    // An approved upstream reset and `exception` -> `todo` both return a row to
    // `todo` with its earlier rounds retained, and it can be blocked again
    // before taking a fresh RED. Numbering that resumption round 1 wrote over a
    // `Round 1` describing the pre-reset obligation.
    const text = await rounds();
    expect(text).toContain(
      "the resumed cycle is the row's **next** round: round 1 on a row that carries none, and the number after the highest on a row that already carries rounds",
    );
    expect(text).toContain("A row at `todo` is not always one that never ran");
    expect(text).toContain("either overwriting that record or mixing two cycles under one number");
    const ledger = flat(await read(tree, LEDGER));
    expect(ledger).toContain("**round 1 only on a row carrying no rounds**");
  });
});

describe.each(TREES)("%s (the resumption reads what was written, not the status alone)", (tree) => {
  const rounds = async (): Promise<string> =>
    flat(await read(tree, "assistant/skills/qfai-implement/references/round-evidence.md"));

  it("gives a finished but un-reviewed rework round a case of its own", async () => {
    // The review is requested at `refactor`, so a block taken between the
    // rework's GREEN and that return leaves the highest round holding both
    // pairs and no verdict. Read as "the rework had not opened a round", the
    // resumption went looking for a verdict that does not exist yet.
    const text = await rounds();
    expect(text).toContain(
      "**A highest round that holds both pairs but carries no reviewer verdict of its own is the rework's round, finished and not yet re-submitted**",
    );
    expect(text).toContain("The resumed cycle **opens no round**");
    // And the case that does read the verdict now says which round carries one.
    expect(text).toContain(
      "A highest round already closed by its GREEN pair **and carrying its own verdict** means the rework had not opened a round",
    );
  });

  it("continues a round a previous resumption opened and left empty", async () => {
    // `blocked` -> `todo` writes `Resumed-from-blocked` before the fresh RED it
    // owes, so a row blocked again while still at `todo` leaves a round with
    // that field and nothing else. Opening the next number stranded it.
    const text = await rounds();
    expect(text).toContain("**Unless the highest round holds nothing but `Resumed-from-blocked`**");
    expect(text).toContain("That round is unfinished, not closed");
    expect(text).toContain("the next resumption **continues it**");
  });

  it("moves a falsifiability trio into the retained group in its own shape", async () => {
    // The group described RED-pair fields only, so an interrupted trio lost the
    // predicate it broke and lost that it was a falsifiability observation.
    const text = await rounds();
    expect(text).toContain(
      "**A round whose RED observation was the falsifiability trio moves the trio, not a RED pair**",
    );
    expect(text).toContain("`Round N: Interrupted RED Satisfied-by`");
    expect(text).toContain("`Round N: Interrupted Falsifiability command`");
    expect(text).toContain("`Round N: Interrupted Falsifiability result`");
    expect(text).toContain("`Round N: Interrupted RED failure mode`");
    // The field list declares itself complete, so it has to admit both shapes.
    expect(text).toContain("in whichever of the two forms that round's own observation took");
  });

  it("keeps an already-recorded verdict recomputable after its run is moved", async () => {
    // The move happens after the gatekeeper hashed and passed that run, so
    // recomputing against the round's live RED fields reads the fresh run and
    // reports a correct PASS as stale — a row with no legal way to complete.
    const text = await rounds();
    expect(text).toContain(
      "**A verdict already recorded against the moved run is recomputed from this group, not from the round's live RED fields**",
    );
    const baseline = flat(
      await read(tree, "assistant/constitution/shared-skill-delegation-baseline.md"),
    );
    expect(baseline).toContain(
      "**A round that has moved its observation into the `Interrupted RED` group is hashed from that group**",
    );
    expect(baseline).toContain("The fresh observation is a separate subject");
  });

  it("puts `Resumed-from-blocked` inside the RED observation hash subject", async () => {
    // The reviewer was made to read the field, so a subject that does not cover
    // it lets the field be added, removed or rewritten to another departure
    // after the PASS with the recomputation unmoved.
    const baseline = flat(
      await read(tree, "assistant/constitution/shared-skill-delegation-baseline.md"),
    );
    expect(baseline).toContain(
      "the RED pair or the falsifiability trio with `RED failure mode`, and `Resumed-from-blocked` where the round carries one",
    );
    expect(baseline).toContain(
      "`Resumed-from-blocked` is in the subject because the reviewer reads it",
    );
  });

  it("makes the gatekeeper check the departure status, not just the field", async () => {
    // `red-not-observable.md` limits the self-reference to a departure a GREEN
    // pair closed; the reviewer condition required only that the field be
    // present, so a row blocked at `red` or `todo` could cite itself.
    const gatekeeper = flat(await read(tree, "assistant/agents/qa-gatekeeper.md"));
    expect(gatekeeper).toContain(
      "**Read the departure status it records and require `green` or `refactor`**",
    );
    expect(gatekeeper).toContain("has no GREEN of its own to point at");
  });

  it("does not read a reset ATDD row's spent handover as an unconsumed one", async () => {
    // An approved upstream reset returns a completed E2E/API/Integration row to
    // `todo` with its rounds retained; blocked again there, its
    // `Resumed-from-blocked` names `todo` over provenance consumed a cycle ago.
    const skill = flat(await read(tree, SKILL));
    expect(skill).toContain(
      "**A row whose `Resumed-from-blocked` names `todo` and carries no earlier round is not that row**",
    );
    expect(skill).toContain("**The departure status alone does not say the handover is unspent**");
    expect(skill).toContain(
      "**A row whose `Resumed-from-blocked` names `todo` over no earlier round does come here**",
    );
    expect(skill).toContain("**A row that carries an earlier round does not**");
    expect(skill).toContain("an entry whose RED observation is newer than the retained rounds");
  });
});
