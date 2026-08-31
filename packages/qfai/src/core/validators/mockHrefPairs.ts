/**
 * SSOT-sync pair manifest for the discussion mock href-form contract
 * (Pair V). The two surfaces that MUST agree on whether same-origin
 * absolute `/path/` hrefs are permitted:
 *
 *   - the shipped discussion mock template (anchor-form default), and
 *   - the QFAI-MOCK-010 validator (strict; `/path/` rejected).
 *
 * Drift between the two is caught by R-MOCK-HREF-DRIFT.
 *
 * The pair is modeled by two token sets that detect the *drift form*
 * on each side:
 *   - `templateDriftTokens` — present when the template emits a
 *     same-origin absolute link (`<a href="/...">`), i.e. it has
 *     abandoned the anchor-form default.
 *   - `validatorAcceptTokens` — present when the validator code has
 *     been broadened to accept (`continue`) a leading-slash same-origin
 *     path instead of pushing it to localRefs.
 *
 * Symmetric (both absent → anchor-form template + strict validator, or
 * both present → `/path/` template + broadened validator) raises no
 * finding. Asymmetric (one present, one absent) raises the drift.
 *
 * Tokens are intentionally short, stable substrings (no regex), so the
 * pair check stays deterministic and cheap.
 */
export const MOCK_HREF_TEMPLATE_REL =
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/03_Story-Workshop.md";

// Follows the classification, not the filename. The same-origin branch moved to `htmlMockDom.ts` when
// jsdom was put behind a dynamic import; a manifest left pointing at the old file reads an unchanged
// module and reports no drift however far the template moves. Whoever moves this code again moves
// this constant in the same change.
export const MOCK_HREF_VALIDATOR_REL = "packages/qfai/src/core/uiux/htmlMockDom.ts";

export type MockHrefPair = {
  /** Stable human-readable clause name (used in justification text). */
  readonly clause: string;
  /** Substrings whose presence proves the template uses the drift (`/path/`) form. */
  readonly templateDriftTokens: readonly string[];
  /** Substrings whose presence proves the validator was broadened to accept `/path/`. */
  readonly validatorAcceptTokens: readonly string[];
};

export const MOCK_HREF_PAIRS: readonly MockHrefPair[] = [
  {
    clause: "same-origin-absolute-href-ban",
    // Template drift form: an anchor whose href is a leading-slash path.
    templateDriftTokens: ['href="/'],
    // Validator broadened to accept a leading-slash same-origin path.
    validatorAcceptTokens: ["accept same-origin /path/"],
  },
];
