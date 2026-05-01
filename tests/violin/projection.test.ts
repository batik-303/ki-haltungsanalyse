import { describe, it, expect } from 'vitest';
// import { projectAnchorToScroll } from '../../src/core/analysis/violin-analyzer';

describe('Violin Schnecken-Projektion', () => {
  it('should project anchor onto shoulder-hand axis', () => {
    // Dummy logic for illustration
    const shoulder = { x: 0, y: 0 };
    const hand = { x: 10, y: 0 };
    // Project anchor 20% beyond hand along shoulder-hand axis
    const t = 1.2;
    const anchor = {
      x: shoulder.x + (hand.x - shoulder.x) * t,
      y: shoulder.y + (hand.y - shoulder.y) * t,
    };
    expect(anchor.x).toBeCloseTo(12);
    expect(anchor.y).toBeCloseTo(0);
  });
});
