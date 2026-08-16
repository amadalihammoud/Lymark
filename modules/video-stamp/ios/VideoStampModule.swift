import AVFoundation
import ExpoModulesCore
import UIKit

/**
 * O carimbo de vídeo no iOS — AVFoundation com camada de overlay.
 *
 * O mesmo desenho do Android e do desktop, com o motor da plataforma: o
 * carimbo chega pronto do JavaScript como um PNG transparente do TAMANHO DO
 * QUADRO (desenhado pelo mesmo código do carimbo da foto), e aqui ele é só
 * sobreposto. Quem compõe é o `AVVideoCompositionCoreAnimationTool`: uma
 * `CALayer` com o PNG por cima da camada do vídeo, e o
 * `AVAssetExportSession` reencoda por hardware.
 *
 * A rotação é o detalhe que não pode passar: vídeo de celular quase sempre
 * carrega `preferredTransform` (gravado "deitado" com instrução de girar).
 * O `renderSize` sai das dimensões JÁ giradas — as mesmas que o JavaScript
 * viu ao desenhar o overlay — e a transform é aplicada na instrução da
 * camada do vídeo, nunca no overlay.
 */
public class VideoStampModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VideoStamp")

    AsyncFunction("stamp") { (inputUri: String, overlayPath: String, outputPath: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        Self.stamp(inputUri: inputUri, overlayPath: overlayPath, outputPath: outputPath, promise: promise)
      }
    }
  }

  private static func fileUrl(_ value: String) -> URL {
    if value.hasPrefix("file://"), let url = URL(string: value) { return url }
    return URL(fileURLWithPath: value)
  }

  // swiftlint:disable:next function_body_length
  private static func stamp(inputUri: String, overlayPath: String, outputPath: String, promise: Promise) {
    let asset = AVURLAsset(url: fileUrl(inputUri))

    guard let videoTrack = asset.tracks(withMediaType: .video).first else {
      promise.reject("ERR_VIDEO", "O arquivo não pôde ser lido como vídeo.")
      return
    }
    guard let overlayImage = UIImage(contentsOfFile: overlayPath)?.cgImage else {
      promise.reject("ERR_OVERLAY", "O carimbo não pôde ser lido.")
      return
    }

    // Dimensões de EXIBIÇÃO: o natural size com a rotação aplicada. É o
    // quadro que o JavaScript mediu para desenhar o overlay.
    let transform = videoTrack.preferredTransform
    let rotated = videoTrack.naturalSize.applying(transform)
    let renderSize = CGSize(width: abs(rotated.width), height: abs(rotated.height))

    let composition = AVMutableComposition()
    guard
      let compositionVideo = composition.addMutableTrack(
        withMediaType: .video,
        preferredTrackID: kCMPersistentTrackID_Invalid
      )
    else {
      promise.reject("ERR_COMPOSICAO", "Falha ao preparar a composição.")
      return
    }

    let fullRange = CMTimeRange(start: .zero, duration: asset.duration)
    do {
      try compositionVideo.insertTimeRange(fullRange, of: videoTrack, at: .zero)
      // Áudio é opcional: vídeo sem trilha sonora segue sem ela, como no
      // Android e no ffmpeg (`-map 0:a?`).
      if let audioTrack = asset.tracks(withMediaType: .audio).first,
        let compositionAudio = composition.addMutableTrack(
          withMediaType: .audio,
          preferredTrackID: kCMPersistentTrackID_Invalid
        ) {
        try compositionAudio.insertTimeRange(fullRange, of: audioTrack, at: .zero)
      }
    } catch {
      promise.reject("ERR_COMPOSICAO", error.localizedDescription)
      return
    }

    // A transform de rotação entra na instrução da camada do vídeo. A
    // translação corrige a origem: girar 90° sem transladar desenharia o
    // quadro fora da tela.
    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionVideo)
    var corrected = transform
    corrected.tx = transform.tx < 0 ? renderSize.width : max(transform.tx, 0)
    corrected.ty = transform.ty < 0 ? renderSize.height : max(transform.ty, 0)
    if rotated.width < 0 { corrected.tx = renderSize.width }
    if rotated.height < 0 { corrected.ty = renderSize.height }
    layerInstruction.setTransform(corrected, at: .zero)

    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = fullRange
    instruction.layerInstructions = [layerInstruction]

    // As camadas: vídeo embaixo, carimbo por cima, do tamanho exato do
    // quadro — toda a decisão de posição já veio resolvida no PNG.
    let videoLayer = CALayer()
    videoLayer.frame = CGRect(origin: .zero, size: renderSize)
    let overlayLayer = CALayer()
    overlayLayer.contents = overlayImage
    overlayLayer.frame = CGRect(origin: .zero, size: renderSize)
    overlayLayer.contentsGravity = .resize
    let parentLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: renderSize)
    parentLayer.addSublayer(videoLayer)
    parentLayer.addSublayer(overlayLayer)

    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize = renderSize
    videoComposition.instructions = [instruction]
    let fps = videoTrack.nominalFrameRate > 0 ? videoTrack.nominalFrameRate : 30
    videoComposition.frameDuration = CMTime(value: 1, timescale: CMTimeScale(fps.rounded()))
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )

    let outputUrl = URL(fileURLWithPath: outputPath)
    try? FileManager.default.removeItem(at: outputUrl)

    guard
      let export = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality)
    else {
      promise.reject("ERR_EXPORT", "Falha ao preparar a exportação.")
      return
    }
    export.videoComposition = videoComposition
    export.outputURL = outputUrl
    export.outputFileType = .mp4
    export.shouldOptimizeForNetworkUse = true

    export.exportAsynchronously {
      switch export.status {
      case .completed:
        promise.resolve(outputPath)
      case .cancelled:
        promise.reject("ERR_EXPORT", "Exportação cancelada.")
      default:
        promise.reject("ERR_EXPORT", export.error?.localizedDescription ?? "Falha na exportação.")
      }
    }
  }
}
