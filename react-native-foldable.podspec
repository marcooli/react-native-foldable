require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = package['name']
  s.version = package['version']
  s.summary = package['description']
  s.homepage = package['homepage']
  s.license = { :type => 'MIT', :file => 'LICENSE' }
  s.authors = 'react-native-foldable contributors'
  # npm distributes the source; consumers autolink this local podspec.
  s.source = { :git => package['repository']['url'], :tag => "v#{s.version}" }
  s.platforms = { :ios => '16.4' }
  s.source_files = 'ios/**/*.{h,mm}'
  s.frameworks = 'UIKit', 'QuartzCore'
  install_modules_dependencies(s)
end
