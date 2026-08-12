// src/app/settings/language.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSelector } from '@/components/LanguageSelector';
import { colors, typography } from '@/theme';

export default function LanguageSettings() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={[typography.screenTitle, styles.title]}>
        {t('language.label')}
      </Text>
      <Text style={[typography.body, styles.subtitle]}>
        {t('language.selector')}
      </Text>
      <View style={styles.selectorContainer}>
        <LanguageSelector />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: 20,
  },
  selectorContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    backgroundColor: colors.surface,
  },
});
