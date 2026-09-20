import { useEffect } from 'react';
import type { HingeNativeEvent } from './types';

export interface ObserverProps {
  includeInactiveRegions: boolean;
  onChange(event: HingeNativeEvent): void;
}

/** Metro selects platform adapters on iOS/Android; other platforms stay native-free. */
export default function HingeNativeView({ onChange }: ObserverProps) {
  useEffect(() => {
    onChange({ available: false, status: 'unknown', angleRadians: 0, reason: 'unsupported-platform', regions: [] });
  }, [onChange]);
  return null;
}
