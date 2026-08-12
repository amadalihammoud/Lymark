import { ClerkProvider as ExpoClerkProvider, useAuth, useUser } from '@clerk/expo';
import { ReactNode, createContext, useContext } from 'react';

const ClerkContext = createContext({});

export function ClerkProvider({ children }: { children: ReactNode }) {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    console.warn('Clerk: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY nao definida');
  }
  
  return (
    <ExpoClerkProvider publishableKey={publishableKey}>
      {children}
    </ExpoClerkProvider>
  );
}

export const useClerkAuth = () => {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  return { isSignedIn, userId, user };
};
