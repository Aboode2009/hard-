/**
 * Runs async work one piece at a time, in call order.
 *
 * Task completion reads `challenge_progress`, edits it in memory, and writes it
 * back. Two taps in quick succession both read the *old* row before either
 * write lands, so the second write overwrites the first: a task the user just
 * checked silently un-checks itself, and its points vanish with it. Users read
 * that as the app freezing or losing their work.
 *
 * Serializing the whole read-modify-write makes the second tap read what the
 * first one wrote. The UI is already updated optimistically before any of this
 * runs, so queueing costs the user nothing on screen.
 *
 * A rejected job does not break the chain — the next one still runs.
 */
export function createSerializer() {
  let tail: Promise<unknown> = Promise.resolve();

  return function run<T>(job: () => Promise<T>): Promise<T> {
    // Both handlers are the job itself: it must run whether the previous one
    // resolved or threw.
    const result = tail.then(job, job);
    tail = result.catch(() => {});
    return result;
  };
}
