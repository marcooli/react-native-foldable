import { createContext, useContext, useLayoutEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import HingeNativeView from './HingeNativeView';
import { initialFoldableSnapshot } from './foldable';
import { getFoldableScreen, type FoldableScreenOptions } from './screen';
import { createStore, getStore, initialSnapshot, type HingeController, type HingeStore } from './store';

const Context = createContext<HingeStore | null>(null);

export type HingeProviderProps = PropsWithChildren<{
  controller?: HingeController;
  includeInactiveRegions?: boolean;
  /** Use a padding-free provider; place padding on a child to preserve region coordinates. */
  style?: StyleProp<ViewStyle>;
}>;

export function HingeProvider({ children, controller, includeInactiveRegions = false, style }: HingeProviderProps) {
  const [ownedStore] = useState(createStore);
  const store = controller ? getStore(controller) : ownedStore;
  useLayoutEffect(() => store.attach(), [store]);
  return <Context.Provider value={store}>
    <View style={[{ flex: 1 }, style]} collapsable={false}>
      {children}
      <HingeNativeView includeInactiveRegions={includeInactiveRegions} onChange={store.update} />
    </View>
  </Context.Provider>;
}

function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error('Hinge hooks must be used inside a HingeProvider.');
  return store;
}

export function useHingeSnapshot() {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => initialSnapshot);
}

export function useHinge() {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getHinge, () => null);
}

export function useHingeRegions() {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => store.getSnapshot().regions, () => initialSnapshot.regions);
}

export function useHingeController(): HingeController { return useStore(); }

export function useFoldable() {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getFoldableSnapshot, () => initialFoldableSnapshot);
}

export function useDisplayFeatures() {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => store.getFoldableSnapshot().displayFeatures, () => initialFoldableSnapshot.displayFeatures);
}

export function useFoldablePosture() {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => store.getFoldableSnapshot().posture, () => initialFoldableSnapshot.posture);
}

/** Unknown by default. Opt-in posture/angle inference is not verified screen identity. */
export function useFoldableScreen(options?: FoldableScreenOptions) {
  const store = useStore();
  return useSyncExternalStore(store.subscribe,
    () => getFoldableScreen(store.getFoldableSnapshot(), options),
    () => getFoldableScreen(initialFoldableSnapshot, options));
}
