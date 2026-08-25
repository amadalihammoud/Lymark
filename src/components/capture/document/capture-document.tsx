import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  CaptureMetadata,
  SelectedPhoto,
  WatermarkFieldKey,
  WatermarkPreferences,
} from '@/types';

import { CaptureActionBar } from './action-bar';
import { DataRuler, DataRulerFooter } from './data-ruler';
import { PhotoStage } from './photo-stage';
import { StampPanel } from './stamp-panel';

/**
 * A tela larga como DOCUMENTO.
 *
 * O diagnóstico que originou este desenho: a tela larga era o idioma do
 * celular multiplicado por três colunas — todos os ajustes permanentemente
 * abertos, nada protagonista. Aqui a foto é a protagonista, os dados que saem
 * nela ficam colados nela, e o que é ajuste de aparência vai para o lado.
 *
 * Este componente é APRESENTAÇÃO PURA: recebe tudo por props e não consulta
 * nenhum contexto. É de propósito — é o que mantém o fluxo de exportação, a
 * cota e o histórico vivendo num lugar só, na tela, sem uma segunda cópia das
 * regras aqui dentro.
 */
export function CaptureDocument({
  photo,
  metadata,
  preferences,
  visibleFields,
  source,
  hasPhoto,
  busy,
  pending,
  isEmpty,
  addressHint,
  locating,
  onChangeField,
  onSyncDateTime,
  onRegenerateCode,
  onLocate,
  onSave,
  onShare,
  onReset,
  onVideo,
  onBatch,
}: {
  photo: SelectedPhoto | null;
  metadata: CaptureMetadata;
  preferences: WatermarkPreferences;
  visibleFields: Record<WatermarkFieldKey, boolean>;
  /** Os botões de origem, já montados pela tela. */
  source: ReactNode;
  hasPhoto: boolean;
  busy: boolean;
  pending: 'save' | 'share' | null;
  /** Nenhum campo com conteúdo: a foto sairia sem marca d'água. */
  isEmpty: boolean;
  addressHint?: { text: string; imprecise: boolean } | null;
  locating: boolean;
  onChangeField: (key: WatermarkFieldKey, value: string) => void;
  onSyncDateTime: () => void;
  onRegenerateCode: () => void;
  onLocate: () => void;
  onSave: () => void;
  onShare: () => void;
  onReset: () => void;
  onVideo: () => void;
  onBatch: () => void;
}) {
  return (
    /*
      A cadeia `flex: 1` + `minHeight: 0` daqui até o poço do palco é
      estrutural, não cosmética: se ela se romper em qualquer elo, a caixa
      mede zero de altura, o cálculo devolve zeros e a foto aparece SEM
      CARIMBO — sem erro no console, sem teste que acuse.

      Pelo mesmo motivo, nada aqui pode ser envolvido num ScrollView: um
      contêiner rolável devolve altura indefinida e produz exatamente essa
      falha.
    */
    <View style={styles.root}>
      <CaptureActionBar
        source={source}
        hasPhoto={hasPhoto}
        busy={busy}
        pending={pending}
        onSave={onSave}
        onShare={onShare}
        onReset={onReset}
        onVideo={onVideo}
        onBatch={onBatch}
      />

      <View style={styles.body}>
        <PhotoStage
          photo={photo}
          metadata={metadata}
          preferences={preferences}
          ruler={
            <DataRuler
              metadata={metadata}
              visibleFields={visibleFields}
              onChangeField={onChangeField}
              onSyncDateTime={onSyncDateTime}
              onRegenerateCode={onRegenerateCode}
              onLocate={onLocate}
              locating={locating}
              disabled={busy}
            />
          }
          footer={
            <DataRulerFooter
              visibleFields={visibleFields}
              addressHint={addressHint}
              isEmpty={isEmpty}
            />
          }
        />

        <StampPanel />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
  },
});
