/**
 * The workflow file names this package writes into an adopter's
 * `.github/workflows/` directory.
 *
 * The list is IN-BINARY. It is never computed by globbing the asset
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
 * not import from `cli/`, and a second copy of the list is how the two
 * answers drift apart. `cli/commands/init.ts` re-exports it, so the public
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
