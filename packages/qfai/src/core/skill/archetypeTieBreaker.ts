/**
 * Archetype tie-breaker for Required Process step 9 Phase A autonomous selection.
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

  const [topFirst] = topScorers;
  if (topFirst === undefined) {
    throw new Error("breakTie: no top scorer resolved");
  }
  if (topScorers.length === 1) {
    return { winner: topFirst, isTie: false, tieBreakReason: null };
  }

  const visualThemeWeight = (c: ArchetypeScore): number => c.dimensionWeights["visualTheme"] ?? 0;

  const maxVisual = Math.max(...topScorers.map(visualThemeWeight));
  const byVisual = topScorers.filter((c) => visualThemeWeight(c) === maxVisual);

  const [visualFirst] = byVisual;
  if (visualFirst === undefined) {
    throw new Error("breakTie: no visual-theme winner resolved");
  }
  if (byVisual.length === 1) {
    return {
      winner: visualFirst,
      isTie: true,
      tieBreakReason: "highest visual-theme weight",
    };
  }

  const [alphaFirst] = [...byVisual].sort((a, b) => a.name.localeCompare(b.name));
  if (alphaFirst === undefined) {
    throw new Error("breakTie: no alphabetical winner resolved");
  }
  return {
    winner: alphaFirst,
    isTie: true,
    tieBreakReason: "alphabetical name (visual-theme weights equal)",
  };
}
