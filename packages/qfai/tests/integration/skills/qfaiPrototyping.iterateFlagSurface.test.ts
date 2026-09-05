/**
 * `/qfai-prototyping` Step 2-B.1 flag-surface completeness.
 *
 * The skill has exactly one place that enumerates the flags of
 * `qfai prototyping iterate`, and operators (and agents that only read
 * `.qfai/assistant/`) treat it as the flag reference. It had drifted to
 * three entries while the parser accepted ten, leaving the mandatory
 * cycle-0 `--force` and the gate-relaxing `--mode exploration`
 * documented nowhere in the shipped tree.
 *
 * This test pins the three sites together: the `args.ts` parser case,
 * the `main.ts` forwarding into `runPrototypingIterate`, and the
 * Step 2-B.1 enumeration. Adding a flag to the CLI without documenting
 * it — or renaming one in the parser without touching the skill — fails
 * here.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SKILL_MD = path.resolve(
  process.cwd(),
  "assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md",
);
const ARGS_TS = path.resolve(process.cwd(), "src/cli/lib/args.ts");
const MAIN_TS = path.resolve(process.cwd(), "src/cli/main.ts");
const CONTRACT_MD = path.resolve(
  process.cwd(),
  "..",
  "..",
  ".qfai/contracts/cli/qfai-prototyping-iterate.md",
);

/**
 * Every optional flag `qfai prototyping iterate` accepts, paired with
 * the `ParsedOptions` key `main.ts` forwards it through. `--cycle` is
 * omitted: it is the required positional-equivalent, not an opt-in.
 *
 * This table is NOT the source of truth for the flag set. Two
 * independent derivations pin it in both directions:
 * `forwardedOptionKeys()` reads the `runPrototypingIterate({ ... })`
 * call in `main.ts`, and `parserIterateOptionKeys()` reads the
 * `options.prototyping*` assignments in `args.ts`. A flag wired into
 * the CLI without being added here therefore fails a derivation test,
 * which in turn forces the SKILL.md / contract scans to cover it —
 * including the case where `args.ts` gains a flag whose forwarding
 * into `main.ts` was forgotten, which the `main.ts` derivation alone
 * cannot see.
 */
const ITERATE_FLAGS: ReadonlyArray<{ flag: string; optionKey: string }> = [
  { flag: "--target-url", optionKey: "prototypingTargetUrl" },
  { flag: "--force", optionKey: "force" },
  { flag: "--license-patch", optionKey: "prototypingLicensePatch" },
  { flag: "--primary-spec-id", optionKey: "prototypingPrimarySpecId" },
  { flag: "--check-convergence", optionKey: "prototypingCheckConvergence" },
  { flag: "--capture", optionKey: "prototypingCapture" },
  { flag: "--auto-serve", optionKey: "prototypingAutoServe" },
  { flag: "--emit-skeletons", optionKey: "prototypingEmitSkeletons" },
  { flag: "--skeleton-mode", optionKey: "prototypingSkeletonMode" },
  { flag: "--mode", optionKey: "prototypingMode" },
];

/**
 * Slice the `runPrototypingIterate({ ... })` call site out of
 * `main.ts`. Throws rather than returning an empty string so a renamed
 * entry point surfaces as a failure instead of a vacuous pass.
 */
function forwardingBlock(main: string): string {
  const start = main.indexOf("await runPrototypingIterate({");
  if (start === -1) {
    throw new Error("main.ts: `await runPrototypingIterate({` call site not found");
  }
  const end = main.indexOf("});", start);
  if (end === -1) {
    throw new Error("main.ts: `runPrototypingIterate` call site is not terminated");
  }
  return main.slice(start, end);
}

/**
 * Derive the `ParsedOptions` keys the iterate call site actually
 * forwards. `prototypingCycle` is dropped: `--cycle` is required, not
 * an opt-in flag.
 */
function forwardedOptionKeys(main: string): string[] {
  const keys = new Set<string>();
  for (const match of forwardingBlock(main).matchAll(/options\.([A-Za-z0-9_]+)/g)) {
    const key = match[1];
    if (key !== undefined) keys.add(key);
  }
  keys.delete("prototypingCycle");
  return [...keys].sort();
}

/**
 * `ParsedOptions` keys `args.ts` assigns under a `prototyping*` name
 * that are NOT part of the `iterate` opt-in flag surface. Every entry
 * carries the reason it is excluded — this set is the only
 * hand-maintained escape from the parser-side derivation below, so a
 * newly parsed `prototyping*` flag must be classified here or
 * documented as an iterate flag; it cannot stay invisible.
 */
const NON_ITERATE_PROTOTYPING_OPTION_KEYS: ReadonlySet<string> = new Set([
  "prototypingAction", // sub-command selector (preflight / iterate / certify / show-spec)
  "prototypingCycle", // `--cycle` is required on iterate, not an opt-in flag
  "prototypingCheckOnly", // `prototyping certify --check`
  "prototypingScope", // `prototyping certify --scope`
  "prototypingUpgradeScopeFull", // `prototyping certify --upgrade-scope full`
]);

/**
 * Derive the iterate-owned `ParsedOptions` keys from the PARSER, with
 * no reference to `main.ts`. Collects every `options.prototypingX =`
 * assignment target in `args.ts` (comparisons such as
 * `options.prototypingAction === "certify"` are excluded by the
 * `[^=]` tail) and subtracts the non-iterate classifications above.
 *
 * Known limitation: `args.ts` is one flat switch shared by every
 * sub-command, so only the `prototyping`-prefixed option names are
 * attributable to prototyping by inspection. `--force` (`options.force`)
 * is shared with `init` and is covered by the `main.ts` derivation and
 * the doc scans instead.
 */
function parserIterateOptionKeys(args: string): string[] {
  const keys = new Set<string>();
  for (const match of args.matchAll(/options\.(prototyping[A-Za-z0-9_]*)\s*=[^=]/g)) {
    const key = match[1];
    if (key !== undefined && !NON_ITERATE_PROTOTYPING_OPTION_KEYS.has(key)) keys.add(key);
  }
  return [...keys].sort();
}

/**
 * Slice SKILL.md from the Step 2-B.1 heading to the next `###`
 * heading. Throws rather than returning the whole file so a renamed
 * heading surfaces as a failure instead of a silently passing scan.
 */
function extractStep2B1(content: string): string {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith("### Step 2-B.1"));
  if (start === -1) {
    throw new Error("SKILL.md: `### Step 2-B.1` heading not found");
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("### "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

describe("/qfai-prototyping — `iterate` flag surface is fully enumerated", () => {
  it("ITERATE_FLAGS matches the set main.ts actually forwards", async () => {
    // The bidirectional pin. Without it every scan below walks only the
    // hard-coded table, so a flag added to `args.ts` + `main.ts` and
    // documented nowhere would keep the suite green.
    const main = await readFile(MAIN_TS, "utf-8");
    const declared = ITERATE_FLAGS.map(({ optionKey }) => optionKey).sort();
    expect(forwardedOptionKeys(main)).toEqual(declared);
  });

  it("ITERATE_FLAGS matches the set args.ts actually parses", async () => {
    // The second, independent pin. The `main.ts` derivation above only
    // sees flags that were remembered to be forwarded — a flag added to
    // `args.ts` whose forwarding block entry was forgotten leaves both
    // `forwardedOptionKeys()` and this table unchanged, and the CLI then
    // accepts it while silently dropping it. Deriving from the parser
    // too fails that case here.
    const args = await readFile(ARGS_TS, "utf-8");
    const declared = ITERATE_FLAGS.map(({ optionKey }) => optionKey)
      .filter((optionKey) => optionKey.startsWith("prototyping"))
      .sort();
    expect(parserIterateOptionKeys(args)).toEqual(declared);
  });

  it("the help text describes `--force` for the cycle-0 re-seed, not just init", async () => {
    // Step 2-B.1 tells the agent that `npx qfai --help` wins whenever
    // the two disagree. If the help keeps calling `--force` an
    // init-only flag, that precedence rule makes the agent drop the
    // mandatory cycle-0 re-seed flag and hit the exit-2 refusal.
    const main = await readFile(MAIN_TS, "utf-8");
    const usageStart = main.indexOf("function usage(): string {");
    expect(usageStart).toBeGreaterThan(-1);
    expect(main.slice(usageStart)).toMatch(/--force\s+prototyping iterate --cycle 0:/);
  });

  it("Step 2-B.1 documents every flag the parser accepts", async () => {
    const section = extractStep2B1(await readFile(SKILL_MD, "utf-8"));
    const missing = ITERATE_FLAGS.filter(({ flag }) => !section.includes(`\`${flag}`)).map(
      ({ flag }) => flag,
    );
    expect(missing).toEqual([]);
  });

  it("Step 2-B.1 does not close the set with a hard-coded count", async () => {
    const section = extractStep2B1(await readFile(SKILL_MD, "utf-8"));
    // "Three flags extend ..." is the exact shape that went stale. Any
    // spelled-out count in the lead-in re-creates the same trap.
    expect(section).not.toMatch(
      /\b(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\s+flags?\b/i,
    );
  });

  it("every documented flag still has a parser case in args.ts", async () => {
    const args = await readFile(ARGS_TS, "utf-8");
    const missing = ITERATE_FLAGS.filter(({ flag }) => !args.includes(`case "${flag}":`)).map(
      ({ flag }) => flag,
    );
    expect(missing).toEqual([]);
  });

  it("every documented flag is still forwarded into runPrototypingIterate", async () => {
    const main = await readFile(MAIN_TS, "utf-8");
    const start = main.indexOf("await runPrototypingIterate({");
    expect(start).toBeGreaterThan(-1);
    const block = main.slice(start, main.indexOf("});", start));
    const missing = ITERATE_FLAGS.filter(
      ({ optionKey }) => !block.includes(`options.${optionKey}`),
    ).map(({ flag }) => flag);
    expect(missing).toEqual([]);
  });

  it("the CLI contract synopsis lists every flag", async () => {
    const contract = await readFile(CONTRACT_MD, "utf-8");
    const synopsisStart = contract.indexOf("qfai prototyping iterate --cycle");
    expect(synopsisStart).toBeGreaterThan(-1);
    const synopsis = contract.slice(synopsisStart, contract.indexOf("```", synopsisStart));
    const missing = ITERATE_FLAGS.filter(({ flag }) => !synopsis.includes(flag)).map(
      ({ flag }) => flag,
    );
    expect(missing).toEqual([]);
  });
});
