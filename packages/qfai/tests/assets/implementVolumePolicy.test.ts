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
    });

    it(`${tree}: the tier is a ledger column, not prose in the Evidence cell`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      const ledger = unwrap(await read(tree, LEDGER));

      // The tier used to be recorded in `Evidence` — a pointer cell, written
      // last, by the agent whose ceremony the tier decides. It could not be
      // read before the work it sizes, so T1 was unreachable from the schema.
      expect(section).not.toContain("Record the tier in the row's `Evidence` cell");
      expect(section).toContain("The tier lives in the row's own `Tier` column");
      expect(section).toContain("It is **not** recorded in `Evidence`");
      expect(section).toContain(
        "`/qfai-sdd` Phase 2b derives it once per row, while it is seeding the row, and writes it to that row's `Tier` column",
      );

      // The schema has to carry the column the policy points at. Padding is
      // prettier's, so the cell is compared with runs of spaces collapsed.
      expect(ledger.replace(/ {2,}/g, " ")).toContain(
        "| Tier | Review tier `/qfai-implement` owes this row. Legal values: `T1`, `T2`, `T3`; `-` when undeclared |",
      );
      expect(ledger).toContain(
        "## Declared tier column (optional, seeded at ledger-authoring time)",
      );
      expect(ledger).toContain("Fill it at ledger-authoring time (`/qfai-sdd` Phase 2b)");

      // The skill body sends the reader to the column, not to `Evidence`.
      const skill = unwrap(await read(tree, SKILL));
      expect(skill).toContain(
        "take each row's **risk tier** from its own ledger table's `Tier` column (blank is T1; a table lacking that column derives per row)",
      );
    });

    it(`${tree}: an unescalated row defaults to T1, an absent column does not`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      const ledger = unwrap(await read(tree, LEDGER));

      // Absence used to mean T2, so the tier that exists to make cheap rows
      // cheap was the only one costing a deliberate act to claim.
      expect(section).not.toContain("A row with no recorded tier is treated as **T2**");
      expect(section).toContain("A row whose `Tier` cell is blank or `-` is **T1**");
      expect(ledger).toContain("**Blank or `-` means `T1`.**");
      // A legacy ledger predating the column is not silently downgraded.
      expect(section).toContain("An absent column is not a claim of T1");
      expect(ledger).toContain(
        "A ledger **table** carrying no `Tier` column is not covered by that default",
      );
      // The criticality tie-break moved upstream; it did not soften.
      expect(section).toContain("apply the criticality tie-break below");
    });

    it(`${tree}: the missing column is judged per ledger table, not per file`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      const ledger = unwrap(await read(tree, LEDGER));

      // `/qfai-implement` appends a ledger table per change request
      // (`tddHelpers.collectLedgerTables`), so a file-wide "has a Tier column?"
      // test lets a seeded table vouch for an unseeded neighbour: those rows
      // carry no Tier cell at all, yet would read as blank, and blank is T1.
      // An authz or contract row would be batched instead of reviewed per row.
      expect(section).toContain("The column is read per ledger table, not per file.");
      expect(section).toContain("`/qfai-implement` appends a table per change request");
      expect(section).toContain(
        "A ledger **table** whose header carries no `Tier` is not covered by that default",
      );
      expect(section).toContain("a sibling table's column does not stand in for the missing one");
      expect(ledger).toContain("read the header of the table the row lives in, not the file");
      expect(ledger).toContain("Derive the tier of every row in that table before processing it");
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
