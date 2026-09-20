import type { FoldableSnapshot } from './foldable';

export type FoldableScreen = 'inner' | 'cover' | 'unknown';
export type FoldableScreenInfo =
  | Readonly<{ screen: 'unknown'; source: 'unavailable' }>
  | Readonly<{ screen: 'inner' | 'cover'; source: 'heuristic' }>;
export type FoldableScreenOptions = Readonly<{
  /** Opt-in assumption, NOT native screen detection. Invalid for rear/dual-screen modes. */
  heuristic?: 'inward-folding-posture';
  /** With the posture heuristic enabled, guess cover at 0–5° if posture is unknown. */
  closedAngleFallback?: boolean;
}>;

const unknown: FoldableScreenInfo = Object.freeze({ screen: 'unknown', source: 'unavailable' });
const inner: FoldableScreenInfo = Object.freeze({ screen: 'inner', source: 'heuristic' });
const cover: FoldableScreenInfo = Object.freeze({ screen: 'cover', source: 'heuristic' });

/** Neither native adapter currently reports screen identity. Default is always unknown. */
export function getFoldableScreen(
  snapshot: Pick<FoldableSnapshot, 'posture'> & Partial<Pick<FoldableSnapshot, 'angleDegrees' | 'angleReason'>>,
  options: FoldableScreenOptions = {},
): FoldableScreenInfo {
  if (options.heuristic !== 'inward-folding-posture') return unknown;
  switch (snapshot.posture) {
    case 'closed': return cover;
    case 'halfOpened':
    case 'flat': return inner;
    default: {
      const angle = snapshot.angleDegrees;
      return options.closedAngleFallback === true && snapshot.angleReason === null &&
        typeof angle === 'number' && Number.isFinite(angle) && angle >= 0 && angle <= 5
        ? cover : unknown;
    }
  }
}
