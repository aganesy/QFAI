/**
 * Repository entry point for the Markdown-schema lane.
 *
 * The implementation lives in `packages/qfai/assets/scripts/check-mdschema.mjs`
 * because it SHIPS: the workflow `qfai init` writes into an adopter's
 * `.github/workflows/` runs the same file, against the same schemas, out of the
 * installed package. A second copy here would be the SSOT-sync failure this
 * repository names in half its guards — two implementations of one rule,
 * drifting silently until an adopter gets a verdict this repository would not
 * have given.
 *
 * So this file is a delegator and nothing else. It exists because
 * `pnpm lint:mdschema` and the guard's tests address the lane by its
 * repository-root path, which is where a contributor looks for it.
 */
import process from "node:process";

import { main, patternToRegExp } from "../packages/qfai/assets/scripts/check-mdschema.mjs";

export { patternToRegExp };

process.exit(main());
