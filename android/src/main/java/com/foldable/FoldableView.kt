package com.foldable

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.view.View
import android.view.ViewTreeObserver
import androidx.core.content.ContextCompat
import androidx.core.util.Consumer
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.WritableMap
import com.facebook.react.common.LifecycleState
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event

class FoldableView(private val reactContext: ThemedReactContext) : View(reactContext), LifecycleEventListener, SensorEventListener, ViewTreeObserver.OnPreDrawListener {
  private val sensors = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  private val tracker = WindowInfoTrackerCallbackAdapter(WindowInfoTracker.getOrCreate(context))
  private var running = false
  private var disposed = false
  private var angle: Double? = null
  private var angleReason = "initializing"
  private var layoutReason = "initializing"
  private var features: List<FoldingFeature> = emptyList()
  private var previous: String? = null
  private val location = IntArray(2)
  private val callback = Consumer<WindowLayoutInfo> { info ->
    if (running) { features = info.displayFeatures.filterIsInstance<FoldingFeature>(); layoutReason = ""; emit() }
  }
  init {
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    isClickable = false
    reactContext.addLifecycleEventListener(this)
  }
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    viewTreeObserver.addOnPreDrawListener(this)
    if (reactContext.lifecycleState == LifecycleState.RESUMED) start()
  }
  override fun onDetachedFromWindow() {
    viewTreeObserver.removeOnPreDrawListener(this)
    stop("detached")
    super.onDetachedFromWindow()
  }
  override fun onHostResume() { if (isAttachedToWindow) start() }
  override fun onHostPause() = stop("background")
  override fun onHostDestroy() = stop("detached")
  override fun onPreDraw(): Boolean { if (running) emit(); return true }
  private fun start() {
    if (running || disposed) return
    running = true
    previous = null
    angleReason = "initializing"
    layoutReason = "initializing"
    val sensor = if (Build.VERSION.SDK_INT >= 30) sensors.getDefaultSensor(Sensor.TYPE_HINGE_ANGLE) else null
    if (sensor == null) angleReason = if (Build.VERSION.SDK_INT < 30) "unsupported-os" else "unavailable"
    else try { if (!sensors.registerListener(this, sensor, SensorManager.SENSOR_DELAY_UI)) angleReason = "unavailable" }
    catch (_: RuntimeException) { angleReason = "unavailable" }
    val activity = reactContext.currentActivity
    if (activity == null) layoutReason = "unavailable"
    else try { tracker.addWindowLayoutInfoListener(activity, ContextCompat.getMainExecutor(context), callback) }
    catch (_: RuntimeException) { layoutReason = "unavailable" }
    emit()
  }
  private fun stop(reason: String) {
    running = false
    sensors.unregisterListener(this)
    tracker.removeWindowLayoutInfoListener(callback)
    angle = null; features = emptyList(); angleReason = reason; layoutReason = reason
    emit()
  }
  fun dispose() {
    stop("detached"); disposed = true
    if (viewTreeObserver.isAlive) viewTreeObserver.removeOnPreDrawListener(this)
    reactContext.removeLifecycleEventListener(this)
  }
  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
  override fun onSensorChanged(event: SensorEvent) {
    if (!running) return
    val value = event.values.firstOrNull()?.toDouble()
    angle = value?.takeIf { it.isFinite() }?.let { Math.toRadians(it) }
    angleReason = if (angle == null) "unavailable" else ""
    emit()
  }
  private fun emit() {
    if (id == NO_ID || disposed) return
    getLocationInWindow(location)
    val density = resources.displayMetrics.density.toDouble()
    val nativeFeatures = Arguments.createArray()
    val regions = Arguments.createArray()
    for (feature in features) {
      val bounds = feature.bounds
      val x = (bounds.left - location[0]) / density
      val y = (bounds.top - location[1]) / density
      val w = bounds.width() / density
      val h = bounds.height() / density
      if (x > width / density || y > height / density || x + w < 0 || y + h < 0) continue
      nativeFeatures.pushMap(Arguments.createMap().apply {
        putDouble("x", x); putDouble("y", y); putDouble("width", w); putDouble("height", h)
        putString("orientation", when (feature.orientation) {
          FoldingFeature.Orientation.HORIZONTAL -> "horizontal"
          FoldingFeature.Orientation.VERTICAL -> "vertical"
          else -> "unknown"
        })
        putString("state", when (feature.state) {
          FoldingFeature.State.HALF_OPENED -> "halfOpened"
          FoldingFeature.State.FLAT -> "flat"
          else -> "unknown"
        })
        putBoolean("isSeparating", feature.isSeparating)
        putString("occlusion", when (feature.occlusionType) {
          FoldingFeature.OcclusionType.FULL -> "full"
          FoldingFeature.OcclusionType.NONE -> "none"
          else -> "unknown"
        })
      })
      if (feature.isSeparating || feature.occlusionType == FoldingFeature.OcclusionType.FULL) regions.pushMap(Arguments.createMap().apply {
        putDouble("x", x); putDouble("y", y); putDouble("width", w); putDouble("height", h); putBoolean("isActive", true)
      })
    }
    val payload = Arguments.createMap().apply {
      putBoolean("available", angle != null); putDouble("angleRadians", angle ?: 0.0)
      // Android posture and angle have independent availability; use useFoldable().
      putString("status", "unknown"); putString("reason", angleReason)
      putBoolean("layoutAvailable", layoutReason.isEmpty()); putString("layoutReason", layoutReason)
      putArray("features", nativeFeatures); putArray("regions", regions)
    }
    val signature = payload.toString()
    if (signature == previous) return
    val dispatcher = UIManagerHelper.getEventDispatcher(reactContext) ?: return
    previous = signature
    dispatcher.dispatchEvent(FoldableEvent(UIManagerHelper.getSurfaceId(reactContext), id, payload))
  }
}

private class FoldableEvent(surfaceId: Int, viewId: Int, private val payload: WritableMap) : Event<FoldableEvent>(surfaceId, viewId) {
  override fun getEventName() = "topHingeChange"
  override fun getEventData() = payload
}
