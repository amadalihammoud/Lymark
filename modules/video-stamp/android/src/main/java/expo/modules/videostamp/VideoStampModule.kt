package expo.modules.videostamp

import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.OverlayEffect
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import com.google.common.collect.ImmutableList
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * O carimbo de vídeo no Android — Media3 Transformer com overlay estático.
 *
 * O desenho é o mesmo do desktop, com o Transformer no lugar do ffmpeg: o
 * carimbo chega pronto do JavaScript como um PNG transparente do tamanho do
 * quadro (desenhado pelo mesmo código do carimbo da foto), e aqui ele é só
 * sobreposto — o `BitmapOverlay` estático desenha o bitmap centrado, sem
 * escala, então um overlay do tamanho exato do quadro cobre o vídeo inteiro
 * e toda a decisão de posição já veio resolvida.
 *
 * O Transformer usa o MediaCodec do aparelho: reencoda por hardware, rápido
 * e sem processo externo. A API é marcada como instável pelo Media3 (o
 * `@OptIn` abaixo), mas é a mesma que o Google Fotos usa — instável aqui
 * significa "a assinatura pode mudar entre versões", não "não funciona".
 */
@OptIn(UnstableApi::class)
class VideoStampModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VideoStamp")

    AsyncFunction("stamp") { inputUri: String, overlayPath: String, outputPath: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject(CodedException("ERR_SEM_CONTEXTO", "Contexto Android indisponível.", null))
        return@AsyncFunction
      }

      // O Transformer exige um Looper; o da thread principal é o dele.
      Handler(Looper.getMainLooper()).post {
        try {
          val bitmap = BitmapFactory.decodeFile(overlayPath)
          if (bitmap == null) {
            promise.reject(CodedException("ERR_OVERLAY", "O carimbo não pôde ser lido.", null))
            return@post
          }

          val overlay = BitmapOverlay.createStaticBitmapOverlay(bitmap)
          val videoEffects = ImmutableList.of<Effect>(OverlayEffect(ImmutableList.of(overlay)))

          val editedItem = EditedMediaItem.Builder(MediaItem.fromUri(Uri.parse(inputUri)))
            .setEffects(Effects(ImmutableList.of<AudioProcessor>(), videoEffects))
            .build()

          val transformer = Transformer.Builder(context)
            .addListener(object : Transformer.Listener {
              override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                promise.resolve(outputPath)
              }

              override fun onError(
                composition: Composition,
                exportResult: ExportResult,
                exportException: ExportException,
              ) {
                promise.reject(
                  CodedException("ERR_EXPORT", exportException.message ?: "Falha na exportação.", exportException),
                )
              }
            })
            .build()

          transformer.start(editedItem, outputPath)
        } catch (error: Throwable) {
          promise.reject(CodedException("ERR_CARIMBO", error.message ?: "Falha ao carimbar.", error))
        }
      }
    }
  }
}
