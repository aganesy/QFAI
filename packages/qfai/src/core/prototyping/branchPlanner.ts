export type BranchAxis =
  | "typography-worldview"
  | "density-philosophy"
  | "shape-language"
  | "hierarchy-strategy"
  | "contrast-structure"
  | "motif-rhythm";

const AXIS_PRIORITY: Record<string, readonly BranchAxis[]> = {
  "score-still-improving": ["hierarchy-strategy", "contrast-structure"],
  "code-change-too-large": ["typography-worldview", "motif-rhythm"],
  default: ["typography-worldview", "density-philosophy", "shape-language"],
};

export function planBreakthroughBranches(reasons: string[], branchCount: number): BranchAxis[] {
  const selected = new Set<BranchAxis>();
  const orderedReasons = reasons.length > 0 ? reasons : ["default"];
  const defaultAxes: readonly BranchAxis[] = [
    "typography-worldview",
    "density-philosophy",
    "shape-language",
  ];

  for (const reason of orderedReasons) {
    const axes: readonly BranchAxis[] = AXIS_PRIORITY[reason] ?? defaultAxes;
    for (const axis of axes) {
      if (selected.size >= branchCount) {
        return Array.from(selected);
      }
      selected.add(axis);
    }
  }

  for (const axis of defaultAxes) {
    if (selected.size >= branchCount) {
      break;
    }
    selected.add(axis);
  }

  return Array.from(selected);
}
