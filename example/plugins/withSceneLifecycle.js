const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

// Expo 57 includes this scene delegate, but the downloaded bare template still
// starts React Native from UIApplicationDelegate. iOS 27 requires scene adoption.
module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, config => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [{
          UISceneConfigurationName: 'Default Configuration',
          UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
        }],
      },
    };
    return config;
  });
  return withAppDelegate(config, config => {
    if (config.modResults.language !== 'swift') {
      throw new Error('Hinge Lab scene configuration requires the Expo Swift AppDelegate template.');
    }
    let source = config.modResults.contents;
    if (!source.includes('ExpoAppDelegate, ExpoReactNativeFactoryProvider')) {
      source = source.replace('class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    }
    if (!source.includes('class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider')) {
      throw new Error('The Expo AppDelegate template changed; review the scene lifecycle plugin.');
    }
    source = source.replace(
      /    window = UIWindow\(frame: UIScreen\.main\.bounds\)\s+factory\.startReactNative\(\s+withModuleName: "main",\s+in: window,\s+launchOptions: launchOptions\)/,
      '    // ExpoAppSceneDelegate creates the scene window and starts this factory.'
    );
    if (source.includes('factory.startReactNative(')) {
      throw new Error('React Native must be started by ExpoAppSceneDelegate, not AppDelegate.');
    }
    config.modResults.contents = source;
    return config;
  });
};
