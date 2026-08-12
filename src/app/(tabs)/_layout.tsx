import { Tabs } from 'expo-router';
import { colors } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.background },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Capturar',
          tabBarIcon: ({ color, size }) => (
            // Icone de camera
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Galeria',
          tabBarIcon: ({ color, size }) => (
            // Icone de galeria
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth="2"/>
              <rect x="14" y="14" width="7" height="7" stroke={color} strokeWidth="2"/>
            </svg>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configuracoes',
          tabBarIcon: ({ color, size }) => (
            // Icone de configuracoes
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V15z" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ),
        }}
      />
    </Tabs>
  );
}
