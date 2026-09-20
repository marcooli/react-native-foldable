import type { FoldablePosture, FoldableScreenInfo } from 'react-native-foldable';

export function screenLabel(info: FoldableScreenInfo): string {
  if (info.source === 'unavailable') return 'Screen: Unknown · unavailable';
  return `Screen: ${info.screen === 'inner' ? 'Inner' : 'Cover'} · heuristic`;
}

export function postureLabel(posture: FoldablePosture): string {
  switch (posture) {
    case 'flat': return 'Fully opened';
    case 'halfOpened': return 'Partially opened';
    case 'closed': return 'Closed';
    default: return 'Posture not reported';
  }
}

export function platformCopy(platform: string) {
  if (platform === 'android') return {
    eyebrow: 'ANDROID · LIVE NATIVE DATA',
    help: 'Fold or rotate the Android emulator using its foldable controls. Outlined regions come from Android WindowManager; the hinge angle is reported separately by the sensor.',
    regions: 'separating or occluding region',
  };
  if (platform === 'ios') return {
    eyebrow: 'IOS · LIVE NATIVE DATA',
    help: 'Fold or rotate the simulator in Device Hub. Outlined division regions come from UIKit and include its interaction margins.',
    regions: 'division region',
  };
  return { eyebrow: 'FOLDABLE · DIAGNOSTICS', help: 'Native foldable observation is not available on this platform.', regions: 'region' };
}
