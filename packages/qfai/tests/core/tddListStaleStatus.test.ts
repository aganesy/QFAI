/**
 * The ledger must be compared to the repository in both directions.
 *
 * `TEST_FILE_CHECK_STATUSES` gated the validator's only filesystem probe, so
 * "row claims `done` but the test file is missing" was an error while "the test
 * exists and passes but the row still claims `todo`" was invisible. The second
 * direction is the one that actually occurs when work lands from parallel
 * worktrees — in the field, 228 of 510 rows across eight ledgers were recorded
 * `todo` while their test file existed and their selector was collected, and
 * `qfai validate --profile tdd --fail-on error` reported `error: 0` throughout.
 *
 * `Selector` was also required and read by no code in the package. It is what
 * makes the converse check trustworthy: a test file hosts many rows, so file
 * existence alone would fire on any row whose neighbours had landed.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const BASE_HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence |";
const BASE_SEP =
  "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- |";

type Issues = Awaited<ReturnType<typeof validateTddList>>;

/**
 * @param rows - ledger rows, already pipe-formatted
 * @param repoFiles - extra files to create, keyed by repo-relative path
 */
async function withLedger(
  rows: string[],
  repoFiles: Record<string, string>,
  assertion: (issues: Issues) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-stale-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    for (const file of ["01_Spec.md", "02_User-stories.md", "03_Acceptance-Criteria.md"]) {
      await writeFile(path.join(specDir, file), "# x\n", "utf-8");
    }
    await writeFile(path.join(specDir, "06_Test-Cases.md"), "# TC\n", "utf-8");
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      [BASE_HEADERS, BASE_SEP, ...rows].join("\n"),
      "utf-8",
    );
    for (const [rel, content] of Object.entries(repoFiles)) {
      const abs = path.join(root, rel);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, content, "utf-8");
    }
    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const stale = (issues: Issues): Issues => issues.filter((i) => i.code === "TDDLIST_STALE_STATUS");
const unresolved = (issues: Issues): Issues =>
  issues.filter((i) => i.code === "TDDLIST_SELECTOR_UNRESOLVED");

const TEST_FILE = "it('renders the header', () => {});\nit('test_reconcile_head', () => {});\n";

describe("TDDLIST_STALE_STATUS — the ledger under-reporting", () => {
  it("reports a todo row whose test file and selector both exist", async () => {
    await withLedger(
      ["| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | renders the header | todo | - | - |"],
      { "tests/a.test.ts": TEST_FILE },
      (issues) => {
        const found = stale(issues);
        expect(found).toHaveLength(1);
        // A warning, not an error: the row may legitimately be about to be
        // reconciled, and the finding is "reconcile this", not "you lied".
        expect(found[0]?.severity).toBe("warning");
        expect(found[0]?.message).toContain("The ledger may be stale");
        expect(found[0]?.suggested_action).toContain("TDDLIST-005");
      },
    );
  });

  it("stays silent when the test file does not exist", async () => {
    await withLedger(
      ["| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | renders the header | todo | - | - |"],
      {},
      (issues) => {
        expect(stale(issues)).toEqual([]);
      },
    );
  });

  it("stays silent when the file exists but this row's selector does not", async () => {
    // The discriminator: a shared test file whose other rows have landed must
    // not drag every remaining row into a warning.
    await withLedger(
      ["| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | emits_a_retry_event | todo | - | - |"],
      { "tests/a.test.ts": TEST_FILE },
      (issues) => {
        expect(stale(issues)).toEqual([]);
      },
    );
  });

  // A match here is evidence the row's `todo` is STALE, so a reader that answered on the
  // selector's last identifier-shaped word alone would fire on rows whose test does not exist:
  // `header` appears in almost any test file.
  it("stays silent when only the selector's last token appears, not the selector", async () => {
    await withLedger(
      // `validates the header` shares its last word with `renders the header` in the fixture and
      // shares nothing else.
      ["| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | validates the header | todo | - | - |"],
      { "tests/a.test.ts": TEST_FILE },
      (issues) => {
        expect(
          stale(issues),
          "a warning whose whole value is being trusted cannot fire on a test that is not there",
        ).toEqual([]);
      },
    );
  });

  it("still fires when the selector appears verbatim, so the rule is not a mute", async () => {
    await withLedger(
      ["| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | renders the header | todo | - | - |"],
      { "tests/a.test.ts": TEST_FILE },
      (issues) => {
        expect(
          stale(issues),
          "the true direction must survive the strictness, or it removed the rule instead of its false positive",
        ).toHaveLength(1);
      },
    );
  });

  it("does not fire on statuses other than todo", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | renders the header | red | - | - |",
        "| TDD-0002 | TC-0002 | Unit | tests/a.test.ts | test_reconcile_head | done | - | ev |",
      ],
      { "tests/a.test.ts": TEST_FILE },
      (issues) => {
        expect(stale(issues)).toEqual([]);
      },
    );
  });

  it("resolves a pytest-style selector after its path prefix", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit | tests/a_test.py | tests/a_test.py::TestX::test_reconcile_head | todo | - | - |",
      ],
      { "tests/a_test.py": "class TestX:\n    def test_reconcile_head(self):\n        pass\n" },
      (issues) => {
        expect(stale(issues)).toHaveLength(1);
      },
    );
  });

  it("ignores a Test file that escapes the project root", async () => {
    await withLedger(
      ["| TDD-0001 | TC-0001 | Unit | ../outside.test.ts | renders the header | todo | - | - |"],
      {},
      (issues) => {
        expect(stale(issues)).toEqual([]);
      },
    );
  });
});

describe("TDDLIST_SELECTOR_UNRESOLVED — Selector is finally read", () => {
  it("reports a completed row whose selector is not in its test file", async () => {
    await withLedger(
      ["| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | emits_a_retry_event | done | - | ev |"],
      { "tests/a.test.ts": TEST_FILE },
      (issues) => {
        const found = unresolved(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.severity).toBe("warning");
        expect(found[0]?.suggested_action).toContain("TDDLIST-006");
      },
    );
  });

  it("accepts a completed row whose selector resolves", async () => {
    await withLedger(
      ["| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | test_reconcile_head | done | - | ev |"],
      { "tests/a.test.ts": TEST_FILE },
      (issues) => {
        expect(unresolved(issues)).toEqual([]);
      },
    );
  });

  it("does not double-report a completed row whose test file is missing", async () => {
    // `TDDLIST_TEST_FILE_MISSING` already owns that case.
    await withLedger(
      ["| TDD-0001 | TC-0001 | Unit | tests/gone.test.ts | test_reconcile_head | done | - | ev |"],
      {},
      (issues) => {
        expect(unresolved(issues)).toEqual([]);
        expect(issues.some((i) => i.code === "TDDLIST_TEST_FILE_MISSING")).toBe(true);
      },
    );
  });

  it("does not fire on a todo row", async () => {
    await withLedger(
      ["| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | emits_a_retry_event | todo | - | - |"],
      { "tests/a.test.ts": TEST_FILE },
      (issues) => {
        expect(unresolved(issues)).toEqual([]);
      },
    );
  });

  it("reports a row whose selector only shares its last word with a test", async () => {
    // The `done` direction of the same leniency the stale-status rule is protected from: matching
    // on the selector's last identifier-shaped word alone accepts `header` for almost any file, so
    // a row could name no test in it and still report nothing. `validates the header` shares that
    // word with `renders the header` in the fixture and shares nothing else.
    await withLedger(
      ["| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | validates the header | done | - | ev |"],
      { "tests/a.test.ts": TEST_FILE },
      (issues) => {
        const found = unresolved(issues);
        expect(found, "the selector names no test in this file").toHaveLength(1);
        expect(found[0]?.severity).toBe("warning");
      },
    );
  });

  /**
   * The JSON array form of `Selector` (`selector-granularity.md#entry-form`), read per element.
   *
   * Unsplit, an array reaches the containment check as one long string that no test file contains,
   * so the row is reported whether or not its tests exist and its real state is unreadable either
   * way. Split, each element answers for itself.
   */
  describe("a Selector holding a JSON array is read per element", () => {
    it("reports the row when one element of the array names no test", async () => {
      await withLedger(
        [
          `| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | ["missing_test","test_reconcile_head"] | done | - | ev |`,
        ],
        { "tests/a.test.ts": TEST_FILE },
        (issues) => {
          expect(unresolved(issues).length).toBe(1);
        },
      );
    });

    it("accepts the row when every element names a test", async () => {
      await withLedger(
        [
          `| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | ["renders the header","test_reconcile_head"] | done | - | ev |`,
        ],
        { "tests/a.test.ts": TEST_FILE },
        (issues) => {
          expect(unresolved(issues)).toEqual([]);
        },
      );
    });

    it("treats a cell that only looks like an array as a single entry", async () => {
      // Opens with `[` but is not JSON, so § Entry form makes it one entry, and one entry must
      // appear in full. Stripping the bracket and reading the remainder as the real selector would
      // find `test_reconcile_head` and report nothing, which is the reading this excludes.
      await withLedger(
        [
          "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | [case 3] test_reconcile_head | done | - | ev |",
        ],
        { "tests/a.test.ts": TEST_FILE },
        (issues) => {
          expect(unresolved(issues)).toHaveLength(1);
        },
      );
    });

    it("accepts the same bracketed cell when the file spells it that way", async () => {
      // The bracket is not what makes the case above report — absence is.
      await withLedger(
        [
          "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | [case 3] test_reconcile_head | done | - | ev |",
        ],
        { "tests/a.test.ts": "it('[case 3] test_reconcile_head', () => {});\n" },
        (issues) => {
          expect(unresolved(issues)).toEqual([]);
        },
      );
    });

    it("does not re-read a one-element array as a comma list", async () => {
      // § Entry form takes each element verbatim "with no further splitting", and a one-element
      // array is how a single name that would itself parse as a list is written. Split on its
      // comma, both parts are in the fixture and this would pass; taken whole, the element names
      // no test and the row is reported.
      await withLedger(
        [
          `| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | ["renders the header, test_reconcile_head"] | done | - | ev |`,
        ],
        { "tests/a.test.ts": TEST_FILE },
        (issues) => {
          expect(unresolved(issues)).toHaveLength(1);
        },
      );
    });
  });

  /**
   * `selector-granularity.md` § Reading a cell written under the old comma rule.
   *
   * Before the array form the contract called a multi-entry cell a comma-separated list, so
   * ledgers already in projects hold `renders the header, renders the footer` meaning two names.
   * Read as one entry such a row can never resolve again, so a bare comma-bearing cell gets one
   * bounded second reading — adopted only when the file contains every part.
   */
  describe("a bare cell written under the old comma rule", () => {
    it("accepts the row when every comma-separated part names a test", async () => {
      await withLedger(
        [
          "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | renders the header, test_reconcile_head | done | - | ev |",
        ],
        { "tests/a.test.ts": TEST_FILE },
        (issues) => {
          expect(unresolved(issues)).toEqual([]);
        },
      );
    });

    it("reports the row when one part names no test", async () => {
      // The split is evidence, not a free pass: one absent part and the cell is back to naming
      // nothing, which is the row's real problem.
      await withLedger(
        [
          "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | absent_one, test_reconcile_head | done | - | ev |",
        ],
        { "tests/a.test.ts": TEST_FILE },
        (issues) => {
          expect(unresolved(issues)).toHaveLength(1);
        },
      );
    });

    it("reads a name that legitimately holds a comma whole, without splitting it", async () => {
      // Step 1 wins when it answers. Split, `and labels it` names no test on its own and the row
      // would be reported for a selector that is correct.
      const name = "falls back to the built-in set, and labels it, when the file is absent";
      await withLedger(
        [`| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | ${name} | done | - | ev |`],
        { "tests/a.test.ts": `it('${name}', () => {});\n` },
        (issues) => {
          expect(unresolved(issues)).toEqual([]);
        },
      );
    });
  });
});
