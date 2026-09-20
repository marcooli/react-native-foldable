package com.foldable

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.RNIOSHingeObserverManagerDelegate
import com.facebook.react.viewmanagers.RNIOSHingeObserverManagerInterface

class FoldableViewManager : SimpleViewManager<FoldableView>(), RNIOSHingeObserverManagerInterface<FoldableView> {
  private val delegate = RNIOSHingeObserverManagerDelegate(this)
  override fun getDelegate(): ViewManagerDelegate<FoldableView> = delegate
  override fun getName() = "RNIOSHingeObserver"
  override fun createViewInstance(context: ThemedReactContext) = FoldableView(context)
  @ReactProp(name = "includeInactiveRegions", defaultBoolean = false)
  override fun setIncludeInactiveRegions(view: FoldableView, value: Boolean) { /* Android only reports current features. */ }
  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> = mutableMapOf(
    "topHingeChange" to mapOf("registrationName" to "onHingeChange")
  )
  override fun onDropViewInstance(view: FoldableView) { view.dispose(); super.onDropViewInstance(view) }
}
