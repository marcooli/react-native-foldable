import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type HingeChangeEvent = Readonly<{
  available: boolean;
  status: string;
  angleRadians: Double;
  reason: string;
  layoutAvailable: boolean;
  layoutReason: string;
  features: {
    x: Double;
    y: Double;
    width: Double;
    height: Double;
    orientation: string;
    state: string;
    isSeparating: boolean;
    occlusion: string;
  }[];
  regions: {
    x: Double;
    y: Double;
    width: Double;
    height: Double;
    isActive: boolean;
  }[];
}>;

export interface NativeProps extends ViewProps {
  includeInactiveRegions?: WithDefault<boolean, false>;
  onHingeChange?: DirectEventHandler<HingeChangeEvent>;
}

export default codegenNativeComponent<NativeProps>('RNIOSHingeObserver');
