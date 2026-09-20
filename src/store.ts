import type { HingeInfo, HingeNativeEvent, HingeRegion, HingeSnapshot, HingeStatus, HingeUnavailableReason } from './types';
import { initialFoldableSnapshot, normalizeFoldable, type FoldableSnapshot } from './foldable';

const emptyRegions: readonly HingeRegion[] = Object.freeze([]);
export const initialSnapshot: HingeSnapshot = Object.freeze({ hinge: null, regions: emptyRegions, reason: 'initializing' });

export interface HingeController {
  getFoldableSnapshot(): FoldableSnapshot;
  /** Cached snapshot for this provider, including initialization/availability. */
  getSnapshot(): HingeSnapshot;
  getHinge(): HingeInfo | null;
  /** Snapshot changes, including reserved-region-only changes. */
  subscribe(listener: () => void): () => void;
  /** Future hinge changes. Use getHinge() for the current value. */
  addHingeListener(listener: (hinge: HingeInfo | null) => void): () => void;
}

export interface HingeStore extends HingeController {
  update(event: HingeNativeEvent): void;
  reset(reason?: HingeUnavailableReason): void;
  attach(): () => void;
}

const stores = new WeakMap<HingeController, HingeStore>();
const statuses = new Set<HingeStatus>(['unknown', 'closed', 'partiallyOpen', 'fullyOpen']);
const reasons = new Set<HingeUnavailableReason>(['initializing', 'unavailable', 'detached', 'background', 'unsupported-platform', 'unsupported-os', 'unsupported-sdk']);

function sameRegions(a: readonly HingeRegion[], b: readonly HingeRegion[]) {
  return a.length === b.length && a.every((region, index) => {
    const other = b[index]!;
    return region.x === other.x && region.y === other.y && region.width === other.width && region.height === other.height && region.isActive === other.isActive;
  });
}

export function createStore(): HingeStore {
  let snapshot = initialSnapshot;
  let foldable = initialFoldableSnapshot;
  let attached = false;
  let attachmentVersion = 0;
  const listeners = new Set<() => void>();
  const publish = (next: HingeSnapshot, nextFoldable: FoldableSnapshot) => {
    const featureEqual = JSON.stringify(nextFoldable.displayFeatures) === JSON.stringify(foldable.displayFeatures);
    if (featureEqual) nextFoldable = Object.freeze({ ...nextFoldable, displayFeatures: foldable.displayFeatures });
    const foldableEqual = featureEqual && nextFoldable.angleRadians === foldable.angleRadians && nextFoldable.angleReason === foldable.angleReason && nextFoldable.posture === foldable.posture && nextFoldable.layoutReason === foldable.layoutReason;
    if (snapshot.hinge === next.hinge && snapshot.regions === next.regions && snapshot.reason === next.reason && foldableEqual) return;
    if (!foldableEqual) foldable = nextFoldable;
    snapshot = Object.freeze(next);
    for (const listener of [...listeners]) listener();
  };
  const store: HingeStore = {
    getFoldableSnapshot: () => foldable,
    getSnapshot: () => snapshot,
    getHinge: () => snapshot.hinge,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    addHingeListener(listener) {
      let previous = snapshot.hinge;
      return store.subscribe(() => {
        if (snapshot.hinge !== previous) {
          previous = snapshot.hinge;
          listener(previous);
        }
      });
    },
    update(event) {
      const available = event.available && Number.isFinite(event.angleRadians);
      const status: HingeStatus = statuses.has(event.status as HingeStatus) ? event.status as HingeStatus : 'unknown';
      let hinge: HingeInfo | null = available ? Object.freeze({ status, angleRadians: event.angleRadians, angleDegrees: event.angleRadians * 180 / Math.PI }) : null;
      if (hinge && snapshot.hinge?.status === hinge.status && snapshot.hinge.angleRadians === hinge.angleRadians) hinge = snapshot.hinge;
      const validRegions = event.regions.filter(r => [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width >= 0 && r.height >= 0);
      const regions = sameRegions(snapshot.regions, validRegions) ? snapshot.regions : Object.freeze(validRegions.map(r => Object.freeze({ ...r })));
      const reason = available ? null : reasons.has(event.reason as HingeUnavailableReason) ? event.reason as HingeUnavailableReason : 'unavailable';
      publish({ hinge, regions, reason }, normalizeFoldable(event, reason));
    },
    reset(reason = 'detached') { publish({ hinge: null, regions: emptyRegions, reason }, Object.freeze({ ...initialFoldableSnapshot, angleReason: reason, layoutReason: reason })); },
    attach() {
      if (attached) throw new Error('A HingeController can only belong to one mounted HingeProvider. Create a controller per provider.');
      attached = true;
      const version = ++attachmentVersion;
      return () => {
        attached = false;
        // React StrictMode replays effects without remounting the native view.
        // Preserve its reading if the same controller is immediately reattached.
        queueMicrotask(() => {
          if (!attached && version === attachmentVersion) store.reset();
        });
      };
    },
  };
  stores.set(store, store);
  return store;
}

/** Optional imperative access. Never share a controller across mounted providers/scenes. */
export function createHingeController(): HingeController { return createStore(); }

export function getStore(controller: HingeController): HingeStore {
  const store = stores.get(controller);
  if (!store) throw new Error('Use createHingeController() to create a HingeController.');
  return store;
}
