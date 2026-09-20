export type HingeStatus = 'unknown' | 'closed' | 'partiallyOpen' | 'fullyOpen';

export type HingeInfo = Readonly<{
  status: HingeStatus;
  angleRadians: number;
  angleDegrees: number;
}>;

/** Coordinates in points relative to the HingeProvider's bounds; includes system margins. */
export type HingeRegion = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
}>;

export type HingeUnavailableReason =
  | 'initializing'
  | 'unavailable'
  | 'detached'
  | 'background'
  | 'unsupported-platform'
  | 'unsupported-os'
  | 'unsupported-sdk';

export type HingeSnapshot = Readonly<{
  hinge: HingeInfo | null;
  regions: readonly HingeRegion[];
  reason: HingeUnavailableReason | null;
}>;

/** Native transport shape. Angle is meaningful only when available is true. */
export type HingeNativeEvent = Readonly<{
  layoutAvailable?: boolean;
  layoutReason?: string;
  features?: readonly import('./foldable').NativeDisplayFeature[];
  available: boolean;
  status: string;
  angleRadians: number;
  reason: string;
  regions: readonly HingeRegion[];
}>;
