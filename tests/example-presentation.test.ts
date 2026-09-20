import { describe, expect, it } from 'vitest';
import { platformCopy, postureLabel, screenLabel } from '../example/presentation';

describe('example presentation', () => {
  it('distinguishes screen estimates from unavailable identity', () => {
    expect(screenLabel({ screen: 'inner', source: 'heuristic' })).toBe('Screen: Inner · heuristic');
    expect(screenLabel({ screen: 'cover', source: 'heuristic' })).toBe('Screen: Cover · heuristic');
    expect(screenLabel({ screen: 'unknown', source: 'unavailable' })).toBe('Screen: Unknown · unavailable');
  });
  it('labels native posture without deriving it from a sensor angle', () => {
    expect(postureLabel('flat')).toBe('Fully opened');
    expect(postureLabel('halfOpened')).toBe('Partially opened');
    expect(postureLabel('closed')).toBe('Closed');
    expect(postureLabel('unknown')).toBe('Posture not reported');
  });
  it('does not show iOS instructions on Android', () => {
    const copy = platformCopy('android');
    expect(copy.eyebrow).toContain('ANDROID');
    expect(copy.help).toContain('WindowManager');
    expect(JSON.stringify(copy)).not.toMatch(/UIKit|Device Hub|IPHONE/);
    expect(platformCopy('ios').help).toContain('UIKit');
    expect(platformCopy('web').help).toContain('not available');
  });
});
