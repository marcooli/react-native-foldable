import { useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { FoldableProvider, useHingeRegions, useFoldable, useFoldableScreen } from 'react-native-foldable';
import { platformCopy, postureLabel, screenLabel } from './presentation';

function Readings() {
  const foldable = useFoldable();
  // Demonstrate the opt-in estimate; never present this as native screen identity.
  const screen = useFoldableScreen({ heuristic: 'inward-folding-posture', closedAngleFallback: true });
  const regions = useHingeRegions();
  const copy = platformCopy(Platform.OS);
  return <View style={styles.readings}>
    <Text testID="platform-label" style={styles.eyebrow}>{copy.eyebrow}</Text>
    <Text testID="hinge-angle" style={styles.angle}>{foldable.angleDegrees === null ? '—' : `${foldable.angleDegrees.toFixed(1)}°`}</Text>
    <Text testID="hinge-status" style={styles.status}>{postureLabel(foldable.posture)}</Text>
    <Text testID="foldable-screen" style={styles.screen}>{screenLabel(screen)}</Text>
    <Text testID="screen-explanation" style={styles.detail}>Inward-folding estimate, not verified screen identity. If posture is unknown, a 0–5° hinge angle estimates Cover.</Text>
    {foldable.posture === 'unknown' && <Text testID="posture-explanation" style={styles.detail}>No posture is reported for this view. The hinge angle alone does not determine posture.</Text>}
    <Text testID="foldable-posture" style={styles.detail}>Posture: {foldable.posture} · Layout: {foldable.layoutReason ?? 'available'} · Features: {foldable.displayFeatures.length}</Text>
    <Text style={styles.detail}>{foldable.angleRadians === null ? `Angle: ${foldable.angleReason ?? 'unavailable'}` : `${foldable.angleRadians.toFixed(4)} radians`}</Text>
    <Text testID="hinge-region-count" style={styles.detail}>{regions.length} {copy.regions}{regions.length === 1 ? '' : 's'}</Text>
    <Text testID="platform-help" style={styles.help}>{copy.help}</Text>
  </View>;
}

function RegionOverlay() {
  const regions = useHingeRegions();
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {regions.map((r, i) => <View key={i} style={[styles.region, {
      left: r.x, top: r.y, width: Math.max(1, r.width), height: Math.max(1, r.height),
      borderStyle: r.isActive ? 'solid' : 'dashed',
    }]} />)}
  </View>;
}

function FoldSafeButton() {
  const regions = useHingeRegions();
  const [size, setSize] = useState({ width: 0, height: 0 });
  // This absolute canvas shares the provider's origin. A control is displaced only
  // when its whole rect fits on one side of an actual active division region.
  const width = 180;
  const height = 48;
  let x = Math.max(0, (size.width - width) / 2);
  let y = Math.max(0, size.height - height - 28);
  const overlaps = (r: typeof regions[number]) => r.isActive && x < r.x + r.width && x + width > r.x && y < r.y + r.height && y + height > r.y;
  for (const region of regions) {
    if (!overlaps(region)) continue;
    if (region.height >= region.width) {
      if (region.x >= width + 16) x = (region.x - width) / 2;
      else if (size.width - region.x - region.width >= width + 16) x = region.x + region.width + (size.width - region.x - region.width - width) / 2;
    } else if (region.y >= height + 16) {
      y = region.y - height - 8;
    } else if (size.height - region.y - region.height >= height + 16) {
      y = region.y + region.height + 8;
    }
  }
  const fits = size.width >= width && size.height >= height && !regions.some(overlaps);
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={e => setSize(e.nativeEvent.layout)}>
    {fits && <Pressable style={[styles.button, { left: x, top: y, width, height }]} accessibilityRole="button" onPress={() => {}}>
      <Text style={styles.buttonText}>Clear of the fold</Text>
    </Pressable>}
  </View>;
}

export default function App() {
  const [inactive, setInactive] = useState(false);
  return <SafeAreaProvider><SafeAreaView style={styles.root} edges={['top', 'right', 'bottom', 'left']}>
    <StatusBar barStyle="light-content" />
    <View style={styles.header}><Text testID="example-title" style={styles.title}>Foldable Lab</Text>{Platform.OS === 'ios' && <View style={styles.toggle}>
      <Text style={styles.detail}>Inactive regions</Text><Switch testID="inactive-regions-toggle" value={inactive} onValueChange={setInactive} />
    </View>}</View>
    <FoldableProvider includeInactiveRegions={inactive} style={styles.canvas}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}><Readings /></ScrollView>
      <FoldSafeButton /><RegionOverlay />
    </FoldableProvider>
  </SafeAreaView></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111820' },
  header: { padding: 24, gap: 16 },
  title: { color: '#f0f5fa', fontSize: 30, fontWeight: '700' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  canvas: { margin: 16, backgroundColor: '#1a2530', borderRadius: 20, overflow: 'hidden' },
  scroll: { flex: 1, marginBottom: 96 },
  scrollContent: { flexGrow: 1 },
  readings: { padding: 24, gap: 12 },
  eyebrow: { color: '#82dac4', fontSize: 11, letterSpacing: 1 },
  angle: { color: '#ffffff', fontSize: 64, fontWeight: '300' },
  status: { color: '#82dac4', fontSize: 22 },
  screen: { color: '#ffb773', fontSize: 16, fontWeight: '600' },
  detail: { color: '#bac8d5', fontSize: 14 },
  help: { color: '#9eafbf', lineHeight: 22, marginTop: 16 },
  region: { position: 'absolute', borderColor: '#ffb773', borderWidth: 1, backgroundColor: '#ffb77322' },
  button: { position: 'absolute', borderRadius: 24, backgroundColor: '#82dac4', justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#111820', fontWeight: '600' },
});
