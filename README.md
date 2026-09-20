# react-native-foldable

Experimental foldable-device utilities for React Native Fabric on iOS and Android:
hinge angle, native posture, display features, and fold-aware pane geometry.
Each provider observes its own view/window; angle and layout availability are independent.

## iPhone Duo demo

[Watch the iPhone Duo example — Foldable Lab (MP4, 6.9 MB)](media/iphone-duo-demo.mp4)

Screen recording of the example app on iPhone Duo. Screen identity labels marked
`heuristic` are estimates, not verified native screen identity.

## Current state

**Experimental alpha (`0.1.0-alpha.0`). Source is available on GitHub; this project
has not been published to npm. APIs may change before a stable release.**

| Capability | iOS | Android |
| --- | --- | --- |
| Hinge angle | UIHingeInteraction on iOS 27.1+ | Optional hinge sensor on API 30+ |
| Native posture | Closed, partially open, fully open | Half-open / flat when WindowManager reports a fold |
| Fold geometry | UIKit division regions with system margins | WindowManager features in provider-local dp |
| Inner/cover estimate | Opt-in heuristic only | Opt-in heuristic; optional near-zero-angle fallback |
| Render on both screens at once | Not implemented | Not implemented |

Local validation includes 55 automated tests, native Debug builds on both platforms,
and simulator/emulator smoke checks. **No physical-device validation has been
completed.** Sensor accuracy, full lifecycle/rotation/multi-window coverage, and
performance remain unverified. See [validation details](docs/VALIDATION.md).

## Foldable utilities

```tsx
import { Text } from 'react-native';
import { FoldableProvider, useFoldable } from 'react-native-foldable';

function Content() {
  const { angleDegrees, posture, angleReason } = useFoldable();
  return <Text>{posture} · {angleDegrees === null ? angleReason : `${angleDegrees}°`}</Text>;
}

export default function App() {
  return <FoldableProvider><Content /></FoldableProvider>;
}
```

- `useFoldable()` exposes independently nullable angles, posture, `displayFeatures`,
  `angleReason`, and `layoutReason`.
- `useDisplayFeatures()` subscribes to geometry/posture changes without angle-only rerenders.
- `useFoldablePosture()` returns `unknown`, `closed`, `halfOpened`, or `flat`.
- `getFoldableLayoutMode(features)` returns `tabletop`, `book`, or `unknown` from
  native half-open separating folds; it does not guess from hinge angles.
- `getFoldablePanes(container, features)` returns `{ panes, obstacles }`. Full-span
  separating folds and iOS division margins split the rectangle; partial obstacles
  must still be avoided by the caller. Zero-width separating folds split panes too.
- `createFoldableController()` and `useFoldableController()` provide imperative
  access, including `getFoldableSnapshot()` and `subscribe()`.

All geometry uses provider-local logical units (iOS points / Android dp). Measure
the container in that same coordinate space. Window size is not a hardware test:
use React Native's `useWindowDimensions()` for general responsive UI.

An empty feature list does **not** prove that a device cannot fold. `null` layout
reason means observation is available, not that a feature exists. iOS division
regions include system interaction margins and have unknown occlusion/separation
semantics; Android reports those properties directly. See [platform semantics](docs/FOLDABLE.md).

## Inner vs cover screen (experimental inference)

**Neither native adapter currently exposes verified inner/cover screen identity.**
`useFoldableScreen()` therefore returns `{ screen: 'unknown', source: 'unavailable' }`
by default, even when the hinge posture is known. It requires a `FoldableProvider`.
“Cover” means the phone's outer screen, not a connected external monitor.

```tsx
import { useFoldableScreen } from 'react-native-foldable';

// Inside a FoldableProvider:
const verifiedOnly = useFoldableScreen(); // currently always unknown / unavailable

// Optional guess ONLY for a known inward-folding device in ordinary single-screen use:
const estimate = useFoldableScreen({ heuristic: 'inward-folding-posture' });
// closed -> cover; halfOpened / flat -> inner; unknown -> unknown
// A guess has source: 'heuristic', NEVER native verification.

// Separately opt in to a near-zero-angle fallback (enabled in the example):
const withAngleFallback = useFoldableScreen({
  heuristic: 'inward-folding-posture',
  closedAngleFallback: true,
});
// Unknown posture + available angle in [0, 5] degrees -> cover / heuristic.
```

The current result is either `inner | cover` with `source: 'heuristic'`, or
`unknown` with `source: 'unavailable'`. No current result has `source: 'native'`.
The hook rerenders when its classification changes, including angle-threshold
crossings if the fallback is enabled. Options can change at runtime.
For imperative use: `getFoldableScreen(controller.getFoldableSnapshot(), options)`.

**Do not use this estimate as a hardware test or to control sensitive content.**
It can be wrong for rear-display/camera-preview modes, dual-screen use, external
monitors, outward-folding or multi-fold devices. We do not detect those modes or
verify the device model. Screen dimensions and absent folding features are never
used to guess a cover screen. Android may report no posture on the cover screen:
the posture-only heuristic stays `unknown`. The separate `closedAngleFallback`
option guesses `cover` only with an available, finite angle between 0° and 5°
(inclusive). It requires the posture heuristic to be enabled, never overrides known
posture, and never infers `inner` from larger angles. Missing or invalid angles
remain `unknown`. This threshold is an uncalibrated demo assumption, not a platform
guarantee; sensor noise near 5° can make the label alternate. Native posture is unchanged.
Prefer window dimensions and `useDisplayFeatures()` for responsive layouts.
See [screen inference details](docs/FOLDABLE.md#screen-identity-and-opt-in-inference).

## Requirements and status

- Tested baseline: React Native 0.86.3 (New Architecture), React 19.2.3,
  Expo 57. Peer dependencies allow later versions; those are not yet validated.
- iOS 27.1 SDK / Xcode 27.1 to compile the hinge implementation.
- Deployment target iOS 16.4 or later. iOS below 27.1 returns `unsupported-os`.
- Older SDK builds compile a fallback returning `unsupported-sdk`.
- Android uses Jetpack WindowManager 1.5.1 for layout and `TYPE_HINGE_ANGLE`
  on API 30+ when present. The native library targets API 24+ (the consuming RN
  version may require a higher minimum). Older Android can still report layout.
- Web and other platforms safely return `unsupported-platform`.
- This is a GitHub source alpha, not an npm release or production-ready SDK.

## Install

Clone and pack the source, then install the tarball in your consuming app:

```sh
git clone https://github.com/marcooli/react-native-foldable.git
cd react-native-foldable
nvm use
npm ci --ignore-scripts
npm pack
```

From your app directory, run `npm install /path/to/react-native-foldable/react-native-foldable-0.1.0-alpha.0.tgz`.
The pack step builds JavaScript and declarations. Direct Git URL installation is
not the documented installation path; generated `lib/` files are not committed.

Run `pod install` in the consuming app's iOS directory and rebuild. Native code
requires an Expo development build; Expo Go cannot load this component.
Autolinking is sufficient: no config plugin or permission prompt is required by
this library. Use Xcode 27.1 for both pod installation and the build. The consuming
app must adopt the UIKit scene lifecycle: iOS 27 rejects apps built with the new
SDK that still create their sole window in AppDelegate. The Expo example includes
`plugins/withSceneLifecycle.js`, which configures Expo's `ExpoAppSceneDelegate`
and leaves window creation to it. This is app setup, not a hinge permission.

```tsx
import { Text } from 'react-native';
import { HingeProvider, useHinge, useHingeRegions } from 'react-native-foldable';

function Readout() {
  const hinge = useHinge();
  const regions = useHingeRegions();
  return <Text>{hinge ? `${hinge.status}: ${hinge.angleDegrees}°` : 'No reading'}</Text>;
}

export default function App() {
  return <HingeProvider><Readout /></HingeProvider>;
}
```

Mount one provider for each coordinate space you need to observe. It creates a
`View` with `flex: 1` and a non-interactive, inaccessible native observer filling
its bounds. Keep padding and borders on child views. Frames are points from the
provider's top-left, not screen coordinates; translate them before applying to a
nested child with a different origin. System region frames already include
interaction margins. Do not add those margins a second time.

## Hinge compatibility API

The original hinge exports remain available. New integrations should prefer
`FoldableProvider` and `useFoldable()`: Android posture may be available without
an angle, while the legacy `useHinge()` is angle-dependent. Its Android `status`
is `unknown`; read the independently reported posture from `useFoldable()`.

- `useHinge()` → `{ status, angleRadians, angleDegrees } | null`.
- `useHingeRegions()` → read-only division-region rectangles
  `{ x, y, width, height, isActive }[]`.
- `useHingeSnapshot()` → `{ hinge, regions, reason }`.
- `useHingeController()` → the nearest provider's imperative controller.
- `createHingeController()` → a controller you may pass as `<HingeProvider controller={controller}>`.
- `includeInactiveRegions` on the provider defaults to `false`. Inactive regions
  can have zero width and are preserved when requested.

Statuses are `unknown`, `closed`, `partiallyOpen`, and `fullyOpen`. They come from
UIKit, never angle thresholds. `null` means no available reading in this hierarchy,
not a closed hinge or a definitive assertion about the device's hardware.

The snapshot reason is `null` for an available reading, otherwise `initializing`,
`unavailable`, `detached`, `background`, `unsupported-platform`, `unsupported-os`,
or `unsupported-sdk`. Regions are independently useful and need not imply a live
hinge reading. For adaptive layouts, use regions and live window dimensions;
use hinge angles for interactions and effects.

```ts
const controller = createHingeController(); // keep stable, outside render or in useState
// Mount <HingeProvider controller={controller}> in the correct scene first.
const current = controller.getHinge(); // cached; null before the initial native event
const remove = controller.addHingeListener(hinge => console.log(hinge?.angleDegrees));
const removeSnapshotListener = controller.subscribe(() => console.log(controller.getSnapshot()));
remove();
removeSnapshotListener();
```

Listeners receive future changes, not an immediate initial callback. `subscribe`
includes region/availability changes; `addHingeListener` excludes region-only changes.
A controller may belong to only one mounted provider. Unmount clears cached data.
Hooks outside a provider throw an actionable error. Missing iOS native linking is
a build/integration error, not silently treated as unsupported hardware.

The iOS native observer samples while attached and foreground-visible at a requested
30 fps, coalesces hinge readings, and sends only changed snapshots to JS. It also
queries regions each tick to catch coordinate changes that don't resize the view.
Apple controls the actual sensor cadence and precision. This is not a guarantee
of 30 sensor readings per second and is not a Reanimated/worklet binding. Inactive
but visible scenes continue observing; background scenes stop and clear readings.

## Example and development

```sh
nvm use # or use another Node version satisfying package.json
npm install
npm run check
npm run prebuild --workspace hinge-example
cd example/ios
pod install
cd ../..
npm run ios --workspace hinge-example
```

For Android, with an emulator running and the Android SDK/JDK configured:

```sh
npm run android --workspace hinge-example
```

The example is named **Foldable Lab** in the UI (native project: HingeLab). It
shows angle, native posture, geometry availability, and a clearly labeled screen
estimate. It enables both `inward-folding-posture` and `closedAngleFallback` for
demonstration; library consumers receive `unknown` unless they opt in.
On Android, “Posture not reported” may legitimately appear on the cover screen.
The screen estimate can still say “Cover · heuristic”; these are different signals.

Metro watches the parent library source. If you change Metro configuration or see
a newly added export reported as undefined, restart with
`npm run start --workspace hinge-example -- --clear` and reload the app.

If Xcode is installed outside the selected command-line path, set `DEVELOPER_DIR`
to its `Contents/Developer` directory before running native commands. The example
uses an Expo development client, a live angle meter, an overlay for reserved
regions, and a CTA displaced using region geometry. Use Device Hub to exercise
closed, partially open, fully open, rotated, and split-view configurations.

`npm run check` typechecks, tests subscription behavior and hooks, builds JS and
declarations, and runs React Native Codegen. Generated code is excluded from the
package because it must match the consuming app's React Native version.

## Architecture and references

`HingeProvider → Fabric observer → UIHingeInteraction + UIView reserved regions`.
A component is used instead of an application-global TurboModule because the
layout APIs belong to a view/window; Fabric events carry typed snapshots to the
provider store. Android combines SensorManager events with WindowManager callbacks,
converts window pixels to provider-local dp, and unregisters observers in background
or on detach. Imperative callers use the same store.

- [Apple UIHinge](https://developer.apple.com/documentation/uikit/uihinge)
- [Apple UIHingeInteraction](https://developer.apple.com/documentation/uikit/uihingeinteraction)
- [Apple adaptive layouts talk](https://developer.apple.com/videos/play/tech-talks/111463/)
- [React Native Fabric iOS components](https://reactnative.dev/docs/fabric-native-components-ios)
- [Android fold-aware apps](https://developer.android.com/develop/adaptive-apps/guides/foldables/make-your-app-fold-aware)
- [Android hinge sensor](https://developer.android.com/reference/android/hardware/Sensor#TYPE_HINGE_ANGLE)

The implementation was checked against the actual Xcode 27.1 SDK headers:
`UIHinge.h`, `UIHingeInteraction.h`, `UIViewReservedRegion.h`, and `UIView.h`.
Scene accessories, native arrangement containers, and
Reanimated integration are outside this first release.

## Contributing and license

Bug reports and pull requests are welcome. Include OS/SDK, React Native and device
versions, whether the issue occurs on hardware or a simulator, and a minimal
reproduction. Run `npm run check` and `npm run codegen:android` before submitting.
CI checks TypeScript, tests, builds, Codegen and package contents; it does not run
native builds or validate physical devices. No automated publishing is configured.

Licensed under [MIT](LICENSE).
