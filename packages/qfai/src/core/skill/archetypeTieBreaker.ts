/**
 * Archetype tie-breaker for Step 11.3 Phase A autonomous selection.
 *
 * When two or more archetypes share the same aggregate taste-interview score,
 * this function deterministically selects the winner using:
 *   1. Highest visual-theme dimension weight.
 *   2. Alphabetical archetype name (ascending) as final tiebreaker.
 */

export interface ArchetypeScore {
  readonly name: string;
  readonly score: number;
  readonly dimensionWeights: Readonly<Record<string, number>>;
}

export interface TieBreakResult {
  readonly winner: ArchetypeScore;
  readonly isTie: boolean;
  readonly tieBreakReason: string | null;
}

export function breakTie(candidates: readonly ArchetypeScore[]): TieBreakResult {
  if (candidates.length === 0) {
    throw new Error("breakTie requires at least one candidate");
  }

  const maxScore = Math.max(...candidates.map((c) => c.score));
  const topScorers = candidates.filter((c) => c.score === maxScore);

  if (topScorers.length === 1) {
    return { winner: topScorers[0], isTie: false, tieBreakReason: null };
  }

  const visualThemeWeight = (c: ArchetypeScore): number =>
    c.dimensionWeights["visualTheme"] ?? 0;

  const maxVisual = Math.max(...topScorers.map(visualThemeWeight));
  const byVisual = topScorers.filter((c) => visualThemeWeight(c) === maxVisual);

  if (byVisual.length === 1) {
    return {
      winner: byVisual[0],
      isTie: true,
      tieBreakReason: "highest visual-theme weight",
    };
  }

  const winner = [...byVisual].sort((a, b) => a.name.localeCompare(b.name))[0];
  return {
    winner,
    isTie: true,
    tieBreakReason: "alphabetical name (visual-theme weights equal)",
  };
}
