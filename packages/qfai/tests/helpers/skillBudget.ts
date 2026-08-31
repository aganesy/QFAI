/**
 * Line ceiling for a shipped assistant asset.
 *
 * The number is no longer declared here. It is owned by
 * `src/core/doctor/assetLineBudget.ts`, which ships, so a project created by
 * `qfai init` gets the same backstop through `qfai doctor` (`assets.lineBudget`)
 * that this suite gives the framework. This module stays as the historical
 * import path for the asset tests and re-exports the runtime constants.
 *
 * The ceiling is a backstop, not the design rule. The design rule is that a
 * `SKILL.md` stays thin: it states the contract and points at the topic file
 * that carries the detail, under the skill's own `references/`, `templates/` or
 * `examples/` directory. A file approaching this number is a signal to move a
 * section out, not to raise it.
 */
export {
  ASSISTANT_ASSET_MAX_LINES as SKILL_MD_MAX_LINES,
  LINE_BUDGET_EXEMPT,
  countLines,
} from "../../src/core/doctor/assetLineBudget.js";
