import type { HingeNativeEvent, HingeUnavailableReason } from './types';

export type FoldableRect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type FoldablePosture = 'unknown' | 'closed' | 'halfOpened' | 'flat';
export type DisplayFeature = Readonly<{
  bounds: FoldableRect;
  kind: 'fold' | 'division';
  orientation: 'horizontal' | 'vertical' | 'unknown';
  state: 'unknown' | 'halfOpened' | 'flat';
  isSeparating: boolean | null;
  occlusion: 'unknown' | 'none' | 'full';
  includesSystemMargins: boolean;
}>;
export type FoldableSnapshot = Readonly<{
  angleDegrees: number | null;
  angleRadians: number | null;
  angleReason: HingeUnavailableReason | null;
  /** Native posture, never angle thresholds. */
  posture: FoldablePosture;
  displayFeatures: readonly DisplayFeature[];
  /** null means observation is available, not that the device can fold. */
  layoutReason: HingeUnavailableReason | null;
}>;
export type NativeDisplayFeature = FoldableRect & Readonly<{
  orientation: string; state: string; isSeparating: boolean; occlusion: string;
}>;
const validRect = (r: FoldableRect) => [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width >= 0 && r.height >= 0;
const reasons = new Set(['initializing', 'unavailable', 'detached', 'background', 'unsupported-platform', 'unsupported-os', 'unsupported-sdk']);

export function normalizeFoldable(event: HingeNativeEvent, angleReason: HingeUnavailableReason | null): FoldableSnapshot {
  const angle = event.available && Number.isFinite(event.angleRadians) ? event.angleRadians : null;
  const features: DisplayFeature[] = event.features !== undefined
    ? event.features.filter(validRect).map(f => ({
      bounds: { x: f.x, y: f.y, width: f.width, height: f.height }, kind: 'fold',
      orientation: f.orientation === 'horizontal' || f.orientation === 'vertical' ? f.orientation : 'unknown',
      state: f.state === 'flat' || f.state === 'halfOpened' ? f.state : 'unknown',
      isSeparating: f.isSeparating, occlusion: f.occlusion === 'none' || f.occlusion === 'full' ? f.occlusion : 'unknown',
      includesSystemMargins: false,
    }))
    : event.regions.filter(r => r.isActive && validRect(r)).map(r => ({
      bounds: { x: r.x, y: r.y, width: r.width, height: r.height }, kind: 'division',
      orientation: r.height > r.width ? 'vertical' : r.width > r.height ? 'horizontal' : 'unknown',
      state: 'unknown', isSeparating: null, occlusion: 'unknown', includesSystemMargins: true,
    }));
  let posture: FoldablePosture = 'unknown';
  if (event.features !== undefined) {
    if (features.some(f => f.state === 'halfOpened')) posture = 'halfOpened';
    else if (features.length && features.every(f => f.state === 'flat')) posture = 'flat';
  } else if (angle !== null) {
    posture = event.status === 'closed' ? 'closed' : event.status === 'partiallyOpen' ? 'halfOpened' : event.status === 'fullyOpen' ? 'flat' : 'unknown';
  }
  return Object.freeze({ angleRadians: angle, angleDegrees: angle === null ? null : angle * 180 / Math.PI,
    angleReason, posture, displayFeatures: Object.freeze(features.map(f => Object.freeze({ ...f, bounds: Object.freeze(f.bounds) }))),
    layoutReason: event.layoutAvailable ? null : reasons.has(event.layoutReason ?? '') ? event.layoutReason as HingeUnavailableReason : (angleReason ?? 'unavailable'),
  });
}
export const initialFoldableSnapshot = normalizeFoldable({ available: false, status: 'unknown', angleRadians: 0, reason: 'initializing', regions: [] }, 'initializing');

/** Only native half-open folds with known orientation qualify. */
export function getFoldableLayoutMode(features: readonly DisplayFeature[]): 'tabletop' | 'book' | 'unknown' {
  const folds = features.filter(f => f.state === 'halfOpened' && f.isSeparating);
  if (!folds.length || folds.some(f => f.orientation !== folds[0]!.orientation)) return 'unknown';
  return folds[0]!.orientation === 'horizontal' ? 'tabletop' : folds[0]!.orientation === 'vertical' ? 'book' : 'unknown';
}

/** Split around full-span features. Partial obstacles remain in `obstacles` for callers to avoid. */
export function getFoldablePanes(container: FoldableRect, features: readonly DisplayFeature[]) {
  if (!validRect(container)) throw new Error('Container must have finite coordinates and non-negative dimensions.');
  let panes: FoldableRect[] = [container];
  const obstacles: FoldableRect[] = [];
  for (const feature of features) {
    if (!validRect(feature.bounds) || !(feature.kind === 'division' || feature.isSeparating || feature.occlusion === 'full')) continue;
    const r = feature.bounds;
    const cx = Math.max(container.x, r.x), cy = Math.max(container.y, r.y);
    const right = Math.min(container.x + container.width, r.x + r.width), bottom = Math.min(container.y + container.height, r.y + r.height);
    if (right < cx || bottom < cy) continue;
    const obstacle = { x: cx, y: cy, width: right - cx, height: bottom - cy };
    if (obstacle.width > 0 && obstacle.height > 0) obstacles.push(obstacle);
    panes = panes.flatMap(p => {
      if (feature.orientation === 'vertical' && r.y <= p.y && r.y + r.height >= p.y + p.height && r.x < p.x + p.width && r.x + r.width > p.x) {
        return [ { x: p.x, y: p.y, width: Math.max(0, r.x - p.x), height: p.height },
          { x: Math.max(p.x, r.x + r.width), y: p.y, width: Math.max(0, p.x + p.width - r.x - r.width), height: p.height } ];
      }
      if (feature.orientation === 'horizontal' && r.x <= p.x && r.x + r.width >= p.x + p.width && r.y < p.y + p.height && r.y + r.height > p.y) {
        return [ { x: p.x, y: p.y, width: p.width, height: Math.max(0, r.y - p.y) },
          { x: p.x, y: Math.max(p.y, r.y + r.height), width: p.width, height: Math.max(0, p.y + p.height - r.y - r.height) } ];
      }
      return [p];
    }).filter(p => p.width > 0 && p.height > 0);
  }
  return { panes, obstacles };
}
