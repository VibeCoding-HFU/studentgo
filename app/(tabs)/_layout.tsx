import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const { isAdminMode, isAuthenticated, isManagerMode } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="calendar-month" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mensa"
        options={{
          title: 'Mensa',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="restaurant" color={color} />,
        }}
      />
      <Tabs.Screen
        name="deadlines"
        options={{
          title: 'To-Do',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="checklist" color={color} />,
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: 'Infos',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="menu-book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Kontakt',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="contacts" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="account-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          href: isAuthenticated ? undefined : null,
          title: 'Anfragen',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="notifications" color={color} />,
        }}
      />
      <Tabs.Screen
        name="manager"
        options={{
          href: isManagerMode ? undefined : null,
          title: 'Verwalter',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="edit-note" color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: isAdminMode ? undefined : null,
          title: 'Admin',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="admin-panel-settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
