Pod::Spec.new do |s|
  s.name           = 'VideoStamp'
  s.version        = '0.1.0'
  s.summary        = 'Carimbo de vídeo do Lymark — overlay estático via AVFoundation'
  s.description    = 'Sobrepõe o carimbo (PNG do tamanho do quadro) a um vídeo da galeria.'
  s.author         = 'Lymark'
  s.homepage       = 'https://lymark.app'
  s.license        = { type: 'MIT' }
  s.platforms      = { ios: '15.1' }
  s.swift_version  = '5.4'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
end
