/**
 * Shown while a lazily-loaded route chunk is being fetched and executed.
 *
 * Previously this was `null`, which rendered nothing at all — on a cold start
 * in the native WebView that reads as a white screen, because parsing and
 * running a route chunk is not instant even when it is cached locally.
 */
export const RouteFallback = () => (
  <div className="flex min-h-[100dvh] items-center justify-center bg-background">
    <div
      className="h-9 w-9 animate-spin rounded-full border-[3px] border-t-transparent"
      style={{ borderColor: "hsl(var(--duo-border))", borderTopColor: "transparent" }}
      role="status"
      aria-label="Loading"
    />
  </div>
);
