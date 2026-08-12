import React, { createContext, useContext, ReactNode } from 'react';
import * as Clerk from '@clerk/expo';

interface ClerkContextType {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: any | null;
  signIn: (options?: any) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (options?: any) => Promise<void>;
}

const ClerkContext = createContext<ClerkContextType | undefined>(undefined);

interface ClerkProviderProps {
  children: ReactNode;
}

export const ClerkProvider: React.FC<ClerkProviderProps> = ({ children }) => {
  const clerk = Clerk.useClerk();

  const value: ClerkContextType = {
    isLoaded: clerk.isLoaded,
    isSignedIn: clerk.isSignedIn,
    user: clerk.user,
    signIn: clerk.signIn,
    signOut: clerk.signOut,
    signUp: clerk.signUp,
  };

  return (
    <ClerkContext.Provider value={value}>
      {children}
    </ClerkContext.Provider>
  );
};

export const useClerk = (): ClerkContextType => {
  const context = useContext(ClerkContext);
  if (!context) {
    throw new Error('useClerk must be used within a ClerkProvider');
  }
  return context;
};

export default ClerkContext;