/**
 * A fake `git` for the diff listings `core/gitChanges.ts` runs.
 *
 * Those are two commands, not one: `--numstat` says what changed, and a second
 * `--diff-filter=D --name-only` says what the branch removed. A test that
 * answered both with the same canned string made them indistinguishable — the
 * removal listing received numstat rows and read them as paths — so no test
 * could describe a branch that removed anything, and the case where those two
 * answers differ is the whole reason the second command exists.
 *
 * Both are `-z`, so both are NUL-terminated and carry the path raw.
 *
 * Install it with `vi.mocked(execFileSync).mockImplementation(...)`; anything
 * else the code under test shells out to gets an empty answer.
 */
export function gitDiffListings(
  listings: {
    /** `--numstat` records: `added TAB deleted TAB path`. */
    changed?: readonly string[];
    /** The paths this branch deleted. */
    removed?: readonly string[];
  } = {},
): (...call: unknown[]) => string {
  const terminated = (records: readonly string[]): string =>
    records.map((record) => `${record}\0`).join("");
  return (...call: unknown[]): string => {
    const argv = Array.isArray(call[1]) ? call[1].map(String) : [];
    if (argv.includes("--diff-filter=D")) return terminated(listings.removed ?? []);
    if (argv.includes("--numstat")) return terminated(listings.changed ?? []);
    return "";
  };
}
