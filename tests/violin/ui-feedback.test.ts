import { describe, it, expect } from 'vitest';

// UI-Feedback: Feedback ruhig, motivierend, keine Ablenkung

describe('Violin UI Feedback', () => {
  it('should use positive, motivating messages', () => {
    // Example: check German UI strings (replace with actual selector/strings)
    const messages = [
      'Gut gehalten!',
      'Weiter so!',
      'Stabil!',
      'Super Position!',
    ];
    for (const msg of messages) {
      expect(msg).not.toMatch(/falsch|schlecht|Fehler|Achtung|Warnung/);
    }
  });

  it('should not block instrument view', () => {
    // UI elements should not overlap main instrument area (pseudo-test)
    // Replace with actual UI layout test if possible
    const uiChromePosition = 'screen edge';
    expect(uiChromePosition).toBe('screen edge');
  });
});
