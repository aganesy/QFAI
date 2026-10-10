import { measureValidators, type ValidatorMeasurement } from "./validationProfile.js";

/** Restore real exports before recording results, including either failure path. */
export async function withValidatorMeasurements<T>(
  run: () => Promise<T>,
  record: (measurements: ValidatorMeasurement[]) => Promise<void>,
): Promise<T> {
  const measurements = measureValidators();
  let failure: unknown;
  let failed = false;
  let result: { value: T } | undefined;
  let observed: ValidatorMeasurement[];
  try {
    result = { value: await run() };
  } catch (error: unknown) {
    failed = true;
    failure = error;
  } finally {
    try {
      observed = measurements.read();
    } finally {
      measurements.restore();
    }
  }
  try {
    await record(observed);
  } catch (error: unknown) {
    if (failed)
      throw new AggregateError([failure, error], "Profiling and result recording both failed", {
        cause: error,
      });
    throw error;
  }
  if (failed) throw failure;
  if (result === undefined) throw new Error("The measured callback returned no outcome");
  return result.value;
}
