import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/store';
import { getFoldableLayoutMode, getFoldablePanes, type DisplayFeature } from '../src/foldable';
import type { HingeNativeEvent } from '../src/types';

const android: HingeNativeEvent = { available: false, status: 'unknown', angleRadians: 0, reason: 'unavailable', regions: [], layoutAvailable: true,
  features: [{ x: 400, y: 0, width: 0, height: 600, state: 'halfOpened', orientation: 'vertical', isSeparating: true, occlusion: 'none' }] };
const feature = (overrides: Partial<DisplayFeature> = {}): DisplayFeature => ({
  kind: 'fold', bounds: { x: 400, y: 0, width: 20, height: 600 }, orientation: 'vertical', state: 'halfOpened', isSeparating: true, occlusion: 'none', includesSystemMargins: false, ...overrides,
});
describe('foldable snapshots', () => {
  it('keeps layout and posture when the angle sensor is missing', () => {
    const store = createStore(); store.update(android);
    expect(store.getHinge()).toBeNull();
    expect(store.getFoldableSnapshot()).toMatchObject({ angleDegrees: null, angleReason: 'unavailable', layoutReason: null, posture: 'halfOpened' });
    expect(getFoldableLayoutMode(store.getFoldableSnapshot().displayFeatures)).toBe('book');
  });
  it('does not infer closed posture or hardware absence from an empty layout', () => {
    const store = createStore(); store.update({ ...android, features: [], available: true, angleRadians: 0 });
    expect(store.getFoldableSnapshot()).toMatchObject({ angleDegrees: 0, angleReason: null, posture: 'unknown', displayFeatures: [] });
  });
  it('keeps features stable during angle-only updates and notifies posture-only updates', () => {
    const store = createStore(); store.update(android);
    const features = store.getFoldableSnapshot().displayFeatures;
    store.update({ ...android, available: true, angleRadians: 1 });
    expect(store.getFoldableSnapshot().displayFeatures).toBe(features);
    const listener = vi.fn(); store.subscribe(listener);
    store.update({ ...android, available: true, angleRadians: 1, features: android.features!.map(f => ({ ...f, state: 'flat' })) });
    expect(listener).toHaveBeenCalledOnce();
    expect(store.getFoldableSnapshot().posture).toBe('flat');
  });
  it('preserves iOS margins without inventing Android occlusion semantics', () => {
    const store = createStore(); store.update({ ...android, features: undefined, available: true, status: 'partiallyOpen', angleRadians: 1,
      regions: [{ x: 400, y: 0, width: 30, height: 600, isActive: true }] });
    expect(store.getFoldableSnapshot().posture).toBe('halfOpened');
    expect(store.getFoldableSnapshot().displayFeatures[0]).toMatchObject({ kind: 'division', includesSystemMargins: true, isSeparating: null, occlusion: 'unknown', state: 'unknown' });
  });
  it('clears both capabilities on background and isolates controllers', () => {
    const store = createStore(); store.update(android); store.reset('background');
    expect(store.getFoldableSnapshot()).toMatchObject({ angleReason: 'background', layoutReason: 'background', posture: 'unknown', displayFeatures: [] });
    expect(createStore().getFoldableSnapshot().angleReason).toBe('initializing');
  });
});
describe('foldable layout utilities', () => {
  const rect = { x: 0, y: 0, width: 800, height: 600 };
  it('splits around vertical margins and zero-width separating folds', () => {
    expect(getFoldablePanes(rect, [feature()]).panes).toEqual([
      { x: 0, y: 0, width: 400, height: 600 }, { x: 420, y: 0, width: 380, height: 600 },
    ]);
    expect(getFoldablePanes(rect, [feature({ bounds: { x: 400, y: 0, width: 0, height: 600 } })]).panes.map(p => p.width)).toEqual([400, 400]);
  });
  it('handles horizontal folds and multiple hinges without spanning their gaps', () => {
    const horizontal = feature({ bounds: { x: 0, y: 300, width: 800, height: 0 }, orientation: 'horizontal' });
    expect(getFoldableLayoutMode([horizontal])).toBe('tabletop');
    expect(getFoldablePanes(rect, [feature(), horizontal]).panes).toHaveLength(4);
    expect(getFoldableLayoutMode([feature(), horizontal])).toBe('unknown');
  });
  it('keeps partial obstacles explicit, ignores nonseparating creases, and clips exterior margins', () => {
    expect(getFoldablePanes(rect, [feature({ isSeparating: false })]).panes).toEqual([rect]);
    const partial = getFoldablePanes(rect, [feature({ bounds: { x: 20, y: 20, width: 10, height: 30 } })]);
    expect(partial.panes).toEqual([rect]); expect(partial.obstacles).toHaveLength(1);
    expect(getFoldablePanes(rect, [feature({ bounds: { x: -10, y: 0, width: 30, height: 600 } })]).panes).toEqual([{ x: 20, y: 0, width: 780, height: 600 }]);
  });
  it('rejects malformed containers and ignores invalid feature geometry', () => {
    expect(() => getFoldablePanes({ ...rect, width: NaN }, [])).toThrow();
    expect(getFoldablePanes(rect, [feature({ bounds: { ...rect, width: -1 } })]).panes).toEqual([rect]);
  });
});
