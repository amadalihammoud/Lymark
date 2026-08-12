'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: '#0D2137',
    }}>
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/login"
        appearance={{
          elements: {
            rootBox: {
              width: '100%',
              maxWidth: '400px',
            },
            card: {
              backgroundColor: '#1a1a1a',
              borderColor: '#333',
            },
          },
        }}
      />
    </div>
  );
}
