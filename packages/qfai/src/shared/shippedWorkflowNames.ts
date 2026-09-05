/**
 * The workflow file names this package writes into an adopter's
 * `.github/workflows/` directory, and the ones it used to.
 *
 * Both lists are IN-BINARY. Neither is ever computed by globbing the asset
 * tree at runtime or the adopter's disk: a write set derived from whatever
 * happens to be on disk cannot distinguish a file this package ships from one
 * somebody else put there, which is the distinction the whole
 * shipped-workflows contract rests on. The shipped-asset shape gate keeps this
 * list equal to the packaged workflow assets.
 *
 * They live in `shared/` rather than beside the command that writes them
 * because two layers need the same answer: the `init` command, which copies
 * them, and the `doctor` integrity reader, which has to know what a healthy
 * packaged tree contains before it can call a gutted one healthy. `core/` may
 * not import from `cli/`, and a second copy of a two-name list is how the two
 * answers drift apart. `cli/commands/init.ts` re-exports both, so the public
 * surface is unchanged.
 */

/**
 * Names the current package version ships into the adopter's
 * `.github/workflows/` directory (the shipped-workflows contract's write set).
 */
export const SHIPPED_WORKFLOW_NAMES: ReadonlySet<string> = new Set<string>([
  "qfai-validate.yml",
  "qfai-tests.yml",
  "qfai-docs.yml",
]);

/**
 * Names a previous package version shipped into the adopter's
 * `.github/workflows/` directory that the current version no longer ships
 * (the shipped-workflows contract's prune set). A name moves here in the same
 * change that stops shipping it; a name in neither the shipped nor the retired
 * list is not this package's. Currently empty: no shipped workflow has been
 * retired.
 */
export const RETIRED_WORKFLOW_NAMES: ReadonlySet<string> = new Set<string>();
