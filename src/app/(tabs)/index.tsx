import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { AppHeader } from '@/components/brand/app-header';
import { CaptureActions } from '@/components/capture/capture-actions';
import { MetadataForm } from '@/components/capture/metadata-form';
import { PhotoPreview } from '@/components/capture/photo-preview';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useCapture } from '@/contexts/capture-context';
import { useGallery } from '@/contexts/gallery-context';
import { useSettings } from '@/contexts/settings-context';
import {
  pickPhotoFromLibrary,
  takePhotoWithCamera,
  type PhotoPickResult,
} from '@/features/capture/photo-source';
import { exportWatermarkedPhoto } from '@/features/watermark/export-photo';
import { useAddressLookup } from '@/hooks/use-address-lookup';
import { typography } from '@/theme';

/**
 * Capturar — a tela inicial.
 *
 * Todo o estado mostrado aqui vem do `CaptureProvider`, na raiz. A tela em si
 * guarda apenas o que é efêmero e não faz sentido sobreviver à navegação: se
 * uma exportação está em andamento e a referência da view a ser capturada.
 */
export default function CaptureScreen() {
  const { draft, hasPhoto, setPhotoUri, setField, regenerateCode, syncDateTime, resetDraft } =
    useCapture();
  const { preferences } = useSettings();
  const { addEntry } = useGallery();
  const { lookup, isLoading: locating } = useAddressLookup();

  const previewRef = useRef<View>(null);
  const [exporting, setExporting] = useState(false);

  const applyPickResult = (result: PhotoPickResult) => {
    switch (result.status) {
      case 'selected':
        setPhotoUri(result.uri);
        // Foto nova recebe o horário do momento da captura, não o de quando
        // o app foi aberto.
        syncDateTime();
        break;
      case 'denied':
        Alert.alert(
          'Permissão necessária',
          'Libere o acesso em Configurações › Permissões para continuar.',
        );
        break;
      case 'failed':
        Alert.alert('Não deu certo', 'Não foi possível abrir a foto. Tente novamente.');
        break;
      case 'cancelled':
        break;
    }
  };

  const handleLocate = async () => {
    const address = await lookup();
    if (address) {
      setField('address', address);
      return;
    }
    Alert.alert(
      'Endereço não obtido',
      'Verifique a permissão de localização ou digite o endereço manualmente.',
    );
  };

  const handleExport = async () => {
    if (!hasPhoto) return;

    setExporting(true);
    try {
      const outcome = await exportWatermarkedPhoto(previewRef);
      addEntry({ uri: outcome.uri, metadata: draft.metadata });

      Alert.alert(
        'Foto exportada',
        outcome.savedToLibrary
          ? 'A imagem foi salva na galeria do aparelho e no histórico do Lymark.'
          : 'A imagem entrou no histórico do Lymark. Libere o acesso às fotos para salvá-la também na galeria do aparelho.',
      );
    } catch (error) {
      Alert.alert(
        'Falha ao exportar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <AppHeader tagline="Marca d’água com hora, data e local" />

      <PhotoPreview
        ref={previewRef}
        uri={draft.photoUri}
        metadata={draft.metadata}
        preferences={preferences}
      />

      <CaptureActions
        busy={exporting}
        onTakePhoto={async () => applyPickResult(await takePhotoWithCamera())}
        onPickFromLibrary={async () => applyPickResult(await pickPhotoFromLibrary())}
      />

      <MetadataForm
        metadata={draft.metadata}
        onChangeField={setField}
        onRegenerateCode={regenerateCode}
        onLocate={handleLocate}
        locating={locating}
      />

      <Button
        label="Exportar foto com marca d’água"
        variant="accent"
        onPress={handleExport}
        disabled={!hasPhoto}
        loading={exporting}
      />

      {hasPhoto ? (
        <Button
          label="Começar nova captura"
          icon="refresh"
          variant="ghost"
          onPress={resetDraft}
        />
      ) : (
        <Text style={[typography.caption, { textAlign: 'center' }]}>
          Escolha uma foto para habilitar a exportação.
        </Text>
      )}
    </Screen>
  );
}
