/**
 * What a non-zero exit from a spawned process carries, read by property rather
 * than by assertion.
 *
 * `execFile`'s rejection is typed `unknown` and attaches the child's `code`,
 * `stdout` and `stderr` as own enumerable properties. Spreading it gives those
 * three without claiming a shape the type system cannot check, so a change in
 * what the rejection carries shows up as an empty string here rather than as a
 * cast that kept compiling.
 */
export function failureOf(err: unknown): { code: number; output: string } {
  const bag: Record<string, unknown> = typeof err === "object" && err !== null ? { ...err } : {};
  const stdout = typeof bag.stdout === "string" ? bag.stdout : "";
  const stderr = typeof bag.stderr === "string" ? bag.stderr : "";
  return { code: typeof bag.code === "number" ? bag.code : 1, output: stdout + stderr };
}
