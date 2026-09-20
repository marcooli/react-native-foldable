import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { HingeProvider, useHinge, useHingeRegions, useHingeSnapshot, useFoldable, useDisplayFeatures, useFoldableScreen } from '../src/HingeProvider';
import type { FoldableScreenInfo } from '../src/screen';
import { createStore } from '../src/store';
import type { HingeSnapshot } from '../src/types';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
vi.mock('react-native', () => ({ View: ({ children }: { children: React.ReactNode }) => createElement('View', null, children) }));
vi.mock('../src/HingeNativeView', () => ({ default: () => null }));

describe('React hooks', () => {
  it('reacts to angle-only fallback transitions without changing native posture', async () => {
    const store = createStore();
    let latest: FoldableScreenInfo | undefined;
    let renders = 0;
    function Screen({ fallback }: { fallback: boolean }) {
      latest = useFoldableScreen({ heuristic: 'inward-folding-posture', closedAngleFallback: fallback });
      renders++;
      return null;
    }
    let root!: ReactTestRenderer;
    const tree = (fallback: boolean) => <HingeProvider controller={store}><Screen fallback={fallback} /></HingeProvider>;
    const event = { available: true, status: 'unknown', angleRadians: 0, reason: '', regions: [], features: [], layoutAvailable: true };
    await act(() => { root = create(tree(false)); store.update(event); });
    expect(latest?.screen).toBe('unknown');
    await act(() => { root.update(tree(true)); });
    expect(latest).toEqual({ screen: 'cover', source: 'heuristic' });
    const previousRenders = renders;
    await act(() => { store.update({ ...event, angleRadians: Math.PI / 180 }); });
    expect(renders).toBe(previousRenders);
    await act(() => { store.update({ ...event, angleRadians: Math.PI / 2 }); });
    expect(latest?.screen).toBe('unknown');
    await act(() => { store.update(event); });
    expect(latest?.screen).toBe('cover');
    expect(store.getFoldableSnapshot().posture).toBe('unknown');
    await act(() => { store.reset('background'); });
    expect(latest?.screen).toBe('unknown');
    await act(() => { root.unmount(); });
  });
  it('updates screen estimates with posture/options and clears them on background', async () => {
    const store = createStore();
    let latest: FoldableScreenInfo | undefined;
    let renders = 0;
    function Screen({ enabled }: { enabled: boolean }) {
      latest = useFoldableScreen(enabled ? { heuristic: 'inward-folding-posture' } : undefined);
      renders++;
      return null;
    }
    let root!: ReactTestRenderer;
    const tree = (enabled: boolean) => <HingeProvider controller={store}><Screen enabled={enabled} /></HingeProvider>;
    await act(() => { root = create(tree(false)); });
    const event = { available: true, status: 'closed', angleRadians: 0, reason: '', regions: [] };
    await act(() => { store.update(event); });
    expect(latest).toEqual({ screen: 'unknown', source: 'unavailable' });
    await act(() => { root.update(tree(true)); });
    expect(latest).toEqual({ screen: 'cover', source: 'heuristic' });
    await act(() => { store.update({ ...event, status: 'fullyOpen', angleRadians: Math.PI }); });
    expect(latest).toEqual({ screen: 'inner', source: 'heuristic' });
    const previousRenders = renders;
    await act(() => { store.update({ ...event, status: 'fullyOpen', angleRadians: 3 }); });
    expect(renders).toBe(previousRenders);
    await act(() => { root.update(tree(false)); });
    expect(latest).toEqual({ screen: 'unknown', source: 'unavailable' });
    await act(() => { root.update(tree(true)); store.reset('background'); });
    expect(latest).toEqual({ screen: 'unknown', source: 'unavailable' });
    await act(() => { root.unmount(); });
  });

  it('requires a provider for screen inference', () => {
    function Consumer() { useFoldableScreen(); return null; }
    expect(() => act(() => { create(<Consumer />); })).toThrow('inside a HingeProvider');
  });
  it('keeps feature consumers stable while foldable angle consumers update', async () => {
    const store = createStore();
    let angle: number | null = null;
    let featureRenders = 0;
    function Angle() { angle = useFoldable().angleDegrees; return null; }
    function Features() { useDisplayFeatures(); featureRenders++; return null; }
    let root!: ReactTestRenderer;
    await act(() => { root = create(<HingeProvider controller={store}><Angle /><Features /></HingeProvider>); });
    await act(() => { store.update({ available: true, status: 'unknown', angleRadians: Math.PI / 2, reason: '', layoutAvailable: true, regions: [], features: [] }); });
    expect(angle).toBe(90); expect(featureRenders).toBe(1);
    await act(() => { root.unmount(); });
    expect(store.getFoldableSnapshot().layoutReason).toBe('detached');
  });
  it('subscribes, keeps angle-only updates out of region consumers, and cleans up', async () => {
    const store = createStore();
    let latest: HingeSnapshot | undefined;
    let regionRenders = 0;
    function Info() { latest = useHingeSnapshot(); useHinge(); return null; }
    function Regions() { useHingeRegions(); regionRenders++; return null; }
    let root!: ReactTestRenderer;
    await act(() => { root = create(<HingeProvider controller={store}><Info /><Regions /></HingeProvider>); });
    expect(latest?.reason).toBe('initializing');
    await act(() => { store.update({ available: true, status: 'fullyOpen', angleRadians: Math.PI, reason: '', regions: [] }); });
    expect(latest?.hinge?.angleDegrees).toBe(180);
    expect(regionRenders).toBe(1);
    await act(() => { root.unmount(); });
    expect(store.getSnapshot().reason).toBe('detached');
  });

  it('requires a provider instead of silently reading another scene', async () => {
    function Consumer() { useHinge(); return null; }
    expect(() => act(() => { create(<Consumer />); })).toThrow('inside a HingeProvider');
  });
});
