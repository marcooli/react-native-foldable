import { describe, expect, it } from 'vitest';
import { getFoldableScreen } from '../src/screen';
import { createStore } from '../src/store';

const options = { heuristic: 'inward-folding-posture' } as const;
const unknown = { screen: 'unknown', source: 'unavailable' };

describe('screen inference', () => {
  it.each([0, 0.1, 5])('estimates cover at %s degrees only with both opt-ins', angleDegrees => {
    const snapshot = { posture: 'unknown', angleDegrees, angleReason: null } as const;
    expect(getFoldableScreen(snapshot)).toEqual(unknown);
    expect(getFoldableScreen(snapshot, options)).toEqual(unknown);
    expect(getFoldableScreen(snapshot, { closedAngleFallback: true })).toEqual(unknown);
    expect(getFoldableScreen(snapshot, { ...options, closedAngleFallback: true }))
      .toEqual({ screen: 'cover', source: 'heuristic' });
  });
  it.each([null, undefined, NaN, Infinity, -Infinity, -1, 5.001, 90, 180])('keeps invalid or non-closed angle %s unknown', angleDegrees => {
    expect(getFoldableScreen({ posture: 'unknown', angleDegrees, angleReason: null },
      { ...options, closedAngleFallback: true })).toEqual(unknown);
  });
  it('requires available angle data and never overrides known posture', () => {
    const fallback = { ...options, closedAngleFallback: true };
    expect(getFoldableScreen({ posture: 'unknown', angleDegrees: 0, angleReason: 'background' }, fallback)).toEqual(unknown);
    expect(getFoldableScreen({ posture: 'unknown', angleDegrees: 0 }, fallback)).toEqual(unknown);
    expect(getFoldableScreen({ posture: 'flat', angleDegrees: 0, angleReason: null }, fallback)).toEqual({ screen: 'inner', source: 'heuristic' });
    expect(getFoldableScreen({ posture: 'closed', angleDegrees: 180, angleReason: null }, fallback)).toEqual({ screen: 'cover', source: 'heuristic' });
  });
  it.each(['closed', 'halfOpened', 'flat', 'unknown'] as const)('does not guess %s by default', posture => {
    expect(getFoldableScreen({ posture })).toEqual(unknown);
    expect(getFoldableScreen({ posture }, {})).toEqual(unknown);
  });
  it.each([
    ['closed', 'cover', 'heuristic'], ['halfOpened', 'inner', 'heuristic'],
    ['flat', 'inner', 'heuristic'], ['unknown', 'unknown', 'unavailable'],
  ] as const)('explicitly labels the %s estimate', (posture, screen, source) => {
    expect(getFoldableScreen({ posture }, options)).toEqual({ screen, source });
  });
  it('does not turn an Android zero angle and empty features into cover identity', () => {
    const store = createStore();
    store.update({ available: true, status: 'unknown', angleRadians: 0, reason: '', regions: [], features: [], layoutAvailable: true });
    expect(getFoldableScreen(store.getFoldableSnapshot(), options)).toEqual(unknown);
  });
  it.each(['initializing', 'background', 'detached', 'unsupported-platform', 'unsupported-os', 'unsupported-sdk', 'unavailable'] as const)(
    'keeps %s snapshots unknown', reason => {
      const store = createStore();
      store.reset(reason);
      expect(getFoldableScreen(store.getFoldableSnapshot(), options)).toEqual(unknown);
    },
  );
  it('returns frozen, stable results', () => {
    const result = getFoldableScreen({ posture: 'halfOpened' }, options);
    expect(result).toBe(getFoldableScreen({ posture: 'flat' }, options));
    expect(Object.isFrozen(result)).toBe(true);
  });
});
