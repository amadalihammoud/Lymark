// Importado pela família, e não pelo barril `@expo/vector-icons`: o barril
// carrega TODAS as famílias de ícones e some com megabytes no bundle.
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import {
  PERMISSION_DESCRIPTORS,
  useAppPermissions,
  type PermissionSnapshot,
} from '@/hooks/use-app-permissions';
import { colors, spacing, typography } from '@/theme';

/**
 * Permissões.
 *
 * Mostra o estado real consultado ao sistema, e não uma suposição do app. Um
 * acesso negado em definitivo não vira um botão que não faz nada: o pedido
 * encaminha o usuário para os Ajustes do aparelho.
 */
export default function PermissionsScreen() {
  const { permissions, refreshing, refresh, request } = useAppPermissions();

  return (
    <Screen>
      <Text style={typography.body}>
        O Lymark só pede o que precisa para carimbar uma foto. Nada é enviado para
        servidores — tudo acontece no aparelho.
      </Text>

      <Section title="Acessos">
        {PERMISSION_DESCRIPTORS.map((descriptor, index) => (
          <PermissionRow
            key={descriptor.id}
            title={descriptor.title}
            rationale={descriptor.rationale}
            snapshot={permissions[descriptor.id]}
            loading={refreshing}
            onRequest={() => request(descriptor.id)}
            showDivider={index < PERMISSION_DESCRIPTORS.length - 1}
          />
        ))}
      </Section>

      <Button
        label="Verificar novamente"
        icon="refresh"
        variant="ghost"
        onPress={() => void refresh()}
      />
    </Screen>
  );
}

function PermissionRow({
  title,
  rationale,
  snapshot,
  loading,
  onRequest,
  showDivider,
}: {
  title: string;
  rationale: string;
  snapshot: PermissionSnapshot | null;
  loading: boolean;
  onRequest: () => void;
  showDivider: boolean;
}) {
  const granted = snapshot?.granted ?? false;
  const permanentlyDenied = snapshot !== null && !snapshot.granted && !snapshot.canAskAgain;

  return (
    <View style={[styles.row, showDivider && styles.divider]}>
      <View style={styles.info}>
        <View style={styles.titleLine}>
          <Ionicons
            name={granted ? 'checkmark-circle' : 'alert-circle-outline'}
            size={18}
            color={granted ? colors.success : colors.textSubtle}
          />
          <Text style={typography.value}>{title}</Text>
        </View>
        <Text style={typography.caption}>{rationale}</Text>
      </View>

      {loading && snapshot === null ? (
        <ActivityIndicator color={colors.textMuted} />
      ) : granted ? (
        <Text style={[typography.caption, styles.grantedLabel]}>Liberado</Text>
      ) : (
        <Button
          label={permanentlyDenied ? 'Ajustes' : 'Permitir'}
          variant="primary"
          onPress={onRequest}
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grantedLabel: {
    color: colors.success,
    fontWeight: '700',
  },
  action: {
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
});
