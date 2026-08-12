import { useClerkAuth } from '@/contexts/clerk-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export const useAuthProtection = (redirectTo: string = '/login') => {
  const { isSignedIn } = useClerkAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) {
      router.replace(redirectTo);
    }
  }, [isSignedIn, redirectTo, router]);

  return { isSignedIn };
};

export const usePublicAuth = () => {
  const { isSignedIn, userId, user } = useClerkAuth();
  return { isSignedIn, userId, user };
};
