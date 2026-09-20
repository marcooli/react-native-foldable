import { StyleSheet } from 'react-native';
import HingeObserver from './specs/HingeObserverNativeComponent';
import type { ObserverProps } from './HingeNativeView';

export default function HingeNativeView({ includeInactiveRegions, onChange }: ObserverProps) {
  return <HingeObserver
    style={StyleSheet.absoluteFill}
    pointerEvents="none"
    accessible={false}
    accessibilityElementsHidden
    includeInactiveRegions={includeInactiveRegions}
    onHingeChange={event => onChange({ ...event.nativeEvent, features: undefined })}
  />;
}
