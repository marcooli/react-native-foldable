# Release validation

## Foldable-library results — 2026-09-20

- Renamed to `react-native-foldable`; added Android angle/layout observation and shared posture/pane utilities.
- Passed: TypeScript, **55 tests**, JS/declaration build, iOS and Android Fabric
  Codegen, Android native adapter Kotlin compilation, CocoaPods autolinking,
  the full iOS Debug simulator build with Xcode 27.1, and the full Android
  Debug example build (arm64-v8a), including Fabric autolinking.
- Package dry-run passed; both native adapters and declarations are included,
  while generated builds, dependencies, and removed audio samples are excluded.
- The iOS full build covers arm64 and x86_64 simulator architectures.
- Runtime smoke checks: iOS example displayed 0°/closed on the outer display and
  180°/fully opened on the inner display. Android emulator displayed flat posture
  when open and unknown posture with no features at 0° on the cover display.
  The opt-in angle fallback was visually verified as `Cover · heuristic` on Android.
  Safe-area integration and the new screen label were checked in the running examples.
- Screen inference tests cover defaults, both opt-ins, angle boundaries, invalid and
  unavailable readings, posture precedence, subscription updates and background reset.
- Full fold-transition/rotation coverage, sensor accuracy, Android lifecycle behavior,
  nested-provider coordinate changes, and physical-device validation remain outstanding.
  These smoke checks are not a complete device or production-readiness certification.
- GitHub source distribution only; no npm publish or production-readiness claim.

## Historical iOS-only results — 2026-09-19

- Xcode **27.1, build 27A9269**, iOS Simulator SDK **27.1**.
- React Native **0.86.3**, React **19.2.3**, Expo **57.0.24**, Node **22.23.2**.
- Passed: TypeScript (library, example, tests), **9 tests**, JS/declaration build,
  Fabric Codegen, CocoaPods autolinking, full Debug simulator native build,
  installation on the booted iPhone Duo, launch of the corrected scene-based app
  into Expo's development launcher, and Metro bundling of the iOS example.
- Not yet verified: live native readings, folding, rotation, scene transitions,
  or physical-device behavior. The simulator reached the system **Open in Hinge
  Lab?** prompt; macOS was locked, preventing Device Hub interaction. The older
  idb accessibility interface reads the outer display, so it could not identify
  controls on the active inner display. A successful compile is not a live API test.
- The first RN 0.79.5 example hit a dependency compiler error in fmt with this
  Xcode version. The example and supported peer baseline were moved to Expo 57's
  RN 0.86.3. No patches to third-party dependency source are required.
- The local example resolves this repository's source directly in Metro to avoid
  a root-pointing npm workspace symlink error. Consumers install the normal package.
- A launch log identified iOS 27's required scene lifecycle. The example includes
  an idempotent Expo config plugin selecting `EXExpoAppSceneDelegate` and making
  AppDelegate provide the React Native factory without creating a global window.

This alpha must not be described as device-validated until the following native
checks have actually been completed. JavaScript tests do not establish that
sensor events arrive or that regions match physical hardware.

## Automated checks

- `npm run check`: TypeScript, store/hook tests, JS build, Fabric Codegen.
- `npm run codegen:android`: Android Fabric contract generation.
- `npm pack --dry-run`: source, iOS code, podspec, built JS, and declarations included.
- Generate and build the example with Xcode 27.1; retain the exact SDK/RN versions.

## Simulator/device matrix

- Initial reading on a hinge-capable hierarchy; initial unavailable reading on an ordinary iPhone.
- Closed / partially open / fully open / unknown status; no angle-derived status.
- Fold, rotate, resize, and use Split View; compare overlay with UIKit's reserved regions.
- Include inactive regions; preserve a zero-width inactive division.
- Provider below a header and inside a modal; ensure local coordinates and scene isolation.
- Two scenes/controllers; confirm updates do not cross-contaminate.
- Background/foreground, visible inactive scene, unmount/remount, reload and Fabric recycling.
- Confirm observer neither intercepts touches nor appears in accessibility navigation.
- Run older iOS deployment and an older-SDK build for explicit fallback reasons.
- Measure JS event cadence and idle native overhead; validate on physical Duo hardware.
- Android: feature/posture data with no angle sensor; angle sensor with no window feature.
- Android: flat / half-open folds, horizontal / vertical orientation, full occlusion,
  zero-width folds, nested providers, Activity recreation, background/foreground, and multi-window.
- Android: confirm modal/secondary-window behavior before advertising support for those hierarchies.

## Before publishing

Verify the intended package name and owner, replace provisional metadata as needed,
add the repository URL, decide the tested RN support range, record native results,
and then release an alpha deliberately. CI checks JavaScript/Codegen; it does not
claim to test iOS hardware. No npm publishing or automated release is configured.
