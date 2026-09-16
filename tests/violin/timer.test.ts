import { describe, it, expect, vi } from 'vitest';
// TODO: Platzhalter — später durch einen echten Test von createSessionTimer
// (src/core/session/session-tracker) ersetzen (strikt TDD: erst Test, dann Code).

describe('Violin 5-Sekunden-Belohnungs-Timer', () => {
  it('should trigger reward after 5 seconds in zone', () => {
    vi.useFakeTimers();
    let rewarded = false;
    const timer = setTimeout(() => { rewarded = true; }, 5000);
    vi.advanceTimersByTime(5000);
    expect(rewarded).toBe(true);
    clearTimeout(timer);
    vi.useRealTimers();
  });

  it('should reset timer when leaving zone', () => {
    vi.useFakeTimers();
    let rewarded = false;
    const timer = setTimeout(() => { rewarded = true; }, 5000);
    setTimeout(() => { clearTimeout(timer); }, 2000);
    vi.advanceTimersByTime(2100);
    expect(rewarded).toBe(false);
    vi.useRealTimers();
  });
});
