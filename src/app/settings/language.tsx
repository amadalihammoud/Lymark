// Importado pela família, e não pelo barril `@expo/vector-icons`: o barril
// carrega TODAS as famílias de ícones e some com megabytes no bundle.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslations } from 'use-intl';

import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { useLocalePreference } from '@/contexts/locale-context';
import { HIT_TARGET, colors, spacing, typography } from '@/theme';
import { LOCALES, LOCALE_NAMES, type Locale } from '@i18n/locales';

/**
 * Idioma da interface.
 *
 * Uma lista, e não um seletor suspenso: são doze idiomas escritos em cinco
 * alfabetos, e quem procura o próprio idioma quer vê-lo escrito por extenso,
 * não abrir um menu e rolar às cegas.
 *
 * A primeira opção é seguir o aparelho. Ela existe porque a maioria nunca vai
 * abrir esta tela — e para essas pessoas o certo é o app já estar no idioma
 * que elas configuraram no sistema.
 */
export default function LanguageScreen() {
  const t = useTranslations('app.language');
  const { locale, isAutomatic, setLocale, clearLocale } = useLocalePreference();

  return (
    <Screen>
      <Text style={typography.body}>{t('automaticNote')}</Text>

      <Section title={t('label')}>
        <LanguageRow
          label={t('automatic')}
          selected={isAutomatic}
          onPress={clearLocale}
          showDivider
        />

        {LOCALES.map((code, index) => (
          <LanguageRow
            key={code}
            label={LOCALE_NAMES[code]}
            selected={!isAutomatic && locale === code}
            onPress={() => setLocale(code)}
            showDivider={index < LOCALES.length - 1}
          />
        ))}
      </Section>
    </Screen>
  );
}

function LanguageRow({
  label,
  selected,
  onPress,
  showDivider,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  showDivider: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && styles.divider,
        pressed && styles.pressed,
      ]}>
      {/*
        O nome de cada idioma vai escrito no próprio idioma, então a linha
        precisa aceitar árabe e japonês na mesma lista. `writingDirection`
        em `auto` deixa cada nome se orientar sozinho.
      */}
      <Text style={[typography.value, styles.label]}>{label}</Text>

      {selected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: HIT_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  label: {
    flexShrink: 1,
    writingDirection: 'auto',
  },
});
