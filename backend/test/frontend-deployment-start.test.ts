import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { forwardTerminationSignals } from "../../scripts/forward-termination-signals.mjs";

describe("frontend deployment process supervision", () => {
  it.each(["SIGTERM", "SIGINT"] as const)(
    "forwards %s once and removes handlers after child exit",
    (signal) => {
      const host = new EventEmitter();
      const child = Object.assign(new EventEmitter(), {
        exitCode: null as number | null,
        signalCode: null as NodeJS.Signals | null,
        kill: vi.fn().mockReturnValue(true),
      });
      const forwarding = forwardTerminationSignals(child, host, 60_000);

      host.emit(signal);
      host.emit(signal);
      expect(child.kill).toHaveBeenCalledOnce();
      expect(child.kill).toHaveBeenCalledWith(signal);
      expect(forwarding.forwardedSignal()).toBe(signal);

      child.exitCode = 0;
      forwarding.cleanup();
      expect(host.listenerCount("SIGTERM")).toBe(0);
      expect(host.listenerCount("SIGINT")).toBe(0);
    },
  );

  it("force-stops a child that exceeds the shutdown bound", async () => {
    vi.useFakeTimers();
    try {
      const host = new EventEmitter();
      const child = Object.assign(new EventEmitter(), {
        exitCode: null as number | null,
        signalCode: null as NodeJS.Signals | null,
        kill: vi.fn().mockReturnValue(true),
      });
      const forwarding = forwardTerminationSignals(child, host, 100);

      host.emit("SIGTERM");
      await vi.advanceTimersByTimeAsync(100);
      expect(child.kill.mock.calls).toEqual([["SIGTERM"], ["SIGKILL"]]);
      forwarding.cleanup();
    } finally {
      vi.useRealTimers();
    }
  });
});
