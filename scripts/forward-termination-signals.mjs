const TERMINATION_SIGNALS = ["SIGINT", "SIGTERM"];

export function forwardTerminationSignals(
  child,
  hostProcess = process,
  forceAfterMs = 10_000,
) {
  let forwardedSignal;
  let forceTimer;

  const handlers = new Map(
    TERMINATION_SIGNALS.map((signal) => [
      signal,
      () => {
        if (forwardedSignal) return;
        forwardedSignal = signal;
        if (child.exitCode == null && child.signalCode == null) {
          child.kill(signal);
          forceTimer = setTimeout(() => {
            if (child.exitCode == null && child.signalCode == null) {
              child.kill("SIGKILL");
            }
          }, forceAfterMs);
          forceTimer.unref?.();
        }
      },
    ]),
  );

  for (const [signal, handler] of handlers) hostProcess.on(signal, handler);

  return {
    forwardedSignal: () => forwardedSignal,
    cleanup() {
      if (forceTimer) clearTimeout(forceTimer);
      for (const [signal, handler] of handlers) {
        hostProcess.removeListener(signal, handler);
      }
    },
  };
}
