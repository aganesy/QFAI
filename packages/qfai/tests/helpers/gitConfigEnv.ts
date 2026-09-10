/**
 * Declaring git configuration through the environment, so a spawned git inherits it.
 *
 * git reads `GIT_CONFIG_COUNT` / `GIT_CONFIG_KEY_<n>` / `GIT_CONFIG_VALUE_<n>` as
 * configuration, and a child process inherits the environment of whatever started it.
 * That makes this the one place a setting can be applied to every git a test spawns —
 * including the ones inside helpers — without each fixture repeating it.
 *
 * Kept apart from the setup file that applies it. A setup file's whole effect is a
 * side effect at import, so a test that imported it to reach this function would
 * perform that side effect itself and could no longer tell a wired setup from an
 * unwired one.
 */

/** A `key`/`value` pair, in the form git's environment configuration takes. */
export type GitConfigEntry = readonly [key: string, value: string];

/** Git's declared count of environment-supplied configuration entries. */
const COUNT = "GIT_CONFIG_COUNT";

/**
 * Adds `entries` to the git configuration carried in `env`.
 *
 * Adds rather than assigns. `GIT_CONFIG_COUNT` may already carry entries that something
 * outside this suite set, and writing index 0 would drop one with nothing to notice.
 *
 * A count that is not a non-negative integer is treated as absent. git rejects such a
 * value outright, so there are no entries behind it to preserve, and starting at 0 leaves
 * a usable configuration instead of an unusable one.
 */
export function appendGitConfig(env: NodeJS.ProcessEnv, entries: readonly GitConfigEntry[]): void {
  const declared = env[COUNT];
  const start = declared !== undefined && /^\d+$/.test(declared) ? Number(declared) : 0;

  entries.forEach(([key, value], offset) => {
    const index = String(start + offset);
    env[`GIT_CONFIG_KEY_${index}`] = key;
    env[`GIT_CONFIG_VALUE_${index}`] = value;
  });

  env[COUNT] = String(start + entries.length);
}
