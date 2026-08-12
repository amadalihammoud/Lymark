import { useUser } from '@clerk/clerk-expo';

export interface UserMetadata {
  hasActiveSubscription?: boolean;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'trialing' | 'past_due';
  isFakeUser?: boolean;
}

/**
 * Componente para proteger rotas com verificação de assinatura
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [hasAccess, setHasAccess] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (user) {
      const metadata = user.publicMetadata as UserMetadata;
      
      // Se já é fake user ou tem assinatura, permite
      if (metadata.isFakeUser || 
          (metadata.hasActiveSubscription && metadata.subscriptionStatus === 'active')) {
        setHasAccess(true);
        return;
      }

      // Se não tem assinatura, criar fake (para desenvolvimento)
      setHasAccess(true);
    } else {
      setHasAccess(false);
    }
  }, [user]);

  if (hasAccess === null) {
    return null; // Loading
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook para verificar assinatura
 */
export function useSubscriptionCheck() {
  const { user } = useUser();
  
  const checkAndCreateFakeIfNeeded = async (): Promise<{
    hasAccess: boolean;
    isFakeUser: boolean;
  }> => {
    if (!user) {
      return { hasAccess: false, isFakeUser: false };
    }

    const metadata = user.publicMetadata as UserMetadata;
    
    // Se já é fake user, tem acesso
    if (metadata.isFakeUser) {
      return { hasAccess: true, isFakeUser: true };
    }

    // Se tem assinatura ativa, tem acesso
    if (metadata.hasActiveSubscription && metadata.subscriptionStatus === 'active') {
      return { hasAccess: true, isFakeUser: false };
    }

    // Se não tem assinatura, criar fake user (para dev)
    return { hasAccess: true, isFakeUser: true };
  };

  return { checkAndCreateFakeIfNeeded };
}
