import { Stack, useRouter } from 'expo-router';
import { useTranslations } from 'use-intl';

import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';

export default function NotFoundScreen() {
  const t = useTranslations('app');
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.screenTitle') }} />
      <Screen scrollable={false}>
        <EmptyState
          icon="compass-outline"
          title={t('notFound.title')}
          description={t('notFound.body')}
          actionLabel={t('gallery.emptyAction')}
          onAction={() => router.replace('/')}
        />
      </Screen>
    </>
  );
}
