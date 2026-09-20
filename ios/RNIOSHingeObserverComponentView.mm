#import "RNIOSHingeObserverComponentView.h"
#import <QuartzCore/QuartzCore.h>
#import <react/renderer/components/RNIOSHingeSpec/ComponentDescriptors.h>
#import <react/renderer/components/RNIOSHingeSpec/EventEmitters.h>
#import <react/renderer/components/RNIOSHingeSpec/Props.h>
#import <react/renderer/components/RNIOSHingeSpec/RCTComponentViewHelpers.h>

// Runtime availability alone cannot compile a reference absent from an older SDK.
#if __has_include(<UIKit/UIHingeInteraction.h>) && __has_include(<UIKit/UIViewReservedRegion.h>)
#import <UIKit/UIHingeInteraction.h>
#import <UIKit/UIViewReservedRegion.h>
#define RN_HINGE_HAS_SDK 1
#else
#define RN_HINGE_HAS_SDK 0
#endif

using namespace facebook::react;

@interface RNIOSHingeObserverComponentView () <RCTRNIOSHingeObserverViewProtocol>
- (void)sample;
@end

// CADisplayLink retains its target; using a weak proxy lets an abandoned view deallocate.
@interface RNIOSHingeDisplayLinkTarget : NSObject
@property(nonatomic, weak) RNIOSHingeObserverComponentView *view;
- (void)tick:(CADisplayLink *)link;
@end

@implementation RNIOSHingeDisplayLinkTarget
- (void)tick:(CADisplayLink *)link { [self.view sample]; }
@end

@implementation RNIOSHingeObserverComponentView {
  id<UIInteraction> _hingeInteraction;
  CADisplayLink *_displayLink;
  NSDictionary *_lastPayload;
  BOOL _available;
  BOOL _includeInactiveRegions;
  double _angleRadians;
  NSString *_status;
  NSString *_reason;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNIOSHingeObserverComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if ((self = [super initWithFrame:frame])) {
    _props = std::make_shared<const RNIOSHingeObserverProps>();
    _status = @"unknown";
    _reason = @"initializing";
    self.userInteractionEnabled = NO;
    self.accessibilityElementsHidden = YES;
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(sceneChanged:)
                                                name:UISceneDidEnterBackgroundNotification object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(sceneChanged:)
                                                name:UISceneWillEnterForegroundNotification object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(sceneChanged:)
                                                name:UISceneDidActivateNotification object:nil];
  }
  return self;
}

- (void)dealloc
{
  [_displayLink invalidate];
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)clearReading:(NSString *)reason
{
  _available = NO;
  _angleRadians = 0;
  _status = @"unknown";
  _reason = reason;
}

- (void)stopObserving
{
  [_displayLink invalidate];
  _displayLink = nil;
  if (_hingeInteraction) {
    // Clear identity first, ignoring a possible final callback from removal.
    id<UIInteraction> interaction = _hingeInteraction;
    _hingeInteraction = nil;
    [self removeInteraction:interaction];
  }
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [self restartObserving];
}

- (void)sceneChanged:(NSNotification *)notification
{
  if (notification.object != self.window.windowScene) return;
  // Foreground notification can arrive before activationState has changed.
  __weak RNIOSHingeObserverComponentView *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{ [weakSelf restartObserving]; });
}

- (void)restartObserving
{
  [self stopObserving];
  if (!self.window) {
    [self clearReading:@"detached"];
    [self sample];
    return;
  }
  if (self.window.windowScene.activationState == UISceneActivationStateBackground) {
    [self clearReading:@"background"];
    [self sample];
    return;
  }
#if RN_HINGE_HAS_SDK
  if (@available(iOS 27.1, *)) {
    [self clearReading:@"initializing"];
    __weak RNIOSHingeObserverComponentView *weakSelf = self;
    UIHingeInteraction *interaction = [[UIHingeInteraction alloc] initWithUpdateHandler:
      ^(UIHingeInteraction *source, UIHingeInteractionUpdate *update) {
        RNIOSHingeObserverComponentView *view = weakSelf;
        if (!view || source != view->_hingeInteraction) return;
        UIHinge *hinge = update.hinge;
        if (!hinge) {
          [view clearReading:@"unavailable"];
          return;
        }
        view->_available = YES;
        view->_reason = @"";
        view->_angleRadians = hinge.angle;
        switch (hinge.status) {
          case UIHingeStatusClosed: view->_status = @"closed"; break;
          case UIHingeStatusPartiallyOpen: view->_status = @"partiallyOpen"; break;
          case UIHingeStatusFullyOpen: view->_status = @"fullyOpen"; break;
          case UIHingeStatusUnknown: default: view->_status = @"unknown"; break;
        }
      }];
    _hingeInteraction = interaction;
    [self addInteraction:interaction];
    RNIOSHingeDisplayLinkTarget *target = [RNIOSHingeDisplayLinkTarget new];
    target.view = self;
    _displayLink = [CADisplayLink displayLinkWithTarget:target selector:@selector(tick:)];
    _displayLink.preferredFramesPerSecond = 30;
    [_displayLink addToRunLoop:NSRunLoop.mainRunLoop forMode:NSRunLoopCommonModes];
  } else {
    [self clearReading:@"unsupported-os"];
  }
#else
  [self clearReading:@"unsupported-sdk"];
#endif
  [self sample];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<const RNIOSHingeObserverProps>(props);
  _includeInactiveRegions = newProps.includeInactiveRegions;
  [super updateProps:props oldProps:oldProps];
  [self sample];
}

- (void)updateEventEmitter:(EventEmitter::Shared const &)eventEmitter
{
  [super updateEventEmitter:eventEmitter];
  // Send the current reading to a newly attached JS listener even if it hasn't changed.
  _lastPayload = nil;
  [self sample];
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  // The next display tick reads regions after the native layout transaction.
}

- (void)sample
{
  if (!_eventEmitter) return;
  NSMutableArray<NSDictionary *> *regions = [NSMutableArray new];
  BOOL layoutAvailable = NO;
#if RN_HINGE_HAS_SDK
  if (@available(iOS 27.1, *)) {
    if (self.window && ![_reason isEqualToString:@"background"]) {
      layoutAvailable = YES;
      UIViewReservedRegionQueryOptions options = _includeInactiveRegions
        ? UIViewReservedRegionQueryOptionsIncludeInactive : UIViewReservedRegionQueryOptionsNone;
      // Query the actual observer's bounds. Never use UIScreen.main or a global key window.
      for (UIViewReservedRegion *region in [self reservedRegionsOfKind:
            UIViewReservedRegionKind.divisionRegionKind options:options]) {
        CGRect frame = region.frame;
        [regions addObject:@{@"x": @(frame.origin.x), @"y": @(frame.origin.y),
          @"width": @(frame.size.width), @"height": @(frame.size.height), @"isActive": @(region.active)}];
      }
    }
  }
#endif
  NSDictionary *payload = @{@"available": @(_available), @"status": _status,
    @"angleRadians": @(_angleRadians), @"reason": _reason, @"regions": regions, @"layoutAvailable": @(layoutAvailable)};
  if ([_lastPayload isEqual:payload]) return;
  _lastPayload = payload;

  RNIOSHingeObserverEventEmitter::OnHingeChange event = {};
  event.available = _available;
  event.status = _status.UTF8String;
  event.angleRadians = _angleRadians;
  event.reason = _reason.UTF8String;
  event.layoutAvailable = layoutAvailable;
  event.layoutReason = layoutAvailable ? "" : _reason.UTF8String;
  for (NSDictionary *region in regions) {
    decltype(event.regions)::value_type value = {};
    value.x = [region[@"x"] doubleValue];
    value.y = [region[@"y"] doubleValue];
    value.width = [region[@"width"] doubleValue];
    value.height = [region[@"height"] doubleValue];
    value.isActive = [region[@"isActive"] boolValue];
    event.regions.push_back(value);
  }
  std::static_pointer_cast<const RNIOSHingeObserverEventEmitter>(_eventEmitter)->onHingeChange(event);
}

- (void)prepareForRecycle
{
  [self stopObserving];
  [self clearReading:@"initializing"];
  _lastPayload = nil;
  [super prepareForRecycle];
}

@end
