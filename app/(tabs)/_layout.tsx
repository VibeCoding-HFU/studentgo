import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { useAuth } from '@/contexts/auth-context';

function HomeBackButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel="Zur Startseite"
      accessibilityRole="button"
      onPress={() => router.replace('/')}
      style={({ pressed }) => ({
        alignItems: 'center',
        height: 42,
        justifyContent: 'center',
        marginLeft: 4,
        opacity: pressed ? 0.7 : 1,
        width: 42,
      })}
    >
      <MaterialIcons name="arrow-back" size={25} color="#00684F" />
    </Pressable>
  );
}

const moduleHeaderOptions = {
  headerLeft: () => <HomeBackButton />,
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: '#F5F7FB',
  },
  headerTintColor: '#00684F',
  headerTitleStyle: {
    color: '#101828',
    fontWeight: '800' as const,
  },
};

export default function ModuleStackLayout() {
  const { isAdminMode, isManagerMode } = useAuth();

  return (
    <Stack screenOptions={{ animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="schedule" options={{ ...moduleHeaderOptions, title: 'Plan' }} />
      <Stack.Screen name="deadlines" options={{ ...moduleHeaderOptions, title: 'To-Do' }} />
      <Stack.Screen name="contacts" options={{ ...moduleHeaderOptions, title: 'Kontakt' }} />
      <Stack.Screen name="curriculum" options={{ ...moduleHeaderOptions, title: 'Studium' }} />
      <Stack.Screen name="nfc" options={{ ...moduleHeaderOptions, title: 'Mensa' }} />
      <Stack.Screen name="account" options={{ ...moduleHeaderOptions, title: 'Account' }} />
      <Stack.Screen name="requests" options={{ ...moduleHeaderOptions, title: 'Anfragen' }} />
      <Stack.Screen
        name="manager"
        options={{
          ...moduleHeaderOptions,
          title: 'Verwalter',
          ...(isManagerMode && !isAdminMode ? {} : { href: null }),
        }}
      />
      <Stack.Screen
        name="admin"
        options={{
          ...moduleHeaderOptions,
          title: 'Admin',
          ...(isAdminMode ? {} : { href: null }),
        }}
      />
    </Stack>
  );
}
