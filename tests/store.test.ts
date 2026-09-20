import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/store';
import type { HingeNativeEvent } from '../src/types';

const reading = (overrides: Partial<HingeNativeEvent> = {}): HingeNativeEvent => ({
  available: true, status: 'partiallyOpen', angleRadians: Math.PI / 2, reason: '', regions: [], ...overrides,
});

describe('scene-scoped hinge store', () => {
  it('distinguishes initialization, unavailable, and a closed hinge', () => {
    const store = createStore();
    expect(store.getSnapshot().reason).toBe('initializing');
    store.update(reading({ available: false, reason: 'unavailable' }));
    expect(store.getHinge()).toBeNull();
    expect(store.getSnapshot().reason).toBe('unavailable');
    store.update(reading({ status: 'closed', angleRadians: 0 }));
    expect(store.getHinge()).toEqual({ status: 'closed', angleRadians: 0, angleDegrees: 0 });
    expect(store.getSnapshot().reason).toBeNull();
  });

  it('converts radians without rounding or inventing status from the angle', () => {
    const store = createStore();
    store.update(reading({ status: 'unknown' }));
    expect(store.getHinge()).toEqual({ status: 'unknown', angleRadians: Math.PI / 2, angleDegrees: 90 });
    store.update(reading({ status: 'future-native-enum' }));
    expect(store.getHinge()?.status).toBe('unknown');
  });

  it('deduplicates native readings and keeps region-only changes out of hinge listeners', () => {
    const store = createStore();
    const hingeListener = vi.fn();
    const listener = vi.fn();
    const unsubscribe = store.addHingeListener(hingeListener);
    store.subscribe(listener);
    store.update(reading());
    const first = store.getSnapshot();
    store.update(reading());
    expect(store.getSnapshot()).toBe(first);
    store.update(reading({ regions: [{ x: 50, y: 0, width: 12, height: 300, isActive: true }] }));
    expect(store.getHinge()).toBe(first.hinge);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(hingeListener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.update(reading({ angleRadians: Math.PI }));
    expect(hingeListener).toHaveBeenCalledTimes(1);
  });

  it('clears stale data on detachment and isolates separate scenes', async () => {
    const a = createStore();
    const b = createStore();
    const detach = a.attach();
    a.update(reading());
    expect(b.getHinge()).toBeNull();
    expect(() => a.attach()).toThrow('one mounted HingeProvider');
    detach();
    await Promise.resolve();
    expect(a.getSnapshot()).toEqual({ hinge: null, regions: [], reason: 'detached' });
    expect(() => a.attach()).not.toThrow();
  });

  it('preserves a reading during StrictMode effect replay', async () => {
    const store = createStore();
    const detach = store.attach();
    store.update(reading());
    detach();
    const detachAgain = store.attach();
    await Promise.resolve();
    expect(store.getHinge()?.angleDegrees).toBe(90);
    detachAgain();
    await Promise.resolve();
    expect(store.getHinge()).toBeNull();
  });

  it('preserves inactive zero-width regions and filters invalid geometry', () => {
    const store = createStore();
    store.update(reading({ regions: [
      { x: 100, y: 0, width: 0, height: 200, isActive: false },
      { x: NaN, y: 0, width: 10, height: 200, isActive: true },
    ] }));
    expect(store.getSnapshot().regions).toEqual([{ x: 100, y: 0, width: 0, height: 200, isActive: false }]);
    store.update(reading({ angleRadians: NaN }));
    expect(store.getHinge()).toBeNull();
    expect(store.getSnapshot().reason).toBe('unavailable');
  });
});
