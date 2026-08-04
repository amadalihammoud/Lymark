import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';

/**
 * Fundo de teste para a pré-visualização do carimbo.
 *
 * Sem foto escolhida, o carimbo aparecia sobre um azul chapado — que não
 * responde à pergunta que a tela existe para responder: *dá para ler?* A
 * sombra e a faixa escura só se avaliam contra os dois extremos, e é sobre o
 * claro que o texto branco desaparece.
 *
 * O degradê vai de quase branco a quase preto na diagonal, cobrindo os dois
 * casos de uma vez. Desenhado com o mesmo Skia do carimbo, sem somar imagem
 * ao aplicativo.
 */
export function PreviewBackdrop({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={['#F2F5F8', '#9FB0C0', '#31414F', '#0B1119']}
          positions={[0, 0.38, 0.72, 1]}
        />
      </Rect>
    </Canvas>
  );
}
