'use client';

import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: '#0D2137',
    }}>
      <h1 style={{
        marginBottom: '2rem',
        color: '#fff',
        fontSize: '2rem',
        textAlign: 'center'
      }}>
        Entre para acessar o Lymark
      </h1>
      <SignIn
        path="/login"
        routing="path"
        signUpUrl="/sign-up"
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
            headerTitle: {
              color: '#fff',
            },
            headerSubtitle: {
              color: '#aaa',
            },
            button: {
              backgroundColor: '#007AFF',
              color: '#fff',
            },
            buttonPrimary: {
              backgroundColor: '#007AFF',
              color: '#fff',
            },
          },
        }}
      />
    </div>
  );
}
