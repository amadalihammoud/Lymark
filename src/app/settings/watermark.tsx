import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { WatermarkControls } from '@/components/settings/watermark-controls';
import { useCapture } from '@/contexts/capture-context';
import { useSettings } from '@/contexts/settings-context';
import { StampCanvas } from '@/features/watermark/stamp-canvas';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Preferências de marca d'água.
 *
 * A tela abre com uma pré-visualização ao vivo alimentada pelo rascunho de
 * captura atual: mexer num interruptor aqui mostra o efeito sobre a foto que
 * o usuário acabou de escolher, e não sobre um exemplo genérico.
 *
 * Os controles em si moram em `WatermarkControls`, porque a tela larga de
 * Capturar os mostra ao lado da foto. Aqui sobrou a moldura e a
 * pré-visualização, que só faz sentido nesta rota — no layout de três colunas
 * a foto de verdade já está do lado.
 */
export default function WatermarkSettingsScreen() {
  const { preferences, visibleFieldCount } = useSettings();
  const { draft } = useCapture();
  const [previewFrame, setPreviewFrame] = useState({ width: 0, height: 0 });

  return (
    <Screen>
      <Section
        title="Pré-visualização"
        description={
          draft.photo
            ? 'Sobre a foto atual da aba Capturar.'
            : 'Escolha uma foto em Capturar para ver sobre a imagem real.'
        }>
        <View
          style={styles.preview}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setPreviewFrame((current) =>
              current.width === width && current.height === height ? current : { width, height },
            );
          }}>
          {draft.photo ? (
            <Image
              source={{ uri: draft.photo.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : null}
          <StampCanvas
            metadata={draft.metadata}
            preferences={preferences}
            width={previewFrame.width}
            height={previewFrame.height}
          />
          {visibleFieldCount === 0 ? (
            <Text style={[typography.caption, styles.previewHint]}>
              Nenhum campo selecionado — a foto sai sem marca d’água.
            </Text>
          ) : null}
        </View>
      </Section>

      <WatermarkControls />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHint: {
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },
});
