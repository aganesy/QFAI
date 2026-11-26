export async function waitForCatalogueWriteHold(
  held: Promise<void>,
  writer: Promise<number>,
  stderr: readonly string[],
): Promise<void> {
  const finishedEarly = writer.then((code) => {
    throw new Error(
      `Catalogue writer exited with code ${code} before reaching the held rename.\n${stderr.join("")}`.trimEnd(),
    );
  });
  await Promise.race([held, finishedEarly]);
}

/** Runs fixture work while the writer is paused, then settles the writer before returning. */
export async function withCatalogueWriteHold<T>(
  hold: { held: Promise<void>; resume: () => void },
  writer: Promise<number>,
  stderr: readonly string[],
  exercise: () => Promise<T>,
): Promise<{ value: T; writerCode: number }> {
  await waitForCatalogueWriteHold(hold.held, writer, stderr);
  let value: T;
  try {
    try {
      value = await exercise();
    } finally {
      hold.resume();
    }
  } catch (error) {
    // A rejected writer must not replace the error from the fixture work.
    await writer.catch(() => undefined);
    throw error;
  }
  return { value, writerCode: await writer };
}
