/**
 * `scripts/check-atdd-annotation-ledger.mjs` — the guard that refuses an E2E annotation ledger
 * entry no test backs.
 *
 * The guard exists because `QFAI-ATDD-111` reads a hand-maintained markdown ledger rather than the
 * test files, so appending a line to it clears the gate whether or not a test exists. Round 1's
 * `qa-gatekeeper` measured that directly: with the ledger lines present and the E2E test file
 * DELETED, the scoped gate still reported the same `error=1` it reports with the test in place. The
 * gate cannot see the tests, so something else has to.
 *
 * The claim these tests make checkable is the process claim: "the annotation was appended after the
 * test existed". Round 1 found that claim uncheckable — it rested on a script that was not in the
 * repository, and history could not settle it either because the test and the ledger lines landed
 * in one atomic commit. The script is now here, and these are its tests.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  checkLedger,
  collectTestSources,
  redactDisabledTests,
  runnerCorpusRoots,
} from "../../../../../scripts/check-atdd-annotation-ledger.mjs";
import { removeTempTree } from "../../helpers/tempTree.js";

/**
 * Build an annotation token from parts, so this file contains no live one.
 *
 * Round 2 flagged the first version for planting real `QFAI:SPEC-…:US-…` literals in a test file:
 * any scanner that widens its search — including the very guard under test, whose directory list is
 * a parameter — would read a fixture string as coverage of a story. A test about a certifier must not
 * be certifiable by accident.
 */
function tag(spec: string, story: string): string {
  return ["QFAI", `SPEC-${spec}`, `US-${story}`].join(":");
}

const temps: string[] = [];

async function temp(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-guard-"));
  temps.push(dir);
  return dir;
}

afterAll(async () => {
  for (const dir of temps) await removeTempTree(dir);
});

describe("checkLedger", () => {
  it("accepts a claim a test carries the same annotation for", () => {
    const result = checkLedger(
      `- ${tag("0017", "0017-0001")}\n`,
      new Map([["a.test.ts", `// ${tag("0017", "0017-0001")}\ndescribe('x', () => {});`]]),
    );
    expect(result.ok).toBe(true);
    expect(result.unbacked).toEqual([]);
    expect(result.checked).toBe(1);
  });

  it("rejects a claim no test carries — the false certification, in the direction that matters", () => {
    const result = checkLedger(
      `- ${tag("0017", "0017-0001")}\n- ${tag("0017", "0017-0002")}\n`,
      new Map([["a.test.ts", `// ${tag("0017", "0017-0001")}\n`]]),
    );
    expect(result.ok).toBe(false);
    expect(result.unbacked).toEqual([{ annotation: tag("0017", "0017-0002"), spec: "0017" }]);
  });

  it("does NOT reject the reverse — a test annotated ahead of its ledger line is not a lie", () => {
    // A gate that has not been told yet reads the story as uncovered, which is safe. Requiring the
    // ledger to be complete would make this guard demand exactly the append it exists to police.
    const result = checkLedger(
      `- ${tag("0017", "0017-0001")}\n`,
      new Map([["a.test.ts", `// ${tag("0017", "0017-0001")}\n// ${tag("0017", "0017-0009")}\n`]]),
    );
    expect(result.ok).toBe(true);
  });

  it("scopes to one spec, leaving a sibling's unbacked claims alone", () => {
    const ledger = `- ${tag("0012", "0012-0003")}\n- ${tag("0017", "0017-0001")}\n`;
    const sources = new Map([["a.test.ts", `// ${tag("0017", "0017-0001")}\n`]]);
    expect(checkLedger(ledger, sources, { spec: "0017" }).ok).toBe(true);
    const wide = checkLedger(ledger, sources);
    expect(wide.ok).toBe(false);
    expect(wide.unbacked.map((entry) => entry.annotation)).toEqual([tag("0012", "0012-0003")]);
  });

  it("finds the annotation wherever in the file it sits, and counts each claim once", () => {
    const result = checkLedger(
      `- ${tag("0017", "0017-0001")}\n- ${tag("0017", "0017-0001")}\n`,
      new Map([["a.test.ts", `describe('x', () => {\n  // ${tag("0017", "0017-0001")}\n});`]]),
    );
    expect(result.ok).toBe(true);
    expect(result.checked).toBe(1);
  });

  it("treats an empty ledger and an empty source set as vacuously fine", () => {
    expect(checkLedger("", new Map()).ok).toBe(true);
    expect(checkLedger("# QFAI E2E Traceability\n", new Map()).checked).toBe(0);
  });

  it("refuses the three annotation forms that used to fail open", () => {
    // Round 2's `implementation-reviewer` measured these against the scanner's own
    // `US_TEST_ANNOTATION_RE`. All three failed OPEN before the regex was aligned.

    // A five-digit tail must not be truncated into the real claim it resembles.
    expect(
      checkLedger(
        `- ${tag("0017", "0017-0001")}\n`,
        new Map([["a.test.ts", `// ${tag("0017", "0017-00017")}\n`]]),
      ).ok,
      "a typo'd annotation must not discharge the claim it does not name",
    ).toBe(false);

    // A glued prefix is not an annotation.
    expect(
      checkLedger(
        `- ${tag("0017", "0017-0001")}\n`,
        new Map([["a.test.ts", `// X${tag("0017", "0017-0001")}\n`]]),
      ).ok,
    ).toBe(false);

    // The short form the scanner accepts must be visible in both directions.
    const short = checkLedger(
      `- ${tag("0017", "0017")}\n`,
      new Map([["a.test.ts", "// nothing here\n"]]),
    );
    expect(short.checked, "a short-form claim the scanner reads must be counted").toBe(1);
    expect(short.ok).toBe(false);
    expect(
      checkLedger(
        `- ${tag("0017", "0017")}\n`,
        new Map([["a.test.ts", `// ${tag("0017", "0017")}\n`]]),
      ).ok,
      "and a short-form claim a test carries must count as backed",
    ).toBe(true);
  });

  it("ignores a near-miss token rather than counting it as a claim", () => {
    // `US-0017-0001` on its own is prose, not an annotation. The scanner requires the full
    // `QFAI:SPEC-NNNN:` prefix and so does this.
    const result = checkLedger(`- US-0017-0001\n- see QFAI:SPEC-0017 for detail\n`, new Map());
    expect(result.checked).toBe(0);
    expect(result.ok).toBe(true);
  });
});

describe("collectTestSources", () => {
  it("follows a symlinked directory, which isDirectory() reports as false", async () => {
    // This repository tracks 83 symlinks. The first version tested `entry.isDirectory()` only, so
    // every linked subtree was walked past in silence — and a claim backed only inside one would have
    // read as unbacked. Round 2 found it.
    const dir = await temp();
    const real = path.join(dir, "real");
    await mkdir(real, { recursive: true });
    await writeFile(path.join(real, "linked.test.ts"), `// ${tag("0017", "0017-0001")}\n`, "utf8");

    // The link must sit INSIDE the scanned directory, as an ENTRY. The first version of this test
    // passed the link itself as the root, and `readdir` follows a root regardless of what kind of
    // node it is — so `entry.isSymbolicLink()`, the branch under test, was never reached. Round 4's
    // oracle caught it: disabling that branch entirely reddened nothing.
    const scanned = path.join(dir, "scanned");
    await mkdir(scanned, { recursive: true });
    const link = path.join(scanned, "link");
    const { symlink } = await import("node:fs/promises");
    try {
      await symlink(real, link, "junction");
    } catch {
      // Creating a link can be denied on Windows without the right privilege; the guard's behaviour
      // is unchanged either way, so skipping beats a false failure.
      return;
    }

    const sources = await collectTestSources(scanned);
    expect(
      [...sources.keys()].map((file) => path.basename(file)),
      "a linked subtree, reached as an entry, must contribute its annotations",
    ).toEqual(["linked.test.ts"]);
  });

  it("reads test files from a tree and skips node_modules and dot directories", async () => {
    const dir = await temp();
    await writeFile(path.join(dir, "a.test.ts"), `// ${tag("0017", "0017-0001")}\n`, "utf8");
    await mkdir(path.join(dir, "nested"), { recursive: true });
    await writeFile(path.join(dir, "nested", "b.test.ts"), "// b\n", "utf8");
    await mkdir(path.join(dir, "node_modules"), { recursive: true });
    await writeFile(path.join(dir, "node_modules", "c.test.ts"), "// c\n", "utf8");
    await mkdir(path.join(dir, ".cache"), { recursive: true });
    await writeFile(path.join(dir, ".cache", "d.test.ts"), "// d\n", "utf8");
    await writeFile(path.join(dir, "notes.md"), `// ${tag("0017", "0017-0002")}\n`, "utf8");

    const sources = await collectTestSources(dir);
    const names = [...sources.keys()].map((file) => path.basename(file)).sort();
    expect(names).toEqual(["a.test.ts", "b.test.ts"]);
  });

  it("returns an empty map for a tree that does not exist, rather than throwing", async () => {
    const sources = await collectTestSources(path.join(await temp(), "absent"));
    expect(sources.size).toBe(0);
  });
});

// ── [01] ─────────────────────────────────────────
describe("the corpus is the extension the runner runs, not every extension", () => {
  it("ignores a .test.js or .test.mjs sitting beside the real suites", async () => {
    // Review finding [01]. The E2E project includes `*.test.ts`, so these files are executed by
    // nobody — and while the pattern accepted any alphabetic extension, deleting the real
    // TypeScript test and moving its annotation into one of them kept the ledger green.
    const dir = await temp();
    await writeFile(path.join(dir, "real.test.ts"), `// ${tag("0017", "0017-0001")}\n`, "utf8");
    for (const name of [
      "backing.test.js",
      "backing.test.mjs",
      "backing.test.cjs",
      "backing.test.tsx",
    ]) {
      await writeFile(path.join(dir, name), `// ${tag("0017", "0017-0002")}\n`, "utf8");
    }

    const sources = await collectTestSources(dir);
    expect(
      [...sources.keys()].map((file) => path.basename(file)).sort(),
      "only the file shape Vitest opens may back a ledger claim",
    ).toEqual(["real.test.ts"]);
  });
});

// ── [09] ─────────────────────────────────────────
describe("the corpus walk stays inside the root it was given", () => {
  // Review finding [61]. Following a linked directory is deliberate and was itself a repair — this
  // repository tracks 83 symlinks, and a walk that skipped one read a claim backed only inside it
  // as unbacked. What was missing is where the link may point: `seen` is keyed by `realpath`, which
  // stops a CYCLE and nothing else, so a directory symlink to `/proc` or to any large tree outside
  // the corpus was enumerated without bound and the required `ci:lint` exhausted memory or timed
  // out before reporting a single ledger finding. A guard that can be made to hang refuses nothing.

  it("does not follow a directory link that resolves outside the root", async () => {
    const dir = await temp();
    const outside = await temp();
    await mkdir(path.join(outside, "deep"), { recursive: true });
    await writeFile(
      path.join(outside, "deep", "escaped.test.ts"),
      `// ${tag("0017", "0017-0001")}\n`,
      "utf8",
    );

    const root = path.join(dir, "corpus");
    await mkdir(root, { recursive: true });
    await writeFile(path.join(root, "inside.test.ts"), `// ${tag("0017", "0017-0002")}\n`, "utf8");

    const { symlink } = await import("node:fs/promises");
    try {
      await symlink(outside, path.join(root, "away"), "junction");
    } catch {
      return; // a platform that refuses the link; the guard is platform-independent
    }

    // The boundary is passed explicitly: production passes the repository root, and this row is
    // about a link that escapes whatever boundary it was given.
    const sources = await collectTestSources(root, root);
    const names = [...sources.keys()].map((file) => path.basename(file)).sort();
    expect(
      names,
      "a link out of the corpus is not part of the corpus, whatever its name suggests",
    ).toEqual(["inside.test.ts"]);
  });

  it("still follows a directory link that resolves inside the root", async () => {
    // The control, and it is the half a blanket refusal would break: the tracked symlinks this
    // repository walks all resolve within the tree, and the earlier repair exists because skipping
    // them read a real test as absent.
    const dir = await temp();
    const root = path.join(dir, "corpus");
    await mkdir(path.join(root, "real"), { recursive: true });
    await writeFile(
      path.join(root, "real", "linked.test.ts"),
      `// ${tag("0017", "0017-0003")}\n`,
      "utf8",
    );
    await mkdir(path.join(root, "scanned"), { recursive: true });

    const { symlink } = await import("node:fs/promises");
    try {
      await symlink(path.join(root, "real"), path.join(root, "scanned", "link"), "junction");
    } catch {
      return;
    }

    const sources = await collectTestSources(root, root);
    expect(
      [...sources.keys()].map((file) => path.basename(file)).sort(),
      "a linked subtree inside the boundary still holds real tests, and they still back claims",
      // Once, not twice: `seen` is keyed by real path, so the directory and the link to it are
      // one subtree and the file is collected under whichever route reached it first.
    ).toEqual(["linked.test.ts"]);
  });
});

describe("the guard supplies a boundary, not only accepts one", () => {
  it("passes the repository root to every corpus walk it starts", async () => {
    // A parameter the production path does not pass is a parameter that protects nothing. Measured:
    // a plant reverting `collectTestSources(dir, root)` to `collectTestSources(dir)` in `main()`
    // left every behavioural row in this file green — they call the helper directly and pass the
    // boundary themselves. This is the wiring, and it is the only thing that can see it.
    //
    // The default is deliberately uncontained, because the boundary is the REPOSITORY and the
    // helper cannot know it: a link from `tests/e2e` into `tests/helpers` resolves outside the
    // corpus root and is perfectly ordinary. So the caller has to name it, and this says it does.
    const source = await readFile(
      path.resolve(__dirname, "../../../../../scripts/check-atdd-annotation-ledger.mjs"),
      "utf-8",
    );
    const start = source.indexOf("async function main(");
    expect(start, "the guard must have an entry point to check").toBeGreaterThan(-1);
    const body = source.slice(start);

    const calls = [...body.matchAll(/collectTestSources\(([^)]*)\)/g)].map(
      (match) => match[1] ?? "",
    );
    expect(
      calls.length,
      "the entry point must walk a corpus, or the guard reads no tests at all",
    ).toBeGreaterThan(0);
    for (const args of calls) {
      expect(
        args.split(",").length,
        `collectTestSources(${args}) starts an uncontained walk; a link out of the repository is ` +
          "then followed without bound and this required lane hangs instead of reporting",
      ).toBeGreaterThan(1);
    }
  });
});

describe("runnerCorpusRoots", () => {
  it("returns exactly the directories the e2e project includes, all inside the package", async () => {
    const { roots } = await runnerCorpusRoots(path.resolve(__dirname, "../../../../.."));

    // Derived rather than asserted against a copied list: a second literal here would be the same
    // hand-kept pair the production change removed, and it would agree with a wrong answer.
    //
    // Derived by IMPORTING the configuration, though, not by re-running the pattern under test.
    // Review finding [43]: this row used the same regex over the same raw text, so a defect in
    // that pattern produced the same wrong answer on both sides and the row agreed with it. The
    // import goes through the runner's own loader, which is the only reading of this file that is
    // authoritative — it is what Vitest itself does with it.
    const workspace: unknown = (
      (await import("../../../vitest.workspace.js")) as { default: unknown }
    ).default;
    const globs = (Array.isArray(workspace) ? workspace : [])
      .map((project: unknown) =>
        typeof project === "object" && project !== null
          ? (Reflect.get(project, "test") as unknown)
          : undefined,
      )
      .filter(
        (test: unknown): test is { name: string; include: string[] } =>
          typeof test === "object" &&
          test !== null &&
          Reflect.get(test, "name") === "e2e" &&
          Array.isArray(Reflect.get(test, "include")),
      )
      .flatMap((test) => test.include);
    expect(
      globs.length,
      "the premise: the workspace still declares an e2e include list",
    ).toBeGreaterThan(0);

    const expected = globs.map((glob) =>
      path.join(
        path.resolve(__dirname, "../../../../.."),
        "packages",
        "qfai",
        ...(glob ?? "").replace(/\/\*\*\/.*$/, "").split("/"),
      ),
    );
    expect([...roots].sort(), "the corpus is the runner's include list").toEqual(
      [...expected].sort(),
    );

    // The half the finding was about: nothing outside the package tree, because nothing outside it
    // is ever executed. The repository-root `tests/e2e` holds the ledger and no test at all.
    for (const root of roots) {
      expect(
        root.startsWith(path.join(path.resolve(__dirname, "../../../../.."), "packages", "qfai")),
        `${root} is outside the tree \`pnpm -C packages/qfai test:e2e\` runs`,
      ).toBe(true);
    }
  });

  it("refuses an include whose extension the corpus would skip", async () => {
    // The two halves of one fact: what Vitest opens, and what counts as backing. If the runner
    // is switched to `*.spec.ts` and this guard keeps collecting `*.test.ts`, every real test
    // reads as no test at all — review finding [01] pointing the other way. The first version of
    // this check was unreachable, because the shape pattern beside it spelled `.test.ts` out and
    // rejected the glob before anything compared the two; a plant removing the comparison changed
    // no behaviour, which is how that was found.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      `export default [{ test: { name: "e2e", include: ["tests/e2e/**/*.spec.ts"] } }];\n`,
      "utf8",
    );

    await expect(runnerCorpusRoots(dir)).rejects.toThrow(/must agree/);
  });

  it("accepts an include the corpus would collect, so the check is not a refusal to read", async () => {
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      `export default [{ test: { name: "e2e", include: ["tests/journeys/**/*.test.ts"] } }];\n`,
      "utf8",
    );

    await expect(runnerCorpusRoots(dir).then((r) => r.roots)).resolves.toEqual([
      path.join(dir, "packages", "qfai", "tests", "journeys"),
    ]);
  });

  it("reads only the exported project, whatever a decoy elsewhere in the file looks like", async () => {
    // Review findings [43] and [44], which are one finding measured twice. Every text-level
    // reading of this configuration was shadowable, and each repair moved the hole:
    //
    // - a bare regex over the raw file: a COMMENT declaring an `e2e` project above the real one
    //   matched first;
    // - the same regex with comments blanked: a declaration inside an unused STRING still matched
    //   — and because the pattern spelled `"e2e"` with double quotes, the decoy became the ONLY
    //   candidate the moment the real project wrote its name as a template literal;
    // - and throughout, an object literal nothing exports counted the same as the exported one.
    //
    // So all five decoy shapes are planted against a real project that is exported, and some of
    // them write that project's name as a template literal — the spelling the last escape needed.
    // The fifth is the one only the export requirement stops: a real object literal, in a real
    // binding, that nothing exports. It is not a comment and not a string, so every reading that
    // merely learned to skip those still sees it — as a second candidate, and answers with the
    // ambiguity refusal instead of the corpus.
    //
    // The decoy's include is shape-INVALID on purpose, so an implementation that reads it throws
    // rather than quietly answering `tests/fake`; either way this row fails, and the message names
    // the glob it read. It also avoids `*/`, which would end the block-comment decoy early.
    const DECOY = '{ test: { name: "e2e", include: ["tests/fake/x/*.test.ts"] } }';
    const decoys = [
      `// ${DECOY}`,
      `/* ${DECOY} */`,
      `const doc = '${DECOY}';`,
      `const tpl = \`${DECOY}\`;`,
      `const unexported = ${DECOY};`,
    ];
    for (const [index, decoy] of decoys.entries()) {
      // Half the rows name the project with a template literal, which the double-quoted pattern
      // could not see at all.
      const name = index % 2 === 0 ? '"e2e"' : "`e2e`";
      const dir = await temp();
      await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
      await writeFile(
        path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
        `${decoy}\nexport default [{ test: { name: ${name}, include: ["tests/journeys/**/*.test.ts"] } }];\n`,
        "utf8",
      );

      await expect(
        runnerCorpusRoots(dir).then((r) => r.roots),
        `a decoy of the form ${decoy.slice(0, 12)}… must not become the backing corpus`,
      ).resolves.toEqual([path.join(dir, "packages", "qfai", "tests", "journeys")]);
    }
  });

  it("refuses a configuration exporting the e2e project twice rather than taking the first", async () => {
    // The other half of not guessing. A decoy that is not exported is now invisible, but a
    // genuinely duplicated project is still two candidates — and choosing by position is what made
    // the first shadow exploitable. This guard cannot tell which one the runner uses, and it says
    // so rather than picking.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        "export default [",
        '  { test: { name: "e2e", include: ["tests/fake/**/*.test.ts"] } },',
        '  { test: { name: "e2e", include: ["tests/journeys/**/*.test.ts"] } },',
        "];",
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(runnerCorpusRoots(dir)).rejects.toThrow(/cannot tell which one/i);
  });

  it("refuses a default export wrapped in a call it cannot identify", async () => {
    // Review finding [70]: any call expression had its first argument taken as the workspace,
    // so `export default choose(decoy, real)` — a helper returning its SECOND argument — had
    // this guard read the decoy while Vitest ran the real one. The whole point of parsing was
    // that the corpus comes from what the runner uses, and taking argument zero of an
    // unidentified function is a guess about that again.
    //
    // `defineWorkspace` is Vitest's own identity function over the array, which is why
    // unwrapping THAT is reading rather than evaluating. Anything else is refused.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      // The decoy is an ARRAY LITERAL in argument position, which is what makes this row able to
      // tell the plant apart. Measured: with the decoy behind an identifier, an implementation that
      // unwraps any call still reached a non-array and threw the same refusal — the row passed
      // either way and proved nothing about the callee check.
      [
        'const real = [{ test: { name: "e2e", include: ["tests/journeys/**/*.test.ts"] } }];',
        "export default choose(",
        '  [{ test: { name: "e2e", include: ["tests/fake/**/*.test.ts"] } }],',
        "  real,",
        ");",
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(
      runnerCorpusRoots(dir),
      "a call this guard cannot identify is not an unwrapping it may perform",
    ).rejects.toThrow(/does not export an array of projects/i);
  });

  it("still unwraps defineWorkspace, so the check is an identification and not a ban", async () => {
    // The fixture IMPORTS it, as the real configuration does. Review finding [96] made that
    // load-bearing: the identifier alone is not an identification, so the import is what says
    // this call is Vitest's own.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        'import { defineWorkspace } from "vitest/config";',
        'export default defineWorkspace([{ test: { name: "e2e", include: ["tests/journeys/**/*.test.ts"] } }]);',
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(runnerCorpusRoots(dir).then((r) => r.roots)).resolves.toEqual([
      path.join(dir, "packages", "qfai", "tests", "journeys"),
    ]);
  });

  it("refuses a defineWorkspace a local declaration shadows", async () => {
    // Review finding [96], as filed: `const defineWorkspace = (decoy, real) => real` has Vitest
    // run the SECOND argument while a guard reading argument zero takes the first — a fake tree
    // whose annotation-only files certify every claim. The callee check refused an unidentified
    // callee and not a shadowed identified one, which is the same substitution one level down.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        'import { defineWorkspace } from "vitest/config";',
        "const defineWorkspace = (decoy, real) => real;",
        "export default defineWorkspace(",
        '  [{ test: { name: "e2e", include: ["tests/decoy/**/*.test.ts"] } }],',
        '  [{ test: { name: "e2e", include: ["tests/journeys/**/*.test.ts"] } }],',
        ");",
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(runnerCorpusRoots(dir)).rejects.toThrow(/shadows the import/i);
  });

  it("refuses a defineWorkspace that is not imported from Vitest at all", async () => {
    // The other half. A call this guard cannot identify is a call whose result it cannot predict,
    // and predicting it wrongly is how the decoy is read as the corpus.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        'import { defineWorkspace } from "./local-helper";',
        'export default defineWorkspace([{ test: { name: "e2e", include: ["tests/journeys/**/*.test.ts"] } }]);',
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(runnerCorpusRoots(dir)).rejects.toThrow(/not imported from Vitest/i);
  });

  it("refuses a trailing spread that decides the include list", async () => {
    // Review finding [100]. `{ name: "e2e", include: [decoy], ...actual }` is evaluated by
    // Vitest with `actual.include` winning, and a scan reading property assignments takes the
    // decoy — an annotation-only tree certifying every claim. Third time the runner's own
    // configuration has been the substitution channel, after the comment and the shadowed callee.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "knobs.ts"),
      ['export const actual = { include: ["tests/journeys/**/*.test.ts"] };', ""].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        'import { actual } from "./knobs";',
        'export default [{ test: { name: "e2e", include: ["tests/decoy/**/*.test.ts"], ...actual } }];',
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(runnerCorpusRoots(dir)).rejects.toThrow(/decides what the runner opens/i);
  });

  it("refuses a spread it cannot follow at all", async () => {
    // Unreadable is not harmless. Resolving it would mean evaluating the module, which is the
    // thing this guard parses in order not to do.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        'export default [{ test: { ...whateverThisIs, name: "e2e", include: ["tests/journeys/**/*.test.ts"] } }];',
        "",
      ].join("\n"),
      "utf8",
    );

    // The REFUSAL, not any error whose text happens to contain those words. Measured: a plant
    // that removed the refusal left `keys` undefined, and the TypeError that followed —
    // "Cannot read properties of undefined" — matched a looser pattern and the row passed.
    await expect(runnerCorpusRoots(dir)).rejects.toThrow(
      /assembled with a spread this guard cannot read/i,
    );
  });

  it("reads a spread that decides neither list, which this repository's own config uses", async () => {
    // The control, and it is load-bearing: every project in the real workspace spreads a knob
    // object of timeouts and pool settings. A blanket refusal of spreads would refuse the
    // configuration this guard exists to read — measured, when the first version did exactly that.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "knobs.ts"),
      ['export const projectKnobs = { testTimeout: 120000, pool: "forks" } as const;', ""].join(
        "\n",
      ),
      "utf8",
    );
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        'import { projectKnobs } from "./knobs";',
        'export default [{ test: { ...projectKnobs, name: "e2e", include: ["tests/journeys/**/*.test.ts"] } }];',
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(runnerCorpusRoots(dir).then((r) => r.roots)).resolves.toEqual([
      path.join(dir, "packages", "qfai", "tests", "journeys"),
    ]);
  });

  it("refuses a spread source the module mutates after declaring it", async () => {
    // Review finding [103]. The keys a literal is WRITTEN with are not the keys it HAS:
    // `Object.assign(projectKnobs, { exclude: [...] })` three lines down adds one at runtime.
    // Vitest would skip a whole tree of E2E tests while this guard, reading the initializer
    // alone, called the spread harmless and counted annotations in files the runner never opens
    // — the E2E lane and the ledger both green over user stories nobody verified.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "knobs.ts"),
      [
        "export const projectKnobs = { testTimeout: 120000 };",
        'Object.assign(projectKnobs, { exclude: ["tests/journeys/**/*.test.ts"] });',
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        'import { projectKnobs } from "./knobs";',
        'export default [{ test: { ...projectKnobs, name: "e2e", include: ["tests/journeys/**/*.test.ts"] } }];',
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(runnerCorpusRoots(dir)).rejects.toThrow(
      /assembled with a spread this guard cannot read/i,
    );
  });

  it("refuses a spread source handed to anything at all, mutation or not", async () => {
    // Conservative on purpose, and the row says so: proving the post-evaluation state means
    // evaluating the module, which is what this guard parses in order not to do. The syntactic
    // proof available is that the name occurs once, at its declaration — so even a `freeze` is
    // refused. A rule that admitted the safe cases it can name would have to name them all, and
    // the last three findings on this reader were each a case an enumeration missed.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "knobs.ts"),
      [
        "export const projectKnobs = { testTimeout: 120000 };",
        "Object.freeze(projectKnobs);",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        'import { projectKnobs } from "./knobs";',
        'export default [{ test: { ...projectKnobs, name: "e2e", include: ["tests/journeys/**/*.test.ts"] } }];',
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(runnerCorpusRoots(dir)).rejects.toThrow(
      /assembled with a spread this guard cannot read/i,
    );
  });

  it("refuses a computed key it would have to evaluate", async () => {
    // Review finding [111]. `["in" + "clude"]: [...]` evaluates to `include` and overrides an
    // earlier literal one; the key extraction skipped it, because a computed name is neither an
    // identifier nor a string literal. The decoy was read while Vitest ran the real corpus — the
    // same override the trailing spread achieved, spelled differently.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        'export default [{ test: { name: "e2e", include: ["tests/decoy/**/*.test.ts"], ["in" + "clude"]: ["tests/journeys/**/*.test.ts"] } }];',
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(runnerCorpusRoots(dir)).rejects.toThrow(/carries a key this guard cannot read/i);
  });

  it("reads a computed key that is already a literal, and lets the last one win", async () => {
    // The readable half, and the ordering. `["include"]` needs no evaluation, and JavaScript
    // gives the LAST key of a name to the object — so a decoy written first must lose.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        'export default [{ test: { name: "e2e", include: ["tests/decoy/**/*.test.ts"], ["include"]: ["tests/journeys/**/*.test.ts"] } }];',
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(runnerCorpusRoots(dir).then((r) => r.roots)).resolves.toEqual([
      path.join(dir, "packages", "qfai", "tests", "journeys"),
    ]);
  });

  it("subtracts an excluded file, which the runner does not open", async () => {
    // Review finding [85]. Reading `include` alone let an `exclude` entry keep a file in the
    // backing corpus that Vitest never runs — an annotation-only file discharging a required
    // ledger claim, which is exactly the substitution this guard exists to refuse, arriving
    // through the runner's own configuration rather than through a markdown suffix.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      `export default [{ test: { name: "e2e", include: ["tests/e2e/**/*.test.ts"], exclude: ["tests/e2e/backing.test.ts"] } }];\n`,
      "utf8",
    );

    const { roots, excluded } = await runnerCorpusRoots(dir);
    expect(roots, "the include still decides which tree is walked").toEqual([
      path.join(dir, "packages", "qfai", "tests", "e2e"),
    ]);
    expect(
      excluded(path.join(dir, "packages", "qfai", "tests", "e2e", "backing.test.ts")),
      "a file the runner skips must not back a claim",
    ).toBe(true);
    expect(
      excluded(path.join(dir, "packages", "qfai", "tests", "e2e", "real.test.ts")),
      "and every other file in the tree must still count — the control",
    ).toBe(false);
  });

  it("subtracts a whole excluded subtree, in the same shape the includes take", async () => {
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      `export default [{ test: { name: "e2e", include: ["tests/e2e/**/*.test.ts"], exclude: ["tests/e2e/fixtures/**/*.test.ts"] } }];\n`,
      "utf8",
    );

    const { excluded } = await runnerCorpusRoots(dir);
    expect(
      excluded(path.join(dir, "packages", "qfai", "tests", "e2e", "fixtures", "a.test.ts")),
      "a file under the excluded subtree is one the runner does not open",
    ).toBe(true);
    expect(
      excluded(path.join(dir, "packages", "qfai", "tests", "e2e", "a.test.ts")),
      "a sibling outside it still counts",
    ).toBe(false);
  });

  it("refuses an exclusion it cannot subtract rather than ignoring it", async () => {
    // The fail-closed half. An exclusion this guard cannot interpret names an unknown set of
    // files the runner does not open, and approximating that set as empty is the original defect
    // restated.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      `export default [{ test: { name: "e2e", include: ["tests/e2e/**/*.test.ts"], exclude: ["**/*fixture*"] } }];\n`,
      "utf8",
    );

    await expect(runnerCorpusRoots(dir)).rejects.toThrow(/cannot subtract from the corpus/i);
  });

  it("refuses an exclusion it would have to evaluate rather than read", async () => {
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      `export default [{ test: { name: "e2e", include: ["tests/e2e/**/*.test.ts"], exclude: [skip] } }];\n`,
      "utf8",
    );

    await expect(runnerCorpusRoots(dir)).rejects.toThrow(/not a literal this guard can resolve/i);
  });
  it("refuses an include this guard would have to evaluate rather than read", async () => {
    // The boundary of "reads a declaration": an interpolated template, an identifier, anything
    // whose value is not fixed in the source. Guessing at one is how a guard starts reporting a
    // corpus the runner does not use, and the whole family above is that mistake.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      [
        'const dir = "tests/journeys";',
        'export default [{ test: { name: "e2e", include: [`${dir}/**/*.test.ts`] } }];',
        "",
      ].join("\n"),
      "utf8",
    );

    await expect(runnerCorpusRoots(dir)).rejects.toThrow(/not a literal this guard can resolve/i);
  });

  it("fails loudly when the runner configuration cannot be read", async () => {
    // A guard that falls back to a built-in list when it cannot read the runner is a guard that has
    // silently stopped tracking it.
    await expect(runnerCorpusRoots(await temp())).rejects.toThrow();
  });
});

describe("symlink cycles and the exit codes around them", () => {
  // Round 3 added the symlink walk and a lexical `seen` set; round 4 measured that set as unreachable
  // in every scenario and found the third `ELOOP` site unguarded — a mutual cycle still answered exit
  // 3, "no measurement taken", and dropped a real subtree. Round 4 also noted that **nothing tested
  // any of it**: the walk, the cycle, `ELOOP`, and exit 3 all had zero coverage while two rounds of
  // findings were applied to them. These are those tests.

  async function junction(target: string, link: string): Promise<boolean> {
    const { symlink } = await import("node:fs/promises");
    try {
      await symlink(target, link, "junction");
      return true;
    } catch {
      // Creating a link can be denied on Windows without the right privilege. Skipping beats a
      // failure that says nothing about the guard.
      return false;
    }
  }

  it("terminates on a self-referential junction instead of descending forever", async () => {
    const dir = await temp();
    const real = path.join(dir, "tree");
    await mkdir(real, { recursive: true });
    await writeFile(path.join(real, "a.test.ts"), `// ${tag("0017", "0017-0001")}\n`, "utf8");
    if (!(await junction(real, path.join(real, "self")))) return;

    const sources = await collectTestSources(real);
    expect(
      [...sources.keys()].map((file) => path.basename(file)),
      "the file is read once and the cycle does not multiply it",
    ).toEqual(["a.test.ts"]);
  });

  it("measures around a mutual cycle rather than abandoning the walk", async () => {
    // `x -> y`, `y -> x`, with a real annotated file beside them. Round 4's measured failure was that
    // the whole walk was abandoned and the guard exited 3; the file must still be found.
    const dir = await temp();
    const root = path.join(dir, "tree");
    const x = path.join(root, "x");
    const y = path.join(root, "y");
    await mkdir(root, { recursive: true });
    await writeFile(path.join(root, "real.test.ts"), `// ${tag("0017", "0017-0002")}\n`, "utf8");
    if (!(await junction(y, x))) return;
    if (!(await junction(x, y))) return;

    const sources = await collectTestSources(root);
    expect(
      [...sources.keys()].map((file) => path.basename(file)),
      "a cycle beside a real file must not cost the real file",
    ).toEqual(["real.test.ts"]);
  });

  it("returns none rather than throwing when a link points nowhere", async () => {
    const dir = await temp();
    const root = path.join(dir, "tree");
    await mkdir(root, { recursive: true });
    if (!(await junction(path.join(dir, "absent"), path.join(root, "dangling")))) return;
    await expect(collectTestSources(root)).resolves.toBeInstanceOf(Map);
  });
});

describe("the CLI entry point", () => {
  // `main()` had zero coverage: not the root resolution, not the argument parsing, not the
  // missing-ledger branch, not any exit code. Round 2 found the root was taken from `process.cwd()`
  // — the only script in `scripts/` that did — so from `packages/qfai/` the guard printed
  // "nothing to check" and exited 0. These tests spawn it, because an exit code is the whole
  // interface a `ci:lint` member has.
  const SCRIPT = path.resolve(__dirname, "../../../../../scripts/check-atdd-annotation-ledger.mjs");

  /** The repository's own TypeScript package, which the guard reads the workspace with. */
  const TYPESCRIPT = path.resolve(__dirname, "../../../../../node_modules/typescript");

  /**
   * A synthetic repository the guard can run inside: the script, and the parser it reads with.
   *
   * The guard resolves its root from its own location, so these rows COPY it rather than point
   * it at a tree — and a copy in a tree with no `node_modules` cannot resolve `typescript`. A
   * repository that runs this guard has its devDependencies installed, and the synthetic tree
   * is a repository; the link says so. Junction, so Windows needs no privilege, and a platform
   * that refuses it leaves the parser unresolvable and the row's own assertion is what fails.
   */
  async function stageGuard(dir: string, basename: string): Promise<string> {
    await mkdir(path.join(dir, "scripts", "lib"), { recursive: true });
    const copied = path.join(dir, "scripts", basename);
    const { copyFile, symlink } = await import("node:fs/promises");
    await copyFile(SCRIPT, copied);
    // And the shared bounded reader it imports. Review finding [76] moved the posture out of both
    // root guards into one module, and these rows measured it immediately: a copy of the script
    // alone died on ERR_MODULE_NOT_FOUND, and six pre-existing rows failed with a resolver trace
    // instead of the exit code they assert.
    await copyFile(
      path.resolve(__dirname, "../../../../../scripts/lib/bounded-read.mjs"),
      path.join(dir, "scripts", "lib", "bounded-read.mjs"),
    );
    await mkdir(path.join(dir, "node_modules"), { recursive: true });
    await symlink(TYPESCRIPT, path.join(dir, "node_modules", "typescript"), "junction").catch(
      () => undefined,
    );
    return copied;
  }

  function run(args: string[], cwd: string): { status: number | null; out: string; err: string } {
    const child = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf-8" });
    if (child.error !== undefined) throw child.error;
    return { status: child.status, out: child.stdout ?? "", err: child.stderr ?? "" };
  }

  it("fails a scoped run when the ledger is missing, and passes an unscoped one", async () => {
    // Review finding [27]. `ci:lint` runs this with `--spec 0017`, and the missing-ledger branch
    // returned 0 without consulting the scope — so deleting or renaming the ledger left the guard
    // green while it examined nothing, for a spec it was configured to hold at zero. The
    // scoped-selected-nothing branch that would have caught it sat further down and was never
    // reached.
    //
    // Unscoped, an absent ledger really is nothing to check, and that half is asserted too: the
    // repair is a scope distinction, not a new refusal.
    const dir = await temp();
    await mkdir(path.join(dir, "packages", "qfai", "tests", "e2e"), { recursive: true });
    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      `export default [{ test: { name: "e2e", include: ["tests/e2e/**/*.test.ts"] } }];\n`,
      "utf8",
    );
    const copied = await stageGuard(dir, "check-atdd-annotation-ledger.mjs");

    const scoped = spawnSync(process.execPath, [copied, "--spec", "0017"], {
      cwd: dir,
      encoding: "utf-8",
    });
    if (scoped.error !== undefined) throw scoped.error;
    expect(scoped.status, "a scoped run that can examine nothing is not a pass").toBe(1);
    expect(`${scoped.stdout ?? ""}${scoped.stderr ?? ""}`).toMatch(/no ledger/i);

    const unscoped = spawnSync(process.execPath, [copied], { cwd: dir, encoding: "utf-8" });
    if (unscoped.error !== undefined) throw unscoped.error;
    expect(
      unscoped.status,
      "a repository that has not started certifying has no claims to refuse",
    ).toBe(0);
  });

  it("does not count a root-tree test the runner never executes", async () => {
    // Review finding [09], end to end. `runnerCorpusRoots` being right is not the same as `main()`
    // USING it: a plant reverting the wiring back to the two hand-listed trees left every direct
    // row on the helper green, which is how this gap was found.
    //
    // The script resolves its root from its own location, so it is COPIED into a synthetic tree
    // rather than pointed at one. The tree is the exact shape the finding describes: the ledger
    // claims a story, the only annotation for it sits in the repository-root `tests/e2e` — which
    // `pnpm -C packages/qfai test:e2e` never opens — and the package tree has nothing.
    const dir = await temp();
    await mkdir(path.join(dir, "tests", "e2e"), { recursive: true });
    await mkdir(path.join(dir, "packages", "qfai", "tests", "e2e"), { recursive: true });

    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      `export default [{ test: { name: "e2e", include: ["tests/e2e/**/*.test.ts"] } }];\n`,
      "utf8",
    );
    await writeFile(
      path.join(dir, "tests", "e2e", "qfai-traceability.md"),
      `- ${tag("0017", "0017-0001")}\n`,
      "utf8",
    );
    await writeFile(
      path.join(dir, "tests", "e2e", "backing.test.ts"),
      `// ${tag("0017", "0017-0001")}\n`,
      "utf8",
    );

    const copied = await stageGuard(dir, "check-atdd-annotation-ledger.mjs");

    const child = spawnSync(process.execPath, [copied], { cwd: dir, encoding: "utf-8" });
    if (child.error !== undefined) throw child.error;

    expect(
      child.status,
      "a claim backed only by a file the runner never opens is a claim with nothing behind it",
    ).toBe(1);
    expect(`${child.stdout ?? ""}${child.stderr ?? ""}`).toContain(tag("0017", "0017-0001"));
  });

  it("counts the same test once it sits where the runner runs it", async () => {
    // The other direction, from the same fixture: move the file into the package tree and the
    // claim is backed. Without this the row above would also hold for a guard that refuses
    // everything.
    const dir = await temp();
    await mkdir(path.join(dir, "tests", "e2e"), { recursive: true });
    await mkdir(path.join(dir, "packages", "qfai", "tests", "e2e"), { recursive: true });

    await writeFile(
      path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
      `export default [{ test: { name: "e2e", include: ["tests/e2e/**/*.test.ts"] } }];\n`,
      "utf8",
    );
    await writeFile(
      path.join(dir, "tests", "e2e", "qfai-traceability.md"),
      `- ${tag("0017", "0017-0001")}\n`,
      "utf8",
    );
    await writeFile(
      path.join(dir, "packages", "qfai", "tests", "e2e", "backing.test.ts"),
      `// ${tag("0017", "0017-0001")}\n`,
      "utf8",
    );

    const copied = await stageGuard(dir, "check-atdd-annotation-ledger.mjs");

    const child = spawnSync(process.execPath, [copied], { cwd: dir, encoding: "utf-8" });
    if (child.error !== undefined) throw child.error;
    expect(child.status, `${child.stdout ?? ""}${child.stderr ?? ""}`).toBe(0);
  });

  it("passes for spec-0017 from the repository root", () => {
    const root = path.resolve(__dirname, "../../../../..");
    const result = run(["--spec", "0017"], root);
    expect(result.status).toBe(0);
    expect(result.out).toMatch(/9 claim\(s\) backed by a test annotation \(spec-0017\)/);
  });

  it("gives the same answer from a subdirectory, because the root is module-relative", async () => {
    const root = path.resolve(__dirname, "../../../../..");
    const fromRoot = run(["--spec", "0017"], root);
    const fromPackage = run(["--spec", "0017"], path.join(root, "packages", "qfai"));
    expect(fromPackage.status, "the cwd must not decide whether the guard runs").toBe(
      fromRoot.status,
    );
    expect(fromPackage.out).toBe(fromRoot.out);
    expect(fromPackage.out, "and it must not be the reassuring no-ledger sentence").not.toMatch(
      /nothing to check/,
    );

    // The same from an unrelated directory entirely.
    const elsewhere = await temp();
    expect(run(["--spec", "0017"], elsewhere).status).toBe(0);
  });

  it("exits 1 repo-wide, naming unbacked claims on stderr", () => {
    const root = path.resolve(__dirname, "../../../../..");
    const result = run([], root);
    expect(result.status).toBe(1);
    expect(result.err).toMatch(/claims coverage no test carries an annotation for/);
    expect(result.err).toMatch(/QFAI:SPEC-\d{4}:US-\d{4}-\d{4}/);
    expect(result.err).toMatch(/Write the test first/);
  });

  it("rejects a malformed --spec with exit 2 rather than widening to every spec", () => {
    const root = path.resolve(__dirname, "../../../../..");
    for (const args of [["--spec"], ["--spec", "17"], ["--spec", "abcd"], ["--spec="]]) {
      const result = run(args, root);
      expect(result.status, `${args.join(" ")} must not be tolerated`).toBe(2);
      expect(result.err).toMatch(/--spec needs a four-digit spec number/);
    }
  });

  it("accepts the inline --spec=NNNN form rather than widening in silence", () => {
    // Round 2 found `--spec=0017` was ignored, so a scoped invocation quietly became a repo-wide one
    // — which exits 1 today, meaning the typo would have looked like a finding.
    const root = path.resolve(__dirname, "../../../../..");
    const inline = run(["--spec=0017"], root);
    expect(inline.status).toBe(0);
    expect(inline.out).toBe(run(["--spec", "0017"], root).out);
  });

  it("rejects a repeated --spec rather than silently taking the last one", () => {
    // Last-wins with no message is the shape this parser exists to close, one turn further in: the
    // invocation's scope is not what it reads as. Both spellings, and mixed.
    const root = path.resolve(__dirname, "../../../../..");
    for (const args of [
      ["--spec", "0017", "--spec", "0018"],
      ["--spec=0017", "--spec=0018"],
      ["--spec", "0017", "--spec=0018"],
      ["--spec=0017", "--spec", "0017"],
    ]) {
      const result = run(args, root);
      expect(result.status, `${args.join(" ")} must be a usage error`).toBe(2);
      expect(result.err).toMatch(/--spec given more than once/);
    }
  });

  it("rejects an unknown argument instead of ignoring it", () => {
    const root = path.resolve(__dirname, "../../../../..");
    for (const args of [
      ["--spce", "0017"],
      ["-s", "0017"],
      ["0017"],
      ["--spec", "0017", "extra"],
    ]) {
      const result = run(args, root);
      expect(result.status, `${args.join(" ")} must be a usage error`).toBe(2);
      expect(result.err).toMatch(/unknown argument/);
    }
  });

  it("does not count a claim backed only by a file the runner excludes", async () => {
    // The WIRING, which the unit rows above cannot reach. Review finding [85] is only closed if
    // `main` subtracts what `runnerCorpusRoots` reports — and a plant that dropped the
    // subtraction there left every one of those rows green, because they call the reader
    // directly. This one runs the guard.
    //
    // Both directions in one fixture: with the exclusion the claim is unbacked and the guard
    // exits 1; without it the same file backs the same claim and the guard exits 0. Anything
    // that changed both answers at once would be a fixture fault rather than a repair.
    const claim = tag("0017", "0017-0001");

    const build = async (exclude: boolean): Promise<{ dir: string; copied: string }> => {
      const dir = await temp();
      await mkdir(path.join(dir, "tests", "e2e"), { recursive: true });
      await mkdir(path.join(dir, "packages", "qfai", "tests", "e2e"), { recursive: true });
      await writeFile(
        path.join(dir, "tests", "e2e", "qfai-traceability.md"),
        `- ${claim}\n`,
        "utf8",
      );
      await writeFile(
        path.join(dir, "packages", "qfai", "tests", "e2e", "backing.test.ts"),
        `// ${claim}\n`,
        "utf8",
      );
      await writeFile(
        path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
        exclude
          ? `export default [{ test: { name: "e2e", include: ["tests/e2e/**/*.test.ts"], exclude: ["tests/e2e/backing.test.ts"] } }];\n`
          : `export default [{ test: { name: "e2e", include: ["tests/e2e/**/*.test.ts"] } }];\n`,
        "utf8",
      );
      return { dir, copied: await stageGuard(dir, "check-atdd-annotation-ledger.mjs") };
    };

    const included = await build(false);
    const backing = spawnSync(process.execPath, [included.copied], {
      cwd: included.dir,
      encoding: "utf-8",
    });
    if (backing.error !== undefined) throw backing.error;
    expect(
      backing.status,
      `the premise: with no exclusion the file backs the claim:\n${backing.stdout ?? ""}${backing.stderr ?? ""}`,
    ).toBe(0);

    const excluded = await build(true);
    const child = spawnSync(process.execPath, [excluded.copied], {
      cwd: excluded.dir,
      encoding: "utf-8",
    });
    if (child.error !== undefined) throw child.error;
    const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;
    expect(
      child.status,
      `a file the runner never opens must not discharge a claim:\n${output}`,
    ).toBe(1);
    expect(output, "and the finding must name the claim left unbacked").toContain(claim);
  }, 30_000);
  it("does not count a claim backed only by a test the runner will not execute", async () => {
    // The WIRING for review finding [115], which the rows calling `redactDisabledTests` directly
    // cannot reach: a plant that removed the redaction from `main` left every one of them green.
    // This one runs the guard.
    //
    // Both directions from one fixture, differing only in `describe` versus `describe.skip`.
    const claim = tag("0017", "0017-0001");

    const build = async (skipped: boolean): Promise<{ dir: string; copied: string }> => {
      const dir = await temp();
      await mkdir(path.join(dir, "tests", "e2e"), { recursive: true });
      await mkdir(path.join(dir, "packages", "qfai", "tests", "e2e"), { recursive: true });
      await writeFile(
        path.join(dir, "tests", "e2e", "qfai-traceability.md"),
        `- ${claim}\n`,
        "utf8",
      );
      await writeFile(
        path.join(dir, "packages", "qfai", "tests", "e2e", "backing.test.ts"),
        [
          'import { describe, it, expect } from "vitest";',
          "",
          `// ${claim}`,
          `describe${skipped ? ".skip" : ""}("covers the story", () => {`,
          '  it("asserts something", () => {',
          "    expect(1).toBe(1);",
          "  });",
          "});",
          "",
        ].join("\n"),
        "utf8",
      );
      await writeFile(
        path.join(dir, "packages", "qfai", "vitest.workspace.ts"),
        `export default [{ test: { name: "e2e", include: ["tests/e2e/**/*.test.ts"] } }];\n`,
        "utf8",
      );
      return { dir, copied: await stageGuard(dir, "check-atdd-annotation-ledger.mjs") };
    };

    const running = await build(false);
    const backing = spawnSync(process.execPath, [running.copied], {
      cwd: running.dir,
      encoding: "utf-8",
    });
    if (backing.error !== undefined) throw backing.error;
    expect(
      backing.status,
      `the premise: a suite that runs backs the claim:\n${backing.stdout ?? ""}${backing.stderr ?? ""}`,
    ).toBe(0);

    const skipped = await build(true);
    const child = spawnSync(process.execPath, [skipped.copied], {
      cwd: skipped.dir,
      encoding: "utf-8",
    });
    if (child.error !== undefined) throw child.error;
    const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;
    expect(
      child.status,
      `a suite Vitest reports as skipped must not discharge a claim:\n${output}`,
    ).toBe(1);
    expect(output, "and the finding must name the claim left unbacked").toContain(claim);
  }, 30_000);

  it("exits 0 with an explicit message when a tree genuinely has no ledger", async () => {
    // The one legitimate exit-0-without-checking path. Distinguishable from the wrong-cwd case
    // only because the root no longer comes from the cwd: this needs a copy of the script in a
    // tree of its own.
    const dir = await temp();
    const copied = await stageGuard(dir, "guard.mjs");
    const child = spawnSync(process.execPath, [copied], {
      cwd: dir,
      encoding: "utf-8",
    });
    expect(child.status).toBe(0);
    expect(child.stdout ?? "").toMatch(/no ledger at tests\/e2e — nothing to check/);
  });
  it("refuses a ledger that exists but is not a readable regular file", async () => {
    // Review finding [76]. The markdown was read with a plain `readFile`, which follows a symlink:
    // `tests/e2e/qfai-traceability.md` pointed at `/dev/zero`, or at a FIFO nothing ever writes to,
    // and this required `ci:lint` member hung until the job timed out. A lane that can be made to
    // hang blocks nothing — and this one exists precisely because the gate beside it fails open.
    //
    // Planted as a junction to a DIRECTORY rather than to `/dev/zero`, which does not exist on every
    // platform this suite runs on; the reader refuses both by the same descriptor test. A hang would
    // fail this row by timing out either way.
    const dir = await temp();
    await mkdir(path.join(dir, "tests", "e2e"), { recursive: true });
    await mkdir(path.join(dir, "elsewhere"), { recursive: true });
    const copied = await stageGuard(dir, "check-atdd-annotation-ledger.mjs");
    const { symlink } = await import("node:fs/promises");
    try {
      await symlink(
        path.join(dir, "elsewhere"),
        path.join(dir, "tests", "e2e", "qfai-traceability.md"),
        "junction",
      );
    } catch {
      return;
    }

    const child = spawnSync(process.execPath, [copied], { cwd: dir, encoding: "utf-8" });
    if (child.error !== undefined) throw child.error;
    const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;
    expect(child.status, `a ledger this guard refuses to read is not a pass:\n${output}`).toBe(1);
    expect(output, "the refusal must say what it refused").toMatch(
      /exists but is not a readable regular file/,
    );
    expect(
      output,
      "and must not be reported as the absent-ledger case, which is the other answer",
    ).not.toMatch(/nothing to check/);

    // And the one branch no portable fixture reaches: which errors mean ABSENT. The reader
    // answers `undefined` for every refusal, so presence is decided by a second `lstat` — and if
    // that treated any failure as absence, an EACCES or an ELOOP on the ledger would print
    // `nothing to check` and exit 0, which is the fail-open the branch above exists to close,
    // reached by a different route. Planting EACCES portably is not possible here; asserting which
    // predicate decides is.
    const guard = await readFile(
      path.resolve(__dirname, "../../../../../scripts/check-atdd-annotation-ledger.mjs"),
      "utf8",
    );
    expect(
      guard,
      "only a missing path may be read as absent — every other failure is present-and-unreadable",
    ).toMatch(/presentByName = !isMissing\(error\);/);
  }, 30_000);

  it("refuses a ledger past its size ceiling instead of reading it into memory", async () => {
    // The unconditional half of the same refusal: no link, no device, nothing platform-specific — a
    // file whose size alone says it is not a ledger. A pull request that can put a gigabyte in a
    // required lane's path exhausts the runner instead of being reported.
    const dir = await temp();
    await mkdir(path.join(dir, "tests", "e2e"), { recursive: true });
    const copied = await stageGuard(dir, "check-atdd-annotation-ledger.mjs");
    await writeFile(
      path.join(dir, "tests", "e2e", "qfai-traceability.md"),
      `# ledger\n${"x".repeat(5 * 1024 * 1024)}\n`,
      "utf8",
    );

    const child = spawnSync(process.execPath, [copied], { cwd: dir, encoding: "utf-8" });
    if (child.error !== undefined) throw child.error;
    const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;
    expect(child.status, `an oversized ledger must be refused:\n${output}`).toBe(1);
    expect(output).toMatch(/exists but is not a readable regular file/);
  }, 30_000);
});

describe("the guard against this repository's own ledger", () => {
  it("passes for spec-0017, whose annotations were appended after the test existed", async () => {
    const root = path.resolve(__dirname, "../../../../..");
    const { readFile } = await import("node:fs/promises");
    const ledger = await readFile(path.join(root, "tests", "e2e", "qfai-traceability.md"), "utf8");
    const sources = new Map<string, string>();
    for (const dir of [
      path.join(root, "tests", "e2e"),
      path.join(root, "packages", "qfai", "tests", "e2e"),
    ]) {
      for (const [file, text] of await collectTestSources(dir)) sources.set(file, text);
    }

    const scoped = checkLedger(ledger, sources, { spec: "0017" });
    expect(scoped.unbacked, "every spec-0017 ledger claim must name a test that exists").toEqual(
      [],
    );
    expect(
      scoped.checked,
      "spec-0017 claims nine stories: US-0017-0007's claim was withdrawn in round 1 and restored in " +
        "round 11, carried by a test that observes the runner pool rather than reading its configuration",
    ).toBe(9);

    // Repo-wide the guard does NOT pass, and that is the finding rather than a defect in the guard:
    // 127 of 208 claims are backed by no annotation in any E2E test file. `CR-20260820-0011`.
    //
    // This is a RATCHET, and the shape matters. The first version asserted
    // `unbacked.length > 100`, which round 2's `qa-gatekeeper` broke from both sides: appending 60
    // more unbacked claims (127 -> 187) reddened NOTHING, while backfilling 27 of the 127 with real
    // annotations — exactly what `CR-20260820-0011` Option 1 prescribes — made it FAIL. A test that
    // is blind to unlimited regression and fires on the 27th story fixed is a test that punishes its
    // own fix, which is the shape this spec rejected in writing twice, in this very file's header.
    //
    // `toBeLessThanOrEqual` fires on a NEW unbacked claim and stays green all the way down to zero.
    // The exact figure lives in the CR, which is the governance record for it; this pins only the
    // direction nobody should be allowed to travel silently.
    //
    // One blind spot, stated rather than papered over: a delete-and-add SWAP keeps the count at 127
    // while replacing which stories are uncovered, and no aggregate can see that. Catching it needs a
    // per-claim baseline committed next to the CR, which is `CR-20260820-0011` option 1's work — it
    // is where the per-story decisions get made — not a bound this test can tighten.
    const wide = checkLedger(ledger, sources);
    // The claim count is deliberately NOT asserted at all, and that took three attempts to get
    // right. `toBe(208)` reddened on a legitimate new backed story. `>= 208` then reddened on the
    // FIRST ledger line removed — and removing a line for a story with no test is what
    // `CR-20260820-0011` Option 1 calls "the one that matters and the one that will hurt", so the
    // floor punished the remediation just as squarely as equality punished the addition. Round 4
    // measured both directions: with Option 1 complete the ledger reads `checked = 81,
    // unbacked = 0`, and the floor stayed red the whole way.
    //
    // What is worth pinning is the direction nobody should travel silently, and that is `unbacked`
    // alone. The claim total belongs in the CR, which is the governance record for it.
    expect(
      wide.unbacked.length,
      "a NEW unbacked ledger claim is a regression; fixing existing ones must stay green — " +
        "CR-20260820-0011 holds the exact figure",
    ).toBeLessThanOrEqual(127);
    expect(
      wide.unbacked.some((entry) => entry.spec === "0017"),
      "spec-0017 must not be among the unbacked claims",
    ).toBe(false);
  });
});

describe("a test the runner will not execute backs nothing", () => {
  // Review finding [115]. The backing corpus was the TEXT of every file the runner's include
  // picks up, so an annotation inside `describe.skip`, `it.skip`, `it.todo` or a body that always
  // calls `ctx.skip()` counted exactly as much as one inside a test that ran. Vitest reports those
  // as skipped rather than passed and the project still exits 0 on its other tests, so the
  // required ledger guard certified a user story no executed acceptance test covered.
  //
  // `redactDisabledTests` blanks those constructs before the corpus is compared. Every row below
  // asks it for a count, because a row asserting on the SOURCE of the guard would have passed
  // against the version that had this defect.

  const annotations = (text: string): number =>
    (text.match(/QFAI:SPEC-\d{4}:US-\d{4}-\d{4}/g) ?? []).length;

  const file = (body: string): string =>
    ['import { describe, it, expect } from "vitest";', "", body, ""].join("\n");

  it("keeps the annotation of a suite that runs", async () => {
    const source = file(
      [
        "// QFAI:SPEC-0017:US-0017-0001",
        'describe("runs", () => {',
        '  it("asserts something", () => {',
        "    expect(1).toBe(1);",
        "  });",
        "});",
      ].join("\n"),
    );
    expect(annotations(await redactDisabledTests(source, "runs.test.ts"))).toBe(1);
  });

  it("drops the annotation of a skipped suite, comment and all", async () => {
    const source = file(
      [
        "// QFAI:SPEC-0017:US-0017-0001",
        'describe.skip("does not run", () => {',
        '  it("asserts something", () => {',
        "    expect(1).toBe(1);",
        "  });",
        "});",
      ].join("\n"),
    );
    const redacted = await redactDisabledTests(source, "skipped.test.ts");
    expect(
      annotations(redacted),
      "the annotation sits ABOVE the describe and must go with it",
    ).toBe(0);
    expect(redacted.length, "blanked in place, so every other offset is unchanged").toBe(
      source.length,
    );
  });

  it("drops it for todo and for the x-prefixed spellings too", async () => {
    // The `.todo` opening is COMPOSED rather than written out, and the reason was a measured one
    // rather than a style preference: this repository dogfoods `QFAI-TEST-001`, which scanned
    // source TEXT for `(it|test|describe)\.todo\s*\(` and did not care that this occurrence is
    // a fixture inside a string literal. Written verbatim it failed the repository's own TDD
    // gate — the same text-level-versus-parsed distinction these rows are about, arriving from
    // the other direction. That validator now blanks comments and literals before it matches
    // (`src/core/validators/jsSourceMask.ts`), so the verbatim spelling no longer trips it; the
    // composition is kept because the string built at run time is identical either way.
    const TODO = `.${"to"}${"do"}`;
    for (const opening of [
      `describe${TODO}("t", () => {`,
      'xdescribe("x", () => {',
      'describe.skipIf(true)("c", () => {',
    ]) {
      const source = file(
        [
          "// QFAI:SPEC-0017:US-0017-0001",
          opening,
          '  it("asserts something", () => {',
          "    expect(1).toBe(1);",
          "  });",
          "});",
        ].join("\n"),
      );
      expect(
        annotations(await redactDisabledTests(source, "disabled.test.ts")),
        `${opening} must not back a claim`,
      ).toBe(0);
    }
  });

  it("drops it when the suite runs but every test inside it is skipped", async () => {
    // The spelling the first version of this repair missed. This repository writes the annotation
    // above the `describe`, so reading only the `describe`'s own modifier left it standing over a
    // suite with nothing in it to execute. Measured with a plant against the real corpus.
    const source = file(
      [
        "// QFAI:SPEC-0017:US-0017-0001",
        'describe("the suite itself runs", () => {',
        '  it.skip("but this does not", () => {',
        "    expect(1).toBe(1);",
        "  });",
        "});",
      ].join("\n"),
    );
    expect(annotations(await redactDisabledTests(source, "hollow.test.ts"))).toBe(0);
  });

  it("keeps it when one test in the suite still runs", async () => {
    // The other direction, and the reason the rule is `every test`, not `any test`: a suite with
    // one skipped case and one executed case does cover its story.
    const source = file(
      [
        "// QFAI:SPEC-0017:US-0017-0001",
        'describe("mixed", () => {',
        '  it.skip("parked", () => {',
        "    expect(1).toBe(1);",
        "  });",
        '  it("runs", () => {',
        "    expect(1).toBe(1);",
        "  });",
        "});",
      ].join("\n"),
    );
    expect(annotations(await redactDisabledTests(source, "mixed.test.ts"))).toBe(1);
  });

  it("drops it for a body that always skips itself", async () => {
    const source = file(
      [
        "// QFAI:SPEC-0017:US-0017-0001",
        'describe("runs", () => {',
        '  it("skips itself", (ctx) => {',
        "    ctx.skip();",
        "    expect(1).toBe(1);",
        "  });",
        "});",
      ].join("\n"),
    );
    expect(annotations(await redactDisabledTests(source, "ctxskip.test.ts"))).toBe(0);
  });

  it("keeps it when the skip is conditional, which is a test that runs somewhere", async () => {
    // The boundary. `ctx.skip()` under an `if` is a test that executes on some platform; the
    // guard answers whether a test runs at all, and a blanket reading of `.skip(` would have
    // deleted the annotations of every platform-conditional acceptance test in the corpus.
    const source = file(
      [
        "// QFAI:SPEC-0017:US-0017-0001",
        'describe("runs", () => {',
        '  it("skips on one platform", (ctx) => {',
        '    if (process.platform === "win32") ctx.skip();',
        "    expect(1).toBe(1);",
        "  });",
        "});",
      ].join("\n"),
    );
    expect(annotations(await redactDisabledTests(source, "conditional.test.ts"))).toBe(1);
  });
});
