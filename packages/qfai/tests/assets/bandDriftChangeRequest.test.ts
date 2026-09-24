/**
 * The band drift is recorded where the Drift Protocol looks for it.
 *
 * `QFAI-AUD-020` lost its lower bound as product work: the validator, its
 * tests, the shipped documents and the changelog moved, and the spec packs and
 * the decision records that chose the band did not. A spec stating the opposite
 * of the product is not a bug in either of them — it is settled input the work
 * revealed to be wrong, and the protocol's answer to that is a Change Request.
 *
 * **These assertions hold across the record's lifecycle.** A Change Request is
 * approved, rejected or superseded in place, and the protocol's own step 3
 * rewrites `Status`, `Approved option` and the impact scope when that happens —
 * so pinning today's `open` / `-` would redden this file on the very resolution
 * it exists to make possible. What is pinned instead is the shape a record of
 * this drift must have whatever its status: the contradiction it states, the
 * rows it blocks, the question it puts, and the fields the Decisions layout
 * gives an owner to answer it with.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const CHANGE_REQUEST = path.join(
  repoRoot,
  ".qfai/decisions/CR-20260913-0001-spec-0013-keeps-the-primary-tasks-lower-bound-the-validator-dropped.md",
);

/** The defect record for the template path the band statements name. */
const TEMPLATE_PATH_REQUEST = path.join(
  repoRoot,
  ".qfai/decisions/CR-20260913-0010-spec-0013-and-dr-0267-name-a-ui-contract-template-the-package-does-not-ship.md",
);

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("the primary_tasks band drift has a Change Request", () => {
  const changeRequest = (): Promise<string> => readFile(CHANGE_REQUEST, "utf-8");

  const expectPhrase = async (phrase: string): Promise<void> => {
    expect(unwrap(await changeRequest())).toContain(unwrap(phrase));
  };

  it.each([
    [CHANGE_REQUEST, "CR-20260913-0001", "intent", /^[123]$/],
    // A defect has one repair, so its approval names no option.
    [TEMPLATE_PATH_REQUEST, "CR-20260913-0010", "defect", /^-$/],
  ])(
    "%s carries the header fields the protocol reads, as a legal combination",
    async (file, id, recordClass, optionForm) => {
      // The values move as the record is resolved, and each status fixes what the
      // others may hold: an approval with no option is unresolved under the reset
      // preflight, and an open record naming one claims a choice nobody made.
      const text = await readFile(file, "utf-8");
      expect(text).toContain(`- ID: \`${id}\``);
      expect(text).toContain(`- Class: \`${recordClass}\``);
      const field = (name: string): string | undefined =>
        new RegExp(`^- ${name}: \u0060([^\u0060]*)\u0060$`, "m").exec(text)?.[1];
      const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      const heading = text.indexOf("\n## Resolution\n");
      // Every status carries the section; a record that lost it would read as all resolution.
      expect(heading).toBeGreaterThan(-1);
      const resolution = text.slice(heading + "\n## Resolution\n".length);
      const resolved = resolution.replace(/<!--[\s\S]*?-->/g, "").trim().length > 0;
      const status = field("Status");
      const approvedBy = field("Approved by");
      const approvedAt = field("Approved at") ?? "";
      const option = field("Approved option");
      const appliedAt = field("Applied at") ?? "";
      const supersededBy = field("Superseded by");

      expect(["open", "approved", "rejected", "superseded"]).toContain(status);
      if (status === "open") {
        expect([approvedBy, approvedAt, option, appliedAt, supersededBy]).toEqual([
          "-",
          "-",
          "-",
          "-",
          "-",
        ]);
        expect(resolved).toBe(false);
        return;
      }
      expect(approvedBy ?? "").toMatch(/^(?!-$)\S.*$/);
      expect(approvedAt).toMatch(timestamp);
      if (status === "approved") {
        // The intent record offers options 1, 2 and 3; the defect record none.
        expect(option).toMatch(optionForm);
        expect(supersededBy).toBe("-");
        // Approval alone does not release the gate; once applied, it says how.
        if (appliedAt === "-") {
          expect(resolved).toBe(false);
        } else {
          expect(appliedAt).toMatch(timestamp);
          expect(resolved).toBe(true);
        }
        return;
      }
      expect(appliedAt).toBe("-");
      expect(resolved).toBe(true);
      if (status === "rejected") {
        expect([option, supersededBy]).toEqual(["-", "-"]);
      } else {
        expect(supersededBy).toMatch(/^CR-\d{8}-\d{4}$/);
      }
    },
  );

  it("states both sides of the contradiction by artifact", async () => {
    // The condition the request was raised over, so the record stays true
    // after the option that restores the lower bound is applied.
    await expectPhrase("When this request was raised, `QFAI-AUD-020` was a ceiling");
    await expectPhrase("count == 1 emits nothing");
    await expectPhrase("fewer than 3 or more than 7");
  });

  it("blocks the rows whose obligation the product contradicts", async () => {
    // The two packs share the decision, so settling it for one leaves the
    // shared record and one of its readers disagreeing.
    const section = (await changeRequest())
      .split("## Blocked downstream items\n")[1]
      ?.split("\n## ")[0];
    const items = section
      ?.split("\n")
      .filter((line) => line.startsWith("|") && line.includes("`ledger-row`"))
      .map((line) => line.split("|").map((cell) => cell.trim())[1]);
    expect(items).toEqual([
      "`spec-0013/TDD-0027`, `TDD-0068`, `TDD-0069`",
      "`spec-0013/TDD-0028`, `TDD-0070` to `TDD-0072`",
      "`spec-0013/TDD-0043`, `TDD-0098` to `TDD-0101`, `TDD-0106`, `TDD-0107`",
      "`spec-0004/TDD-0050`",
    ]);
  });

  it("leaves the rows' stale selectors to the stage that may rewrite them", async () => {
    // A `confirm-only` rerun writes no row cell, and a selector that resolves
    // is no longer the executing stage's to repair.
    await expectPhrase(
      "**The three rows' `Selector` cells still state the band, and none of them resolves.**",
    );
  });

  it("re-verifies those rows in place when the product changes to meet them", async () => {
    // An approved reset claims an upstream change. Under option 3 nothing
    // upstream moves, so the rows keep their status and are re-verified.
    await expectPhrase("3. Downstream ledger sweep, under options 1 and 2.");
    await expectPhrase("**Under option 3 no row is reset.**");
    await expectPhrase(
      "**every `done` row whose test runs the changed validator is re-verified in place**",
    );
    // A row a pending reset already returned to `todo` takes its own cycle.
    await expectPhrase("returned to `todo` by then is re-executed by its own cycle instead");
  });

  it("routes the acceptance tests through the stage that writes them", async () => {
    // `/qfai-implement` writes no E2E, API or ATDD-owned Integration test.
    await expectPhrase("**`/qfai-atdd spec-0004` runs under every option**");
    await expectPhrase("the same pass also updates the two skipped cases");
    await expectPhrase("are acceptance tests, which `/qfai-atdd spec-0013` updates");
  });

  it("names an invocation per artifact class, with its mode", async () => {
    // A bare invocation cannot reach a spec-local file and a scoped one cannot
    // reach the policy record.
    await expectPhrase("| `/qfai-sdd spec-0013` |");
    await expectPhrase("| `/qfai-sdd spec-0004` |");
    // The bare invocation is the policy record's owner. The prose naming it
    // would survive the row's removal, so the row itself is what is pinned.
    expect(await changeRequest()).toMatch(/^\s*\| `\/qfai-sdd` +\| `_policies\/08_Decisions\.md`/m);
    await expectPhrase("naming one invocation would leave part of the record unwritten");
  });

  it("says which rows it does not block, and why", async () => {
    // A halt nobody can check the edge of stops more than it was meant to.
    await expectPhrase(
      "Rows for structured task shapes (`TDD-0029/0030` and their siblings) remain",
    );
    await expectPhrase("their obligations do not change with the band decision");
    await expectPhrase(
      "Every other `spec-0004` row but `TDD-0050` is also outside this blocked set",
    );
  });

  it("puts the decision-record question rather than answering it", async () => {
    // Following the product settles the spec statements. It does not settle
    // what becomes of a decision the product overturned.
    await expectPhrase("whether a reversed decision is rewritten in place or left standing");
    await expectPhrase("**supersede** the three decisions");
    await expectPhrase("**rewrite** the three decisions in place");
    await expectPhrase("Restore the floor in the product");
  });

  it("supersedes through the fields the Decisions layout defines", async () => {
    // `Superseded by` is not one of them, and the protocol forbids inventing
    // a layout, so an owner could not have carried out that instruction.
    await expectPhrase("there is no `Superseded by` field to write");
  });

  it("links a superseded record through a value `Related` may hold", async () => {
    // Neither Decisions template admits a `DR-*` in `Related`, and both admit
    // a `CR-*`. Naming the new decision there would write a value the layout
    // forbids; naming this record, which names the new decision, does not.
    await expectPhrase("`Related` cannot hold");
    await expectPhrase("names\n`CR-20260913-0001` in `Related`");
  });

  it("supersedes only the band choice of the composite record", async () => {
    // `Status` belongs to the whole record, and the composite adopts two
    // decisions this record does not reach. Setting it would withdraw them.
    await expectPhrase("`DR-0004-0014` is not superseded as a record.");
    // The option an approver reads says so too, not only the action beneath it.
    await expectPhrase(
      "the composite `DR-0004-0014` stays standing, with only its band entry marked superseded",
    );
    await expectPhrase("The other two\nadoptions are not touched.");
  });

  it("keeps the authorization list conditioned on the outcome while it is open", async () => {
    // `QFAI-DRIFT-001` reads a path here and not the condition beside it, so
    // the section is narrowed before the status leaves `open` — which removes
    // the conditional prose this asserts. Pinning it past `open` would redden
    // this file on the very resolution the record exists to make possible.
    const text = await changeRequest();
    if (!/^- Status: `open`$/m.test(text)) return;
    await expectPhrase("**Under option 3 it reduces to the three delta files**");
    await expectPhrase("reduced to the approved outcome before `Status: approved` is written");
  });
});
