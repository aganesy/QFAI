import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`. A runner launched from the
// repo root resolves `../..` to the directory ABOVE the repo, and every read
// below then fails on a path unrelated to what is being asserted.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const REFERENCE = "assistant/skills/qfai-implement/references/volume-policy.md";
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which the sentence happened to break.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("qfai-implement scales its ceremony to ledger volume", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the skill keeps a pointer to the full rules`, async () => {
      const skill = await read(tree, SKILL);
      expect(skill).toContain("## Volume Policy (MUST)");
      expect(skill).toContain("references/volume-policy.md");
      expect(skill).toContain("risk tier");
    });
  }

  for (const tree of QFAI_TREES) {
    it(`${tree}: defines risk tiers with a stated default`, async () => {
      const section = await read(tree, REFERENCE);
      expect(section).not.toBe("");
      expect(section).toContain("## Risk tier (derive per row)");
      expect(section).toContain("T1 — standard");
      expect(section).toContain("T2 — elevated");
      expect(section).toContain("T3 — surface");
      // An unrecorded tier must not silently become the cheapest one.
      expect(section).toContain("A row with no recorded tier is treated as **T2**");
    });

    it(`${tree}: states its rationale once and points at the file that holds the ceremony`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      // A merge left two wordings of the same opening paragraph stacked. The
      // surviving one must be the copy corrected for the move into a reference
      // file: it names `SKILL.md`, where the per-item ceremony actually lives.
      const rationale = section.match(/The per-item ceremony/g) ?? [];
      expect(rationale, "the rationale paragraph is duplicated").toHaveLength(1);
      expect(section).toContain(
        "The per-item ceremony in `SKILL.md` is written for a ledger of tens of rows",
      );
      // What is below in this file is the risk-tier table, not the ceremony.
      expect(section).not.toContain("The per-item ceremony below");
      expect(section).toContain("dropping a gate is not on the table");
    });

    it(`${tree}: permits batched review with a bounded unit`, async () => {
      const section = await read(tree, REFERENCE);
      expect(section).toContain("## Batched review");
      expect(section).toContain("coherent group");
      expect(section).toContain("a `REVISE` on the group blocks every member");
      expect(section).toContain("a T2 or T3 row is always reviewed alone");
    });

    it(`${tree}: allows a sequential multi-spec queue without enabling parallelism`, async () => {
      const content = await read(tree, SKILL);
      const section = await read(tree, REFERENCE);
      expect(section).toContain("## Multi-spec queue");
      expect(section).toContain("This is a queue, not parallelism");
      // Auto-discovery must no longer say "at most one spec".
      expect(content).not.toContain("Auto-discovery selects at most one spec");
      expect(content).toContain("does NOT enable multi-spec parallel execution");
    });

    it(`${tree}: makes the gate-cycle cost visible before processing`, async () => {
      const section = await read(tree, REFERENCE);
      expect(section).toContain("## Cost visibility");
      expect(section).toContain("rows × gate cycles");
    });

    it(`${tree}: T1 rebatches the mandatory gates instead of dropping them`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      const skill = unwrap(await read(tree, SKILL));
      // agent-routing.yml keeps qa-gatekeeper mandatory+blocking, so T1 must not
      // claim "no live gatekeeper turn".
      expect(section).not.toContain("no live gatekeeper turn");
      expect(section).toContain("### Routing is unchanged");
      expect(section).toContain("scales **how often** a gate runs, never **whether** it runs");
      // `blocking_agents` now carries all three reviewers, so the prose must
      // not keep describing `implementation-reviewer` as absent from it.
      expect(section).not.toContain("Note the asymmetry");
      expect(section).not.toContain("`implementation-reviewer` is mandatory but not in that list");
      expect(section).toContain(
        "`blocking_agents` lists all three, so a `REVISE` from any of them blocks `done`",
      );
      expect(skill).not.toContain("only the first two are in `blocking_agents`");
      expect(skill).toContain("`implementation-reviewer` all mandatory and all blocking");
      expect(section).toContain(
        "`qa-gatekeeper` confirms RED/GREEN once per coherent group instead of once per row",
      );
      // The handoff contract and the 11-point gate carry the same tier rule.
      expect(skill).toContain("the submitted unit in steps 2-4 is the coherent group");
      expect(skill).toContain(
        "items 3, 5, 7 and 8 are satisfied by the confirmation covering the row's coherent group; they are never waived",
      );
    });

    it(`${tree}: group formation has a review-start condition and no new lifecycle edge`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      const skill = unwrap(await read(tree, SKILL));
      expect(section).toContain("### Group formation (states and transitions)");
      expect(section).toContain("adds **no** status value");
      expect(section).toContain("this is the review-start condition");
      expect(section).toContain("Members still move `refactor -> done`, only together");
      // Item 11 of the 11-point gate must not be skipped by the batch write.
      expect(section).toContain("**Checkpoint, then the ledger write.**");
      expect(section).toContain("checkpoint verification to pass **before** a row becomes `done`");
      expect(section).toContain("A failing checkpoint leaves the whole group in `refactor`");
      // Parking a row in `refactor` must be reconciled with one-item-at-a-time.
      expect(section).toContain("at most one row is in `red` or `green` at any moment");
      expect(skill).toContain(
        "A T1 row parked in `refactor` waiting for its review group (see Volume Policy) does not violate this",
      );
      expect(skill).toContain("stays in `refactor` until the group closes");
    });

    it(`${tree}: a QA rejection of the cycle has a recovery edge`, async () => {
      // T1 defers the RED/GREEN confirmation until after the row has left
      // `red`. Forward-only plus "every member stays in `refactor`" left a
      // rejected row unable to redo the RED it was faulted for — permanently
      // unable to reach `done`.
      const section = unwrap(await read(tree, REFERENCE));

      // The edge must exist in the lifecycle SSOT. That SSOT is now
      // `references/execution-ledger.md` — SKILL.md carries a summary and a
      // pointer under the progressive-disclosure budget (#414).
      //
      // Assert both anchors first: an `indexOf` miss returns -1, and `slice`
      // then succeeds on a different range, so a moved heading would make every
      // assertion below vacuous instead of failing. That is exactly what it
      // caught when the lifecycle moved out of SKILL.md.
      const ledger = unwrap(await read(tree, LEDGER));
      // A real heading, so `TDDLIST_EXCEPTION_PARKED` and SKILL.md can link to
      // `#allowed-transitions` — as plain text it rendered no anchor and both
      // pointers landed at the top of the file.
      const lifecycleStart = ledger.indexOf("### Allowed transitions");
      const lifecycleEnd = ledger.indexOf("## Exception Handling");
      expect(
        lifecycleStart,
        "execution-ledger.md has no `### Allowed transitions`",
      ).toBeGreaterThan(-1);
      expect(lifecycleEnd, "execution-ledger.md has no `## Exception Handling`").toBeGreaterThan(
        lifecycleStart,
      );
      const lifecycle = ledger.slice(lifecycleStart, lifecycleEnd);
      expect(lifecycle).toContain("`refactor` -> `red`");
      expect(lifecycle).toContain("QA rejection recovery");
      expect(lifecycle).toContain("Cite the verdict in `Evidence`");
      // Every edge not listed stays prohibited. The old wording ("nothing but
      // that QA rejection re-opens a row") was false against this same list —
      // `blocked -> todo`, `exception -> todo` and the upstream reset all
      // re-open one — so the claim is now the closed-list rule plus a table
      // naming each returning edge and whether it needs approval.
      expect(lifecycle).toContain("Any edge not listed above is prohibited.");
      expect(lifecycle).not.toContain("the only re-entry");
      expect(lifecycle).toContain('**"Backward" is narrower than "moves to an earlier status".**');
      for (const edge of ["`blocked` -> `todo`", "`exception` -> `todo`", "`refactor` -> `red`"]) {
        expect(lifecycle).toContain(edge);
      }
      expect(lifecycle).toContain('"Backward transition prohibited: green -> red"');

      // The reference splits the two kinds of REVISE so the edge is not used
      // for a merely badly written evidence cell.
      expect(section).toContain("It adds exactly **one** lifecycle edge");
      expect(section).toContain("about how the evidence was **written** — fix in place");
      expect(section).toContain("takes the `refactor -> red` QA rejection recovery");
      expect(section).toContain("The group stays open and is reviewed again on close");
      // The anchor the skill points at must resolve.
      expect(section).toContain("### Group formation (states and transitions)");
    });

    it(`${tree}: the group key is a ledger column, not a join the runner redoes`, async () => {
      // Open/Fill/Close were predicates over "the BR/AC this row belongs to",
      // and no ledger column carried it: `TC-Refs` reaches an AC through
      // `06_Test-Cases.md` and a BR only by scanning `04_Business-Rules.md`
      // backwards. A run could then never close a group (nothing reviewed) or
      // close one per row (T2 cost at T1 ceremony).
      const section = unwrap(await read(tree, REFERENCE));
      const ledger = unwrap(await read(tree, LEDGER));
      const skill = unwrap(await read(tree, SKILL));

      expect(ledger).toContain("## Group key column (optional, required for T1 batching)");
      expect(ledger).toContain("| BR-Ref |");
      // The two hops are many-to-many, so the value needs a stated tie-break or
      // two agents grouping the same rows disagree.
      expect(ledger).toContain("**One `BR-*` per row.**");
      expect(ledger).toContain("keep the **lowest-numbered** `BR-*`");
      expect(ledger).toContain("`/qfai-sdd` Phase 2b");
      // An unresolved key must degrade to a group of one, never to no close.
      expect(ledger).toContain("it forms a group of one and is reviewed alone");

      expect(section).toContain("the set of items that share one `BR-Ref` value");
      expect(section).toContain(
        "no `todo` **T1** row carrying the key remains **anywhere** in the ledger",
      );
      expect(section).not.toContain("the first T1 row of a BR/AC reaches `refactor`");
      // Ledger order need not be key-contiguous. Closing on "the next `todo`
      // row has a different key" reopens a second group on the same key later,
      // which is one review per contiguous run, not one per `BR-Ref`.
      expect(section).toContain("The keyed conditions scan the **whole** ledger");
      expect(section).toContain("`BR-A, BR-B, BR-A`");
      expect(skill).toContain("the rows sharing one `BR-Ref`, the ledger's group key");
    });

    it(`${tree}: an open group makes Phase Red's row selection keyed, not positional`, async () => {
      // Fill advances "the ledger's remaining T1 rows carrying that same
      // `BR-Ref`", but Phase Red selected the first `todo` row in ledger order.
      // On `BR-A, BR-B, BR-A` those disagree: the positional pick is the `B`,
      // which can neither join the open `A` group nor open one of its own,
      // while the trailing `A` keeps the open group from closing.
      const section = unwrap(await read(tree, REFERENCE));
      const skill = unwrap(await read(tree, SKILL));

      expect(section).toContain("**While a group is open, this selection outranks ledger order**");
      expect(section).toContain("the first `todo` row carrying the **open key**");
      expect(section).toContain(
        "Selection returns to ledger order only once no `todo` T1 row carries the key",
      );
      expect(skill).toContain(
        "**While a T1 review group is open that `todo` selection is keyed, not positional**",
      );
      expect(skill).toContain("take the first `todo` row carrying the open group's `BR-Ref`");
      expect(skill).toContain("`references/volume-policy.md` > Group formation, Fill");
    });

    it(`${tree}: a named row of another key is deferred, not stranded at refactor`, async () => {
      // "A named row wins" applied before the keyed selection: a named T1 row
      // of key B, invoked while group A is open, can neither join A nor open
      // its own group — and Open fires on a row *reaching* `refactor` while no
      // group is open, an event that has passed by the time A closes. B sat at
      // `refactor` permanently, with no rule that re-offers it a group.
      const section = unwrap(await read(tree, REFERENCE));
      const skill = unwrap(await read(tree, SKILL));

      expect(skill).toContain("**An open T1 review group outranks even that**");
      expect(skill).toContain(
        "a named T1 row whose `BR-Ref` differs from the open group's key is **deferred**",
      );
      expect(section).toContain("**It outranks the named-row override too.**");
      expect(section).toContain("is a selection rule, not a licence to strand one");
      // Deferral, not rejection: the ids are still processed, and the reason it
      // cannot deadlock is that no close condition needs them.
      for (const doc of [skill, section]) {
        expect(doc).toContain("an event, not a state");
        expect(doc).toContain("then processed in the order given");
      }
      expect(skill).toContain("Deferring cannot deadlock");
      expect(section).toContain("Deferral cannot deadlock");
      // Over-correction pin: a named row that shares the open key, and a named
      // T2/T3 row, are not deferred.
      expect(skill).toContain("A named row carrying the open key joins the group");
      expect(section).toContain("a named T2 / T3 row is reviewed alone and is never deferred");
    });

    it(`${tree}: the direct TC -> EX -> BR edge wins over the AC join`, async () => {
      // The AC join alone misattributes a row: a TC pinned through its `EX` to
      // one `BR` was filed under the lowest-numbered `BR` merely sharing its
      // `AC`, so rows verifying different rules landed in one review unit.
      const ledger = unwrap(await read(tree, LEDGER));
      // The key is only reproducible if a wrong one is named: optional to the
      // validator, checked when the ledger declares it.
      expect(ledger).toContain("`TDDLIST_BR_REF_UNRESOLVED`");
      // Resolving is not deriving: a key from some other route names a real
      // rule and still batches the row under one its `TC-Refs` never reach.
      expect(ledger).toContain("`TDDLIST_BR_REF_MISMATCH`");
      expect(ledger).toContain("the validator recomputes it and names the expected value");
      // And a rule named only in an auxiliary table is not a declaration.
      expect(ledger).toContain(
        "reads declarations from a table's `BR-ID` column and from `## BR-NNNN-NNNN` headings only",
      );
      expect(ledger).toContain("**`TC` -> `EX` -> `BR`.**");
      expect(ledger).toContain("that `EX`'s `BR-Ref` in `05_Examples.md`");
      expect(ledger).toContain("**Only for a TC with no `EX-Ref`:**");
      // One `EX` may pin a cohesive rule bundle to several `BR-*`
      // (`layerCoverage.test.ts`), so the hop is not single-valued and the
      // tie-break has to run over the union, not only over several `TC-Refs`.
      expect(ledger).toContain("may list **several** `BR-*` in that one cell");
      expect(ledger).toContain("The tie-break applies to the whole union");
    });

    it(`${tree}: the close conditions are scoped to the key's T1 members`, async () => {
      // Tier is derived per row, so one `BR-Ref` can hold T2/T3 rows. Reading
      // them as members strands the group — Fill only ever advances the key's
      // remaining T1 rows, so a `todo` T2 row keeps both conditions false.
      const section = unwrap(await read(tree, REFERENCE));
      expect(section).toContain("every **T1** row carrying the key has reached `refactor`");
      expect(section).toContain("Both keyed conditions read **T1 members only**");
      expect(section).toContain("neither join the group nor hold it open");
      // `-` is "not resolved", not a value rows share — and neither is the
      // empty cell the validator accepts as the same state. Reading `""` as an
      // ordinary key batches rows no `BR` relates into one review unit.
      expect(section).toContain("`-` is **not** a shared key");
      expect(section).toContain("**empty cell reads exactly as `-`**");
      expect(section).toContain(
        "opens a group of one that closes the moment that row reaches `refactor`",
      );
      const ledger = unwrap(await read(tree, LEDGER));
      expect(ledger).toContain("**An empty cell is the same state as `-`**");
    });

    it(`${tree}: the ledger-exhausted clause is a terminator, not a grouping rule`, async () => {
      // It is the only close condition a keyless ledger can evaluate, so it was
      // the fallback every run reached — and it makes the whole spec one group,
      // which "a group must not mix tiers" forbids.
      const section = unwrap(await read(tree, REFERENCE));
      expect(section).toContain(
        "The last close condition is a **terminator, not a grouping rule**",
      );
      expect(section).toContain("has batched the whole spec into one group");
      expect(section).toContain("### When the ledger carries no `BR-Ref` column");
      expect(section).toContain('Do **not** fall through to "the ledger has no `todo` rows left"');
      expect(section).toContain("every T1 row is its own group and is reviewed alone");
    });

    it(`${tree}: criticality forces T2 regardless of layer`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      expect(section).toContain("### Criticality outranks connectedness");
      expect(section).toContain("**T2 regardless of layer**");
      for (const critical of [
        "an authorization or authentication decision",
        "cryptographic verification",
        "money or accounting arithmetic",
        "data-integrity or safety-critical logic",
      ]) {
        expect(section).toContain(critical);
      }
      expect(section).toContain("When it is arguable whether a row is critical, it is critical");
    });

    it(`${tree}: cites the volume-policy subsections by file, not as bare sections`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const section = await read(tree, REFERENCE);
      // `Volume Policy > X` reads as a pointer inside SKILL.md, but its own
      // `## Volume Policy (MUST)` section carries none of those subsections —
      // they live in `references/volume-policy.md`. Cite the file, the way
      // every other reference in SKILL.md does.
      expect(skill).not.toMatch(/Volume Policy\s*>/);
      const citations: ReadonlyArray<readonly [string, string]> = [
        ["references/volume-policy.md#multi-spec-queue", "## Multi-spec queue"],
        ["references/volume-policy.md#advancing-the-queue", "### Advancing the queue"],
        [
          "references/volume-policy.md#group-formation-states-and-transitions",
          "### Group formation (states and transitions)",
        ],
      ];
      for (const [citation, heading] of citations) {
        expect(skill, `SKILL.md does not cite ${citation}`).toContain(citation);
        expect(section, `volume-policy.md has no ${heading}`).toContain(heading);
      }
    });

    it(`${tree}: the multi-spec queue defines how it advances and when it exits`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      const skill = unwrap(await read(tree, SKILL));
      expect(section).toContain("### Advancing the queue");
      expect(section).toContain("**Empty -> exit.**");
      expect(section).toContain('"Report and exit" in CRITICAL CONSTRAINTS applies per ledger');
      expect(section).toContain("Exit only after the last queued spec");
      // The constraint that used to end the run at the first finished ledger.
      expect(skill).not.toContain('When all items are `done`, report "nothing to do" and exit.');
      expect(skill).toContain(
        'report "nothing to do" for that spec, then advance to the next spec of a confirmed queue',
      );
      expect(skill).toContain("announce the next queued spec and restart at Phase: Red");
    });
  }
});
