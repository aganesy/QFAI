export const FULL_HARNESS_EXIT_REASONS = [
  "quality-threshold-met",
  "plateau",
  "budget-exhausted",
  "fake-ui-detected",
  "runtime-failure",
  "human-review-required",
] as const;

export type FullHarnessExitReason = (typeof FULL_HARNESS_EXIT_REASONS)[number];

export function mapLoopStatusToExitReason(status: string): FullHarnessExitReason {
  switch (status) {
    case "converged":
      return "quality-threshold-met";
    case "plateau":
      return "plateau";
    case "max-iterations":
      return "budget-exhausted";
    default:
      return "runtime-failure";
  }
}
