/**
 * Tela de login com Clerk
 */

import { useRouter } from 'expo-router';
import { useSignIn } from .@clerk/expo.;
import { Button, View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';

export default function LoginScreen() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();

  const handleSignIn = async (strategy: 'oauth_google' | 'oauth_apple') => {
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/',
      });
    } catch (err) {
      console.error('Erro ao fazer login:', err);
    }
  };

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <Text style={typography.body}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[typography.screenTitle, styles.title]}>
        Bem-vindo ao Lymark
      </Text>
      <Text style={[typography.body, styles.subtitle]}>
        Faça login para continuar
      </Text>

      <View style={styles.buttons}>
        <Button
          label="Entrar com Google"
          onPress={() => handleSignIn('oauth_google')}
          style={styles.button}
        />
        <Button
          label="Entrar com Apple"
          onPress={() => handleSignIn('oauth_apple')}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  title: {
    marginBottom: 8,
    color: colors.text,
  },
  subtitle: {
    marginBottom: 32,
    color: colors.textSecondary,
  },
  buttons: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  button: {
    marginBottom: 16,
  },
});
