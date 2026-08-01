import { Stack, useRouter } from 'expo-router';

import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <Screen scrollable={false}>
        <EmptyState
          icon="compass-outline"
          title="Caminho inexistente"
          description="Essa tela não faz parte do Lymark."
          actionLabel="Ir para Capturar"
          onAction={() => router.replace('/')}
        />
      </Screen>
    </>
  );
}
