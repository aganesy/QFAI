/**
 * SSOT-sync pair manifest for the prototyping Tailwind compliance
 * contract. Each entry names a contract clause that MUST appear in
 * both the scanner code (designMdViolations.ts) and the generator
 * prompt (generator-prompt.md). Drift between the two surfaces is
 * caught by R-PROMPT-SCANNER-DRIFT.
 *
 * Tokens are intentionally chosen to be:
 *   - short, stable substrings (no regex), so the pair check stays
 *     deterministic and cheap;
 *   - clause-bearing identifiers that BOTH surfaces necessarily
 *     contain when the contract is honored (e.g. the kind enum
 *     `color` on the scanner and the matching ban on `#hex` in the
 *     prompt's hard-constraints list).
 *
 * Add a new entry when a new compliance clause is introduced; never
 * mutate existing entries without simultaneously updating the SSOT
 * documentation and the corresponding test fixture.
 */
export type PromptScannerPair = {
  /** Stable human-readable clause name (used in justification text). */
  readonly clause: string;
  /** Substrings that MUST appear in designMdViolations.ts. */
  readonly scannerTokens: readonly string[];
  /** Substrings that MUST appear in generator-prompt.md. */
  readonly promptTokens: readonly string[];
};

export const PROMPT_SCANNER_PAIRS: readonly PromptScannerPair[] = [
  {
    clause: "color-literal-ban",
    // Scanner enumerates `"color"` as a DesignMdViolation kind.
    scannerTokens: ['"color"'],
    // Prompt forbids hex / rgb / hsl literals outside DESIGN.md.
    promptTokens: ["#hex", "rgb("],
  },
];
