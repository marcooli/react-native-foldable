# Platform semantics and scope

`react-native-foldable` replaces the unpublished `react-native-ios-hinge` package.
Update imports and reinstall pods; the original hinge exports remain aliases.
The internal native observer/Codegen names retain their original names to avoid
unnecessary native churn. The example keeps its existing application identifier.

| Capability | iOS | Android |
| --- | --- | --- |
| Angle | View-associated UIHingeInteraction | Optional device hinge sensor, API 30+ |
| Posture | UIHinge status | FoldingFeature state, independent of sensor |
| Geometry | UIKit division regions, including system margins | WindowManager FoldingFeature bounds, converted to provider-local dp |
| Occlusion / separating | Unknown, not fabricated | Reported by WindowManager |
| Inactive regions | Optional UIKit query | Not supported; only currently reported features |
| Verified inner/cover identity | Not exposed by this adapter | Not exposed by this adapter |

Angles and features can be independently unavailable. Sensor existence does not
guarantee an immediate reading. An empty window feature list says nothing conclusive
about hardware. Native posture never infers closed from a zero angle or an absent
feature. The separate screen estimate can optionally use a near-zero angle (below).

An Android sensor is device-scoped even though its listener belongs to a provider.
Android layout belongs to the current React Activity; separate providers translate
its features into their local coordinates. The first implementation handles ordinary,
axis-aligned RN view hierarchies; do not apply scale/rotation transforms to the provider.
Android pre-draw checks update coordinates when an ancestor moves without resizing.
Missing activity, unavailable sensors, initialization and background states are explicit.

`getFoldablePanes` is a geometry utility, not a hardware classifier or complete
layout engine. It supports multiple full-span divisions, including zero-width folds.
It does not automatically pad partial obstacles, select a navigation layout, or
account for display cutouts and system bars. Combine it with the app's safe-area
handling and measured provider-local container rectangle. Input features should
come from `useDisplayFeatures()`; inactive iOS regions are excluded from this list.

## Screen identity and opt-in inference

`useFoldableScreen(options?)` reads the nearest provider's native posture and,
only for an explicitly enabled fallback, its angle availability and degrees.
`getFoldableScreen(snapshot, options?)` is its pure imperative equivalent; pass a
fresh `getFoldableSnapshot()` result, not a cached reading from before backgrounding.
Neither API currently detects a physical screen or supplies a native display ID.
The hook is provider-scoped, not an application-global active-screen query.

Without options (or with `{}`), the result is always
`{ screen: 'unknown', source: 'unavailable' }`. This means screen identity is not
available; it does not mean the hinge sensor or layout API is unavailable.

Explicit `{ heuristic: 'inward-folding-posture' }` enables this assumption:

| Native posture | Estimated screen | Source |
| --- | --- | --- |
| closed | cover | heuristic |
| halfOpened | inner | heuristic |
| flat | inner | heuristic |
| unknown | unknown | unavailable |

An additional `closedAngleFallback: true` changes only the unknown-posture row:
if `angleReason === null` and `angleDegrees` is finite and within [0, 5] inclusive,
return `cover / heuristic`. Otherwise return `unknown / unavailable`. The option
does nothing without `heuristic: 'inward-folding-posture'`. Known posture always
wins, even if the angle disagrees. Larger angles never imply inner screen, and
missing, negative, NaN, or infinite angles never imply cover. There is no hysteresis:
sensor noise around 5° may cause alternation. The threshold is an uncalibrated
assumption, not an Android/iOS specification. It does not change native posture.
The example enables both options and displays this limitation beside the label.

`FoldableScreenInfo` is a discriminated union: a known screen currently always
has source `heuristic`, never `native`. We intentionally do not expose an
`isInnerScreen` boolean that would conflate unknown with false. Results are readonly
and reference-stable while the classification is unchanged. The hook updates for
classification changes from posture, provider, or option changes, and from angle
threshold crossings when enabled; unchanged classifications do not trigger it.
Initialization, background, detach, and unsupported-platform snapshots
have unknown posture and therefore produce unknown screen identity.

Opting in asserts an app-specific assumption: a conventional inward-folding device,
using its cover when closed and its inner screen when open. The library does not
verify that assumption. Rear-display camera modes, simultaneous inner/cover usage,
connected monitors, outward-folding devices, and multi-fold hardware can violate it.
Do not use the estimate for privacy/security decisions or as proof of hardware.

iOS uses UIHinge status, which describes a hinge, not which physical panel presents
the scene. Android uses FoldingFeature posture, independent of the angle sensor;
an empty feature list leaves native posture unknown even at zero degrees. Android explicitly
notes that absent features can mean a cover screen, a small inner-screen window,
or an external display ([Android guidance](https://android-developers.googleblog.com/2023/06/detecting-if-device-is-foldable-tablet.html)).
Only the separately enabled angle fallback uses an angle threshold. No screen-size
breakpoint, simulator display number, or missing feature determines screen identity.
“Cover” is not synonymous with an external
monitor. For layouts, prefer measured window dimensions and native display features.

Initial scope: angle, posture, display features, pane geometry, opt-in screen inference, lifecycle-safe
subscriptions, and explicit platform fallbacks. Not included: physical device-model
detection, dual-screen activity launching, scene arrangements, sensor synthesis,
Reanimated worklets, screen-size breakpoint policies, or audio/instrument features.

## Development checks

```sh
npm ci --ignore-scripts
npm run check
npm run codegen:android
npm pack --dry-run
```

For Android native compilation, generate the example with
`cd example && npx expo prebuild --platform android --no-install`, then build with
the example's Gradle wrapper. Android SDK and a compatible Java runtime are required.
Both platform adapters are experimental until foldable-device testing is complete.
