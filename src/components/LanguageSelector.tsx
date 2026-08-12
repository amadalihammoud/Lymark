// src/components/LanguageSelector.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from '@/hooks/useTranslation';
import { colors } from '@/theme';

const languages = [
  { code: 'pt', name: 'Portugues' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Espanol' },
  { code: 'fr', name: 'Francais' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'ru', name: 'Russkiy' },
  { code: 'zh', name: 'Zhongwen' },
  { code: 'ja', name: 'Nihongo' },
  { code: 'ko', name: 'Hangugeo' },
  { code: 'ar', name: 'Arabi' },
];

export function LanguageSelector() {
  const { locale, setLanguage } = useTranslation();

  return (
    <View style={styles.container}>
      <Picker
        selectedValue={locale}
        onValueChange={(itemValue) => setLanguage(itemValue)}
        style={styles.picker}
        dropdownIconColor={colors.text}
      >
        {languages.map((lang) => (
          <Picker.Item
            key={lang.code}
            label={lang.name}
            value={lang.code}
            color={colors.text}
          />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 150,
  },
  picker: {
    color: colors.text,
    backgroundColor: colors.background,
  },
});

export default LanguageSelector;
