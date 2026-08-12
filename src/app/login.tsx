import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useClerkAuth } from '@/contexts/clerk-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useWarmUpBrowser } from '@/hooks/use-warm-up-browser';

export default function LoginScreen() {
  const { isSignedIn } = useClerkAuth();
  const router = useRouter();

  useWarmUpBrowser();

  const handleSignIn = async () => {
    // TODO: Implement actual Clerk sign in
    // For now, redirect to home if already signed in
    if (isSignedIn) {
      router.replace('/');
    } else {
      // Placeholder: open Clerk hosted sign in
      await WebBrowser.openAuthSessionAsync(
        'https://your-clerk-instance.clerk.accounts.dev/sign-in'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo ao Lymark</Text>
      <Text style={styles.subtitle}>Faca login para continuar</Text>
      <Pressable style={styles.button} onPress={handleSignIn}>
        <Text style={styles.buttonText}>Entrar com Clerk</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0D2137',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
